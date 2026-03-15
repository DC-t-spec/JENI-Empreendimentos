/* =====================================================
JENI INFORMA — AUTH & SUBMISSIONS
Supabase client + auth + forms
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

  const password = document.getElementById("password").value;
  const confirm = document.getElementById("confirm_password").value;

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
    await supabaseClient.from("profiles").update({
      full_name: fullName,
      phone,
      organization_name: organization,
      city
    }).eq("id", data.user.id);
  }

  showMessage(
    "signup-message",
    "Conta criada com sucesso.",
    "success"
  );

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
  const password = document.getElementById("password").value;

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
async function initAdminPage() {
  const adminAccess = await requireAdmin();
  if (!adminAccess) return;

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  showMessage("admin-message", "A carregar submissões...", "info");

  const { data, error } = await loadAdminSubmissions();

  if (error) {
    console.error("ADMIN LOAD ERROR:", error);
    showMessage("admin-message", error.message || "Erro ao carregar submissões.", "error");
    return;
  }

  clearMessage("admin-message");

  const listEl = document.getElementById("admin-submissions-list");
  const statPending = document.getElementById("stat-pending");
  const statApproved = document.getElementById("stat-approved");
  const statRejected = document.getElementById("stat-rejected");
  const statArchived = document.getElementById("stat-archived");

  const pendingCount = data.filter(item => item.status === "pending").length;
  const approvedCount = data.filter(item => item.status === "approved").length;
  const rejectedCount = data.filter(item => item.status === "rejected").length;
  const archivedCount = data.filter(item => item.status === "archived").length;

  statPending.textContent = pendingCount;
  statApproved.textContent = approvedCount;
  statRejected.textContent = rejectedCount;
  statArchived.textContent = archivedCount;

  if (!data || data.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        Ainda não existem submissões registadas.
      </div>
    `;
    return;
  }

  const sortedData = [...data].sort((a, b) => {
    const statusOrder = {
      pending: 1,
      approved: 2,
      rejected: 3,
      archived: 4,
      draft: 5
    };

    const aOrder = statusOrder[a.status] || 99;
    const bOrder = statusOrder[b.status] || 99;

    if (aOrder !== bOrder) return aOrder - bOrder;

    return new Date(b.created_at) - new Date(a.created_at);
  });

  listEl.innerHTML = sortedData.map(item => {
    const typeLabel =
      item.type === "event" ? "Evento" :
      item.type === "opportunity" ? "Oportunidade" :
      item.type === "news" ? "Notícia" :
      item.type || "Submissão";

    const statusLabel =
      item.status === "pending" ? "Pendente" :
      item.status === "approved" ? "Aprovado" :
      item.status === "rejected" ? "Rejeitado" :
      item.status === "archived" ? "Arquivado" :
      item.status || "Sem estado";

    const principalDate =
      item.type === "event"
        ? formatDateTime(item.start_date || item.event_date)
        : item.type === "opportunity"
          ? (item.deadline || "Sem prazo")
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
            <span class="admin-type-pill">${typeLabel}</span>
            <span class="admin-status-pill ${item.status}">${statusLabel}</span>
          </div>
        </div>

        <h3>${item.title || "Sem título"}</h3>

        <p>${item.summary || "Sem resumo disponível."}</p>

        <div class="admin-details">
          <p><strong>Categoria:</strong> ${item.category || "Não definida"}</p>
          <p><strong>${principalLabel}:</strong> ${principalDate}</p>
          <p><strong>Local:</strong> ${item.location || "Não definido"}</p>
          <p><strong>Criado em:</strong> ${formatDateTime(item.created_at)}</p>
          <p><strong>Publicado em:</strong> ${item.published_at ? formatDateTime(item.published_at) : "Ainda não publicado"}</p>
        </div>

        <div class="admin-actions">
          <button class="admin-btn admin-btn-approve" data-id="${item.id}" data-action="approved">Aprovar</button>
          <button class="admin-btn admin-btn-reject" data-id="${item.id}" data-action="rejected">Rejeitar</button>
          <button class="admin-btn admin-btn-archive" data-id="${item.id}" data-action="archived">Arquivar</button>
        </div>
      </article>
    `;
  }).join("");

  listEl.querySelectorAll(".admin-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const submissionId = button.dataset.id;
      const action = button.dataset.action;

      showMessage("admin-message", "A actualizar submissão...", "info");

      const { error: updateError } = await updateSubmissionStatus(submissionId, action);

      if (updateError) {
        console.error("ADMIN UPDATE ERROR:", updateError);
        showMessage("admin-message", updateError.message || "Erro ao actualizar submissão.", "error");
        return;
      }

      showMessage("admin-message", "Submissão actualizada com sucesso.", "success");

      setTimeout(() => {
        initAdminPage();
      }, 500);
    });
  });
}



/* =====================================================
DASHBOARD
===================================================== */

async function initDashboard() {
  const user = await requireAuth();
  if (!user) return;

  const profile = await loadProfile();

  document.getElementById("dashboard-name").textContent =
    profile?.full_name || "-";

  document.getElementById("dashboard-email").textContent =
    user.email || "-";

  document.getElementById("dashboard-organization").textContent =
    profile?.organization_name || "-";

  document.getElementById("dashboard-city").textContent =
    profile?.city || "-";

  document.getElementById("dashboard-role").textContent =
    profile?.role || "produtor";

  const logoutBtn = document.getElementById("logout-btn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }
}

/* =====================================================
STORAGE
===================================================== */

async function uploadImage(file, folder) {
  if (!file) return null;

  const user = await getCurrentUser();
  if (!user) return null;

 const fileName = `${user.id}/${folder}/${Date.now()}-${file.name}`;


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

    showMessage("event-message", "Evento enviado para aprovação.", "success");
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
      status === "draft"
        ? "Rascunho guardado."
        : "Oportunidade enviada para aprovação.",
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
