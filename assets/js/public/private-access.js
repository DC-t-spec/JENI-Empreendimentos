const LONG_PRESS_MS = 950;
const adminPath = "/jeni-informa/admin.html";
const producerPath = "/jeni-informa/dashboard.html";

const supabaseClient = window.JeniSupabase?.createSupabaseClient
  ? window.JeniSupabase.createSupabaseClient()
  : window.JENI_SUPABASE_CLIENT || null;

function resolvePath(pathname) {
  return `${window.location.origin}${pathname}`;
}

function createModal() {
  const modal = document.createElement("div");
  modal.className = "private-access-modal";
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

async function fetchRole() {
  const { data: userData } = await supabaseClient.auth.getUser();
  const user = userData?.user;
  if (!user) return null;
  const { data: profile } = await supabaseClient.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role || null;
}

function redirectByRole(role) {
  if (role === "admin" || role === "editor") {
    window.location.href = resolvePath(adminPath);
    return true;
  }
  if (role === "producer") {
    window.location.href = resolvePath(producerPath);
    return true;
  }
  return false;
}

function initPrivateAccess() {
  const trigger = document.querySelector(".brand");
  if (!trigger || !supabaseClient) return;
  trigger.classList.add("private-access-trigger");

  const modal = createModal();
  const form = modal.querySelector("#private-access-form");
  const emailInput = modal.querySelector("#private-access-email");
  const passwordInput = modal.querySelector("#private-access-password");
  const submitButton = modal.querySelector(".private-access-submit");
  const feedback = modal.querySelector("#private-access-feedback");
  let longPressTimer = null;

  const closeModal = () => modal.classList.remove("is-open");
  const openModal = async () => {
    const { data } = await supabaseClient.auth.getSession();
    if (data?.session) {
      const role = await fetchRole();
      if (redirectByRole(role)) return;
      feedback.textContent = "Access denied for this account.";
      feedback.className = "private-access-feedback error";
    }
    modal.classList.add("is-open");
    setTimeout(() => emailInput.focus(), 40);
  };

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  trigger.addEventListener("dblclick", (event) => {
    event.preventDefault();
    openModal();
  });

  const startLongPress = () => {
    longPressTimer = window.setTimeout(() => openModal(), LONG_PRESS_MS);
  };
  const stopLongPress = () => {
    if (longPressTimer) window.clearTimeout(longPressTimer);
    longPressTimer = null;
  };

  trigger.addEventListener("touchstart", startLongPress, { passive: true });
  trigger.addEventListener("touchend", stopLongPress);
  trigger.addEventListener("touchcancel", stopLongPress);
  trigger.addEventListener("mousedown", startLongPress);
  trigger.addEventListener("mouseup", stopLongPress);
  trigger.addEventListener("mouseleave", stopLongPress);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
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

initPrivateAccess();
