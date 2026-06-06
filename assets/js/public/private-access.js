const LONG_PRESS_MS = 2000;
const adminUrl = new URL("../../../jeni-informa/admin.html", import.meta.url).href;
const producerUrl = new URL("../../../jeni-informa/dashboard.html", import.meta.url).href;
const logoUrl = new URL("../../../logo-jeni.png", import.meta.url).href;
const DOUBLE_CLICK_DELAY_MS = 300;

const supabaseClient = window.JeniSupabase?.createSupabaseClient
  ? window.JeniSupabase.createSupabaseClient()
  : window.JENI_SUPABASE_CLIENT || null;

function createModal() {
  const modal = document.createElement("div");
  modal.className = "private-access-modal";
  modal.innerHTML = `
    <div class="private-access-card" role="dialog" aria-modal="true" aria-labelledby="private-access-title">
      <img src="${logoUrl}" alt="JENI">
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
    window.location.assign(adminUrl);
    return true;
  }
  if (role === "producer") {
    window.location.assign(producerUrl);
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
  let longPressTriggered = false;
  let activePressSource = null;
  let clickTimer = null;

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

  trigger.addEventListener("click", (event) => {
    if (event.detail === 0) return;
    event.preventDefault();
    if (longPressTriggered) {
      longPressTriggered = false;
      return;
    }
    window.clearTimeout(clickTimer);
    clickTimer = window.setTimeout(() => {
      window.location.assign(trigger.href);
    }, DOUBLE_CLICK_DELAY_MS);
  });

  trigger.addEventListener("dblclick", (event) => {
    event.preventDefault();
    window.clearTimeout(clickTimer);
    clickTimer = null;
    openModal();
  });

  const getPressSource = (event) => event.type.startsWith("pointer") ? "pointer" : "touch";
  const startLongPress = (event) => {
    if (event.type.startsWith("pointer") && event.pointerType === "mouse") return;

    const source = getPressSource(event);
    if (activePressSource) return;

    activePressSource = source;
    longPressTriggered = false;
    window.clearTimeout(longPressTimer);
    longPressTimer = window.setTimeout(() => {
      longPressTimer = null;
      longPressTriggered = true;
      window.clearTimeout(clickTimer);
      clickTimer = null;
      openModal();
    }, LONG_PRESS_MS);
  };
  const stopLongPress = (event) => {
    const source = getPressSource(event);
    if (source !== activePressSource) return;

    window.clearTimeout(longPressTimer);
    longPressTimer = null;
    activePressSource = null;
  };

  trigger.addEventListener("touchstart", startLongPress, { passive: true });
  trigger.addEventListener("touchend", stopLongPress);
  trigger.addEventListener("touchcancel", stopLongPress);
  trigger.addEventListener("pointerdown", startLongPress);
  trigger.addEventListener("pointerup", stopLongPress);
  trigger.addEventListener("pointercancel", stopLongPress);
  trigger.addEventListener("pointerleave", stopLongPress);
  trigger.addEventListener("contextmenu", (event) => {
    if (activePressSource) event.preventDefault();
  });

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
