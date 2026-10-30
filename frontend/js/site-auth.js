const authConfig = window.SUPABASE_CONFIG || {};
const authConfigured = Boolean(
  window.supabase?.createClient &&
    authConfig.url &&
    authConfig.anonKey &&
    !authConfig.url.includes("TU-PROYECTO") &&
    !authConfig.anonKey.includes("TU-ANON-KEY"),
);

const authScreen = document.createElement("section");
authScreen.className = "site-auth-screen";
authScreen.innerHTML = `
  <div class="site-auth-card">
    <img class="site-auth-logo" src="assets/icon/favicon-light.svg" alt="Recordatorios" />
    <h1 id="authTitle">Iniciar sesión</h1>
    <div id="authLoginPanel">
      <form class="site-auth-form" id="authLoginForm">
        <label>Correo electronico<input id="authEmail" type="email" autocomplete="email" required /></label>
        <label>Contraseña<input id="authPassword" type="password" autocomplete="current-password" required /></label>
        <button class="site-auth-submit" type="submit">Iniciar sesión</button>
      </form>
      <button class="site-auth-link" id="authForgot" type="button">Olvidé mi contraseña</button>
    </div>
    <div id="authRequestPanel" hidden>
      <p>Escribe tu correo y te enviaremos un enlace para cambiar la contraseña.</p>
      <form class="site-auth-form" id="authRequestForm">
        <label>Correo electronico<input id="authRequestEmail" type="email" autocomplete="email" required /></label>
        <button class="site-auth-submit" type="submit">Enviar enlace</button>
      </form>
      <button class="site-auth-link" id="authBack" type="button">Volver al inicio de sesión</button>
    </div>
    <div id="authUpdatePanel" hidden>
      <p>Escribe y confirma tu nueva contraseña.</p>
      <form class="site-auth-form" id="authUpdateForm">
        <label>Contraseña nueva<input id="authNewPassword" type="password" autocomplete="new-password" required /></label>
        <label>Confirmar contraseña<input id="authConfirmPassword" type="password" autocomplete="new-password" required /></label>
        <button class="site-auth-submit" type="submit">Guardar contraseña</button>
      </form>
    </div>
    <p class="site-auth-status" id="authStatus" role="status"></p>
  </div>`;
document.body.prepend(authScreen);

const auth$ = (id) => document.getElementById(id);
let authRecovery = false;

function setAuthStatus(message, isError = false) {
  const element = auth$("authStatus");
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

function showAuthPanel(panel) {
  auth$("authLoginPanel").hidden = panel !== "login";
  auth$("authRequestPanel").hidden = panel !== "request";
  auth$("authUpdatePanel").hidden = panel !== "update";
  auth$("authTitle").textContent = panel === "update"
    ? "Cambiar contraseña"
    : panel === "request" ? "Recuperar contraseña" : "Iniciar sesión";
  setAuthStatus("");
}

function updateAuthSession(session) {
  window.siteAuthSession = session;
  const signedIn = Boolean(session?.user);
  document.body.classList.remove("site-auth-pending");
  document.body.classList.toggle("site-auth-required", !signedIn);
  authScreen.hidden = signedIn && !authRecovery;
  const button = auth$("authButton");
  if (button) {
    button.textContent = signedIn ? "Cerrar sesión" : "Iniciar sesión";
    button.onclick = () => signedIn
      ? window.SUPABASE_AUTH_CLIENT.auth.signOut()
      : showAuthPanel("login");
  }
  if (!signedIn) showAuthPanel("login");
  window.dispatchEvent(new CustomEvent("site-auth-ready", { detail: { session } }));
}

async function signIn(event) {
  event.preventDefault();
  const button = auth$("authLoginForm").querySelector("button");
  button.disabled = true;
  setAuthStatus("Iniciando sesión...");
  const { error } = await window.SUPABASE_AUTH_CLIENT.auth.signInWithPassword({
    email: auth$("authEmail").value.trim(),
    password: auth$("authPassword").value,
  });
  button.disabled = false;
  if (error) setAuthStatus("Correo o contraseña incorrectos.", true);
}

async function requestPasswordReset(event) {
  event.preventDefault();
  const button = auth$("authRequestForm").querySelector("button");
  button.disabled = true;
  setAuthStatus("Enviando enlace...");
  const { error } = await window.SUPABASE_AUTH_CLIENT.auth.resetPasswordForEmail(
    auth$("authRequestEmail").value.trim(),
    { redirectTo: window.location.href.split("#")[0] },
  );
  button.disabled = false;
  if (error) return setAuthStatus(error.message, true);
  setAuthStatus("Revisa tu correo y abre el enlace para cambiar tu contraseña.");
  auth$("authRequestForm").reset();
}

async function updatePassword(event) {
  event.preventDefault();
  const password = auth$("authNewPassword").value;
  if (password !== auth$("authConfirmPassword").value) {
    setAuthStatus("Las contraseñas no coinciden.", true);
    return;
  }
  const button = auth$("authUpdateForm").querySelector("button");
  button.disabled = true;
  setAuthStatus("Guardando contraseña...");
  const { error } = await window.SUPABASE_AUTH_CLIENT.auth.updateUser({ password });
  button.disabled = false;
  if (error) return setAuthStatus(error.message, true);
  authRecovery = false;
  auth$("authUpdateForm").reset();
  const { data } = await window.SUPABASE_AUTH_CLIENT.auth.getSession();
  updateAuthSession(data?.session);
}

if (!authConfigured) {
  document.body.classList.remove("site-auth-pending");
  document.body.classList.add("site-auth-required");
  setAuthStatus("Falta configurar Supabase en js/supabase-config.js.", true);
} else {
  window.SUPABASE_AUTH_CLIENT = window.supabase.createClient(
    authConfig.url,
    authConfig.anonKey,
    {
      auth: {
        // Mantiene la sesión al recargar esta pestaña y la elimina al cerrarla.
        storage: window.sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    },
  );
  auth$("authLoginForm").addEventListener("submit", signIn);
  auth$("authRequestForm").addEventListener("submit", requestPasswordReset);
  auth$("authUpdateForm").addEventListener("submit", updatePassword);
  auth$("authForgot").addEventListener("click", () => showAuthPanel("request"));
  auth$("authBack").addEventListener("click", () => showAuthPanel("login"));
  window.SUPABASE_AUTH_CLIENT.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      authRecovery = true;
      showAuthPanel("update");
    }
    updateAuthSession(session);
  });
  window.SUPABASE_AUTH_CLIENT.auth.getSession().then(({ data, error }) => {
    if (error) setAuthStatus("No se pudo recuperar la sesiÃ³n.", true);
    updateAuthSession(data?.session);
  });
}
