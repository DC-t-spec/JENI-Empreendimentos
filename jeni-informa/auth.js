const SUPABASE_URL = "https://qkwusyhkycthottckzww.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrd3VzeWhreWN0aG90dGNrend3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTM2OTIsImV4cCI6MjA4OTA4OTY5Mn0.ycIm_1lZlGNApILY1OReDQmp4Qv4n1Rw7iTAbFq7rdA";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

async function handleSignUp(event) {
  event.preventDefault();

  clearMessage("signup-message");

  const fullName = document.getElementById("full_name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const organizationName = document.getElementById("organization_name").value.trim();
  const city = document.getElementById("city").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm_password").value;

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
    "Conta criada com sucesso. Verifique o seu email para confirmar a conta, se o Supabase exigir confirmação.",
    "success"
  );

  document.getElementById("signup-form").reset();

  setTimeout(() => {
    window.location.href = "login.html";
  }, 2500);
}

async function handleLogin(event) {
  event.preventDefault();

  clearMessage("login-message");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

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

async function handleLogout() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert("Erro ao terminar sessão: " + error.message);
    return;
  }

  window.location.href = "login.html";
}

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
    nameEl.textContent = profile?.full_name || "Utilizador";
  }

  if (emailEl) {
    emailEl.textContent = profile?.email || user.email || "-";
  }

  if (orgEl) {
    orgEl.textContent = profile?.organization_name || "Não informado";
  }

  if (cityEl) {
    cityEl.textContent = profile?.city || "Não informado";
  }

  if (roleEl) {
    roleEl.textContent = profile?.role || "producer";
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }
}
