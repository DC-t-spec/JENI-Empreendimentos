/* =====================================================
JENI INFORMA — AUTH & SUBMISSIONS
Supabase client + auth + forms + admin
===================================================== */

const SUPABASE_URL = "https://qkwusyhkycthottckzww.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrd3VzeWhreWN0aG90dGNrend3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTM2OTIsImV4cCI6MjA4OTA4OTY5Mn0.ycIm_1lZlGNApILY1OReDQmp4Qv4n1Rw7iTAbFq7rdA";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

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
  if (type === "opportunity") return "Oportunidade";
  if (type === "news") return "Notícia";
  return type || "Submissão";
}

function getStatusLabel(status) {
  if (status === "pending") return "Pendente";
  if (status === "approved") return "Aprovado";
  if (status === "rejected") return "Rejeitado";
  if (status === "archived") return "Arquivado";
  if (status === "draft") return "Rascunho";
  return status || "Sem estado";
}

/* =====================================================
AUTH
===================================================== */

async function getCurrentUser() {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

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

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  });

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

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showMessage("login-message", error.message, "error");
    return;
  }

  window.location.href = "dashboard.html";
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
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
async function uploadMultipleImages(files, folder) {
  if (!files || !files.length) return [];

  const user = await getCurrentUser();
  if (!user) return [];

  const uploadedUrls = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const cleanName = file.name.replace(/\s+/g, "-");
    const fileName = `${user.id}/${folder}/${Date.now()}-${i}-${cleanName}`;

    const { error } = await supabaseClient
      .storage
      .from("jeni-informa")
      .upload(fileName, file);

    if (error) throw error;

    const { data } = supabaseClient
      .storage
      .from("jeni-informa")
      .getPublicUrl(fileName);

    uploadedUrls.push(data.publicUrl);
  }

  return uploadedUrls;
}

function getFiles(id) {
  const el = document.getElementById(id);
  return el && el.files ? Array.from(el.files) : [];
}

async function saveSubmissionGallery(submissionId, imageUrls = []) {
  if (!submissionId || !imageUrls.length) return;

  const rows = imageUrls.map((url, index) => ({
    submission_id: submissionId,
    image_url: url,
    position: index + 1
  }));

  const { error } = await supabaseClient
    .from("submission_images")
    .insert(rows);

  if (error) throw error;
}

/* =====================================================
EVENT SUBMISSION
===================================================== */

async function submitEventForm(status = "pending") {
  clearMessage("event-message");

  const user = await requireAuth();
  if (!user) return;

  const title = getValue("title");
  const eventDate = getValue("event_date");

  const payload = {
    user_id: user.id,
    type: "event",
    status: status || "pending",
    title: title,
    slug: `${slugify(title)}-${Date.now()}`,
    category: getValue("category") || null,
    event_date: eventDate || null,
    start_date: eventDate ? `${eventDate}T00:00:00+02:00` : null,
    event_time: getValue("event_time") || null,
    location: getValue("location") || null,
    summary: getValue("summary"),
    description: getValue("description"),
    ticket_price: getValue("ticket_price") || null,
    ticket_info: getValue("ticket_info") || null,
    video_url: getValue("video_url") || null
  };

  const image = getFile("image");

  try {
    if (image) {
      payload.image_url = await uploadImage(image, "events");
    } else {
      payload.image_url = null;
    }

    const { data, error } = await supabaseClient
      .from("submissions")
      .insert([payload])
      .select();

    console.log("EVENT PAYLOAD:", payload);
    console.log("EVENT RESULT:", data);
    console.error("EVENT ERROR:", error);

    if (error) {
      showMessage("event-message", error.message, "error");
      return;
    }

    showMessage(
      "event-message",
      status === "draft" ? "Rascunho guardado." : "Evento enviado para aprovação.",
      "success"
    );
  } catch (err) {
    console.error("EVENT CATCH ERROR:", err);
    showMessage("event-message", err.message || "Erro ao submeter evento.", "error");
  }
}

function initEventFormPage() {
  const form = document.getElementById("event-form");
  const draftBtn = document.getElementById("save-draft-btn");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitEventForm("pending");
  });

  if (draftBtn) {
    draftBtn.addEventListener("click", async () => {
      await submitEventForm("draft");
    });
  }
}

/* =====================================================
OPPORTUNITY SUBMISSION
===================================================== */

async function submitOpportunityForm(status = "pending") {
  clearMessage("opportunity-message");

  const user = await requireAuth();
  if (!user) return;

  const title = getValue("title");

  const payload = {
    user_id: user.id,
    type: "opportunity",
    status: status || "pending",
    title: title,
    slug: `${slugify(title)}-${Date.now()}`,
    category: getValue("category") || null,
    summary: getValue("summary"),
    description: getValue("description"),
    deadline: getValue("deadline") || null,
    location: getValue("location") || null,
    external_url: getValue("external_url") || null
  };

  const image = getFile("image");

  try {
    if (image) {
      payload.image_url = await uploadImage(image, "opportunities");
    } else {
      payload.image_url = null;
    }

    const { data, error } = await supabaseClient
      .from("submissions")
      .insert([payload])
      .select();

    console.log("OPPORTUNITY PAYLOAD:", payload);
    console.log("OPPORTUNITY RESULT:", data);
    console.error("OPPORTUNITY ERROR:", error);

    if (error) {
      showMessage("opportunity-message", error.message, "error");
      return;
    }

    showMessage(
      "opportunity-message",
      status === "draft" ? "Rascunho guardado." : "Oportunidade enviada para aprovação.",
      "success"
    );
  } catch (err) {
    console.error("OPPORTUNITY CATCH ERROR:", err);
    showMessage("opportunity-message", err.message || "Erro ao submeter oportunidade.", "error");
  }
}

function initOpportunityFormPage() {
  const form = document.getElementById("opportunity-form");
  const draftBtn = document.getElementById("save-draft-btn");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await submitOpportunityForm("pending");
  });

  if (draftBtn) {
    draftBtn.addEventListener("click", async () => {
      await submitOpportunityForm("draft");
    });
  }
}
/* =====================================================
MINHAS SUBMISSÕES
===================================================== */

async function loadMySubmissions() {
  const user = await requireAuth();
  if (!user) return;

  const listEl = document.getElementById("my-submissions-list");
  const messageElId = "my-submissions-message";

  if (listEl) {
    listEl.innerHTML = `<div class="empty-state">A carregar submissões...</div>`;
  }

  const { data, error } = await supabaseClient
    .from("submissions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    showMessage(messageElId, error.message || "Erro ao carregar submissões.", "error");
    return;
  }

  clearMessage(messageElId);

  if (!listEl) return;

  if (!data || data.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        Ainda não submeteu nenhum conteúdo.
      </div>
    `;
    return;
  }

  listEl.innerHTML = data.map(item => {
    const principalDate =
      item.type === "event"
        ? formatDateTime(item.start_date || item.event_date)
        : item.type === "opportunity"
          ? safeText(item.deadline, "Sem prazo")
          : "—";

    const principalLabel =
      item.type === "event"
        ? "Data principal"
        : item.type === "opportunity"
          ? "Prazo"
          : "Referência";

    return `
      <article class="submission-card">
        <div class="submission-card-top">
          <div class="submission-card-meta">
            <span class="admin-type-pill">${escapeHtml(getTypeLabel(item.type))}</span>
            <span class="admin-status-pill ${escapeHtml(item.status || "")}">
              ${escapeHtml(getStatusLabel(item.status))}
            </span>
          </div>
        </div>

        <h3>${escapeHtml(item.title || "Sem título")}</h3>
        <p>${escapeHtml(item.summary || "Sem resumo disponível.")}</p>

        <div class="admin-details">
          <p><strong>Categoria:</strong> ${escapeHtml(safeText(item.category, "Não definida"))}</p>
          <p><strong>${principalLabel}:</strong> ${escapeHtml(principalDate)}</p>
          <p><strong>Local:</strong> ${escapeHtml(safeText(item.location, "Não definido"))}</p>
          <p><strong>Criado em:</strong> ${escapeHtml(formatDateTime(item.created_at))}</p>
          <p><strong>Publicado em:</strong> ${escapeHtml(item.published_at ? formatDateTime(item.published_at) : "Ainda não publicado")}</p>
        </div>
      </article>
    `;
  }).join("");
}

/* =====================================================
ADMIN — DADOS
===================================================== */

async function loadAdminSubmissions() {
  return await supabaseClient
    .from("submissions")
    .select("*")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });
}

async function updateSubmissionStatus(submissionId, newStatus) {
  const updateData = {
    status: newStatus,
    reviewed_at: new Date().toISOString()
  };

  if (newStatus === "approved") {
    updateData.published_at = new Date().toISOString();
  }

  return await supabaseClient
    .from("submissions")
    .update(updateData)
    .eq("id", submissionId)
    .select()
    .single();
}

async function updateSubmissionById(submissionId, payload) {
  return await supabaseClient
    .from("submissions")
    .update(payload)
    .eq("id", submissionId)
    .select()
    .single();
}

async function createSubmissionByAdmin(payload) {
  return await supabaseClient
    .from("submissions")
    .insert([payload])
    .select()
    .single();
}

/* =====================================================
ADMIN — HELPERS
===================================================== */

function setAdminStats(data = []) {
  const statPending = document.getElementById("stat-pending");
  const statApproved = document.getElementById("stat-approved");
  const statRejected = document.getElementById("stat-rejected");
  const statArchived = document.getElementById("stat-archived");

  const pendingCount = data.filter(item => item.status === "pending").length;
  const approvedCount = data.filter(item => item.status === "approved").length;
  const rejectedCount = data.filter(item => item.status === "rejected").length;
  const archivedCount = data.filter(item => item.status === "archived").length;

  if (statPending) statPending.textContent = pendingCount;
  if (statApproved) statApproved.textContent = approvedCount;
  if (statRejected) statRejected.textContent = rejectedCount;
  if (statArchived) statArchived.textContent = archivedCount;
}

function sortAdminData(data = []) {
  const statusOrder = {
    pending: 1,
    approved: 2,
    rejected: 3,
    archived: 4,
    draft: 5
  };

  return [...data].sort((a, b) => {
    const aOrder = statusOrder[a.status] || 99;
    const bOrder = statusOrder[b.status] || 99;

    if (aOrder !== bOrder) return aOrder - bOrder;

    return new Date(b.created_at) - new Date(a.created_at);
  });
}

function applyAdminFilters(data = []) {
  const search = getValue("admin-search").toLowerCase();
  const type = getValue("admin-filter-type");
  const status = getValue("admin-filter-status");

  let filtered = [...data];

  if (search) {
    filtered = filtered.filter(item =>
      (item.title || "").toLowerCase().includes(search) ||
      (item.summary || "").toLowerCase().includes(search) ||
      (item.description || "").toLowerCase().includes(search) ||
      (item.location || "").toLowerCase().includes(search)
    );
  }

  if (type) {
    filtered = filtered.filter(item => item.type === type);
  }

  if (status) {
    filtered = filtered.filter(item => item.status === status);
  }

  return sortAdminData(filtered);
}

function buildAdminCard(item) {
  const principalDate =
    item.type === "event"
      ? formatDateTime(item.start_date || item.event_date)
      : item.type === "opportunity"
        ? safeText(item.deadline, "Sem prazo")
        : "—";

  const principalLabel =
    item.type === "event"
      ? "Data principal"
      : item.type === "opportunity"
        ? "Prazo"
        : "Referência";

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

      <p>${escapeHtml(item.summary || "Sem resumo disponível.")}</p>

      <div class="admin-details">
        <p><strong>Categoria:</strong> ${escapeHtml(safeText(item.category, "Não definida"))}</p>
        <p><strong>${principalLabel}:</strong> ${escapeHtml(principalDate)}</p>
        <p><strong>Local:</strong> ${escapeHtml(safeText(item.location, "Não definido"))}</p>
        <p><strong>Criado em:</strong> ${escapeHtml(formatDateTime(item.created_at))}</p>
        <p><strong>Publicado em:</strong> ${escapeHtml(item.published_at ? formatDateTime(item.published_at) : "Ainda não publicado")}</p>
      </div>

      <div class="admin-actions">
        <button class="admin-btn admin-btn-approve" data-id="${item.id}" data-action="approved">Aprovar</button>
        <button class="admin-btn admin-btn-reject" data-id="${item.id}" data-action="rejected">Rejeitar</button>
        <button class="admin-btn admin-btn-archive" data-id="${item.id}" data-action="archived">Arquivar</button>
        <button class="admin-btn admin-btn-edit" data-id="${item.id}" data-action="edit">Editar</button>
      </div>

      <div id="admin-gallery-${item.id}" class="admin-gallery-preview"></div>
    </article>
  `;
}
async function renderAdminGalleryPreviews(items = []) {
  for (const item of items) {
    const container = document.getElementById(`admin-gallery-${item.id}`);
    if (!container) continue;

    const gallery = await loadSubmissionGallery(item.id);

    if (!gallery.length) {
      container.innerHTML = "";
      continue;
    }

    container.innerHTML = `
      <div class="admin-gallery-title">Galeria (${gallery.length})</div>
      <div class="admin-gallery-grid">
        ${gallery.map(img => `
          <img src="${escapeHtml(img.image_url)}" alt="Galeria" class="admin-gallery-thumb">
        `).join("")}
      </div>
    `;
  }
}

function fillAdminEditor(item) {
  const editor = document.getElementById("admin-editor");
  const editId = document.getElementById("admin-edit-id");
  const editorTitle = document.getElementById("admin-editor-title");

  if (editId) editId.value = item.id || "";
  if (editorTitle) editorTitle.textContent = "Editar conteúdo";

  const typeEl = document.getElementById("admin-content-type");
  const statusEl = document.getElementById("admin-content-status");
  const titleEl = document.getElementById("admin-content-title");
  const summaryEl = document.getElementById("admin-content-summary");
  const imageEl = document.getElementById("admin-content-image");
  const featuredEl = document.getElementById("admin-content-featured");

  if (typeEl) typeEl.value = item.type || "news";
  if (statusEl) statusEl.value = item.status || "pending";
  if (titleEl) titleEl.value = item.title || "";
  if (summaryEl) summaryEl.value = item.summary || "";
  if (imageEl) imageEl.value = item.image_url || "";
  if (featuredEl) featuredEl.checked = !!item.featured;

  toggleAdminTypeFields();

  if (item.type === "news") {
    const slugEl = document.getElementById("admin-news-slug");
    const descEl = document.getElementById("admin-news-description");

    if (slugEl) slugEl.value = item.slug || "";
    if (descEl) descEl.value = item.description || item.content || "";
  }

  if (item.type === "event") {
    const categoryEl = document.getElementById("admin-event-category");
    const locationEl = document.getElementById("admin-event-location");
    const dateEl = document.getElementById("admin-event-date");
    const timeEl = document.getElementById("admin-event-time");
    const ticketPriceEl = document.getElementById("admin-event-ticket-price");
    const ticketInfoEl = document.getElementById("admin-event-ticket-info");
    const descEl = document.getElementById("admin-event-description");
    const videoEl = document.getElementById("admin-event-video-url");

    if (categoryEl) categoryEl.value = item.category || "";
    if (locationEl) locationEl.value = item.location || "";
    if (dateEl) dateEl.value = item.event_date || (item.start_date ? String(item.start_date).slice(0, 10) : "");
    if (timeEl) timeEl.value = item.event_time || "";
    if (ticketPriceEl) ticketPriceEl.value = item.ticket_price || "";
    if (ticketInfoEl) ticketInfoEl.value = item.ticket_info || "";
    if (descEl) descEl.value = item.description || "";
    if (videoEl) videoEl.value = item.video_url || "";
  }

  if (item.type === "opportunity") {
    const categoryEl = document.getElementById("admin-opportunity-category");
    const locationEl = document.getElementById("admin-opportunity-location");
    const deadlineEl = document.getElementById("admin-opportunity-deadline");
    const linkEl = document.getElementById("admin-opportunity-link");
    const descEl = document.getElementById("admin-opportunity-description");

    if (categoryEl) categoryEl.value = item.category || "";
    if (locationEl) locationEl.value = item.location || "";
    if (deadlineEl) deadlineEl.value = item.deadline ? String(item.deadline).slice(0, 10) : "";
    if (linkEl) linkEl.value = item.external_url || item.external_link || "";
    if (descEl) descEl.value = item.description || "";
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

function getAdminFormData() {
  const title = getValue("admin-content-title");
  const slugValue = getValue("admin-content-slug");

  return {
    type: getValue("admin-content-type") || "news",
    status: getValue("admin-content-status") || "pending",
    title: title,
    slug: slugValue || `${slugify(title)}-${Date.now()}`,
summary: getValue("admin-content-summary") || "Sem resumo",
    description: getValue("admin-content-description"),
    image_url: getValue("admin-content-image") || null,
    external_url: getValue("admin-content-link") || null,
    location: getValue("admin-content-location") || null,
    start_date: getValue("admin-content-start-date") || null,
    end_date: getValue("admin-content-end-date") || null,
    deadline: getValue("admin-content-deadline") || null,
    author_id: getValue("admin-content-author") || null,
    featured: document.getElementById("admin-content-featured")?.checked || false
  };
}
async function loadSubmissionGallery(submissionId) {
  if (!submissionId) return [];

  const { data, error } = await supabaseClient
    .from("submission_images")
    .select("*")
    .eq("submission_id", submissionId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("GALLERY LOAD ERROR:", error);
    return [];
  }

  return data || [];
}
/* =====================================================
ADMIN — RENDER
===================================================== */


let adminSubmissionsCache = [];

function bindAdminActionButtons() {
  const listEl = document.getElementById("admin-submissions-list");
  if (!listEl) return;

  listEl.querySelectorAll(".admin-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const submissionId = button.dataset.id;
      const action = button.dataset.action;

      if (!submissionId || !action) return;

      if (action === "edit") {
        const item = adminSubmissionsCache.find(entry => entry.id === submissionId);
        if (item) fillAdminEditor(item);
        return;
      }

      showMessage("admin-message", "A actualizar submissão...", "info");

      const { error } = await updateSubmissionStatus(submissionId, action);

      if (error) {
        console.error("ADMIN UPDATE ERROR:", error);
        showMessage("admin-message", error.message || "Erro ao actualizar submissão.", "error");
        return;
      }

      showMessage("admin-message", "Submissão actualizada com sucesso.", "success");

      setTimeout(() => {
        initAdminPage();
      }, 400);
    });
  });
}

function renderAdminList(data = []) {
  const listEl = document.getElementById("admin-submissions-list");
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
  renderAdminGalleryPreviews(data);
}







function toggleAdminTypeFields() {
  const type = getValue("admin-content-type");

  const newsBlock = document.getElementById("admin-fields-news");
  const eventBlock = document.getElementById("admin-fields-event");
  const opportunityBlock = document.getElementById("admin-fields-opportunity");

  if (newsBlock) newsBlock.style.display = type === "news" ? "block" : "none";
  if (eventBlock) eventBlock.style.display = type === "event" ? "block" : "none";
  if (opportunityBlock) opportunityBlock.style.display = type === "opportunity" ? "block" : "none";
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

  const baseData = {
    type,
    status: getValue("admin-content-status") || "pending",
    title,
    summary: getValue("admin-content-summary"),
    image_url: imageUrl,
    featured: document.getElementById("admin-content-featured")?.checked || false
  };

  if (type === "news") {
    return {
      ...baseData,
      slug: getValue("admin-news-slug") || `${slugify(title)}-${Date.now()}`,
      description: getValue("admin-news-description")
    };
  }

  if (type === "event") {
    const eventDate = getValue("admin-event-date");

    return {
      ...baseData,
      slug: `${slugify(title)}-${Date.now()}`,
      category: getValue("admin-event-category") || null,
      location: getValue("admin-event-location") || null,
      event_date: eventDate || null,
      start_date: eventDate ? `${eventDate}T00:00:00+02:00` : null,
      event_time: getValue("admin-event-time") || null,
      description: getValue("admin-event-description"),
      ticket_price: getValue("admin-event-ticket-price") || null,
      ticket_info: getValue("admin-event-ticket-info") || null,
      video_url: getValue("admin-event-video-url") || null
    };
  }

  if (type === "opportunity") {
    return {
      ...baseData,
      slug: `${slugify(title)}-${Date.now()}`,
      category: getValue("admin-opportunity-category") || null,
      location: getValue("admin-opportunity-location") || null,
      deadline: getValue("admin-opportunity-deadline") || null,
      external_url: getValue("admin-opportunity-link") || null,
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

  if (type === "event" && !getValue("admin-event-date")) {
    showMessage("admin-message", "Evento precisa de data do evento.", "error");
    return;
  }

  showMessage("admin-message", "A guardar conteúdo...", "info");

  try {
    const imageUrl = await uploadAdminImageIfNeeded();
    const galleryFiles = getFiles("admin-content-gallery-upload");
    const galleryUrls = await uploadMultipleImages(galleryFiles, "gallery");

    const payload = getAdminFormDataByType(imageUrl);

    if (editId) {
      const { data, error } = await updateSubmissionById(editId, payload);

      if (error) {
        showMessage("admin-message", error.message || "Erro ao actualizar conteúdo.", "error");
        return;
      }

      if (galleryUrls.length) {
        await saveSubmissionGallery(editId, galleryUrls);
      }

      showMessage("admin-message", "Conteúdo actualizado com sucesso.", "success");
    } else {
      const adminAccess = await requireAdmin();
      if (!adminAccess) return;

      const createPayload = {
        ...payload,
        user_id: adminAccess.user.id
      };

      if (createPayload.status === "approved") {
        createPayload.published_at = new Date().toISOString();
      }
const { data, error } = await createSubmissionByAdmin(createPayload);
      
      const { data, error } = await createSubmissionByAdmin(createPayload);

      if (error) {
        showMessage("admin-message", error.message || "Erro ao criar conteúdo.", "error");
        return;
      }

      if (galleryUrls.length && data?.id) {
        await saveSubmissionGallery(data.id, galleryUrls);
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
      renderAdminList(applyAdminFilters(adminSubmissionsCache));
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      resetAdminEditor();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      const editor = document.getElementById("admin-editor");
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


/* =====================================================
ADMIN INIT
===================================================== */

async function initAdminPage() {
  const adminAccess = await requireAdmin();
  if (!adminAccess) return;

  initAdminEditor();

  showMessage("admin-message", "A carregar submissões...", "info");

  const { data, error } = await loadAdminSubmissions();

  if (error) {
    console.error("ADMIN LOAD ERROR:", error);
    showMessage("admin-message", error.message || "Erro ao carregar submissões.", "error");
    return;
  }

  clearMessage("admin-message");

  adminSubmissionsCache = sortAdminData(data || []);
  setAdminStats(adminSubmissionsCache);
  renderAdminList(adminSubmissionsCache);
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
  const adminList = document.getElementById("admin-submissions-list");
  const mySubmissionsList = document.getElementById("my-submissions-list");

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

  if (mySubmissionsList) {
    loadMySubmissions();
  }
});
