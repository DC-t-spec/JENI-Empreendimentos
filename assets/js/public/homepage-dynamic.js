import { createSupabaseClient } from '../services/supabase-client.js';

const aliases = { categories: 'services', ctas: 'cta', portfolio: 'highlights' };
const text = (value, fallback = '') => typeof value === 'string' && value.trim() ? value.trim() : fallback;
const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const safeUrl = (value, image = false) => {
  const candidate = text(value);
  if (!candidate) return '';
  if (image && /^(?:\.\.\/|\.\/|\/)?[\w./@%+~-]+(?:\?[^\s]*)?$/i.test(candidate)) return candidate;
  try { const url = new URL(candidate, window.location.href); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
};
const el = (tag, className, content) => { const node = document.createElement(tag); if (className) node.className = className; if (content) node.textContent = content; return node; };
const image = (url, alt = '') => { const src = safeUrl(url, true); if (!src) return null; const img = el('img'); img.src = src; img.alt = alt; img.loading = 'lazy'; img.decoding = 'async'; return img; };
const link = (label, url, className = '') => { const href = safeUrl(url); if (!text(label) || !href) return null; const node = el('a', className, label); node.href = href; if (new URL(href, location.href).origin !== location.origin) { node.target = '_blank'; node.rel = 'noopener noreferrer'; } return node; };
const heading = (tag, value, attr) => { const node = el(tag, '', value); if (attr) node.setAttribute(attr, ''); return node; };

function sectionHead(tag, title, subtitle) {
  const head = el('div', `section-head${tag ? ' center' : ''}`);
  if (tag) head.append(el('span', 'section-tag', tag));
  head.append(heading('h2', title || ''));
  if (subtitle) head.append(el('p', '', subtitle));
  return head;
}

function renderHero(root, payload) {
  const background = safeUrl(payload.image, true);
  if (background) root.style.backgroundImage = `linear-gradient(90deg,rgba(9,12,16,.88),rgba(9,12,16,.35)),url("${background.replaceAll('"', '%22')}")`;
  const overlay = el('div', 'hero-overlay');
  const content = el('div', 'container hero-cinematic-content');
  content.append(el('p', 'hero-kicker', payload.subtitle), heading('h1', payload.title), el('p', 'hero-lead', payload.text));
  const actions = el('div', 'hero-actions');
  [link(payload.button_1_label, payload.button_1_url, 'btn btn-gold'), link(payload.button_2_label, payload.button_2_url, 'btn btn-outline')].filter(Boolean).forEach((item) => actions.append(item));
  content.append(actions); root.replaceChildren(overlay, content);
}

function renderPresentation(root, payload) {
  const container = el('div', 'container presentation-cms-grid');
  const copy = el('div'); copy.append(sectionHead('Sobre JENI', payload.title, payload.text));
  container.append(copy); const img = image(payload.image, payload.title); if (img) container.append(img); root.replaceChildren(container);
}

function renderServices(root, payload) {
  const container = el('div', 'container'); container.append(sectionHead('Serviços', payload.title, payload.subtitle));
  const grid = el('div', 'services-grid premium-services-grid');
  (payload.items || []).forEach((item) => { const card = el(item.url ? 'a' : 'article', 'service-card'); if (item.url) card.href = safeUrl(item.url); const iconImage = image(item.icon, ''); if (iconImage) { iconImage.className = 'service-icon-image'; card.append(iconImage); } else if (text(item.icon).startsWith('fa-')) { const icon = el('i', `fa-solid ${text(item.icon)}`); card.append(icon); } card.append(heading('h3', item.title), el('p', '', item.description)); grid.append(card); });
  container.append(grid); root.replaceChildren(container);
}

function renderHighlights(root, payload) {
  const container = el('div', 'container'); container.append(sectionHead('Portfólio', payload.title, payload.subtitle));
  const grid = el('div', 'portfolio-grid institutional-highlights');
  (payload.items || []).forEach((item) => { const card = el(item.url ? 'a' : 'article', 'portfolio-card'); if (item.url) card.href = safeUrl(item.url); const img = image(item.image, item.title); if (img) card.append(img); const copy = el('div'); copy.append(heading('h3', item.title), el('p', '', item.description)); card.append(copy); grid.append(card); });
  container.append(grid); root.replaceChildren(container);
}

function renderPartners(root, payload) {
  const container = el('div', 'container'); container.append(sectionHead('Rede institucional', payload.title, payload.subtitle)); const grid = el('div', 'partners-grid');
  (payload.items || []).forEach((item) => { const card = el(item.url ? 'a' : 'article', 'partner-card'); if (item.url) card.href = safeUrl(item.url); const wrap = el('span', 'partner-logo-wrap'); const logo = image(item.logo, `Logótipo ${item.name}`); if (logo) wrap.append(logo); card.append(wrap, el('strong', '', item.name)); grid.append(card); }); container.append(grid); root.replaceChildren(container);
}

function renderInforma(root, payload) {
  const container = el('div', 'container'); container.append(sectionHead('JENI Informa', payload.title, payload.subtitle));
  const grid = el('div', 'homepage-informa-grid'); grid.setAttribute('data-homepage-informa', ''); grid.dataset.articleCount = String(Math.max(1, Number(payload.article_count) || 4)); grid.setAttribute('aria-busy', 'true'); grid.innerHTML = '<article class="homepage-informa-status"><p>A carregar conteúdos publicados...</p></article>';
  const actions = el('div', 'cta-actions'); const open = link('Abrir JENI Informa', 'jeni-informa.html', 'btn btn-outline'); if (open) actions.append(open); container.append(grid, actions); root.replaceChildren(container);
}

function renderNewsletter(root, payload) {
  const container = el('div', 'container newsletter-home-inner'); const copy = el('div'); copy.append(el('span', 'section-tag', 'Newsletter'), heading('h2', payload.title), el('p', '', payload.text));
  const form = el('form', 'newsletter-home-form'); form.id = 'newsletterForm'; form.innerHTML = '<label class="sr-only" for="newsletterEmail">Email</label><input id="newsletterEmail" type="email" placeholder="O seu email" required><button class="btn btn-gold" type="submit">Subscrever</button><p id="newsletterMessage" aria-live="polite"></p>';
  container.append(copy, form); root.replaceChildren(container);
}

function renderCta(root, payload) {
  const container = el('div', 'container cta-premium'); if (payload.image) { const url = safeUrl(payload.image, true); if (url) container.style.backgroundImage = `linear-gradient(rgba(15,18,23,.9),rgba(15,18,23,.9)),url("${url.replaceAll('"','%22')}")`; } container.append(heading('h2', payload.title), el('p', '', payload.text)); const button = link(payload.button_label, payload.button_url, 'btn btn-gold'); if (button) container.append(button); root.replaceChildren(container);
}

const renderers = { hero: renderHero, presentation: renderPresentation, services: renderServices, highlights: renderHighlights, partners: renderPartners, informa: renderInforma, newsletter: renderNewsletter, cta: renderCta };

async function bindNewsletter() {
  const form = document.getElementById('newsletterForm'); if (!form) return;
  form.addEventListener('submit', async (event) => { event.preventDefault(); const email = form.querySelector('#newsletterEmail').value.trim(); const message = form.querySelector('#newsletterMessage'); message.textContent = 'A submeter...'; try { const { error } = await createSupabaseClient().from('newsletter_subscribers').insert([{ email, source: 'homepage' }]); if (error) throw error; message.textContent = 'Subscrição concluída com sucesso.'; form.reset(); } catch { message.textContent = 'Não foi possível submeter agora. Tente novamente.'; } });
}

async function initHomepage() {
  const main = document.querySelector('[data-homepage-sections]'); if (!main) return;
  try {
    const client = createSupabaseClient(); if (!client) throw new Error('Supabase indisponível');
    const { data, error } = await client.from('homepage_sections').select('section_key,payload,display_order,status,is_enabled').eq('status', 'published').eq('is_enabled', true).order('display_order', { ascending: true });
    if (error) throw error;
    const seen = new Set();
    (data || []).forEach((section) => { const key = aliases[section.section_key] || section.section_key; if (seen.has(key) || !renderers[key]) return; seen.add(key); const root = document.querySelector(`[data-home-section="${key}"]`); if (!root) return; renderers[key](root, object(section.payload)); root.style.order = String(Number(section.display_order) || 0); root.hidden = false; });
  } catch (error) { console.warn('Não foi possível carregar a Homepage Control.', error); }
  finally { main.setAttribute('aria-busy', 'false'); document.dispatchEvent(new CustomEvent('jeni:homepage-ready')); }
}

document.addEventListener('DOMContentLoaded', initHomepage);
