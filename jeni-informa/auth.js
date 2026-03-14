const SUPABASE_URL = "https://qkwusyhkycthottckzww.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrd3VzeWhreWN0aG90dGNrend3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTM2OTIsImV4cCI6MjA4OTA4OTY5Mn0.ycIm_1lZlGNApILY1OReDQmp4Qv4n1Rw7iTAbFq7rdA";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================
   HELPERS GERAIS
========================= */

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

function safeText(value, fallback = "-") {
  return value && String(value).trim() ? value : fallback;
}

function formatDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatDateTime(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getStatusLabel(status) {
  const value = (status || "pending").toLowerCase();

  if (value === "approved") return "Aprovado";
  if (value === "rejected") return "Rejeitado";
  return "Pendente";
}

function getStatusClass(status) {
  const value = (status || "pending").toLowerCase();

  if (value === "approved") return "success";
  if (value === "rejected") return "error";
  return "info";
}

/* =========================
   AUTH / SESSÃO
========================= */

async function getCurrentUser() {
  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser();

  if (error) {
    console.error("Erro ao obter utilizador:", error.message);
    return null;
  }

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

async function handleLogout() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert("Erro ao terminar sessão: " + error.message);
    return;
  }

  window.location.href = "login.html";
}

/* =========================
   PERFIL
========================= */

async function loadProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Erro ao carregar perfil:", error.message);
    return null;
  }

  return data;
}

/* =========================
   REGISTO
========================= */

async function handleSignUp(event) {
  event.preventDefault();

  clearMessage("signup-message");

  const fullName = getValue("full_name");
  const email = getValue("email");
  const phone = getValue("phone");
  const organizationName = getValue("organization_name");
  const city = getValue("city");
  const password = document.getElementById("password")?.value || "";
  const confirmPassword = document.getElementById("confirm_password")?.value || "";

  if (!fullName || !email || !password || !confirmPassword) {
    showMessage("signup-message", "Preencha os campos obrigatórios.", "error");
    return;
  }

  if (password.length < 6) {
    showMessage("signup-message", "A palavra-passe deve ter pelo menos 6 caracteres.", "error");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("signup-message", "As palavras-passe não coincidem.", "error");
    return;
  }

  showMessage("signup-message", "A criar conta...", "info");

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) {
    showMessage("signup-message", error.message, "error");
    return;
  }

  if (data?.user) {
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
        organization_name: organizationName,
        city
      })
      .eq("id", data.user.id);

    if (profileError) {
      console.error("Erro ao completar perfil:", profileError.message);
    }
  }

  showMessage(
    "signup-message",
    "Conta criada com sucesso. Verifique o seu email para confirmar a conta, caso a confirmação esteja activa no Supabase.",
    "success"
  );

  const form = document.getElementById("signup-form");
  if (form) form.reset();

  setTimeout(() => {
    window.location.href = "login.html";
  }, 2200);
}

/* =========================
   LOGIN
========================= */

async function handleLogin(event) {
  event.preventDefault();

  clearMessage("login-message");

  const email = getValue("email");
  const password = document.getElementById("password")?.value || "";

  if (!email || !password) {
    showMessage("login-message", "Preencha email e palavra-passe.", "error");
    return;
  }

  showMessage("login-message", "A entrar...", "info");

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showMessage("login-message", error.message, "error");
    return;
  }

  showMessage("login-message", "Login efectuado com sucesso.", "success");

  setTimeout(() => {
    window.location.href = "dashboard.html";
  }, 800);
}

/* =========================
   DASHBOARD
========================= */

async function initDashboard() {
  const user = await requireAuth();
  if (!user) return;

  const profile = await loadProfile();

  const nameEl = document.getElementById("dashboard-name");
  const emailEl = document.getElementById("dashboard-email");
  const orgEl = document.getElementById("dashboard-organization");
  const cityEl = document.getElementById("dashboard-city");
  const roleEl = document.getElementById("dashboard-role");

  if (nameEl) {
    nameEl.textContent = safeText(profile?.full_name, "Utilizador");
  }

  if (emailEl) {
    emailEl.textContent = safeText(profile?.email || user.email);
  }

  if (orgEl) {
    orgEl.textContent = safeText(profile?.organization_name, "Não informado");
  }

  if (cityEl) {
    cityEl.textContent = safeText(profile?.city, "Não informado");
  }

  if (roleEl) {
    roleEl.textContent = safeText(profile?.role, "producer");
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }
}

/* =========================
   STORAGE
========================= */

async function uploadImageToBucket(file, folder = "submissions") {
  const user = await getCurrentUser();
  if (!user || !file) return null;

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `${folder}/${user.id}-${Date.now()}.${extension}`;

  const { error } = await supabaseClient.storage
    .from("jeni-informa")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (error) {
    throw error;
  }

  const { data } = supabaseClient.storage
    .from("jeni-informa")
    .getPublicUrl(fileName);

  return data?.publicUrl || null;
}

/* =========================
   SUBMISSÕES
========================= */

async function insertSubmission(payload) {
  return await supabaseClient
    .from("submissions")
    .insert([payload])
    .select()
    .single();
}

async function getMySubmissions() {
  const user = await requireAuth();
  if (!user) return { data: null, error: new Error("Utilizador não autenticado.") };

  return await supabaseClient
    .from("submissions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
}

async function handleEventSubmission(event) {
  event.preventDefault();

  clearMessage("event-message");

  const user = await requireAuth();
  if (!user) return;

  const title = getValue("title");
  const category = getValue("category");
  const eventDate = getValue("event_date");
  const eventTime = getValue("event_time");
  const location = getValue("location");
  const summary = getValue("summary");
  const description = getValue("description");
  const ticketPrice = getValue("ticket_price");
  const ticketInfo = getValue("ticket_info");
  const videoUrl = getValue("video_url");
  const imageFile = getFile("image");

  if (!title || !category || !summary || !description) {
    showMessage("event-message", "Preencha os campos obrigatórios do evento.", "error");
    return;
  }

  try {
    showMessage("event-message", "A enviar evento...", "info");

    let imageUrl = null;

    if (imageFile) {
      imageUrl = await uploadImageToBucket(imageFile, "events");
    }

    const payload = {
      user_id: user.id,
      type: "evento",
      title,
      category,
      event_date: eventDate || null,
      event_time: eventTime || null,
      location: location || null,
      summary,
      description,
      ticket_price: ticketPrice || null,
      ticket_info: ticketInfo || null,
      video_url: videoUrl || null,
      image_url: imageUrl,
      status: "pending"
    };

    const { error } = await insertSubmission(payload);

    if (error) {
      console.error("Erro ao submeter evento:", error.message);
      showMessage("event-message", "Não foi possível submeter o evento.", "error");
      return;
    }

    showMessage("event-message", "Evento submetido com sucesso para análise.", "success");

    const form = document.getElementById("event-form");
    if (form) form.reset();
  } catch (error) {
    console.error("Erro inesperado ao submeter evento:", error);
    showMessage("event-message", "Ocorreu um erro ao enviar o evento.", "error");
  }
}

async function handleOpportunitySubmission(event) {
  event.preventDefault();

  clearMessage("opportunity-message");

  const user = await requireAuth();
  if (!user) return;

  const title = getValue("title");
  const category = getValue("category");
  const summary = getValue("summary");
  const description = getValue("description");
  const deadline = getValue("deadline");
  const location = getValue("location");
  const externalUrl = getValue("external_url");
  const imageFile = getFile("image");

  if (!title || !category || !summary || !description) {
    showMessage("opportunity-message", "Preencha os campos obrigatórios da oportunidade.", "error");
    return;
  }

  try {
    showMessage("opportunity-message", "A enviar oportunidade...", "info");

    let imageUrl = null;

    if (imageFile) {
      imageUrl = await uploadImageToBucket(imageFile, "opportunities");
    }

    const payload = {
      user_id: user.id,
      type: "oportunidade",
      title,
      category,
      summary,
      description,
      deadline: deadline || null,
      location: location || null,
      external_url: externalUrl || null,
      image_url: imageUrl,
      status: "pending"
    };

    const { error } = await insertSubmission(payload);

    if (error) {
      console.error("Erro ao submeter oportunidade:", error.message);
      showMessage("opportunity-message", "Não foi possível submeter a oportunidade.", "error");
      return;
    }

    showMessage("opportunity-message", "Oportunidade submetida com sucesso para análise.", "success");

    const form = document.getElementById("opportunity-form");
    if (form) form.reset();
  } catch (error) {
    console.error("Erro inesperado ao submeter oportunidade:", error);
    showMessage("opportunity-message", "Ocorreu um erro ao enviar a oportunidade.", "error");
  }
}

/* =========================
   MINHAS SUBMISSÕES
========================= */

async function initMySubmissions() {
  const tableBody = document.getElementById("submissions-table-body");
  const emptyState = document.getElementById("submissions-empty");
  const messageId = "submissions-message";

  if (!tableBody) return;

  clearMessage(messageId);

  const { data, error } = await getMySubmissions();

  if (error) {
    console.error("Erro ao carregar submissões:", error.message);
    showMessage(messageId, "Não foi possível carregar as submissões.", "error");
    return;
  }

  tableBody.innerHTML = "";

  if (!data || !data.length) {
    if (emptyState) {
      emptyState.hidden = false;
    }
    return;
  }

  if (emptyState) {
    emptyState.hidden = true;
  }

  data.forEach((item) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${safeText(item.title)}</td>
      <td>${safeText(item.type)}</td>
      <td>${safeText(item.category)}</td>
      <td>${formatDate(item.created_at)}</td>
      <td><span class="auth-message ${getStatusClass(item.status)}">${getStatusLabel(item.status)}</span></td>
    `;

    tableBody.appendChild(tr);
  });
}
