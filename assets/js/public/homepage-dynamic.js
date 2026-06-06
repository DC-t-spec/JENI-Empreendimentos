import { createSupabaseClient } from '../services/supabase-client.js';

const SECTION_SELECTOR = '[data-home-section]';
const DEFAULT_PARTNERS_TITLE = 'Parceiros';
const DEFAULT_PARTNERS_SUBTITLE = 'Instituições e marcas que caminham connosco na promoção da cultura, criatividade e desenvolvimento.';

function asObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}

function text(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function safeUrl(value, { image = false } = {}) {
  const candidate = text(value);
  if (!candidate) return '';
  if (image && /^(?:\.\.\/|\.\/|\/)?[\w./@%+~-]+(?:\?[^\s]*)?$/i.test(candidate)) return candidate;
  try {
    const url = new URL(candidate, window.location.href);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
  } catch {}
  return '';
}

function createLink(label, url, className = 'btn btn-outline') {
  const href = safeUrl(url);
  if (!label || !href) return null;
  const link = document.createElement('a');
  link.className = className;
  link.href = href;
  link.textContent = label;
  if (new URL(href, window.location.href).origin !== window.location.origin) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  return link;
}

function setText(root, selector, value) {
  const element = root?.querySelector(selector);
  if (element && text(value)) element.textContent = text(value);
}

function renderHero(payload) {
  const root = document.querySelector('[data-home-section="hero"]');
  if (!root) return;
  setText(root, '[data-home-field="kicker"]', payload.kicker || payload.eyebrow);
  setText(root, '[data-home-field="title"]', payload.title);
  setText(root, '[data-home-field="subtitle"]', payload.subtitle || payload.description);
  const actions = root.querySelector('[data-home-hero-actions]');
  const configured = Array.isArray(payload.actions) ? payload.actions : Array.isArray(payload.buttons) ? payload.buttons : null;
  if (actions && configured?.length) {
    const links = configured.slice(0, 3).map((item, index) => createLink(text(item?.label || item?.text), item?.url || item?.href, index === 0 ? 'btn btn-gold' : 'btn btn-outline')).filter(Boolean);
    if (links.length) actions.replaceChildren(...links);
  }
}

function renderCta(payload) {
  const root = document.querySelector('[data-home-section="ctas"]');
  if (!root) return;
  setText(root, '[data-cta-title]', payload.title);
  setText(root, '[data-cta-subtitle]', payload.subtitle || payload.description);
  const current = root.querySelector('[data-cta-link]');
  const label = text(payload.button_label || payload.label || payload.button?.label);
  const url = safeUrl(payload.button_url || payload.url || payload.button?.url);
  if (current && label) current.textContent = label;
  if (current && url) current.href = url;
}


function renderCollection(sectionKey, payload) {
  const root = document.querySelector(`[data-home-section="${sectionKey}"]`);
  if (!root) return;
  setText(root, '[data-section-title]', payload.title || payload.heading);
  setText(root, '[data-section-subtitle]', payload.subtitle || payload.description);
  const items = Array.isArray(payload.items) ? payload.items.filter((item) => item && typeof item === 'object' && text(item.title || item.name)) : [];
  if (!items.length) return;

  if (sectionKey === 'categories') {
    const host = root.querySelector('[data-home-categories]');
    if (!host) return;
    const cards = items.slice(0, 8).map((item) => {
      const card = document.createElement('article');
      card.className = 'service-card';
      const heading = document.createElement('h3');
      heading.textContent = text(item.title || item.name);
      const description = document.createElement('p');
      description.textContent = text(item.description || item.subtitle);
      card.append(heading, description);
      return card;
    });
    host.replaceChildren(...cards);
  }

  if (sectionKey === 'highlights') {
    const host = root.querySelector('[data-home-highlights]');
    if (!host) return;
    const cards = items.slice(0, 6).map((item, index) => {
      const card = document.createElement('article');
      card.className = 'portfolio-card portfolio-card-text';
      const counter = document.createElement('span');
      counter.className = 'portfolio-index';
      counter.textContent = String(index + 1).padStart(2, '0');
      const content = document.createElement('div');
      const heading = document.createElement('h3');
      heading.textContent = text(item.title || item.name);
      const description = document.createElement('p');
      description.textContent = text(item.description || item.subtitle);
      content.append(heading, description);
      card.append(counter, content);
      return card;
    });
    host.replaceChildren(...cards);
  }
}

function renderNewsletter(payload) {
  const root = document.querySelector('[data-home-section="newsletter"]');
  if (!root) return;
  setText(root, '[data-section-title]', payload.title || payload.heading);
  setText(root, '[data-section-subtitle]', payload.subtitle || payload.description);
}

function renderPartners(payload) {
  const root = document.querySelector('[data-home-section="partners"]');
  const grid = root?.querySelector('[data-partners-grid]');
  if (!root || !grid) return;
  const items = Array.isArray(payload.items) ? payload.items.filter((item) => text(item?.name) && safeUrl(item?.logo, { image: true })) : [];
  if (!items.length) {
    root.hidden = true;
    grid.replaceChildren();
    return;
  }
  setText(root, '[data-partners-title]', payload.title || DEFAULT_PARTNERS_TITLE);
  setText(root, '[data-partners-subtitle]', payload.subtitle || DEFAULT_PARTNERS_SUBTITLE);
  const cards = items.map((item) => {
    const card = document.createElement(item.url && safeUrl(item.url) ? 'a' : 'article');
    card.className = 'partner-card';
    if (card instanceof HTMLAnchorElement) {
      card.href = safeUrl(item.url);
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.setAttribute('aria-label', `${text(item.name)} — abrir site`);
    }
    const logoWrap = document.createElement('span');
    logoWrap.className = 'partner-logo-wrap';
    const logo = document.createElement('img');
    logo.src = safeUrl(item.logo, { image: true });
    logo.alt = `Logotipo ${text(item.name)}`;
    logo.loading = 'lazy';
    logo.decoding = 'async';
    const name = document.createElement('strong');
    name.textContent = text(item.name);
    logoWrap.appendChild(logo);
    card.append(logoWrap, name);
    return card;
  });
  grid.replaceChildren(...cards);
  root.hidden = false;
}

function applySectionOrder(sections) {
  sections.forEach((section) => {
    const root = document.querySelector(`[data-home-section="${CSS.escape(section.section_key)}"]`);
    if (root && Number.isFinite(Number(section.display_order))) root.style.order = String(Number(section.display_order));
  });
}

function renderSection(section) {
  const payload = asObject(section.payload);
  if (section.section_key === 'hero') renderHero(payload);
  if (section.section_key === 'ctas') renderCta(payload);
  if (section.section_key === 'partners') renderPartners(payload);
  if (section.section_key === 'categories' || section.section_key === 'highlights') renderCollection(section.section_key, payload);
  if (section.section_key === 'newsletter') renderNewsletter(payload);
}

export function markDynamicSectionLoading(sectionId, isLoading = true) {
  const element = document.querySelector(`[data-home-section="${sectionId}"]`);
  if (element) element.dataset.loading = isLoading ? 'true' : 'false';
}

export function normalizeHomepageItems(items = []) {
  return items.filter(Boolean).sort((a, b) => (Number(a.display_order ?? a.position) || 999) - (Number(b.display_order ?? b.position) || 999));
}

async function initHomepage() {
  if (!document.querySelector('[data-homepage-sections]')) return;
  try {
    const client = createSupabaseClient();
    if (!client) throw new Error('Cliente Supabase indisponível.');
    const { data, error } = await client
      .from('homepage_sections')
      .select('section_key,payload,display_order,status,is_enabled')
      .eq('status', 'published')
      .eq('is_enabled', true)
      .order('display_order', { ascending: true });
    if (error) throw error;
    const sections = normalizeHomepageItems(data || []);
    applySectionOrder(sections);
    sections.forEach(renderSection);
  } catch (error) {
    console.warn('Homepage Control indisponível; conteúdo institucional de fallback mantido.', error);
  } finally {
    document.querySelectorAll(SECTION_SELECTOR).forEach((section) => section.removeAttribute('data-loading'));
  }
}

document.addEventListener('DOMContentLoaded', initHomepage);
