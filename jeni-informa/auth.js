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
