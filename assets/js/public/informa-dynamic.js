import { createSupabaseClient } from '../services/supabase-client.js';
import { createContentService } from '../services/content-service.js';

const EMPTY_MESSAGE = 'Ainda não há conteúdos publicados.';
const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
const safe = (value, fallback = '') => (value == null || value === '' ? fallback : value);
const articleUrl = (item) => `jeni-informa-artigo.html?slug=${encodeURIComponent(item.slug)}`;
const HERO_ROTATION_MS = 5000;
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

function normalizeExternalUrl(url) {
  const trimmedUrl = String(url || '').trim();
  if (!/^https?:\/\//i.test(trimmedUrl)) return '';

  try {
    return new URL(trimmedUrl).href;
  } catch (_error) {
    return '';
  }
}

function getHostnameLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch (_error) {
    return url;
  }
}

function isWhatsAppLink(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
    return host === 'wa.me' || host === 'whatsapp.com' || host.endsWith('.whatsapp.com');
  } catch (_error) {
    return false;
  }
}

function sortByPublicationDate(items) {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.published_at || a.created_at || 0).getTime() || 0;
    const dateB = new Date(b.published_at || b.created_at || 0).getTime() || 0;
    return dateB - dateA;
  });
}

function uniqueValidLinks(links) {
  const seen = new Set();

  return links.filter(Boolean).reduce((validLinks, link) => {
    const normalizedUrl = normalizeExternalUrl(link?.url);
    const uniqueKey = normalizedUrl.toLowerCase();
    if (!normalizedUrl || seen.has(uniqueKey)) return validLinks;

    seen.add(uniqueKey);
    const label = String(link.label || '').trim() || getHostnameLabel(normalizedUrl);
    validLinks.push({
      url: normalizedUrl,
      label
    });
    return validLinks;
  }, []);
}


function parseStoredExternalLinks(rawValue) {
  if (Array.isArray(rawValue)) return rawValue;
  if (typeof rawValue !== 'string') return [];

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}


function parseStoredObject(rawValue) {
  if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) return rawValue;
  if (typeof rawValue !== 'string') return {};

  try {
    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function parseStoredGallery(rawValue) {
  const parsed = Array.isArray(rawValue) ? rawValue : (() => {
    if (typeof rawValue !== 'string') return [];
    try {
      const value = JSON.parse(rawValue);
      return Array.isArray(value) ? value : [];
    } catch (_error) {
      return [];
    }
  })();

  const seen = new Set();
  return parsed.map((entry) => {
    const url = typeof entry === 'string' ? entry : entry?.url;
    const normalizedUrl = normalizeExternalUrl(url);
    if (!normalizedUrl) return null;
    return { url: normalizedUrl, alt: String(entry?.alt || '').trim() };
  }).filter(Boolean).filter((entry) => {
    const key = entry.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderDetailRow(label, value) {
  if (!value) return '';
  return `<div class="article-detail-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function renderDetailLink(label, url, buttonLabel) {
  const normalizedUrl = normalizeExternalUrl(url);
  if (!normalizedUrl) return '';
  return `<div class="article-detail-row article-detail-action"><dt>${escapeHtml(label)}</dt><dd><a class="external-link-cta" href="${escapeHtml(normalizedUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(buttonLabel)}</a></dd></div>`;
}

function renderArticleSpecificFields(item) {
  const metadata = item.metadata || {};
  const rowsByType = {
    news: [
      renderDetailRow('Autor da notícia', metadata.news_author),
      renderDetailRow('Créditos das fotos', metadata.photo_credits)
    ],
    event: [
      renderDetailRow('Data', metadata.event_date ? fmt(metadata.event_date) : ''),
      renderDetailRow('Hora', metadata.event_time),
      renderDetailRow('Local', metadata.event_location),
      renderDetailRow('Bilhete', metadata.ticket_info),
      renderDetailRow('Organização/parceiro', metadata.organizer),
      renderDetailLink('Inscrição/bilhete', metadata.registration_url, 'Inscrever / comprar bilhete')
    ],
    call: [
      renderDetailRow('Prazo', metadata.deadline ? fmt(metadata.deadline) : ''),
      renderDetailRow('Entidade promotora', metadata.promoter),
      renderDetailRow('Público-alvo', metadata.target_audience),
      renderDetailRow('Requisitos', metadata.requirements),
      renderDetailRow('Benefícios', metadata.benefits),
      renderDetailLink('Candidatura', metadata.application_url, 'Abrir candidatura'),
      renderDetailLink('Anexo/documento', metadata.attachment_url, 'Abrir documento')
    ],
    scholarship: [
      renderDetailRow('País/local', metadata.country_or_location),
      renderDetailRow('Valor/benefício', metadata.amount_or_benefit),
      renderDetailRow('Duração', metadata.duration),
      renderDetailRow('Prazo', metadata.deadline ? fmt(metadata.deadline) : ''),
      renderDetailRow('Elegibilidade', metadata.eligibility),
      renderDetailRow('Documentos necessários', metadata.required_documents),
      renderDetailLink('Candidatura', metadata.application_url, 'Abrir candidatura')
    ],
    learning: [
      renderDetailRow('Tipo de serviço', metadata.service_type),
      renderDetailRow('Preço', metadata.price_info),
      renderDetailRow('Público-alvo', metadata.target_audience),
      renderDetailRow('Benefícios', metadata.benefits),
      renderDetailLink('Contacto/WhatsApp', metadata.contact_url, isWhatsAppLink(metadata.contact_url) ? 'Contactar no WhatsApp' : 'Contactar')
    ]
  };

  const rows = (rowsByType[item.type] || []).filter(Boolean);
  if (!rows.length) return '';

  return `<section class="article-specific-fields"><h2>Informação essencial</h2><dl>${rows.join('')}</dl></section>`;
}

function renderArticleGallery(gallery = []) {
  if (!gallery.length) return '';

  return `<section class="article-gallery"><h2>Galeria</h2><div class="article-gallery-grid">${gallery.map((entry, index) => `<a href="${escapeHtml(entry.url)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(entry.url)}" loading="lazy" alt="${escapeHtml(entry.alt || `Imagem ${index + 1}`)}"></a>`).join('')}</div></section>`;
}

export function parseExternalLinks(item) {
  const rawLinks = parseStoredExternalLinks(item.external_links);
  const externalLinks = rawLinks.map((entry) => {
    if (typeof entry === 'string') return { url: entry, label: '' };
    if (entry && typeof entry === 'object' && entry.url) return { url: entry.url, label: entry.title || entry.label || '' };
    return null;
  });

  const validExternalLinks = uniqueValidLinks(externalLinks);
  if (validExternalLinks.length > 0) return validExternalLinks;

  return uniqueValidLinks([{
    url: item.external_url,
    label: item.external_label || ''
  }]);
}

function normalizePublishedItem(item, index, catMap, authorMap) {
  const categoryRecord = catMap.get(item.category_id);
  const categoryName = categoryRecord?.name || item.category || getTypeLabel(item.type);
  const categorySlug = categoryRecord?.slug || (categoryName ? slugify(categoryName) : 'conteudo');
  const body = safe(item.body, item.description || '');

  return {
    ...item,
    excerpt: safe(item.excerpt, item.summary || ''),
    body,
    author_name: authorMap.get(item.author_id)?.display_name || authorMap.get(item.author_id)?.full_name || item.author_name || '',
    category: { slug: categorySlug, name: categoryName },
    cover_image: item.image_url || null,
    external_links: parseExternalLinks(item),
    metadata: parseStoredObject(item.metadata),
    gallery: parseStoredGallery(item.gallery),
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

async function fetchPublishedContentItem({ slug, id }) {
  if (!window.supabase || (!slug && !id)) return null;

  try {
    const supabase = createSupabaseClient();
    const content = createContentService(supabase);
    const { data, error } = slug ? await content.getPublishedBySlug(slug) : await content.getPublishedById(id);
    if (error || !data || data.status !== 'published') return null;

    const [catRes, authorRes] = await Promise.all([
      data.category_id ? content.listCategories([data.category_id]) : { data: [] },
      data.author_id ? content.listAuthors([data.author_id]) : { data: [] }
    ]);

    return normalizePublishedItem(
      data,
      0,
      new Map((catRes.data || []).map((category) => [category.id, category])),
      new Map((authorRes.data || []).map((author) => [author.id, author]))
    );
  } catch (error) {
    console.error('PUBLIC CONTENT ITEM LOAD ERROR:', error);
    return null;
  }
}

function renderEmptyCard() {
  return `<article class="premium-card premium-empty"><span>JENI Informa</span><h3>${EMPTY_MESSAGE}</h3></article>`;
}

function buildShareUrl(channel, item) {
  const articleHref = `${window.location.origin}/jeni-informa-artigo.html?slug=${encodeURIComponent(item.slug)}`;
  const encodedUrl = encodeURIComponent(articleHref);
  const encodedTitle = encodeURIComponent(item.title || 'JENI Informa');

  if (channel === 'linkedin') return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  if (channel === 'x') return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
  if (channel === 'email') return `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;
  return articleHref;
}

function bindShareButtons(item) {
  qsa('[data-share]').forEach((button) => {
    const shareUrl = buildShareUrl(button.dataset.share, item);
    button.setAttribute('href', shareUrl);
    if (button.dataset.share !== 'email') {
      button.setAttribute('target', '_blank');
      button.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

function renderHomepage(items) {
  const leadWrap = qs('.informa-premium .lead-story');
  if (!leadWrap) return;

  const publishedItems = sortByPublicationDate(items);

  if (!publishedItems.length) {
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

  const heroItems = publishedItems.filter((item) => item.cover_image);
  if (!heroItems.length) {
    leadWrap.innerHTML = `<article><p class="subtitle">Ainda não há conteúdos publicados com imagem para destacar.</p></article>`;
  } else {
    let activeHeroIndex = 0;
    let rotationTimer;

    const drawHero = () => {
      const lead = heroItems[activeHeroIndex];
      const leadUrl = articleUrl(lead);
      const metaParts = [lead.author_name && `Por ${escapeHtml(lead.author_name)}`, escapeHtml(fmt(lead.published_at)), `${lead.read_minutes} min`].filter(Boolean);
      leadWrap.innerHTML = `<a class="lead-story-image-link" href="${leadUrl}" aria-label="Abrir ${escapeHtml(lead.title)}"><img src="${escapeHtml(lead.cover_image)}" loading="${activeHeroIndex === 0 ? 'eager' : 'lazy'}" alt="${escapeHtml(lead.title)}"></a>
        <article>
          <p class="kicker">${escapeHtml(lead.category.name)}</p>
          <h1><a href="${leadUrl}">${escapeHtml(lead.title)}</a></h1>
          <p class="subtitle">${escapeHtml(lead.excerpt)}</p>
          <p class="meta">${metaParts.join(' · ')}</p>
          <a class="jeni-btn-dark" href="${leadUrl}">Ler artigo</a>
        </article>
        <div class="lead-story-controls" aria-label="Controlos do destaque">
          <button type="button" class="lead-story-arrow" data-hero-action="prev" aria-label="Destaque anterior">‹</button>
          <button type="button" class="lead-story-arrow" data-hero-action="next" aria-label="Próximo destaque">›</button>
        </div>
        <div class="lead-story-indicators" aria-label="Indicadores do destaque">${heroItems.map((_, index) => `<button type="button" class="lead-story-dot${index === activeHeroIndex ? ' active' : ''}" data-hero-index="${index}" aria-label="Abrir destaque ${index + 1}" aria-current="${index === activeHeroIndex ? 'true' : 'false'}"></button>`).join('')}</div>`;
    };

    const rotateHero = (nextIndex) => {
      activeHeroIndex = (nextIndex + heroItems.length) % heroItems.length;
      drawHero();
    };

    const startRotation = () => {
      window.clearInterval(rotationTimer);
      if (heroItems.length > 1) {
        rotationTimer = window.setInterval(() => rotateHero(activeHeroIndex + 1), HERO_ROTATION_MS);
      }
    };

    leadWrap.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : event.target.parentElement;
      const action = target?.closest('[data-hero-action]');
      const dot = target?.closest('[data-hero-index]');
      if (!action && !dot) return;
      event.preventDefault();
      event.stopPropagation();
      rotateHero(dot ? Number(dot.dataset.heroIndex) : activeHeroIndex + (action.dataset.heroAction === 'next' ? 1 : -1));
      startRotation();
    });

    drawHero();
    startRotation();
  }

  const editorialGrid = qs('.editorial-grid');
  if (editorialGrid) {
    editorialGrid.innerHTML = publishedItems.slice(0, 8).map((item) => `<a class="premium-card clickable-card" href="${articleUrl(item)}"><span>${escapeHtml(item.category.name)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.excerpt)}</p><strong>Ler artigo</strong></a>`).join('');
  }

  const trending = qs('.trending ol');
  if (trending) trending.innerHTML = publishedItems.slice(0, 4).map((item) => `<li><a href="${articleUrl(item)}">${escapeHtml(item.title)}</a></li>`).join('');

  const highlights = qs('.highlight-list');
  if (highlights) highlights.innerHTML = publishedItems.slice(1, 5).map((item) => `<a class="highlight-card clickable-card" href="${articleUrl(item)}"><strong>${escapeHtml(item.category.name)}</strong><p>${escapeHtml(item.excerpt)}</p></a>`).join('') || `<article><p>${EMPTY_MESSAGE}</p></article>`;

  const categories = [...new Map(publishedItems.map((item) => [item.category.slug, item.category])).values()];
  const categoryStrip = qs('.category-strip');
  if (categoryStrip) categoryStrip.innerHTML = categories.map((category) => `<a href="jeni-informa-arquivo.html?cat=${encodeURIComponent(category.slug)}">${escapeHtml(category.name)}</a>`).join('');
}

function renderSiteHomepageInforma(items) {
  const host = qs('[data-homepage-informa]');
  if (!host) return;

  const dynamicTitle = qs('[data-homepage-informa-title]');
  if (!items.length) {
    if (dynamicTitle) dynamicTitle.textContent = 'JENI Informa';
    host.innerHTML = `<article class="editorial-card"><p>${EMPTY_MESSAGE}</p><a href="jeni-informa.html">Ver JENI Informa</a></article>`;
    return;
  }

  const lead = items.find((item) => item.featured) || items[0];
  if (dynamicTitle) dynamicTitle.innerHTML = `<a href="${articleUrl(lead)}">${escapeHtml(lead.title)}</a>`;
  const cards = items.slice(1, 4).map((item) => `<a class="editorial-card clickable-card" href="${articleUrl(item)}"><span class="category">${escapeHtml(item.category.name)}</span><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.excerpt)}</p><strong>Ler artigo</strong></a>`).join('');
  host.innerHTML = `<a class="lead-story clickable-card" href="${articleUrl(lead)}"><span class="category">${escapeHtml(lead.category.name)}</span><h3>${escapeHtml(lead.title)}</h3><p>${escapeHtml(lead.excerpt)}</p><strong>Ler artigo</strong></a>${cards}`;
}

async function renderArticlePage(items) {
  const host = qs('[data-article-root]');
  if (!host) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const id = params.get('id');
  let item = items.find((entry) => (slug && entry.slug === slug) || (id && String(entry.id) === id));
  if (!item) item = await fetchPublishedContentItem({ slug, id });

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
  qs('.meta').textContent = [item.author_name && `Por ${item.author_name}`, fmt(item.published_at), `${item.read_minutes} min de leitura`].filter(Boolean).join(' · ');
  qs('.article-body').innerHTML = `<p>${escapeHtml(item.body).replaceAll('\n', '</p><p>')}</p>`;
  const specificFields = qs('.article-specific-host');
  if (specificFields) specificFields.innerHTML = renderArticleSpecificFields(item);
  const galleryHost = qs('.article-gallery-host');
  if (galleryHost) galleryHost.innerHTML = renderArticleGallery(item.gallery);
  bindShareButtons(item);

  const externalLinks = qs('.external-links');
  const externalList = qs('.external-links ul');
  if (externalLinks && externalList) {
    externalLinks.hidden = item.external_links.length === 0;
    externalList.innerHTML = item.external_links.map((link) => {
      const isWhatsApp = isWhatsAppLink(link.url);
      const ctaLabel = isWhatsApp ? 'Entrar no canal WhatsApp' : 'Abrir link externo';
      const icon = isWhatsApp ? '💬' : '↗';
      return `<li><a class="external-link-cta" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer"><span class="external-link-icon" aria-hidden="true">${icon}</span><span><strong>${ctaLabel}</strong><small>${escapeHtml(link.label || getHostnameLabel(link.url))}</small></span></a></li>`;
    }).join('');
  }

  const related = sortByPublicationDate(items).filter((entry) => entry.id !== item.id).slice(0, 3);
  const relatedSection = qs('.related');
  const relatedGrid = qs('.related-grid');
  if (relatedSection && relatedGrid) {
    relatedSection.hidden = related.length === 0;
    relatedGrid.innerHTML = related.map((entry) => `<a class="related-card" href="${articleUrl(entry)}"><span>${escapeHtml(entry.category.name)}</span><strong>${escapeHtml(entry.title)}</strong><small>${fmt(entry.published_at)} · ${entry.read_minutes} min</small></a>`).join('');
  }
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
      return `<a class="archive-card clickable-card" data-cat="${escapeHtml(item.category.slug)}" data-type="${escapeHtml(item.type)}" href="${articleUrl(item)}">${imageHtml}<div class="archive-card-content"><span>${escapeHtml(item.category.name)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.excerpt)}</p><strong>Ler artigo</strong></div></a>`;
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
  await renderArticlePage(data);
  renderArchivePage(data);
  bindNewsletter();
})();
