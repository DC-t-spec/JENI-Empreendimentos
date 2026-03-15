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

  return `
    <article class="admin-card">
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
    </article>
  `;
}

function fillAdminEditor(item) {
  const editor = document.getElementById("admin-editor");
  const editId = document.getElementById("admin-edit-id");
  const editorTitle = document.getElementById("admin-editor-title");

  if (editId) editId.value = item.id || "";
  if (editorTitle) editorTitle.textContent = "Editar conteúdo";

  const map = {
    "admin-content-type": item.type || "news",
    "admin-content-status": item.status || "pending",
    "admin-content-title": item.title || "",
    "admin-content-summary": item.summary || "",
    "admin-content-description": item.description || item.content || "",
    "admin-content-image": item.image_url || "",
    "admin-content-link": item.external_url || item.external_link || "",
    "admin-content-location": item.location || "",
    "admin-content-slug": item.slug || "",
    "admin-content-start-date": item.start_date ? String(item.start_date).slice(0, 10) : "",
    "admin-content-end-date": item.end_date ? String(item.end_date).slice(0, 10) : "",
    "admin-content-deadline": item.deadline ? String(item.deadline).slice(0, 10) : "",
    "admin-content-author": item.author_id || item.user_id || ""
  };

  Object.entries(map).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });

  const featuredEl = document.getElementById("admin-content-featured");
  if (featuredEl) featuredEl.checked = !!item.featured;

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
}

function getAdminFormData() {
  const title = getValue("admin-content-title");
  const slugValue = getValue("admin-content-slug");

  return {
    type: getValue("admin-content-type") || "news",
    status: getValue("admin-content-status") || "pending",
    title: title,
    slug: slugValue || `${slugify(title)}-${Date.now()}`,
    summary: getValue("admin-content-summary"),
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
}

/* =====================================================
ADMIN — FORM
===================================================== */

async function saveAdminContent() {
  const payload = getAdminFormData();
  const editId = getValue("admin-edit-id");

  if (!payload.title) {
    showMessage("admin-message", "Preencha o título do conteúdo.", "error");
    return;
  }

  if (payload.type === "event" && !payload.start_date) {
    showMessage("admin-message", "Evento precisa de data de início.", "error");
    return;
  }

  if (editId) {
    const { error } = await updateSubmissionById(editId, payload);

    if (error) {
      showMessage("admin-message", error.message || "Erro ao actualizar conteúdo.", "error");
      return;
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

    const { error } = await createSubmissionByAdmin(createPayload);

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
}

function initAdminEditor() {
  const form = document.getElementById("admin-content-form");
  const filterBtn = document.getElementById("admin-apply-filters");
  const resetBtn = document.getElementById("admin-reset-editor");
  const cancelBtn = document.getElementById("admin-cancel-editor");
  const logoutBtn = document.getElementById("logout-btn");

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
