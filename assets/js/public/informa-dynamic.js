import { createSupabaseClient } from '../services/supabase-client.js';
import { createContentService } from '../services/content-service.js';

const FALLBACK_ITEMS = [
  { id: 'f1', slug: 'novo-eixo-criativo-africano', title: 'O novo eixo criativo africano: cultura, negócio e impacto global', excerpt: 'Uma leitura sobre talentos e empresas culturais de Moçambique.', body: 'Conteúdo editorial premium em fallback para preservar experiência.', type: 'Análises', category: { slug: 'economia-criativa', name: 'Economia Criativa' }, author_name: 'Redação JENI', published_at: '2026-05-14T08:00:00Z', cover_image: 'foto9.jpg.jpeg', read_minutes: 8, featured: true },
  { id: 'f2', slug: 'empreendedorismo-cultural-internacional', title: 'Empreendedorismo cultural com visão internacional', excerpt: 'Estratégias para escalar criatividade em mercados globais.', body: 'Análise de mercado e posicionamento.', type: 'Mercado', category: { slug: 'negocios', name: 'Negócios' }, author_name: 'Equipa JENI', published_at: '2026-05-13T08:00:00Z', cover_image: 'foto1.jpg.jpeg', read_minutes: 6 },
  { id: 'f3', slug: 'narrativas-africanas-contemporaneas', title: 'Narrativas africanas contemporâneas em destaque', excerpt: 'Curadoria cultural de impacto internacional.', body: 'Leitura crítica sobre influência cultural.', type: 'Entrevistas', category: { slug: 'cultura', name: 'Cultura' }, author_name: 'Redação JENI', published_at: '2026-05-12T08:00:00Z', cover_image: 'foto2.jpg.jpeg', read_minutes: 5 },
  { id: 'f4', slug: 'agenda-premium-criadores-executivos', title: 'Agenda premium para criadores e executivos', excerpt: 'Eventos e experiências que movem o setor criativo.', body: 'Mapa de eventos com maior impacto.', type: 'Eventos', category: { slug: 'eventos', name: 'Eventos' }, author_name: 'Equipa JENI', published_at: '2026-05-11T08:00:00Z', cover_image: 'foto3.jpg.jpeg', read_minutes: 4 }
];

const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (iso) => new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
const safe = (v, d = '') => (v == null || v === '' ? d : v);

async function fetchPublishedContent() {
  if (!window.supabase) return { data: FALLBACK_ITEMS, fallback: true };
  try {
    const supabase = createSupabaseClient();
    const content = createContentService(supabase);
    const { data, error } = await content.listPublishedContent(40);
    if (error) throw error;
    if (!data?.length) return { data: FALLBACK_ITEMS, fallback: true };

    const categoryIds = [...new Set(data.map((i) => i.category_id).filter(Boolean))];
    const authorIds = [...new Set(data.map((i) => i.author_id).filter(Boolean))];

    const [catRes, authorRes] = await Promise.all([
      categoryIds.length ? content.listCategories(categoryIds) : { data: [] },
      authorIds.length ? content.listAuthors(authorIds) : { data: [] }
    ]);

    const catMap = new Map((catRes.data || []).map((c) => [c.id, c]));
    const authorMap = new Map((authorRes.data || []).map((a) => [a.id, a]));

    return {
      data: data.map((i, idx) => ({
        ...i,
        author_name: authorMap.get(i.author_id)?.display_name || 'Redação JENI',
        category: catMap.get(i.category_id) || { slug: 'editorial', name: 'Editorial' },
        cover_image: `foto${(idx % 9) + 1}.jpg.jpeg`,
        read_minutes: Math.max(3, Math.round((safe(i.body, '').split(/\s+/).length || 420) / 180))
      })),
      fallback: false
    };
  } catch (_e) {
    return { data: FALLBACK_ITEMS, fallback: true };
  }
}

function renderHomepage(items) {
  const lead = items.find((i) => i.featured) || items[0];
  const leadWrap = qs('.lead-story');
  leadWrap.innerHTML = `<img src="${safe(lead.cover_image, 'foto9.jpg.jpeg')}" loading="lazy" alt="${lead.title}"><article>
    <p class="kicker">Lead Story · ${lead.category.name}</p>
    <h1>${lead.title}</h1><p class="subtitle">${safe(lead.excerpt, '')}</p>
    <p class="meta">Por ${lead.author_name} · ${fmt(lead.published_at)} · ${lead.read_minutes} min</p>
    <a class="jeni-btn-dark" href="jeni-informa-artigo.html?slug=${encodeURIComponent(lead.slug)}">Ler artigo</a></article>`;

  qs('.editorial-grid').innerHTML = items.slice(0, 8).map((i) => `<article class="premium-card"><span>${i.category.name}</span><h3><a href="jeni-informa-artigo.html?slug=${encodeURIComponent(i.slug)}">${i.title}</a></h3></article>`).join('');
  qs('.trending ol').innerHTML = items.slice(0, 4).map((i) => `<li><a href="jeni-informa-artigo.html?slug=${encodeURIComponent(i.slug)}">${i.title}</a></li>`).join('');
  qs('.highlight-list').innerHTML = items.slice(1, 5).map((i) => `<article><strong>${i.type}</strong><p>${safe(i.excerpt, 'Atualização editorial premium.')}</p></article>`).join('');

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
  qs('.subtitle').textContent = safe(item.excerpt, 'Leitura editorial premium.');
  qs('.meta').textContent = `Por ${item.author_name} · ${fmt(item.published_at)} · ${item.read_minutes} min de leitura`;
  qs('.article-body').innerHTML = `<p>${safe(item.body, item.excerpt)}</p>`;
  const related = items.filter((i) => i.id !== item.id).slice(0, 3);
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
    grid.innerHTML = filtered.map((i) => `<article class="archive-card" data-cat="${i.category.slug}" data-type="${i.type}"><img src="${i.cover_image}" loading="lazy" alt="${i.title}"><div class="archive-card-content"><h3><a href="jeni-informa-artigo.html?slug=${encodeURIComponent(i.slug)}">${i.title}</a></h3><p>${safe(i.excerpt, 'Atualização editorial.')}</p></div></article>`).join('');
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

function bindNewsletter() {
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
  const { data } = await fetchPublishedContent();
  if (qs('.lead-story')) renderHomepage(data);
  if (qs('[data-article-root]')) renderArticlePage(data);
  if (qs('#archiveGrid')) renderArchivePage(data);
  bindNewsletter();
})();
