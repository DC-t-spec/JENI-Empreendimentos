(function () {
  'use strict';

  const BUCKET = 'jeni-informa';
  const MEDIA_FOLDER = 'admin';
  const sectionDefinitions = {
    hero: { label: 'Hero', description: 'Mensagem principal no topo da página.', preview: true, fields: [
      ['title', 'Título', 'text'], ['subtitle', 'Subtítulo', 'text'], ['text', 'Texto', 'textarea'], ['image', 'Imagem principal', 'image'],
      ['button_1_label', 'Botão 1', 'text'], ['button_1_url', 'Link botão 1', 'url'], ['button_2_label', 'Botão 2', 'text'], ['button_2_url', 'Link botão 2', 'url']
    ]},
    presentation: { label: 'Apresentação', description: 'Introdução institucional da JENI.', fields: [
      ['title', 'Título', 'text'], ['text', 'Texto', 'textarea'], ['image', 'Imagem opcional', 'image']
    ]},
    services: { label: 'Serviços', description: 'Lista dinâmica de capacidades e serviços.', preview: true, fields: [
      ['title', 'Título', 'text'], ['subtitle', 'Subtítulo', 'textarea']
    ], list: { key: 'items', add: 'Adicionar serviço', itemLabel: 'Serviço', fields: [
      ['icon', 'Ícone ou imagem', 'image'], ['title', 'Título', 'text'], ['description', 'Descrição', 'textarea'], ['url', 'Link opcional', 'url']
    ]}},
    highlights: { label: 'Destaques / Portfólio', description: 'Projectos em destaque na Home.', preview: true, fields: [
      ['title', 'Título', 'text'], ['subtitle', 'Subtítulo', 'textarea']
    ], list: { key: 'items', add: 'Adicionar destaque', itemLabel: 'Destaque', fields: [
      ['image', 'Imagem', 'image'], ['title', 'Título', 'text'], ['description', 'Descrição', 'textarea'], ['url', 'Link opcional', 'url']
    ]}},
    partners: { label: 'Parceiros', description: 'Rede institucional, logótipos e links.', preview: true, fields: [
      ['title', 'Título', 'text'], ['subtitle', 'Subtítulo', 'textarea']
    ], list: { key: 'items', add: 'Adicionar parceiro', itemLabel: 'Parceiro', fields: [
      ['name', 'Nome', 'text'], ['logo', 'Logo', 'image'], ['url', 'Link opcional', 'url']
    ]}},
    cta: { label: 'CTA Final', description: 'Chamada para acção no final da página.', fields: [
      ['title', 'Título', 'text'], ['text', 'Texto', 'textarea'], ['button_label', 'Botão', 'text'], ['button_url', 'Link', 'url'], ['image', 'Imagem opcional', 'image']
    ]},
    informa: { label: 'JENI Informa', description: 'Artigos publicados automaticamente pelo CMS editorial.', fields: [
      ['title', 'Título', 'text'], ['subtitle', 'Subtítulo', 'textarea'], ['article_count', 'Quantidade de artigos', 'number']
    ]},
    newsletter: { label: 'Newsletter', description: 'Formulário público de subscrição.', fields: [
      ['title', 'Título', 'text'], ['text', 'Texto', 'textarea']
    ]}
  };
  const aliases = { categories: 'services', ctas: 'cta', portfolio: 'highlights' };
  const state = { client: null, notify: () => {}, message: () => {}, sections: [], media: [], mediaSort: 'desc', mediaSearch: '', pickerTarget: null };

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const canonicalKey = (key) => aliases[key] || key;
  const payloadOf = (section) => section?.payload && typeof section.payload === 'object' && !Array.isArray(section.payload) ? section.payload : {};
  const publicUrl = (path) => state.client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const formatDate = (value) => value ? new Date(value).toLocaleString('pt-PT') : 'Sem data';
  const safeFileName = (name) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').toLowerCase();

  function fieldMarkup(field, value = '', prefix = 'field') {
    const [key, label, type] = field;
    const id = `${prefix}-${key}`;
    if (type === 'textarea') return `<div class="admin-field full"><label for="${id}">${escapeHtml(label)}</label><textarea id="${id}" data-cms-field="${key}" rows="3">${escapeHtml(value)}</textarea></div>`;
    const input = `<input id="${id}" data-cms-field="${key}" type="${type === 'image' ? 'url' : type}" ${type === 'number' ? 'min="1" max="12"' : ''} value="${escapeHtml(value)}" placeholder="${type === 'image' ? 'Seleccione uma imagem da biblioteca' : ''}" />`;
    return `<div class="admin-field ${type === 'image' ? 'full media-field' : ''}"><label for="${id}">${escapeHtml(label)}</label><div class="${type === 'image' ? 'media-field-control' : ''}">${input}${type === 'image' ? `<button type="button" class="jeni-btn jeni-btn-outline" data-open-media-picker>Escolher da Biblioteca</button>` : ''}</div>${type === 'image' ? `<div class="image-field-preview" data-image-preview>${value ? `<img src="${escapeHtml(value)}" alt="" />` : '<span>Sem imagem seleccionada</span>'}</div>` : ''}</div>`;
  }

  function listItemMarkup(definition, item = {}, index = 0, sectionId = '') {
    return `<article class="cms-list-item" data-cms-list-item>
      <header><strong>${escapeHtml(definition.itemLabel)} <span data-item-number>${index + 1}</span></strong><div><button type="button" class="icon-action" data-move-item="up" aria-label="Mover para cima">↑</button><button type="button" class="icon-action" data-move-item="down" aria-label="Mover para baixo">↓</button><button type="button" class="icon-action danger" data-remove-item aria-label="Remover">×</button></div></header>
      <div class="admin-form-grid">${definition.fields.map((field) => fieldMarkup(field, item[field[0]] || '', `${sectionId}-${index}`)).join('')}</div>
    </article>`;
  }

  function collectPayload(card) {
    const payload = {};
    card.querySelectorAll(':scope > .cms-section-fields [data-cms-field]').forEach((input) => { payload[input.dataset.cmsField] = input.type === 'number' ? Math.max(1, Number(input.value) || 1) : input.value.trim(); });
    const list = card.querySelector('[data-cms-list]');
    if (list) {
      payload.items = [...list.querySelectorAll('[data-cms-list-item]')].map((row) => {
        const item = {};
        row.querySelectorAll('[data-cms-field]').forEach((input) => { item[input.dataset.cmsField] = input.value.trim(); });
        return item;
      }).filter((item) => Object.values(item).some(Boolean));
    }
    return payload;
  }

  function previewMarkup(key, payload) {
    const image = payload.image ? `style="background-image:linear-gradient(90deg,rgba(10,14,20,.88),rgba(10,14,20,.35)),url('${escapeHtml(payload.image)}')"` : '';
    if (key === 'hero') return `<div class="cms-preview-hero" ${image}><small>Preview Hero</small><h3>${escapeHtml(payload.title || 'Título do Hero')}</h3><p>${escapeHtml(payload.subtitle || payload.text || 'Subtítulo e texto da secção')}</p><div>${payload.button_1_label ? `<span>${escapeHtml(payload.button_1_label)}</span>` : ''}${payload.button_2_label ? `<span>${escapeHtml(payload.button_2_label)}</span>` : ''}</div></div>`;
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (key === 'partners') return `<div class="cms-preview-section"><small>Preview Parceiros</small><h3>${escapeHtml(payload.title || 'Parceiros')}</h3><div class="cms-preview-logos">${items.map((item) => `<span>${item.logo ? `<img src="${escapeHtml(item.logo)}" alt="" />` : ''}<b>${escapeHtml(item.name || 'Parceiro')}</b></span>`).join('') || '<em>Adicione parceiros</em>'}</div></div>`;
    return `<div class="cms-preview-section"><small>Preview ${key === 'services' ? 'Serviços' : 'Portfólio'}</small><h3>${escapeHtml(payload.title || 'Título da secção')}</h3><p>${escapeHtml(payload.subtitle || '')}</p><div class="cms-preview-cards">${items.slice(0, 6).map((item) => `<span>${(item.image || item.icon) ? `<img src="${escapeHtml(item.image || item.icon)}" alt="" />` : ''}<b>${escapeHtml(item.title || 'Item')}</b><small>${escapeHtml(item.description || '')}</small></span>`).join('') || '<em>Adicione itens à lista</em>'}</div></div>`;
  }

  function renderCard(section) {
    const key = canonicalKey(section.section_key);
    const definition = sectionDefinitions[key];
    if (!definition) return '';
    const payload = payloadOf(section);
    const live = section.status === 'published' && section.is_enabled;
    return `<article class="home-section-card cms-section-card" data-home-card="${section.id}" data-section-key="${key}">
      <header class="home-section-card-header"><div><span class="home-section-key">${escapeHtml(key)}</span><h4>${escapeHtml(definition.label)}</h4><p>${escapeHtml(definition.description)}</p></div><span class="home-status-badge ${live ? 'live' : 'draft'}">${live ? 'Visível na Home' : 'Não publicado'}</span></header>
      <div class="home-section-grid"><div class="admin-field"><label>Ordem</label><input data-home-order type="number" min="0" value="${Number(section.display_order) || 0}" /></div><div class="admin-field"><label>Estado</label><select data-home-status><option value="draft"${section.status !== 'published' ? ' selected' : ''}>Draft — não público</option><option value="published"${section.status === 'published' ? ' selected' : ''}>Published — público</option></select></div><div class="admin-field"><label>Disponibilidade</label><select data-home-enabled><option value="true"${section.is_enabled ? ' selected' : ''}>Activo</option><option value="false"${!section.is_enabled ? ' selected' : ''}>Inactivo</option></select></div></div>
      <div class="admin-form-grid cms-section-fields">${definition.fields.map((field) => fieldMarkup(field, payload[field[0]] || '', `${section.id}-main`)).join('')}</div>
      ${definition.list ? `<section class="cms-list-editor"><div class="cms-list-heading"><div><h5>Lista dinâmica</h5><p>Adicione, remova e reordene itens sem editar JSON.</p></div><button type="button" class="jeni-btn jeni-btn-secondary" data-add-item>${definition.list.add}</button></div><div data-cms-list>${(payload.items || []).map((item, index) => listItemMarkup(definition.list, item, index, section.id)).join('')}</div></section>` : ''}
      ${definition.preview ? `<div class="cms-live-preview" data-live-preview>${previewMarkup(key, payload)}</div>` : ''}
      <footer class="cms-card-actions"><button type="button" class="jeni-btn jeni-btn-primary" data-save-section>Guardar secção</button><span>O JSON é gerado automaticamente ao guardar.</span></footer>
    </article>`;
  }

  function updateCard(card) {
    card.querySelectorAll('[data-image-preview]').forEach((preview) => {
      const value = preview.closest('.admin-field')?.querySelector('[data-cms-field]')?.value.trim();
      preview.innerHTML = value ? `<img src="${escapeHtml(value)}" alt="" />` : '<span>Sem imagem seleccionada</span>';
    });
    card.querySelectorAll('[data-item-number]').forEach((number, index) => { number.textContent = index + 1; });
    const preview = card.querySelector('[data-live-preview]');
    if (preview) preview.innerHTML = previewMarkup(card.dataset.sectionKey, collectPayload(card));
  }

  async function loadSections() {
    const wrap = document.getElementById('homepage-sections-list');
    wrap.innerHTML = '<div class="admin-skeleton"></div><div class="admin-skeleton"></div>';
    const { data, error } = await state.client.from('homepage_sections').select('*').order('display_order', { ascending: true });
    if (error) { wrap.innerHTML = '<div class="admin-empty-state">Não foi possível carregar as secções.</div>'; state.message('homepage-message', error.message, 'error'); return; }
    const seen = new Set();
    state.sections = (data || []).filter((section) => { const key = canonicalKey(section.section_key); if (!sectionDefinitions[key] || seen.has(key)) return false; seen.add(key); return true; });
    wrap.innerHTML = state.sections.map(renderCard).join('') || '<div class="admin-empty-state">Execute a migração mais recente para criar as secções da Home.</div>';
  }

  function bindHomepage() {
    const wrap = document.getElementById('homepage-sections-list');
    wrap.addEventListener('input', (event) => { const card = event.target.closest('[data-home-card]'); if (card) updateCard(card); });
    wrap.addEventListener('click', async (event) => {
      const card = event.target.closest('[data-home-card]');
      if (!card) return;
      if (event.target.closest('[data-open-media-picker]')) { state.pickerTarget = event.target.closest('.admin-field').querySelector('[data-cms-field]'); openPicker(); return; }
      const definition = sectionDefinitions[card.dataset.sectionKey];
      if (event.target.closest('[data-add-item]')) { const list = card.querySelector('[data-cms-list]'); list.insertAdjacentHTML('beforeend', listItemMarkup(definition.list, {}, list.children.length, card.dataset.homeCard)); updateCard(card); return; }
      const remove = event.target.closest('[data-remove-item]'); if (remove) { remove.closest('[data-cms-list-item]').remove(); updateCard(card); return; }
      const move = event.target.closest('[data-move-item]'); if (move) { const row = move.closest('[data-cms-list-item]'); const sibling = move.dataset.moveItem === 'up' ? row.previousElementSibling : row.nextElementSibling; if (sibling) sibling[move.dataset.moveItem === 'up' ? 'before' : 'after'](row); updateCard(card); return; }
      const save = event.target.closest('[data-save-section]'); if (!save) return;
      const payload = collectPayload(card);
      const requiredItemFields = { services: ['title'], highlights: ['title', 'image'], partners: ['name', 'logo'] }[card.dataset.sectionKey];
      if (requiredItemFields && payload.items?.some((item) => requiredItemFields.some((key) => !item[key]))) { state.notify('Preencha os campos obrigatórios de todos os itens.', 'error'); return; }
      save.disabled = true; save.textContent = 'A guardar...';
      const update = { payload, display_order: Number(card.querySelector('[data-home-order]').value) || 0, status: card.querySelector('[data-home-status]').value, is_enabled: card.querySelector('[data-home-enabled]').value === 'true', updated_at: new Date().toISOString() };
      const { error } = await state.client.from('homepage_sections').update(update).eq('id', card.dataset.homeCard);
      save.disabled = false; save.textContent = 'Guardar secção';
      if (error) { state.message('homepage-message', error.message, 'error'); state.notify('Erro ao guardar a secção.', 'error'); return; }
      state.message('homepage-message', 'Secção guardada. O JSON foi actualizado automaticamente.', 'success'); state.notify(update.status === 'published' && update.is_enabled ? 'Secção publicada na Home.' : 'Secção guardada sem publicação.', 'success');
      await loadSections();
    });
  }

  function mediaCard(asset, picker = false) {
    return `<article class="media-card" data-media-name="${escapeHtml(asset.name.toLowerCase())}"><button type="button" class="media-preview-button" data-preview-media="${escapeHtml(asset.url)}"><img src="${escapeHtml(asset.url)}" alt="${escapeHtml(asset.name)}" loading="lazy"></button><div class="media-card-body"><strong title="${escapeHtml(asset.name)}">${escapeHtml(asset.name)}</strong><small>${escapeHtml(formatDate(asset.created_at))}</small><small>${Math.round((asset.size || 0) / 1024)} KB</small></div><div class="media-actions">${picker ? `<button type="button" class="jeni-btn jeni-btn-primary" data-select-media="${escapeHtml(asset.url)}">Seleccionar</button>` : `<button type="button" class="jeni-btn jeni-btn-outline" data-copy-url="${escapeHtml(asset.url)}">Copiar URL</button><button type="button" class="jeni-btn jeni-btn-secondary" data-delete-media="${escapeHtml(asset.path)}">Eliminar</button>`}</div></article>`;
  }

  async function loadMedia() {
    const grid = document.getElementById('media-grid');
    if (grid) grid.innerHTML = '<div class="admin-skeleton"></div><div class="admin-skeleton"></div>';
    const { data, error } = await state.client.storage.from(BUCKET).list(MEDIA_FOLDER, { limit: 500, sortBy: { column: 'created_at', order: state.mediaSort } });
    if (error) { state.message('media-message', error.message, 'error'); if (grid) grid.innerHTML = '<div class="admin-empty-state">Não foi possível carregar a biblioteca.</div>'; return; }
    state.media = (data || []).filter((file) => file.name && file.id).map((file) => ({ name: file.name, path: `${MEDIA_FOLDER}/${file.name}`, url: publicUrl(`${MEDIA_FOLDER}/${file.name}`), created_at: file.created_at || file.updated_at, size: file.metadata?.size || 0 }));
    renderMedia();
  }

  function filteredMedia() { return state.media.filter((asset) => asset.name.toLowerCase().includes(state.mediaSearch.toLowerCase())); }
  function renderMedia() {
    const rows = filteredMedia();
    const grid = document.getElementById('media-grid');
    if (grid) grid.innerHTML = rows.map((asset) => mediaCard(asset)).join('') || '<div class="admin-empty-state">Nenhuma imagem encontrada.</div>';
    const pickerGrid = document.querySelector('[data-media-picker-grid]');
    if (pickerGrid) pickerGrid.innerHTML = rows.map((asset) => mediaCard(asset, true)).join('') || '<div class="admin-empty-state">Nenhuma imagem encontrada.</div>';
    const total = document.getElementById('media-total'); if (total) total.textContent = `${rows.length} imagem${rows.length === 1 ? '' : 'ns'}`;
  }

  async function uploadMedia() {
    const input = document.getElementById('media-upload');
    const files = [...(input?.files || [])];
    if (!files.length) { state.notify('Seleccione pelo menos uma imagem.', 'error'); return; }
    state.message('media-message', `A enviar ${files.length} imagem(ns)...`, 'info');
    for (const file of files) {
      if (!file.type.startsWith('image/')) { state.notify(`${file.name} não é uma imagem.`, 'error'); continue; }
      const path = `${MEDIA_FOLDER}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeFileName(file.name)}`;
      const { error } = await state.client.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
      if (error) { state.notify(`Falha no upload de ${file.name}.`, 'error'); state.message('media-message', error.message, 'error'); return; }
    }
    input.value = ''; state.message('media-message', 'Upload concluído. As imagens já estão disponíveis no Homepage Control.', 'success'); state.notify('Upload concluído.', 'success'); await loadMedia();
  }

  function ensureModal() {
    if (document.getElementById('media-picker-modal')) return;
    document.body.insertAdjacentHTML('beforeend', `<div class="media-modal" id="media-picker-modal" hidden><div class="media-modal-backdrop" data-close-media-picker></div><section class="media-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="media-picker-title"><header><div><span class="home-section-key">Media Library</span><h3 id="media-picker-title">Escolher imagem</h3></div><button type="button" class="media-modal-close" data-close-media-picker aria-label="Fechar">×</button></header><div class="admin-field"><label for="media-picker-search">Pesquisar imagem</label><input id="media-picker-search" type="search" placeholder="Nome do ficheiro..." /></div><div class="media-picker-grid" data-media-picker-grid></div></section></div>`);
  }
  function openPicker() { ensureModal(); const modal = document.getElementById('media-picker-modal'); modal.hidden = false; document.body.classList.add('modal-open'); renderMedia(); setTimeout(() => document.getElementById('media-picker-search')?.focus(), 0); }
  function closePicker() { const modal = document.getElementById('media-picker-modal'); if (modal) modal.hidden = true; document.body.classList.remove('modal-open'); state.pickerTarget = null; }

  function bindMedia() {
    ensureModal();
    document.getElementById('media-upload-btn')?.addEventListener('click', uploadMedia);
    document.getElementById('media-search')?.addEventListener('input', (event) => { state.mediaSearch = event.target.value; const pickerSearch = document.getElementById('media-picker-search'); if (pickerSearch) pickerSearch.value = state.mediaSearch; renderMedia(); });
    document.getElementById('media-sort')?.addEventListener('change', async (event) => { state.mediaSort = event.target.value; await loadMedia(); });
    document.getElementById('media-picker-search')?.addEventListener('input', (event) => { state.mediaSearch = event.target.value; renderMedia(); });
    document.addEventListener('click', async (event) => {
      if (event.target.closest('[data-close-media-picker]')) { closePicker(); return; }
      const select = event.target.closest('[data-select-media]'); if (select && state.pickerTarget) { state.pickerTarget.value = select.dataset.selectMedia; state.pickerTarget.dispatchEvent(new Event('input', { bubbles: true })); closePicker(); return; }
      const preview = event.target.closest('[data-preview-media]'); if (preview) { window.open(preview.dataset.previewMedia, '_blank', 'noopener'); return; }
      const copy = event.target.closest('[data-copy-url]'); if (copy) { await navigator.clipboard.writeText(copy.dataset.copyUrl); state.notify('URL pública copiada.', 'success'); return; }
      const remove = event.target.closest('[data-delete-media]'); if (remove) { if (!window.confirm('Eliminar permanentemente esta imagem do Storage?')) return; const { error } = await state.client.storage.from(BUCKET).remove([remove.dataset.deleteMedia]); if (error) { state.notify('Não foi possível eliminar a imagem.', 'error'); return; } state.notify('Imagem eliminada.', 'success'); await loadMedia(); }
    });
  }

  window.JeniHomepageAdmin = {
    async init(options) {
      state.client = options.client; state.notify = options.notify || state.notify; state.message = options.message || state.message;
      bindHomepage(); bindMedia(); await Promise.all([loadSections(), loadMedia()]);
    }
  };
})();
