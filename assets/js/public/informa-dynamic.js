import { createSupabaseClient } from '../services/supabase-client.js';
import { createContentService } from '../services/content-service.js';

const EMPTY_MESSAGE = 'Ainda não há conteúdos publicados.';
const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
const safe = (value, fallback = '') => (value == null || value === '' ? fallback : value);
const fmt = (iso) => {
  if (!iso) return 'Sem data';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
};

function escapeHtml(text = '') {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getTypeLabel(type) {
  const labels = { news: 'Notícia', article: 'Artigo', event: 'Evento', call: 'Oportunidade', scholarship: 'Bolsa', learning: 'Serviço' };
  return labels[type] || type || 'Conteúdo';
}

function parseExternalLinks(item) {
  const links = [];
  const rawLinks = Array.isArray(item.external_links) ? item.external_links : [];

  rawLinks.forEach((entry) => {
    if (typeof entry === 'string') links.push({ url: entry, label: entry });
    if (entry && typeof entry === 'object' && entry.url) links.push({ url: entry.url, label: entry.label || entry.title || entry.url });
  });

  if (item.external_url) links.push({ url: item.external_url, label: item.external_label || 'Link relacionado' });
  if (item.video_url) links.push({ url: item.video_url, label: 'Vídeo relacionado' });

  return links.filter((link) => /^https?:\/\//i.test(link.url));
}

function normalizePublishedItem(item, index, catMap, authorMap) {
  const categoryRecord = catMap.get(item.category_id);
  const categoryName = categoryRecord?.name || item.category || 'Editorial';
  const categorySlug = categoryRecord?.slug || (item.category ? slugify(item.category) : 'editorial');
  const body = safe(item.body, item.description || '');

  return {
    ...item,
    excerpt: safe(item.excerpt, item.summary || ''),
    body,
    author_name: authorMap.get(item.author_id)?.display_name || authorMap.get(item.author_id)?.full_name || item.author_name || 'Redação',
    category: { slug: categorySlug, name: categoryName },
    cover_image: item.image_url || null,
    external_links: parseExternalLinks(item),
    read_minutes: Math.max(1, Math.round((body.split(/\s+/).filter(Boolean).length || 180) / 180)),
    position: index + 1
  };
}

function slugify(text) {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function fetchPublishedContent() {
  if (!window.supabase) return [];

  try {
    const supabase = createSupabaseClient();
    const content = createContentService(supabase);
    const { data, error } = await content.listPublishedContent(40);
    if (error) throw error;

    const publishedOnly = (data || []).filter((item) => item?.status === 'published');
    if (!publishedOnly.length) return [];

    const categoryIds = [...new Set(publishedOnly.map((item) => item.category_id).filter(Boolean))];
    const authorIds = [...new Set(publishedOnly.map((item) => item.author_id).filter(Boolean))];

    const [catRes, authorRes] = await Promise.all([
      categoryIds.length ? content.listCategories(categoryIds) : { data: [] },
      authorIds.length ? content.listAuthors(authorIds) : { data: [] }
    ]);

    const catMap = new Map((catRes.data || []).map((category) => [category.id, category]));
    const authorMap = new Map((authorRes.data || []).map((author) => [author.id, author]));

    return publishedOnly.map((item, index) => normalizePublishedItem(item, index, catMap, authorMap));
  } catch (error) {
    console.error('PUBLIC CONTENT LOAD ERROR:', error);
    return [];
  }
}

function renderEmptyCard() {
  return `<article class="premium-card premium-empty"><span>JENI Informa</span><h3>${EMPTY_MESSAGE}</h3></article>`;
}

function renderHomepage(items) {
  const leadWrap = qs('.informa-premium .lead-story');
  if (!leadWrap) return;

  if (!items.length) {
    leadWrap.innerHTML = `<article><p class="subtitle">${EMPTY_MESSAGE}</p></article>`;
    const editorialGrid = qs('.editorial-grid');
    if (editorialGrid) editorialGrid.innerHTML = renderEmptyCard();
    const trending = qs('.trending ol');
    if (trending) trending.innerHTML = `<li>${EMPTY_MESSAGE}</li>`;
    const highlights = qs('.highlight-list');
    if (highlights) highlights.innerHTML = `<article><p>${EMPTY_MESSAGE}</p></article>`;
    const categories = qs('.category-strip');
    if (categories) categories.innerHTML = '';
    return;
  }

  const lead = items.find((item) => item.featured) || items[0];
  const imageHtml = lead.cover_image ? `<img src="${escapeHtml(lead.cover_image)}" loading="lazy" alt="${escapeHtml(lead.title)}">` : '';
  leadWrap.innerHTML = `${imageHtml}<article>
    <p class="kicker">Lead Story · ${escapeHtml(lead.category.name)}</p>
    <h1>${escapeHtml(lead.title)}</h1><p class="subtitle">${escapeHtml(lead.excerpt)}</p>
    <p class="meta">Por ${escapeHtml(lead.author_name)} · ${escapeHtml(fmt(lead.published_at))} · ${lead.read_minutes} min</p>
    <a class="jeni-btn-dark" href="jeni-informa-artigo.html?slug=${encodeURIComponent(lead.slug)}">Ler artigo</a></article>`;

  const editorialGrid = qs('.editorial-grid');
  if (editorialGrid) {
    editorialGrid.innerHTML = items.slice(0, 8).map((item) => `<article class="premium-card"><span>${escapeHtml(item.category.name)}</span><h3><a href="jeni-informa-artigo.html?slug=${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a></h3></article>`).join('');
  }

  const trending = qs('.trending ol');
  if (trending) trending.innerHTML = items.slice(0, 4).map((item) => `<li><a href="jeni-informa-artigo.html?slug=${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a></li>`).join('');

  const highlights = qs('.highlight-list');
  if (highlights) highlights.innerHTML = items.slice(1, 5).map((item) => `<article><strong>${escapeHtml(getTypeLabel(item.type))}</strong><p>${escapeHtml(item.excerpt)}</p></article>`).join('') || `<article><p>${EMPTY_MESSAGE}</p></article>`;

  const categories = [...new Map(items.map((item) => [item.category.slug, item.category])).values()];
  const categoryStrip = qs('.category-strip');
  if (categoryStrip) categoryStrip.innerHTML = categories.map((category) => `<a href="jeni-informa-arquivo.html?cat=${encodeURIComponent(category.slug)}">${escapeHtml(category.name)}</a>`).join('');
}

function renderSiteHomepageInforma(items) {
  const host = qs('[data-homepage-informa]');
  if (!host) return;

  if (!items.length) {
    host.innerHTML = `<article class="editorial-card"><p>${EMPTY_MESSAGE}</p><a href="jeni-informa.html">Ver JENI Informa</a></article>`;
    return;
  }

  const lead = items.find((item) => item.featured) || items[0];
  const cards = items.slice(1, 4).map((item) => `<article class="editorial-card"><span class="category">${escapeHtml(item.category.name)}</span><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.excerpt)}</p><a href="jeni-informa-artigo.html?slug=${encodeURIComponent(item.slug)}">Ler</a></article>`).join('');
  host.innerHTML = `<article class="lead-story"><span class="category">${escapeHtml(lead.category.name)}</span><h3>${escapeHtml(lead.title)}</h3><p>${escapeHtml(lead.excerpt)}</p><a href="jeni-informa-artigo.html?slug=${encodeURIComponent(lead.slug)}">Ler artigo</a></article>${cards}`;
}

function renderArticlePage(items) {
  const host = qs('[data-article-root]');
  if (!host) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const id = params.get('id');
  const item = items.find((entry) => (slug && entry.slug === slug) || (id && String(entry.id) === id));

  if (!item) {
    host.dataset.state = 'empty';
    qs('[data-article-error]').hidden = false;
    qs('[data-article-content]').hidden = true;
    return;
  }

  document.title = `${safe(item.title)} | JENI Informa`;
  qs('meta[name="description"]')?.setAttribute('content', safe(item.seo_description, item.excerpt || 'Artigo JENI Informa'));
  const canonical = `${window.location.origin}/jeni-informa-artigo.html?slug=${encodeURIComponent(item.slug)}`;
  qs('link[rel="canonical"]')?.setAttribute('href', canonical);
  qs('meta[property="og:title"]')?.setAttribute('content', safe(item.title));
  qs('meta[property="og:description"]')?.setAttribute('content', safe(item.excerpt, 'Artigo JENI Informa'));
  qs('meta[property="og:url"]')?.setAttribute('content', canonical);

  const content = qs('[data-article-content]');
  content.hidden = false;
  qs('[data-article-error]').hidden = true;

  const hero = qs('.article-hero');
  if (hero) {
    hero.hidden = !item.cover_image;
    if (item.cover_image) {
      hero.src = item.cover_image;
      hero.alt = item.title;
    }
  }

  qs('.kicker').textContent = `${getTypeLabel(item.type)} · ${item.category.name}`;
  qs('h1').textContent = item.title;
  qs('.subtitle').textContent = item.excerpt;
  qs('.meta').textContent = `Por ${item.author_name} · ${fmt(item.published_at)} · ${item.read_minutes} min de leitura`;
  qs('.article-body').innerHTML = `<p>${escapeHtml(item.body).replaceAll('\n', '</p><p>')}</p>`;

  const externalLinks = qs('.external-links');
  const externalList = qs('.external-links ul');
  if (externalLinks && externalList) {
    externalLinks.hidden = item.external_links.length === 0;
    externalList.innerHTML = item.external_links.map((link) => `<li><a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a></li>`).join('');
  }

  const related = items.filter((entry) => entry.id !== item.id).slice(0, 3);
  qs('.related').hidden = related.length === 0;
  qs('.related-grid').innerHTML = related.map((entry) => `<a href="jeni-informa-artigo.html?slug=${encodeURIComponent(entry.slug)}">${escapeHtml(entry.title)}</a>`).join('');
  host.dataset.state = 'ready';
}

function renderArchivePage(items) {
  const grid = qs('#archiveGrid');
  if (!grid) return;

  const search = qs('#searchInput');
  const type = qs('#typeSelect');
  const chipsWrap = qs('#chips');
  const empty = qs('#archiveEmpty');

  const types = [...new Set(items.map((item) => item.type).filter(Boolean))];
  if (type) type.innerHTML = '<option value="">Todos os formatos</option>' + types.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(getTypeLabel(value))}</option>`).join('');

  const categories = [...new Map(items.map((item) => [item.category.slug, item.category])).values()];
  if (chipsWrap) chipsWrap.innerHTML = '<button class="archive-filter-chip active" data-filter="all">Todos</button>' + categories.map((category) => `<button class="archive-filter-chip" data-filter="${escapeHtml(category.slug)}">${escapeHtml(category.name)}</button>`).join('');

  const draw = () => {
    const cat = qs('.archive-filter-chip.active')?.dataset.filter || 'all';
    const term = (search?.value || '').toLowerCase();
    const filtered = items.filter((item) => (cat === 'all' || item.category.slug === cat) && (!type?.value || item.type === type.value) && (`${item.title} ${item.excerpt} ${item.author_name}`.toLowerCase().includes(term)));
    grid.innerHTML = filtered.map((item) => {
      const imageHtml = item.cover_image ? `<img src="${escapeHtml(item.cover_image)}" loading="lazy" alt="${escapeHtml(item.title)}">` : '';
      return `<article class="archive-card" data-cat="${escapeHtml(item.category.slug)}" data-type="${escapeHtml(item.type)}">${imageHtml}<div class="archive-card-content"><h3><a href="jeni-informa-artigo.html?slug=${encodeURIComponent(item.slug)}">${escapeHtml(item.title)}</a></h3><p>${escapeHtml(item.excerpt)}</p></div></article>`;
    }).join('');
    empty.hidden = filtered.length > 0;
    if (!filtered.length) qs('#archiveEmpty p').textContent = items.length ? 'Nenhum conteúdo encontrado para os filtros atuais.' : EMPTY_MESSAGE;
  };

  qsa('.archive-filter-chip').forEach((chip) => chip.addEventListener('click', () => {
    qsa('.archive-filter-chip').forEach((entry) => entry.classList.remove('active'));
    chip.classList.add('active');
    draw();
  }));
  search?.addEventListener('input', draw);
  type?.addEventListener('change', draw);
  draw();
}

function bindNewsletter() {
  const form = qs('#newsletterForm');
  if (!form) return;
  const msg = qs('#newsletterMessage');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = qs('#newsletterEmail').value.trim();
    if (!email) return;
    msg.textContent = 'A submeter...';
    if (!window.supabase) {
      msg.textContent = 'Não foi possível submeter agora. Tente novamente mais tarde.';
      return;
    }
    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.from('newsletter_subscribers').insert([{ email, source: 'jeni-informa' }]);
      if (error) throw error;
      msg.textContent = 'Subscrição concluída com sucesso.';
      form.reset();
    } catch (_error) {
      msg.textContent = 'Não foi possível submeter agora. Tente novamente mais tarde.';
    }
  });
}

(async function init() {
  const data = await fetchPublishedContent();
  renderHomepage(data);
  renderSiteHomepageInforma(data);
  renderArticlePage(data);
  renderArchivePage(data);
  bindNewsletter();
})();
