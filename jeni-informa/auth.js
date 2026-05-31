/* =====================================================
JENI INFORMA — AUTH & CONTENT ITEMS
Supabase client + auth + content forms + admin
===================================================== */

const SUPABASE_URL = "https://qkwusyhkycthottckzww.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrd3VzeWhreWN0aG90dGNrend3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTM2OTIsImV4cCI6MjA4OTA4OTY5Mn0.ycIm_1lZlGNApILY1OReDQmp4Qv4n1Rw7iTAbFq7rdA";

const supabaseClient = window.JeniSupabase?.createSupabaseClient
  ? window.JeniSupabase.createSupabaseClient()
  : window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authService = window.JeniAuthService?.createAuthService
  ? window.JeniAuthService.createAuthService(supabaseClient)
  : null;

/* =====================================================
HELPERS
===================================================== */

function slugify(text) {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function showMessage(targetId, message, type = "info") {
  const el = document.getElementById(targetId);
  if (!el) return;

  el.textContent = message;
  el.className = `auth-message ${type}`;
}

function clearMessage(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;

  el.textContent = "";
  el.className = "auth-message";
}

function getAdminEditorElement() {
  return document.getElementById("admin-editor") || document.getElementById("editor");
}
function showToast(message, type = "info") {
  let stack = document.getElementById("admin-toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "admin-toast-stack";
    stack.className = "admin-toast-stack";
    document.body.appendChild(stack);
  }
  const toast = document.createElement("div");
  toast.className = `admin-toast ${type}`;
  toast.textContent = message;
  stack.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function getFile(id) {
  const el = document.getElementById(id);
  return el && el.files ? el.files[0] : null;
}

function formatDateTime(dateString) {
  if (!dateString) return "Sem data";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleString("pt-PT");
}

function formatDateOnly(dateString) {
  if (!dateString) return "Sem data";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleDateString("pt-PT");
}

function safeText(value, fallback = "—") {
  return value || fallback;
}

function escapeHtml(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTypeLabel(type) {
  if (type === "event") return "Evento";
  if (type === "news") return "Notícia";
  if (type === "call") return "Chamada";
  if (type === "scholarship") return "Bolsa";
  if (type === "learning") return "Aprender";
  return type || "Conteúdo";
}

function getStatusLabel(status) {
  status = normalizeStatus(status);
  if (status === "draft") return "Rascunho";
  if (status === "review") return "Em revisão";
  if (status === "published") return "Publicado";
  if (status === "archived") return "Arquivado";
  return "Rascunho";
}

const EDITORIAL_STATUS = ["draft", "review", "published", "archived"];
function normalizeStatus(status) {
  return EDITORIAL_STATUS.includes(status) ? status : "draft";
}

function normalizeContentItem(item) {
  if (!item) return item;
  return {
    ...item,
    status: normalizeStatus(item.status),
    summary: item.summary || item.excerpt || "",
    description: item.description || item.body || "",
    category: item.category || item.categories?.name || "",
    profiles: item.profiles || item.author || null
  };
}

function splitCsv(value) {
  return (value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildExternalLinks(primaryUrl, label = "Link externo") {
  return primaryUrl ? [{ url: primaryUrl, label }] : [];
}

const CONTENT_ITEM_COLUMNS = new Set([
  "id",
  "author_id",
  "category",
  "type",
  "status",
  "title",
  "slug",
  "excerpt",
  "body",
  "featured",
  "seo_title",
  "seo_description",
  "published_at",
  "created_at",
  "updated_at",
  "description",
  "external_links",
  "external_url",
  "image_url",
  "summary"
]);

function normalizeContentItemPayload(payload = {}) {
  const normalized = {};

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (CONTENT_ITEM_COLUMNS.has(key)) {
      normalized[key] = value;
    }
  });

  if (!normalized.author_id) {
    delete normalized.author_id;
  }

  delete normalized.id;
  delete normalized.created_at;

  return normalized;
}

/* =====================================================
AUTH
===================================================== */

async function getCurrentUser() {
  const {
    data: { user },
  } = await (authService ? { data: { user: await authService.getCurrentUser() } } : supabaseClient.auth.getUser());

  return user;
}

async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    window.location.href = "login.html";
    return null;
  }

  return user;
}

/* =====================================================
SIGNUP
===================================================== */

async function handleSignUp(event) {
  event.preventDefault();

  clearMessage("signup-message");

  const fullName = getValue("full_name");
  const email = getValue("email");
  const phone = getValue("phone");
  const organization = getValue("organization_name");
  const city = getValue("city");

  const password = document.getElementById("password")?.value || "";
  const confirm = document.getElementById("confirm_password")?.value || "";

  if (!email || !password) {
    showMessage("signup-message", "Preencha email e palavra-passe.", "error");
    return;
  }

  if (password !== confirm) {
    showMessage("signup-message", "As palavras-passe não coincidem.", "error");
    return;
  }

  showMessage("signup-message", "A criar conta...", "info");

  const { data, error } = await (authService
    ? authService.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      })
    : supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  }));

  if (error) {
    showMessage("signup-message", error.message, "error");
    return;
  }

  if (data?.user) {
    await supabaseClient
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
        organization_name: organization,
        city
      })
      .eq("id", data.user.id);
  }

  showMessage("signup-message", "Conta criada com sucesso.", "success");

  setTimeout(() => {
    window.location.href = "login.html";
  }, 1500);
}

/* =====================================================
LOGIN
===================================================== */

async function handleLogin(event) {
  event.preventDefault();

  clearMessage("login-message");

  const email = getValue("email");
  const password = document.getElementById("password")?.value || "";

  showMessage("login-message", "A entrar...", "info");

  const { error } = await (authService
    ? authService.signInWithPassword({
        email,
        password
      })
    : supabaseClient.auth.signInWithPassword({
    email,
    password
  }));

  if (error) {
    showMessage("login-message", error.message, "error");
    return;
  }

  const profile = await loadProfile();
  window.location.href = ["admin", "editor"].includes(profile?.role) ? "admin.html" : "dashboard.html";
}

async function handleLogout() {
  await (authService ? authService.signOut() : supabaseClient.auth.signOut());
  window.location.href = "login.html";
}

/* =====================================================
PROFILE
===================================================== */

async function loadProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

async function requireAdmin() {
  const user = await requireAuth();
  if (!user) return null;

  const profile = await loadProfile();

  if (!profile || profile.role !== "admin") {
    window.location.href = "dashboard.html";
    return null;
  }

  return { user, profile };
}
async function requireContentManager() {
  const user = await requireAuth();
  if (!user) return null;
  const profile = await loadProfile();
  if (!profile || !["admin", "editor"].includes(profile.role)) {
    window.location.href = "dashboard.html";
    return null;
  }
  return { user, profile };
}

/* =====================================================
DASHBOARD
===================================================== */

async function initDashboard() {
  const user = await requireAuth();
  if (!user) return;

  const profile = await loadProfile();

  const nameEl = document.getElementById("dashboard-name");
  const emailEl = document.getElementById("dashboard-email");
  const organizationEl = document.getElementById("dashboard-organization");
  const cityEl = document.getElementById("dashboard-city");
  const roleEl = document.getElementById("dashboard-role");
  const logoutBtn = document.getElementById("logout-btn");
  const adminLink = document.getElementById("admin-link");

  if (nameEl) nameEl.textContent = profile?.full_name || "-";
  if (emailEl) emailEl.textContent = user.email || "-";
  if (organizationEl) organizationEl.textContent = profile?.organization_name || "-";
  if (cityEl) cityEl.textContent = profile?.city || "-";
  if (roleEl) roleEl.textContent = profile?.role || "produtor";

  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  if (adminLink && profile?.role === "admin") {
    adminLink.style.display = "inline-flex";
  }

  if (["admin", "editor"].includes(profile?.role)) {
    window.location.href = "admin.html";
  }
}

/* =====================================================
STORAGE
===================================================== */

async function uploadImage(file, folder) {
  if (!file) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  const cleanName = file.name.replace(/\s+/g, "-");
  const fileName = `${user.id}/${folder}/${Date.now()}-${cleanName}`;

  const { error } = await supabaseClient
    .storage
    .from("jeni-informa")
    .upload(fileName, file);

  if (error) throw error;

  const { data } = supabaseClient
    .storage
    .from("jeni-informa")
    .getPublicUrl(fileName);

  return data.publicUrl;
}
/* =====================================================
CONTENT FORMS
===================================================== */

/* =====================================================
EVENT CONTENT
===================================================== */

async function submitEventForm(status = "review") {
  clearMessage("event-message");

  const user = await requireAuth();
  if (!user) return;

  const title = getValue("title");

  const description = getValue("description");
  const payload = {
    author_id: user.id,
    type: "event",
    status: normalizeStatus(status || "review"),
    title,
    slug: `${slugify(title)}-${Date.now()}`,
    excerpt: getValue("category") || null,
    summary: getValue("category") || null,
    body: description || null,
    description: description || null,
    image_url: null,
    external_url: null,
    external_links: [],
    published_at: null,
    category: getValue("category") || null
  };

  const image = getFile("image");

  try {
    payload.image_url = image ? await uploadImage(image, "events") : null;

    const { error } = await supabaseClient
      .from("content_items")
      .insert([payload]);

    if (error) {
      showMessage("event-message", error.message, "error");
      return;
    }

    showMessage(
      "event-message",
      status === "draft" ? "Rascunho guardado." : "Evento guardado em revisão.",
      "success"
    );
  } catch (err) {
    console.error("EVENT CATCH ERROR:", err);
    showMessage("event-message", err.message || "Erro ao guardar evento.", "error");
  }
}

function initEventFormPage() {
  const form = document.getElementById("event-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitEventForm("review");
  });
}

/* =====================================================
OPPORTUNITY CONTENT
===================================================== */

async function submitOpportunityForm(status = "review") {
  clearMessage("opportunity-message");

  const user = await requireAuth();
  if (!user) return;

  const title = getValue("title");

  const externalUrl = getValue("external_url") || null;
  const description = getValue("description");
  const summary = getValue("summary") || null;
  const payload = {
    author_id: user.id,
    type: getValue("type") || "call",
    status: normalizeStatus(status || "review"),
    title,
    slug: `${slugify(title)}-${Date.now()}`,
    excerpt: summary,
    summary,
    body: description || null,
    description: description || null,
    image_url: null,
    external_url: externalUrl,
    external_links: buildExternalLinks(externalUrl),
    published_at: null,
    category: getValue("category") || null
  };

  const image = getFile("image");

  try {
    payload.image_url = image ? await uploadImage(image, "opportunities") : null;

    const { error } = await supabaseClient
      .from("content_items")
      .insert([payload]);

    if (error) {
      showMessage("opportunity-message", error.message, "error");
      return;
    }

    showMessage(
      "opportunity-message",
      status === "draft" ? "Rascunho guardado." : "Oportunidade guardada em revisão.",
      "success"
    );
  } catch (err) {
    console.error("OPPORTUNITY CATCH ERROR:", err);
    showMessage("opportunity-message", err.message || "Erro ao guardar oportunidade.", "error");
  }
}

function initOpportunityFormPage() {
  const form = document.getElementById("opportunity-form");
  const draftBtn = document.getElementById("save-draft-btn");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitOpportunityForm("review");
  });

  if (draftBtn) {
    draftBtn.addEventListener("click", async () => {
      await submitOpportunityForm("review");
    });
  }
}
/* =====================================================
MEUS CONTEÚDOS
===================================================== */

async function loadMyContent() {
  const user = await requireAuth();
  if (!user) return;

  const listEl = document.getElementById("my-content-list");
  const messageElId = "my-content-message";

  if (listEl) {
    listEl.innerHTML = `<div class="empty-state">A carregar conteúdos...</div>`;
  }

  const { data, error } = await supabaseClient
    .from("content_items")
    .select("*")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    showMessage(messageElId, error.message || "Erro ao carregar conteúdos.", "error");
    return;
  }

  clearMessage(messageElId);

  if (!listEl) return;

  if (!data || data.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        Ainda não criou nenhum conteúdo.
      </div>
    `;
    return;
  }

  listEl.innerHTML = data.map(item => {
    const principalLabel = "Publicado";
    const principalDate = item.published_at ? formatDateTime(item.published_at) : "Ainda não publicado";

    const previewText = item.description
      ? `${item.description.slice(0, 180)}${item.description.length > 180 ? "..." : ""}`
      : "Sem descrição disponível.";

    return `
      <article class="content-card">
        <div class="content-card-top">
          <div class="content-card-meta">
            <span class="admin-type-pill">${escapeHtml(getTypeLabel(item.type))}</span>
            <span class="admin-status-pill ${escapeHtml(item.status || "")}">
              ${escapeHtml(getStatusLabel(item.status))}
            </span>
          </div>
        </div>

        <h3>${escapeHtml(item.title || "Sem título")}</h3>
        <p>${escapeHtml(previewText)}</p>

        <div class="admin-details">
          <p><strong>Categoria:</strong> ${escapeHtml(safeText(item.category, "Não definida"))}</p>
          <p><strong>${principalLabel}:</strong> ${escapeHtml(principalDate)}</p>
          <p><strong>Criado em:</strong> ${escapeHtml(formatDateTime(item.created_at))}</p>
          <p><strong>Publicado em:</strong> ${escapeHtml(item.published_at ? formatDateTime(item.published_at) : "Ainda não publicado")}</p>
        </div>
      </article>
    `;
  }).join("");
}

/* =====================================================
ADMIN — CONTENT_ITEMS DATA
===================================================== */

async function loadAdminContentItems() {
  const { data, error } = await supabaseClient
    .from("content_items")
    .select("*")
    .order("updated_at", { ascending: false });
  return { data: (data || []).map(normalizeContentItem), error };
}

async function updateContentItemStatus(contentItemId, newStatus) {
  const mapped = normalizeStatus(newStatus);
  const updateData = { status: mapped, updated_at: new Date().toISOString() };
  if (mapped === "published") updateData.published_at = new Date().toISOString();
  return await supabaseClient.from("content_items").update(updateData).eq("id", contentItemId).select().single();
}

async function updateContentItemById(contentItemId, payload) {
  const contentPayload = normalizeContentItemPayload(payload);
  return await supabaseClient.from("content_items").update(contentPayload).eq("id", contentItemId).select().single();
}

async function createContentItemByAdmin(payload) {
  const contentPayload = normalizeContentItemPayload(payload);
  return await supabaseClient.from("content_items").insert([contentPayload]).select().single();
}


async function submitNewsForm(status = "review") {
  clearMessage("news-message");

  const user = await requireAuth();
  if (!user) return;

  const title = getValue("title");

  const description = getValue("description");
  const payload = {
    author_id: user.id,
    type: "news",
    status: normalizeStatus(status || "review"),
    title,
    slug: `${slugify(title)}-${Date.now()}`,
    excerpt: getValue("category") || null,
    summary: getValue("category") || null,
    body: description || null,
    description: description || null,
    image_url: null,
    external_url: null,
    external_links: [],
    published_at: null,
    category: getValue("category") || null
  };
  const image = getFile("image");
  try {
    payload.image_url = image ? await uploadImage(image, "news") : null;

    const { data, error } = await supabaseClient
      .from("content_items")
      .insert([payload])
      .select()
      .single();

    if (error) {
      showMessage("news-message", error.message, "error");
      return;
    }


    showMessage("news-message", "Notícia guardada em revisão.", "success");
  } catch (err) {
    console.error("NEWS CATCH ERROR:", err);
    showMessage("news-message", err.message || "Erro ao guardar notícia.", "error");
  }
}

function initNewsFormPage() {
  const form = document.getElementById("news-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitNewsForm("review");
  });
}

/* =====================================================
ADMIN — HELPERS
===================================================== */

function setAdminStats(data = []) {
  const statTotal = document.getElementById("stat-total");
  const statDraft = document.getElementById("stat-draft");
  const statPublished = document.getElementById("stat-published");
  const statReview = document.getElementById("stat-review");
  const statArchived = document.getElementById("stat-archived");
  const statNewsletter = document.getElementById("stat-newsletter");

  const draftCount = data.filter(item => normalizeStatus(item.status) === "draft").length;
  const publishedCount = data.filter(item => normalizeStatus(item.status) === "published").length;
  const reviewCount = data.filter(item => normalizeStatus(item.status) === "review").length;
  const archivedCount = data.filter(item => item.status === "archived").length;

  if (statTotal) statTotal.textContent = data.length;
  if (statDraft) statDraft.textContent = draftCount;
  if (statPublished) statPublished.textContent = publishedCount;
  if (statReview) statReview.textContent = reviewCount;
  if (statArchived) statArchived.textContent = archivedCount;
  if (statNewsletter) statNewsletter.textContent = "n/d";
}

function sortAdminData(data = []) {
  const statusOrder = { draft: 1, review: 2, published: 3, archived: 4 };

  return [...data].sort((a, b) => {
    const aOrder = statusOrder[a.status] || 99;
    const bOrder = statusOrder[b.status] || 99;

    if (aOrder !== bOrder) return aOrder - bOrder;

    return new Date(b.created_at) - new Date(a.created_at);
  });
}

function applyAdminFilters(data = []) {
  const search = getValue("admin-search").toLowerCase();
  const status = getValue("admin-filter-status");

  let filtered = [...data];

  if (search) {
    filtered = filtered.filter(item =>
      (item.title || "").toLowerCase().includes(search) ||
      (item.summary || "").toLowerCase().includes(search) ||
      (item.description || "").toLowerCase().includes(search)
    );
  }

  if (status) {
    filtered = filtered.filter(item => item.status === status);
  }

  return sortAdminData(filtered);
}

function buildAdminCard(item) {
  const principalDate = item.published_at ? formatDateTime(item.published_at) : "Ainda não publicado";
  const principalLabel = "Publicado";

  const coverImage = item.image_url
    ? `<div class="admin-card-cover">
         <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title || "Imagem")}">
       </div>`
    : "";

  return `
    <article class="admin-card">
      ${coverImage}

      <div class="admin-card-top">
        <div class="admin-card-meta">
          <span class="admin-type-pill">${escapeHtml(getTypeLabel(item.type))}</span>
          <span class="admin-status-pill ${escapeHtml(item.status || "")}">
            ${escapeHtml(getStatusLabel(item.status))}
          </span>
          ${item.featured ? `<span class="admin-type-pill">Destaque</span>` : ""}
        </div>
      </div>

      <h3>${escapeHtml(item.title || "Sem título")}</h3>

      <p>${escapeHtml(item.summary || item.description || "Resumo não informado.")}</p>

      <div class="admin-details">
        <p><strong>Categoria:</strong> ${escapeHtml(safeText(item.category, "Não definida"))}</p>
        <p><strong>Autor:</strong> ${escapeHtml(safeText(item.author_name || item.profiles?.display_name || item.profiles?.full_name || item.profiles?.organization_name, "Não identificado"))}</p>
        ${item.external_url ? `<p><strong>Link externo:</strong> <a href="${escapeHtml(item.external_url)}" target="_blank" rel="noopener noreferrer">Abrir link</a></p>` : ""}
        <p><strong>${principalLabel}:</strong> ${escapeHtml(principalDate)}</p>
        <p><strong>Criado em:</strong> ${escapeHtml(formatDateTime(item.created_at))}</p>
        <p><strong>Publicado em:</strong> ${escapeHtml(item.published_at ? formatDateTime(item.published_at) : "Ainda não publicado")}</p>
      </div>

      <div class="admin-actions">
        <button class="admin-btn" data-id="${item.id}" data-action="draft">Rascunho</button>
        <button class="admin-btn admin-btn-review" data-id="${item.id}" data-action="review">Em revisão</button>
        <button class="admin-btn admin-btn-approve" data-id="${item.id}" data-action="published">Publicar</button>
        <button class="admin-btn admin-btn-archive" data-id="${item.id}" data-action="archived">Arquivar</button>
        <button class="admin-btn admin-btn-edit" data-id="${item.id}" data-action="edit">Editar</button>
      </div>
    </article>
  `;
}
function fillAdminEditor(item) {
  const editor = getAdminEditorElement();
  const editId = document.getElementById("admin-edit-id");
  const editorTitle = document.getElementById("admin-editor-title");

  if (editId) editId.value = item.id || "";
  if (editorTitle) editorTitle.textContent = "Editar conteúdo";

  const typeEl = document.getElementById("admin-content-type");
  const statusEl = document.getElementById("admin-content-status");
  const titleEl = document.getElementById("admin-content-title");
  const categoryEl = document.getElementById("admin-content-category");
  const summaryEl = document.getElementById("admin-content-summary");
  const imageEl = document.getElementById("admin-content-image");
  const externalUrlEl = document.getElementById("admin-content-external-url");
  const featuredEl = document.getElementById("admin-content-featured");

  if (typeEl) typeEl.value = item.type || "news";
  if (statusEl) statusEl.value = normalizeStatus(item.status);
  if (titleEl) titleEl.value = item.title || "";
  if (categoryEl) categoryEl.value = item.category || "";
  if (summaryEl) summaryEl.value = item.summary || item.excerpt || "";
  if (imageEl) imageEl.value = item.image_url || "";
  if (externalUrlEl) externalUrlEl.value = item.external_url || "";
  if (featuredEl) featuredEl.checked = !!item.featured;

  toggleAdminTypeFields();

  if (item.type === "news") {
    const slugEl = document.getElementById("admin-news-slug");
    const descEl = document.getElementById("admin-news-description");

    if (slugEl) slugEl.value = item.slug || "";
    if (descEl) descEl.value = item.description || item.body || item.content || "";
  }

  if (item.type === "event") {
    const categoryEl = document.getElementById("admin-event-category");
    const descEl = document.getElementById("admin-event-description");

    if (categoryEl) categoryEl.value = item.category || "";
    if (descEl) descEl.value = item.description || item.body || "";
  }

  if ((item.type === "call" || item.type === "scholarship")) {
    const categoryEl = document.getElementById("admin-opportunity-category");
    const linkEl = document.getElementById("admin-opportunity-link");
    const descEl = document.getElementById("admin-opportunity-description");

    if (categoryEl) categoryEl.value = item.category || "";
    if (linkEl) linkEl.value = item.external_url || "";
    if (descEl) descEl.value = item.description || item.body || "";
  }

  if (editor) editor.classList.add("active");
  editor?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetAdminEditor() {
  const form = document.getElementById("admin-content-form");
  const editId = document.getElementById("admin-edit-id");
  const editorTitle = document.getElementById("admin-editor-title");

  if (form) form.reset();
  if (editId) editId.value = "";
  if (editorTitle) editorTitle.textContent = "Criar / editar conteúdo";

  toggleAdminTypeFields();
}

/* =====================================================
ADMIN — RENDER
===================================================== */


let adminContentItemsCache = [];

function bindAdminActionButtons() {
  const listEl = document.getElementById("admin-content-list");
  if (!listEl) return;

  listEl.querySelectorAll(".admin-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const contentItemId = button.dataset.id;
      const action = button.dataset.action;

      if (!contentItemId || !action) return;

      if (action === "edit") {
        const item = adminContentItemsCache.find(entry => entry.id === contentItemId);
        if (item) fillAdminEditor(item);
        return;
      }

      showMessage("admin-message", "A actualizar conteúdo...", "info");

      const { error } = await updateContentItemStatus(contentItemId, action);

      if (error) {
        console.error("ADMIN UPDATE ERROR:", error);
        showMessage("admin-message", error.message || "Erro ao actualizar conteúdo.", "error");
        return;
      }

      showMessage("admin-message", "Conteúdo actualizado com sucesso.", "success");

      setTimeout(() => {
        initAdminPage();
      }, 400);
    });
  });
}

function renderAdminList(data = []) {
  const listEl = document.getElementById("admin-content-list");
  if (!listEl) return;

  if (!data || data.length === 0) {
    listEl.innerHTML = `
      <div class="admin-empty-state">
        Nenhum conteúdo encontrado com os filtros aplicados.
      </div>
    `;
    return;
  }

  listEl.innerHTML = data.map(buildAdminCard).join("");
  bindAdminActionButtons();
}







function toggleAdminTypeFields() {
  const type = getValue("admin-content-type");

  const newsBlock = document.getElementById("admin-fields-news");
  const eventBlock = document.getElementById("admin-fields-event");
  const opportunityBlock = document.getElementById("admin-fields-opportunity");
  const learningBlock = document.getElementById("admin-fields-learning");

  if (newsBlock) {
    newsBlock.style.display = type === "news" ? "block" : "none";
  }

  if (eventBlock) {
    eventBlock.style.display = type === "event" ? "block" : "none";
  }

  if (opportunityBlock) {
    opportunityBlock.style.display =
      (type === "call" || type === "scholarship") ? "block" : "none";
  }

  if (learningBlock) {
    learningBlock.style.display = type === "learning" ? "block" : "none";
  }
}

async function uploadAdminImageIfNeeded() {
  const file = getFile("admin-content-image-upload");
  const existingUrl = getValue("admin-content-image");

  if (file) {
    return await uploadImage(file, "admin");
  }

  return existingUrl || null;
}

function getAdminFormDataByType(imageUrl = null) {
  const type = getValue("admin-content-type") || "news";
  const title = getValue("admin-content-title");

  const summary = getValue("admin-content-summary");
  const body = getValue("admin-news-description");
  const status = normalizeStatus(getValue("admin-content-status") || "draft");

  const baseData = {
    type,
    status,
    title,
    category: getValue("admin-content-category") || null,
    excerpt: summary || null,
    body: body || null,
    summary: summary || null,
    description: body || null,
    image_url: imageUrl,
    external_url: getValue("admin-content-external-url") || null,
    external_links: buildExternalLinks(getValue("admin-content-external-url") || null),
    seo_title: getValue("admin-content-seo-title") || null,
    seo_description: getValue("admin-content-seo-description") || null,
    featured: document.getElementById("admin-content-featured")?.checked || false,
    updated_at: new Date().toISOString()
  };

  // NOTÍCIA
  if (type === "news") {
    return {
      ...baseData,
      slug: getValue("admin-news-slug") || `${slugify(title)}-${Date.now()}`
    };
  }

  // APRENDER (usa estrutura de notícia)
  if (type === "learning") {
    return {
      ...baseData,
      slug: `${slugify(title)}-${Date.now()}`
    };
  }

  // EVENTO
  if (type === "event") {
    return {
      ...baseData,
      slug: `${slugify(title)}-${Date.now()}`,
      category: getValue("admin-event-category") || getValue("admin-content-category") || null,
      body: getValue("admin-event-description") || null,
      description: getValue("admin-event-description") || null
    };
  }

  // CHAMADA + BOLSA (usa estrutura de oportunidade)
  if (type === "call" || type === "scholarship") {
    return {
      ...baseData,
      slug: `${slugify(title)}-${Date.now()}`,
      category: getValue("admin-opportunity-category") || getValue("admin-content-category") || null,
      external_url: getValue("admin-opportunity-link") || getValue("admin-content-external-url") || null,
      external_links: buildExternalLinks(getValue("admin-opportunity-link") || getValue("admin-content-external-url") || null),
      body: getValue("admin-opportunity-description") || null,
      description: getValue("admin-opportunity-description")
    };
  }

  return baseData;
}

/* =====================================================
ADMIN — FORM
===================================================== */

async function saveAdminContent() {
  const editId = getValue("admin-edit-id");
  const type = getValue("admin-content-type");
  const title = getValue("admin-content-title");

  if (!title) {
    showMessage("admin-message", "Preencha o título do conteúdo.", "error");
    return;
  }

  showMessage("admin-message", "A guardar conteúdo...", "info");

  try {
    const imageUrl = await uploadAdminImageIfNeeded();
    const payload = getAdminFormDataByType(imageUrl);
    if (normalizeStatus(payload.status) === "published") {
      payload.published_at = new Date().toISOString();
    } else {
      payload.published_at = null;
    }

    if (editId) {
      const { data, error } = await updateContentItemById(editId, payload);

      if (error) {
        showMessage("admin-message", error.message || "Erro ao actualizar conteúdo.", "error");
        return;
      }


      showMessage("admin-message", "Conteúdo actualizado com sucesso.", "success");
    } else {
      const adminAccess = await requireAdmin();
      if (!adminAccess) return;

      const createPayload = { ...payload };
      if (adminAccess.user?.id) {
        createPayload.author_id = adminAccess.user.id;
      }

      if (normalizeStatus(createPayload.status) === "published" && !createPayload.published_at) {
        createPayload.published_at = new Date().toISOString();
      }
      const { data, error } = await createContentItemByAdmin(createPayload);
      

      if (error) {
        showMessage("admin-message", error.message || "Erro ao criar conteúdo.", "error");
        return;
      }


      showMessage("admin-message", "Conteúdo criado com sucesso.", "success");
    }

    resetAdminEditor();

    setTimeout(() => {
      initAdminPage();
    }, 400);
  } catch (err) {
    console.error("ADMIN SAVE ERROR:", err);
    showMessage("admin-message", err.message || "Erro ao guardar conteúdo.", "error");
  }
}

function initAdminEditor() {
  const form = document.getElementById("admin-content-form");
  const filterBtn = document.getElementById("admin-apply-filters");
  const resetBtn = document.getElementById("admin-reset-editor");
  const cancelBtn = document.getElementById("admin-cancel-editor");
  const logoutBtn = document.getElementById("logout-btn");
  const typeSelect = document.getElementById("admin-content-type");

  if (typeSelect && !typeSelect.dataset.bound) {
    typeSelect.dataset.bound = "true";
    typeSelect.addEventListener("change", toggleAdminTypeFields);
  }

  toggleAdminTypeFields();

  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  if (filterBtn) {
    filterBtn.addEventListener("click", () => {
      renderAdminList(applyAdminFilters(adminContentItemsCache));
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      resetAdminEditor();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      const editor = getAdminEditorElement();
      editor?.classList.remove("active");
      resetAdminEditor();
    });
  }

  if (form && !form.dataset.bound) {
    form.dataset.bound = "true";

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await saveAdminContent();
    });
  }
}




async function initHomepageControl() {
  const wrap = document.getElementById("homepage-sections-list");
  if (!wrap || wrap.dataset.bound) return;
  wrap.dataset.bound = "true";

  const editable = ["hero", "ctas", "highlights", "partners", "portfolio"];
  const load = async () => {
    wrap.innerHTML = '<div class="admin-skeleton"></div><div class="admin-skeleton"></div>';
    const { data, error } = await supabaseClient.from("homepage_sections").select("*").order("display_order", { ascending: true });
    if (error) {
      showMessage("homepage-message", error.message, "error");
      return;
    }
    if (!data?.length) {
      wrap.innerHTML = '<div class="admin-empty-state">Sem secções. Crie a primeira secção da homepage.</div>';
      return;
    }
    wrap.innerHTML = data.map((section) => {
      const payload = JSON.stringify(section.payload || {}, null, 2);
      const isEditable = editable.includes(section.section_key);
      return `<article class="home-section-card">
        <div class="home-section-grid">
          <div><strong>${escapeHtml(section.section_key)}</strong><p>Estado: ${escapeHtml(section.status || "draft")}</p></div>
          <div><label>Ordem</label><input data-home-order="${section.id}" type="number" value="${section.display_order || 0}" /></div>
          <div><label>Status</label><select data-home-status="${section.id}"><option value="draft"${section.status === "draft" ? " selected" : ""}>Draft</option><option value="published"${section.status === "published" ? " selected" : ""}>Published</option></select></div>
          <div><label>Ativo</label><select data-home-enabled="${section.id}"><option value="true"${section.is_enabled ? " selected" : ""}>Ativo</option><option value="false"${!section.is_enabled ? " selected" : ""}>Desativado</option></select></div>
        </div>
        ${isEditable ? `<label>Conteúdo JSON</label><textarea data-home-payload="${section.id}" rows="7">${escapeHtml(payload)}</textarea>` : '<div class="preview-box">Secção bloqueada para edição direta nesta fase.</div>'}
        <div class="preview-box"><strong>Preview:</strong> ${escapeHtml(JSON.stringify(section.payload || {})).slice(0, 300)}</div>
        <div class="admin-actions-row"><button type="button" class="jeni-btn jeni-btn-secondary" data-home-save="${section.id}">Guardar</button></div>
      </article>`;
    }).join("");
  };

  wrap.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-home-save]");
    if (!button) return;
    const id = button.getAttribute("data-home-save");
    const payloadEl = wrap.querySelector(`[data-home-payload="${id}"]`);
    const orderEl = wrap.querySelector(`[data-home-order="${id}"]`);
    const enabledEl = wrap.querySelector(`[data-home-enabled="${id}"]`);
    const statusEl = wrap.querySelector(`[data-home-status="${id}"]`);
    let parsedPayload = {};
    if (payloadEl) {
      try { parsedPayload = JSON.parse(payloadEl.value || "{}"); }
      catch { showToast("JSON inválido na secção.", "error"); return; }
    }
    const updatePayload = {
      display_order: Number(orderEl?.value || 0),
      is_enabled: enabledEl?.value === "true",
      status: statusEl?.value || "draft",
      updated_at: new Date().toISOString()
    };
    if (payloadEl) updatePayload.payload = parsedPayload;
    const { error } = await supabaseClient.from("homepage_sections").update(updatePayload).eq("id", id);
    if (error) {
      showMessage("homepage-message", error.message, "error");
      showToast("Erro ao guardar secção.", "error");
      return;
    }
    showMessage("homepage-message", "Secção guardada com sucesso.", "success");
    showToast("Secção atualizada.", "success");
    await load();
  });
  await load();
}

async function initNewsletterManagement() {
  const list = document.getElementById("newsletter-list"); if(!list) return;
  const load = async ()=>{ const q=getValue("newsletter-search"); let req=supabaseClient.from("newsletter_subscribers").select("*").order("created_at",{ascending:false}); if(q) req=req.ilike("email",`%${q}%`); const {data,error}=await req; if(error){showMessage("newsletter-message",error.message,"error"); return;} const rows=data||[]; document.getElementById("newsletter-total").textContent=`Total: ${rows.length}`; list.innerHTML=rows.map(x=>`<article class="admin-card"><h3>${escapeHtml(x.email)}</h3><p>${escapeHtml(formatDateTime(x.created_at))}</p></article>`).join("")||'<div class="admin-empty-state">Sem subscritores.</div>'; const btn=document.getElementById("newsletter-export-btn"); if(btn){ btn.onclick=()=>{ const csv=["email,created_at",...rows.map(r=>`${r.email},${r.created_at}`)].join("\n"); const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download=`newsletter-${Date.now()}.csv`; a.click();}; } };
  document.getElementById("newsletter-search-btn")?.addEventListener("click",load); await load();
}

async function initMediaLibrary() {
  const grid=document.getElementById("media-grid"); if(!grid) return;
  const load=async()=>{
    grid.innerHTML = '<div class="admin-skeleton"></div><div class="admin-skeleton"></div>';
    const {data,error}=await supabaseClient.storage.from("jeni-informa").list("admin",{limit:100,sortBy:{column:"created_at",order:"desc"}});
    if(error){showMessage("media-message",error.message,"error"); return;}
    const rows=(data||[]).filter(f=>f.name);
    if (!rows.length) { grid.innerHTML='<article class="admin-empty-state">Sem ficheiros ainda. Faça upload para iniciar a biblioteca.</article>'; return; }
    grid.innerHTML=rows.map((f)=>{ const path=`admin/${f.name}`; const publicUrl=supabaseClient.storage.from("jeni-informa").getPublicUrl(path).data.publicUrl; return `<article class="media-card"><img src="${escapeHtml(publicUrl)}" alt="${escapeHtml(f.name)}"><p>${escapeHtml(f.name)}</p><p>${escapeHtml(String(f.metadata?.size || 0))} bytes</p><div class="media-actions"><button type="button" class="jeni-btn jeni-btn-outline" data-copy-url="${escapeHtml(publicUrl)}">Copiar URL</button><button type="button" class="jeni-btn jeni-btn-secondary" data-delete-media="${escapeHtml(path)}">Apagar</button></div></article>`; }).join("");
  };
  document.getElementById("media-upload-btn")?.addEventListener("click", async ()=>{ const file=getFile("media-upload"); if(!file){showMessage("media-message","Selecione um ficheiro.","error");return;} showMessage("media-message","A enviar...","info"); const path=`admin/${Date.now()}-${file.name.replace(/\s+/g,'-')}`; const {error}=await supabaseClient.storage.from("jeni-informa").upload(path,file,{upsert:false}); showMessage("media-message",error?error.message:"Upload concluído.",error?"error":"success"); showToast(error ? "Falha no upload." : "Upload concluído.", error ? "error" : "success"); if(!error) load(); });
  grid.addEventListener("click", async (event) => {
    const copyBtn = event.target.closest("[data-copy-url]");
    if (copyBtn) {
      const url = copyBtn.getAttribute("data-copy-url") || "";
      await navigator.clipboard.writeText(url);
      showToast("URL pública copiada.", "success");
      return;
    }
    const delBtn = event.target.closest("[data-delete-media]");
    if (delBtn) {
      const path = delBtn.getAttribute("data-delete-media");
      if (!path || !window.confirm("Confirmar remoção permanente deste ficheiro?")) return;
      const { error } = await supabaseClient.storage.from("jeni-informa").remove([path]);
      if (error) { showMessage("media-message", error.message, "error"); showToast("Erro ao remover ficheiro.", "error"); return; }
      showToast("Ficheiro removido com sucesso.", "success");
      await load();
    }
  });
  await load();
}

/* =====================================================
ADMIN INIT
===================================================== */

async function initAdminPage() {
  const adminAccess = await requireContentManager();
  if (!adminAccess) return;

  initAdminEditor();
  initPremiumEditorEnhancements();
  await initHomepageControl();
  await initNewsletterManagement();
  await initMediaLibrary();

  showMessage("admin-message", "A carregar conteúdos...", "info");

  const { data, error } = await loadAdminContentItems();

  if (error) {
    console.error("ADMIN LOAD ERROR:", error);
    showMessage("admin-message", error.message || "Erro ao carregar conteúdos.", "error");
    return;
  }

  clearMessage("admin-message");

  adminContentItemsCache = sortAdminData(data || []);
  setAdminStats(adminContentItemsCache);
  renderAdminList(adminContentItemsCache);
}

/* =====================================================
AUTO INIT BY PAGE
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signup-form");
  const loginForm = document.getElementById("login-form");
  const eventForm = document.getElementById("event-form");
  const opportunityForm = document.getElementById("opportunity-form");
  const dashboardName = document.getElementById("dashboard-name");
  const adminList = document.getElementById("admin-content-list");
  const myContentList = document.getElementById("my-content-list");
   const newsForm = document.getElementById("news-form");

  if (signupForm) {
    signupForm.addEventListener("submit", handleSignUp);
  }

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  if (eventForm) {
    initEventFormPage();
  }

  if (opportunityForm) {
    initOpportunityFormPage();
  }

  if (dashboardName) {
    initDashboard();
  }

  if (adminList) {
    initAdminPage();
  }

  if (myContentList) {
    loadMyContent();
  }
  
 if (newsForm) {
  initNewsFormPage();
}
});


function initPremiumEditorEnhancements() {
  const titleEl = document.getElementById("admin-content-title");
  const slugEl = document.getElementById("admin-news-slug");
  const bodyEl = document.getElementById("admin-news-description");
  const readingEl = document.getElementById("admin-reading-time");
  const previewBtn = document.getElementById("admin-preview-btn");
  const previewBox = document.getElementById("admin-preview");
  const form = document.getElementById("admin-content-form");
  if (!form) return;

  const syncDerived = () => {
    if (titleEl && slugEl && !slugEl.dataset.manual) slugEl.value = slugify(titleEl.value || "");
    const words = (bodyEl?.value || "").trim().split(/\s+/).filter(Boolean).length;
    if (readingEl) readingEl.value = `${Math.max(1, Math.ceil(words / 200))} min`;
  };
  titleEl?.addEventListener("input", syncDerived);
  bodyEl?.addEventListener("input", syncDerived);
  slugEl?.addEventListener("input", () => { if ((slugEl.value || "").trim()) slugEl.dataset.manual = "1"; });
  previewBtn?.addEventListener("click", () => {
    const title = getValue("admin-content-title");
    const summary = getValue("admin-content-summary");
    const body = getValue("admin-news-description");
    const externalUrl = getValue("admin-content-external-url");
    previewBox.style.display = "block";
    previewBox.innerHTML = `<h3>${escapeHtml(title || "Sem título")}</h3><p>${escapeHtml(summary)}</p><hr><p>${escapeHtml(body.slice(0, 1200))}</p>${externalUrl ? `<p><strong>Link externo:</strong> ${escapeHtml(externalUrl)}</p>` : ""}`;
  });

  setInterval(() => {
    const payload = {
      title: getValue("admin-content-title"), category: getValue("admin-content-category"), summary: getValue("admin-content-summary"),
      body: getValue("admin-news-description"), slug: getValue("admin-news-slug"), external_url: getValue("admin-content-external-url"),
      status: normalizeStatus(getValue("admin-content-status") || "draft")
    };
    localStorage.setItem("jeni_admin_autosave", JSON.stringify(payload));
  }, 15000);

  try {
    const saved = JSON.parse(localStorage.getItem("jeni_admin_autosave") || "null");
    if (saved && !document.getElementById("admin-edit-id")?.value) {
      if (titleEl) titleEl.value = saved.title || "";
      document.getElementById("admin-content-category").value = saved.category || "";
      document.getElementById("admin-content-summary").value = saved.summary || "";
      if (bodyEl) bodyEl.value = saved.body || "";
      if (slugEl) slugEl.value = saved.slug || "";
      document.getElementById("admin-content-external-url").value = saved.external_url || "";
      document.getElementById("admin-content-status").value = normalizeStatus(saved.status);
      syncDerived();
    }
  } catch {}
}
