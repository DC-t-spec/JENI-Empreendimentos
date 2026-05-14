import { createSupabaseClient } from '../services/supabase-client.js';
import { createContentService } from '../services/content-service.js';

// Demo/mock fallback items were removed for production hardening (Fase 4.4).
const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (iso) => new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
const safe = (v, d = '') => (v == null || v === '' ? d : v);

function normalizePublishedItem(i, idx, catMap, authorMap) {
  return {
    ...i,
    author_name: authorMap.get(i.author_id)?.display_name || 'Redação',
    category: catMap.get(i.category_id) || { slug: 'editorial', name: 'Editorial' },
    cover_image: `foto${(idx % 9) + 1}.jpg.jpeg`,
    read_minutes: Math.max(3, Math.round((safe(i.body, '').split(/\s+/).length || 420) / 180))
  };
}

async function fetchPublishedContent() {
  if (!window.supabase) return [];
  try {
    const supabase = createSupabaseClient();
    const content = createContentService(supabase);
    const { data, error } = await content.listPublishedContent(40);
    if (error) throw error;

    // Defensive guard: render only published content_items on public pages.
    const publishedOnly = (data || []).filter((item) => item?.status === 'published');
    if (!publishedOnly.length) return [];

    const categoryIds = [...new Set(publishedOnly.map((i) => i.category_id).filter(Boolean))];
    const authorIds = [...new Set(publishedOnly.map((i) => i.author_id).filter(Boolean))];

    const [catRes, authorRes] = await Promise.all([
      categoryIds.length ? content.listCategories(categoryIds) : { data: [] },
      authorIds.length ? content.listAuthors(authorIds) : { data: [] }
    ]);

    const catMap = new Map((catRes.data || []).map((c) => [c.id, c]));
    const authorMap = new Map((authorRes.data || []).map((a) => [a.id, a]));

    return publishedOnly.map((i, idx) => normalizePublishedItem(i, idx, catMap, authorMap));
  } catch (_e) {
    return [];
  }
}

function renderPremiumEmptyState(selector, title, description) {
  const host = qs(selector);
  if (!host) return;
  host.innerHTML = `<article class="premium-card premium-empty"><span>JENI Informa</span><h3>${title}</h3><p>${description}</p></article>`;
}

function renderHomepage(items) {
  const leadWrap = qs('.lead-story');
  if (!items.length) {
    leadWrap.innerHTML = `<article><p class="kicker">Editorial</p><h1>Conteúdo em actualização</h1><p class="subtitle">Esta secção será publicada assim que novos conteúdos aprovados estiverem disponíveis.</p></article>`;
    renderPremiumEmptyState('.editorial-grid', 'Sem conteúdos publicados', 'A grade editorial será actualizada com artigos aprovados.');
    qs('.trending ol').innerHTML = '<li>Sem conteúdos publicados no momento.</li>';
    qs('.highlight-list').innerHTML = '<article><strong>Destaques</strong><p>Novos destaques editoriais serão exibidos após publicação.</p></article>';
    qs('.category-strip').innerHTML = '';
    return;
  }

  const lead = items.find((i) => i.featured) || items[0];
  leadWrap.innerHTML = `<img src="${safe(lead.cover_image, 'foto9.jpg.jpeg')}" loading="lazy" alt="${lead.title}"><article>
    <p class="kicker">Lead Story · ${lead.category.name}</p>
    <h1>${lead.title}</h1><p class="subtitle">${safe(lead.excerpt, '')}</p>
    <p class="meta">Por ${lead.author_name} · ${fmt(lead.published_at)} · ${lead.read_minutes} min</p>
    <a class="jeni-btn-dark" href="jeni-informa-artigo.html?slug=${encodeURIComponent(lead.slug)}">Ler artigo</a></article>`;

  qs('.editorial-grid').innerHTML = items.slice(0, 8).map((i) => `<article class="premium-card"><span>${i.category.name}</span><h3><a href="jeni-informa-artigo.html?slug=${encodeURIComponent(i.slug)}">${i.title}</a></h3></article>`).join('');
  qs('.trending ol').innerHTML = items.slice(0, 4).map((i) => `<li><a href="jeni-informa-artigo.html?slug=${encodeURIComponent(i.slug)}">${i.title}</a></li>`).join('');
  qs('.highlight-list').innerHTML = items.slice(1, 5).map((i) => `<article><strong>${i.type}</strong><p>${safe(i.excerpt, 'Actualização editorial disponível.')}</p></article>`).join('');

  const cats = [...new Map(items.map((i) => [i.category.slug, i.category])).values()];
  qs('.category-strip').innerHTML = cats.map((c) => `<a href="jeni-informa-arquivo.html?cat=${encodeURIComponent(c.slug)}">${c.name}</a>`).join('');
}

function renderArticlePage(items) {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const id = params.get('id');
  const host = qs('[data-article-root]');
  host.dataset.state = 'loading';
  const item = items.find((i) => (slug && i.slug === slug) || (id && String(i.id) === id));
  if (!item) {
    host.dataset.state = 'error';
    qs('[data-article-error]').hidden = false;
    qs('[data-article-content]').hidden = true;
    return;
  }
  document.title = `${safe(item.title)} | JENI Informa`;
  qs('meta[name="description"]').setAttribute('content', safe(item.seo_description, item.excerpt || 'Artigo JENI Informa'));
  const canonical = `${window.location.origin}/jeni-informa-artigo.html?slug=${encodeURIComponent(item.slug)}`;
  qs('link[rel="canonical"]').setAttribute('href', canonical);
  qs('meta[property="og:title"]').setAttribute('content', safe(item.title));
  qs('meta[property="og:description"]').setAttribute('content', safe(item.excerpt, 'Artigo JENI Informa'));
  qs('meta[property="og:url"]').setAttribute('content', canonical);

  qs('.article-hero').src = safe(item.cover_image, 'foto8.jpg.jpeg');
  qs('.article-hero').alt = item.title;
  qs('.kicker').textContent = `${item.type} · ${item.category.name}`;
  qs('h1').textContent = item.title;
  qs('.subtitle').textContent = safe(item.excerpt, 'Leitura editorial.');
  qs('.meta').textContent = `Por ${item.author_name} · ${fmt(item.published_at)} · ${item.read_minutes} min de leitura`;
  qs('.article-body').innerHTML = `<p>${safe(item.body, item.excerpt)}</p>`;
  const related = items.filter((i) => i.id !== item.id).slice(0, 3);
  qs('.related').hidden = related.length === 0;
  qs('.related-grid').innerHTML = related.map((r) => `<a href="jeni-informa-artigo.html?slug=${encodeURIComponent(r.slug)}">${r.title}</a>`).join('');
  host.dataset.state = 'ready';
}

function renderArchivePage(items) {
  let filtered = items;
  const grid = qs('#archiveGrid');
  const search = qs('#searchInput');
  const type = qs('#typeSelect');
  const chips = qsa('.archive-filter-chip');
  const empty = qs('#archiveEmpty');

  const draw = () => {
    const cat = qs('.archive-filter-chip.active')?.dataset.filter || 'all';
    const term = search.value.toLowerCase();
    filtered = items.filter((i) => (cat === 'all' || i.category.slug === cat) && (!type.value || i.type === type.value) && (`${i.title} ${safe(i.excerpt)} ${i.author_name}`.toLowerCase().includes(term)));
    grid.innerHTML = filtered.map((i) => `<article class="archive-card" data-cat="${i.category.slug}" data-type="${i.type}"><img src="${i.cover_image}" loading="lazy" alt="${i.title}"><div class="archive-card-content"><h3><a href="jeni-informa-artigo.html?slug=${encodeURIComponent(i.slug)}">${i.title}</a></h3><p>${safe(i.excerpt, 'Conteúdo aprovado e publicado.')}</p></div></article>`).join('');
    empty.hidden = filtered.length > 0;
  };

  chips.forEach((ch) => ch.addEventListener('click', () => {
    chips.forEach((c) => c.classList.remove('active'));
    ch.classList.add('active');
    draw();
  }));
  search.addEventListener('input', draw);
  type.addEventListener('change', draw);
  draw();
}

function bindNewsletter() { /* unchanged */
  const form = qs('#newsletterForm');
  if (!form) return;
  const msg = qs('#newsletterMessage');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = qs('#newsletterEmail').value.trim();
    if (!email) return;
    msg.textContent = 'A submeter...';
    if (!window.supabase) { msg.textContent = 'Subscrição recebida. (modo offline)'; form.reset(); return; }
    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.from('newsletter_subscribers').insert([{ email, source: 'jeni-informa' }]);
      if (error) throw error;
      msg.textContent = 'Subscrição concluída com sucesso.';
      form.reset();
    } catch (_e) {
      msg.textContent = 'Não foi possível submeter agora. Tente novamente mais tarde.';
    }
  });
}

(async function init() {
  const data = await fetchPublishedContent();
  if (qs('.lead-story')) renderHomepage(data);
  if (qs('[data-article-root]')) renderArticlePage(data);
  if (qs('#archiveGrid')) renderArchivePage(data);
  bindNewsletter();
})();
