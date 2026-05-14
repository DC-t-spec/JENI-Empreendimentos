const LONG_PRESS_MS = 950;
const ADMIN_PATH = "/jeni-informa/admin.html";
const PRODUCER_PATH = "/jeni-informa/dashboard.html";

function debugLog(...args) {
  console.log("[private-access]", ...args);
}

function resolvePath(pathname) {
  return `${window.location.origin}${pathname}`;
}

function getSupabaseClient() {
  if (window.JeniSupabase?.createSupabaseClient) return window.JeniSupabase.createSupabaseClient();
  if (window.supabase && window.JeniSupabase?.SUPABASE_URL && window.JeniSupabase?.SUPABASE_ANON_KEY) {
    return window.supabase.createClient(window.JeniSupabase.SUPABASE_URL, window.JeniSupabase.SUPABASE_ANON_KEY);
  }
  return null;
}

function createModal() {
  const modal = document.createElement("div");
  modal.className = "private-access-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="private-access-card" role="dialog" aria-modal="true" aria-labelledby="private-access-title">
      <img src="/logo-jeni.png" alt="JENI">
      <h3 id="private-access-title">Private Access</h3>
      <p>JENI Workspace</p>
      <form class="private-access-form" id="private-access-form">
        <div>
          <label for="private-access-email">Email</label>
          <input id="private-access-email" type="email" autocomplete="email" required>
        </div>
        <div>
          <label for="private-access-password">Password</label>
          <input id="private-access-password" type="password" autocomplete="current-password" required>
        </div>
        <button class="private-access-submit" type="submit">Continuar</button>
        <p class="private-access-feedback" id="private-access-feedback" aria-live="polite"></p>
      </form>
    </div>`;
  document.body.appendChild(modal);
  return modal;
}

async function initPrivateAccess() {
  const trigger = document.querySelector(".brand");
  debugLog("brand found:", Boolean(trigger));
  if (!trigger) return;

  const supabaseClient = getSupabaseClient();
  debugLog("supabase client available:", Boolean(supabaseClient));
  if (!supabaseClient) return;

  trigger.classList.add("private-access-trigger");
  const modal = createModal();
  const form = modal.querySelector("#private-access-form");
  const emailInput = modal.querySelector("#private-access-email");
  const passwordInput = modal.querySelector("#private-access-password");
  const submitButton = modal.querySelector(".private-access-submit");
  const feedback = modal.querySelector("#private-access-feedback");
  let longPressTimer = null;
  let longPressTriggered = false;

  async function fetchRole() {
    const { data: userData } = await supabaseClient.auth.getUser();
    const user = userData?.user;
    if (!user) return null;
    const { data: profile } = await supabaseClient.from("profiles").select("role").eq("id", user.id).single();
    debugLog("role detected:", profile?.role || null);
    return profile?.role || null;
  }

  function redirectByRole(role) {
    if (role === "admin" || role === "editor") {
      debugLog("redirect target:", ADMIN_PATH);
      window.location.href = resolvePath(ADMIN_PATH);
      return true;
    }
    if (role === "producer") {
      debugLog("redirect target:", PRODUCER_PATH);
      window.location.href = resolvePath(PRODUCER_PATH);
      return true;
    }
    return false;
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  async function openModal() {
    debugLog("modal open");
    const { data } = await supabaseClient.auth.getSession();
    if (data?.session) {
      const role = await fetchRole();
      if (redirectByRole(role)) return;
      feedback.textContent = "Access denied for this account.";
      feedback.className = "private-access-feedback error";
    }
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    setTimeout(() => emailInput.focus(), 30);
  }

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "j") {
      event.preventDefault();
      debugLog("shortcut detected");
      openModal();
    }
  });

  trigger.addEventListener("click", (event) => {
    if (longPressTriggered) {
      event.preventDefault();
      longPressTriggered = false;
    }
  });

  trigger.addEventListener("dblclick", (event) => {
    event.preventDefault();
    debugLog("dblclick detected");
    openModal();
  });

  const startLongPress = (event) => {
    longPressTriggered = false;
    if (longPressTimer) window.clearTimeout(longPressTimer);
    longPressTimer = window.setTimeout(() => {
      longPressTriggered = true;
      debugLog("long press detected");
      openModal();
    }, LONG_PRESS_MS);
    if (event.type === "touchstart") event.preventDefault();
  };

  const stopLongPress = () => {
    if (longPressTimer) window.clearTimeout(longPressTimer);
    longPressTimer = null;
  };

  trigger.addEventListener("touchstart", startLongPress, { passive: false });
  trigger.addEventListener("touchend", stopLongPress);
  trigger.addEventListener("touchcancel", stopLongPress);
  trigger.addEventListener("mousedown", startLongPress);
  trigger.addEventListener("mouseup", stopLongPress);
  trigger.addEventListener("mouseleave", stopLongPress);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    debugLog("auth start");
    feedback.className = "private-access-feedback";
    feedback.textContent = "A validar acesso...";
    submitButton.disabled = true;
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value
    });
    if (error) {
      feedback.className = "private-access-feedback error";
      feedback.textContent = error.message || "Falha de autenticação.";
      submitButton.disabled = false;
      return;
    }
    const role = await fetchRole();
    if (!redirectByRole(role)) {
      feedback.className = "private-access-feedback error";
      feedback.textContent = "Access denied for this account.";
      submitButton.disabled = false;
      return;
    }
    closeModal();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPrivateAccess);
} else {
  initPrivateAccess();
}
