import "./styles.css";

type AuthMode = "signin" | "create";
type Language = "en" | "es";
type VerificationStatus = "idle" | "loading" | "success" | "error";
type ResetFeedback = { state: "success" | "error" | "info"; text: string } | null;

type PasswordRequirement = {
  key: string;
  message: string;
  test: (password: string) => boolean;
};

type LanguageOption = {
  code: Language;
  label: string;
  flagAlt: string;
  flagSrc: string;
};

type AuthCopy = {
  brandAria: string;
  languageLabel: string;
  signInTab: string;
  createTab: string;
  eyebrow: string;
  heading: string;
  summary: string;
  emailLabel: string;
  identifierLabel: string;
  usernameLabel: string;
  passwordLabel: string;
  nameLabel: string;
  submit: string;
  alternatePrompt: string;
  alternateAction: string;
  passwordGuidance: string;
  serviceUnavailable: string;
  passwordIncomplete: string;
  genericSignInError: string;
  genericCreateError: string;
  emailNotVerified: string;
  resendVerification: string;
  verificationSent: string;
  verificationSendError: string;
  verificationInstructions: (email: string) => string;
  devVerificationLink: string;
  verificationTitle: string;
  verificationLoading: string;
  verificationSuccess: string;
  verificationError: string;
  backToSignIn: string;
  signedIn: (username: string) => string;
  accountCreated: (username: string) => string;
  passwordRequirements: PasswordRequirement[];
};

type PasswordResetCopy = {
  requestTitle: string;
  requestSummary: string;
  identifierLabel: string;
  requestSubmit: string;
  requestSent: string;
  requestError: string;
  resetTitle: string;
  resetSummary: string;
  newPasswordLabel: string;
  confirmPasswordLabel: string;
  resetSubmit: string;
  resetSuccess: string;
  resetError: string;
  forgotPassword: string;
  passwordGuidance: string;
  passwordIncomplete: string;
  passwordMismatch: string;
  devResetLink: string;
  backToSignIn: string;
  serviceUnavailable: string;
};

const ensureTrailingSlash = (url: string) => (url.endsWith("/") ? url : `${url}/`);

const authApiUrl = import.meta.env.VITE_AUTH_API_URL ?? "http://127.0.0.1:8001";
const mainAppUrl = ensureTrailingSlash(
  import.meta.env.VITE_MAIN_APP_URL ?? "http://127.0.0.1:5173/"
);
const languageStorageKey = "worldcup-language";
let pendingVerificationEmail = "";
let devVerificationUrl = "";
let devPasswordResetUrl = "";
let verificationStatus: VerificationStatus = "idle";
let verificationFeedback: { state: "success" | "error"; text: string } | null = null;
let resetFeedback: ResetFeedback = null;

const languageOptions: LanguageOption[] = [
  {
    code: "en",
    label: "EN",
    flagAlt: "United Kingdom flag",
    flagSrc: `${mainAppUrl}assets/flags/united-kingdom.svg`
  },
  {
    code: "es",
    label: "ES",
    flagAlt: "Spain flag",
    flagSrc: `${mainAppUrl}assets/flags/spain.svg`
  }
];

const passwordTests = {
  length: (password: string) => password.length >= 8,
  uppercase: (password: string) => /[A-Z]/.test(password),
  lowercase: (password: string) => /[a-z]/.test(password),
  number: (password: string) => /\d/.test(password)
};

const eyeIcon = `
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
`;

const eyeSlashIcon = `
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M2 12s3.6-6 10-6c2 0 3.7.6 5.2 1.4" />
    <path d="M22 12s-3.6 6-10 6c-2 0-3.7-.6-5.2-1.4" />
    <path d="M4 4l16 16" />
    <path d="M9.8 9.8A3 3 0 0 0 14.2 14.2" />
  </svg>
`;

const authCopy: Record<Language, Record<AuthMode, AuthCopy>> = {
  en: {
    signin: {
      brandAria: "World Cup Picks home",
      languageLabel: "Language",
      signInTab: "Sign in",
      createTab: "Create account",
      eyebrow: "FIFA World Cup 2026",
      heading: "Welcome back",
      summary: "Enter your account details to continue to your World Cup groups.",
      emailLabel: "Email",
      identifierLabel: "Email or username",
      usernameLabel: "Username",
      passwordLabel: "Password",
      nameLabel: "Name",
      submit: "Sign in",
      alternatePrompt: "New to World Cup Picks?",
      alternateAction: "Create an account",
      passwordGuidance: "Password must include:",
      serviceUnavailable: "Auth service is not running. Start the backend and try again.",
      passwordIncomplete: "Please complete all password requirements.",
      genericSignInError: "Could not sign in.",
      genericCreateError: "Could not create the account.",
      emailNotVerified: "Please verify your email before signing in.",
      resendVerification: "Resend verification email",
      verificationSent: "Verification email sent. Check your inbox.",
      verificationSendError: "Could not resend the verification email right now.",
      verificationInstructions: (email) => `We sent a verification link to ${email}. It expires in 5 minutes.`,
      devVerificationLink: "Open local verification link",
      verificationTitle: "Verify your email",
      verificationLoading: "Checking your verification link...",
      verificationSuccess: "Email verified. You can now sign in.",
      verificationError: "This verification link expired or was already used.",
      backToSignIn: "Back to sign in",
      signedIn: (username) => `Signed in as ${username}.`,
      accountCreated: (username) => `Account created for ${username}.`,
      passwordRequirements: [
        { key: "length", message: "At least 8 characters", test: passwordTests.length },
        { key: "uppercase", message: "One uppercase letter", test: passwordTests.uppercase },
        { key: "lowercase", message: "One lowercase letter", test: passwordTests.lowercase },
        { key: "number", message: "One number", test: passwordTests.number }
      ]
    },
    create: {
      brandAria: "World Cup Picks home",
      languageLabel: "Language",
      signInTab: "Sign in",
      createTab: "Create account",
      eyebrow: "FIFA World Cup 2026",
      heading: "Create your account",
      summary: "Set up your profile before joining or creating prediction groups.",
      emailLabel: "Email",
      identifierLabel: "Email or username",
      usernameLabel: "Username",
      passwordLabel: "Password",
      nameLabel: "Name",
      submit: "Create account",
      alternatePrompt: "Already have an account?",
      alternateAction: "Sign in",
      passwordGuidance: "Password must include:",
      serviceUnavailable: "Auth service is not running. Start the backend and try again.",
      passwordIncomplete: "Please complete all password requirements.",
      genericSignInError: "Could not sign in.",
      genericCreateError: "Could not create the account.",
      emailNotVerified: "Please verify your email before signing in.",
      resendVerification: "Resend verification email",
      verificationSent: "Verification email sent. Check your inbox.",
      verificationSendError: "Could not resend the verification email right now.",
      verificationInstructions: (email) => `We sent a verification link to ${email}. It expires in 5 minutes.`,
      devVerificationLink: "Open local verification link",
      verificationTitle: "Verify your email",
      verificationLoading: "Checking your verification link...",
      verificationSuccess: "Email verified. You can now sign in.",
      verificationError: "This verification link expired or was already used.",
      backToSignIn: "Back to sign in",
      signedIn: (username) => `Signed in as ${username}.`,
      accountCreated: (username) => `Account created for ${username}.`,
      passwordRequirements: [
        { key: "length", message: "At least 8 characters", test: passwordTests.length },
        { key: "uppercase", message: "One uppercase letter", test: passwordTests.uppercase },
        { key: "lowercase", message: "One lowercase letter", test: passwordTests.lowercase },
        { key: "number", message: "One number", test: passwordTests.number }
      ]
    }
  },
  es: {
    signin: {
      brandAria: "Inicio de World Cup Picks",
      languageLabel: "Idioma",
      signInTab: "Iniciar sesión",
      createTab: "Crear cuenta",
      eyebrow: "Copa Mundial FIFA 2026",
      heading: "Bienvenido de vuelta",
      summary: "Ingresa los datos de tu cuenta para continuar a tus grupos del Mundial.",
      emailLabel: "Correo",
      identifierLabel: "Correo o usuario",
      usernameLabel: "Usuario",
      passwordLabel: "Contraseña",
      nameLabel: "Nombre",
      submit: "Iniciar sesión",
      alternatePrompt: "¿Nuevo en World Cup Picks?",
      alternateAction: "Crear una cuenta",
      passwordGuidance: "La contraseña debe incluir:",
      serviceUnavailable: "El servicio de autenticación no está corriendo. Inicia el backend e inténtalo de nuevo.",
      passwordIncomplete: "Completa todos los requisitos de la contraseña.",
      genericSignInError: "No se pudo iniciar sesión.",
      genericCreateError: "No se pudo crear la cuenta.",
      emailNotVerified: "Verifica tu correo antes de iniciar sesión.",
      resendVerification: "Reenviar correo de verificación",
      verificationSent: "Correo de verificación enviado. Revisa tu bandeja.",
      verificationSendError: "No se pudo reenviar el correo de verificación en este momento.",
      verificationInstructions: (email) => `Enviamos un enlace de verificación a ${email}. Expira en 5 minutos.`,
      devVerificationLink: "Abrir enlace local de verificación",
      verificationTitle: "Verifica tu correo",
      verificationLoading: "Revisando tu enlace de verificación...",
      verificationSuccess: "Correo verificado. Ya puedes iniciar sesión.",
      verificationError: "Este enlace de verificación expiró o ya fue usado.",
      backToSignIn: "Volver a iniciar sesión",
      signedIn: (username) => `Sesión iniciada como ${username}.`,
      accountCreated: (username) => `Cuenta creada para ${username}.`,
      passwordRequirements: [
        { key: "length", message: "Al menos 8 caracteres", test: passwordTests.length },
        { key: "uppercase", message: "Una letra mayúscula", test: passwordTests.uppercase },
        { key: "lowercase", message: "Una letra minúscula", test: passwordTests.lowercase },
        { key: "number", message: "Un número", test: passwordTests.number }
      ]
    },
    create: {
      brandAria: "Inicio de World Cup Picks",
      languageLabel: "Idioma",
      signInTab: "Iniciar sesión",
      createTab: "Crear cuenta",
      eyebrow: "Copa Mundial FIFA 2026",
      heading: "Crea tu cuenta",
      summary: "Configura tu perfil antes de unirte o crear grupos de pronósticos.",
      emailLabel: "Correo",
      identifierLabel: "Correo o usuario",
      usernameLabel: "Usuario",
      passwordLabel: "Contraseña",
      nameLabel: "Nombre",
      submit: "Crear cuenta",
      alternatePrompt: "¿Ya tienes una cuenta?",
      alternateAction: "Iniciar sesión",
      passwordGuidance: "La contraseña debe incluir:",
      serviceUnavailable: "El servicio de autenticación no está corriendo. Inicia el backend e inténtalo de nuevo.",
      passwordIncomplete: "Completa todos los requisitos de la contraseña.",
      genericSignInError: "No se pudo iniciar sesión.",
      genericCreateError: "No se pudo crear la cuenta.",
      emailNotVerified: "Verifica tu correo antes de iniciar sesión.",
      resendVerification: "Reenviar correo de verificación",
      verificationSent: "Correo de verificación enviado. Revisa tu bandeja.",
      verificationSendError: "No se pudo reenviar el correo de verificación en este momento.",
      verificationInstructions: (email) => `Enviamos un enlace de verificación a ${email}. Expira en 5 minutos.`,
      devVerificationLink: "Abrir enlace local de verificación",
      verificationTitle: "Verifica tu correo",
      verificationLoading: "Revisando tu enlace de verificación...",
      verificationSuccess: "Correo verificado. Ya puedes iniciar sesión.",
      verificationError: "Este enlace de verificación expiró o ya fue usado.",
      backToSignIn: "Volver a iniciar sesión",
      signedIn: (username) => `Sesión iniciada como ${username}.`,
      accountCreated: (username) => `Cuenta creada para ${username}.`,
      passwordRequirements: [
        { key: "length", message: "Al menos 8 caracteres", test: passwordTests.length },
        { key: "uppercase", message: "Una letra mayúscula", test: passwordTests.uppercase },
        { key: "lowercase", message: "Una letra minúscula", test: passwordTests.lowercase },
        { key: "number", message: "Un número", test: passwordTests.number }
      ]
    }
  }
};

const passwordResetCopy: Record<Language, PasswordResetCopy> = {
  en: {
    requestTitle: "Reset your password",
    requestSummary: "Enter your email or username and we will send a password reset link if the account exists.",
    identifierLabel: "Email or username",
    requestSubmit: "Send reset link",
    requestSent: "If that account exists, a reset link has been sent.",
    requestError: "Could not send the password reset email right now.",
    resetTitle: "Choose a new password",
    resetSummary: "Enter a new password that satisfies the security requirements.",
    newPasswordLabel: "New password",
    confirmPasswordLabel: "Confirm new password",
    resetSubmit: "Reset password",
    resetSuccess: "Password reset. You can now sign in.",
    resetError: "This password reset link expired or was already used.",
    forgotPassword: "Forgot your password?",
    passwordGuidance: "Password must include:",
    passwordIncomplete: "Please complete all password requirements.",
    passwordMismatch: "Both password fields must match.",
    devResetLink: "Open local password reset link",
    backToSignIn: "Back to sign in",
    serviceUnavailable: "Auth service is not running. Start the backend and try again."
  },
  es: {
    requestTitle: "Restablecer contraseña",
    requestSummary: "Ingresa tu correo o usuario y enviaremos un enlace si la cuenta existe.",
    identifierLabel: "Correo o usuario",
    requestSubmit: "Enviar enlace",
    requestSent: "Si esa cuenta existe, se envió un enlace para restablecer la contraseña.",
    requestError: "No se pudo enviar el correo para restablecer la contraseña en este momento.",
    resetTitle: "Elige una nueva contraseña",
    resetSummary: "Ingresa una nueva contraseña que cumpla los requisitos de seguridad.",
    newPasswordLabel: "Nueva contraseña",
    confirmPasswordLabel: "Confirmar nueva contraseña",
    resetSubmit: "Restablecer contraseña",
    resetSuccess: "Contraseña restablecida. Ya puedes iniciar sesión.",
    resetError: "Este enlace para restablecer la contraseña expiró o ya fue usado.",
    forgotPassword: "¿Olvidaste tu contraseña?",
    passwordGuidance: "La contraseña debe incluir:",
    passwordIncomplete: "Completa todos los requisitos de la contraseña.",
    passwordMismatch: "Ambos campos de contraseña deben coincidir.",
    devResetLink: "Abrir enlace local para restablecer contraseña",
    backToSignIn: "Volver a iniciar sesión",
    serviceUnavailable: "El servicio de autenticación no está corriendo. Inicia el backend e inténtalo de nuevo."
  }
};

const app = document.querySelector<HTMLDivElement>("#auth-app");

if (!app) {
  throw new Error("Auth app root was not found.");
}

const getStoredLanguage = (): Language => {
  const language = window.localStorage.getItem(languageStorageKey);
  return language === "es" ? "es" : "en";
};

const renderPasswordRequirements = (password: string, requirements: PasswordRequirement[]) =>
  requirements
    .map((requirement) => {
      const isMet = requirement.test(password);

      return `
        <li data-valid="${isMet}">
          <span aria-hidden="true">${isMet ? "&#10003;" : "&#8226;"}</span>
          ${requirement.message}
        </li>
      `;
    })
    .join("");

const renderLanguageMenu = (language: Language, copy: AuthCopy) => {
  const selectedLanguage = languageOptions.find((option) => option.code === language);

  return `
    <div class="language-control">
      <button
        class="language-trigger"
        id="language-trigger"
        type="button"
        aria-expanded="false"
        aria-haspopup="menu"
        aria-label="${copy.languageLabel}"
      >
        <img src="${selectedLanguage?.flagSrc}" alt="${selectedLanguage?.flagAlt}" />
        <span>${selectedLanguage?.label}</span>
      </button>
      <div class="language-menu" id="language-menu" role="menu" hidden>
        ${languageOptions
          .map(
            (option) => `
              <button
                class="language-option"
                type="button"
                role="menuitem"
                data-language="${option.code}"
                aria-current="${option.code === language ? "true" : "false"}"
              >
                <img src="${option.flagSrc}" alt="${option.flagAlt}" />
                <span>${option.label}</span>
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
};

const wireLanguageMenu = (rerender: () => void) => {
  const languageTrigger = document.querySelector<HTMLButtonElement>("#language-trigger");
  const languageMenu = document.querySelector<HTMLDivElement>("#language-menu");
  const languageButtons = document.querySelectorAll<HTMLButtonElement>("[data-language]");

  const closeLanguageMenu = () => {
    languageMenu?.setAttribute("hidden", "");
    languageTrigger?.setAttribute("aria-expanded", "false");
  };

  languageTrigger?.addEventListener("click", () => {
    const isOpen = languageMenu?.hasAttribute("hidden") === false;

    if (isOpen) {
      closeLanguageMenu();
      return;
    }

    languageMenu?.removeAttribute("hidden");
    languageTrigger.setAttribute("aria-expanded", "true");
  });

  languageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextLanguage = button.dataset.language === "es" ? "es" : "en";

      window.localStorage.setItem(languageStorageKey, nextLanguage);
      rerender();
    });
  });
};

const wirePasswordControls = (requirements: PasswordRequirement[]) => {
  const passwordInput = document.querySelector<HTMLInputElement>("#password-input");
  const passwordToggle = document.querySelector<HTMLButtonElement>(".password-toggle");
  const requirementsList = document.querySelector<HTMLUListElement>("#password-requirements");

  passwordInput?.addEventListener("input", () => {
    if (requirementsList) {
      requirementsList.innerHTML = renderPasswordRequirements(passwordInput.value, requirements);
    }
  });

  passwordToggle?.addEventListener("click", () => {
    if (!passwordInput) {
      return;
    }

    const isHidden = passwordInput.type === "password";

    passwordInput.type = isHidden ? "text" : "password";
    passwordToggle.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
    passwordToggle.setAttribute("aria-pressed", String(isHidden));
    passwordToggle.innerHTML = isHidden ? eyeSlashIcon : eyeIcon;
  });
};

const renderVerificationPage = (language: Language = getStoredLanguage()) => {
  const copy = authCopy[language].signin;
  const statusMessage =
    verificationStatus === "success"
      ? copy.verificationSuccess
      : verificationStatus === "error"
        ? copy.verificationError
        : copy.verificationLoading;

  document.documentElement.lang = language;

  app.innerHTML = `
    <section class="auth-shell">
      <header class="auth-topbar">
        <a class="brand" href="${mainAppUrl}" aria-label="${copy.brandAria}">
          <span class="brand-mark" aria-hidden="true">26</span>
          <span>World Cup Picks</span>
        </a>
        <div class="topbar-actions">
          ${renderLanguageMenu(language, copy)}
        </div>
      </header>

      <section class="auth-layout" aria-labelledby="auth-title">
        <div class="auth-panel">
          <div class="auth-heading">
            <p class="eyebrow">${copy.eyebrow}</p>
            <h1 id="auth-title">${copy.verificationTitle}</h1>
          </div>
          <p class="form-message" data-state="${verificationStatus === "error" ? "error" : verificationStatus === "success" ? "success" : "info"}">
            ${statusMessage}
          </p>
          <p class="alternate-action">
            <button type="button" id="back-to-signin">${copy.backToSignIn}</button>
          </p>
        </div>
      </section>
    </section>
  `;

  document.querySelector<HTMLButtonElement>("#back-to-signin")?.addEventListener("click", () => {
    window.history.replaceState({}, "", window.location.pathname);
    render("signin", language);
  });

  document.querySelectorAll<HTMLButtonElement>("[data-language]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextLanguage = button.dataset.language === "es" ? "es" : "en";

      window.localStorage.setItem(languageStorageKey, nextLanguage);
      renderVerificationPage(nextLanguage);
    });
  });
};

const renderPasswordResetRequestPage = (language: Language = getStoredLanguage()) => {
  const copy = authCopy[language].signin;
  const resetCopy = passwordResetCopy[language];

  document.documentElement.lang = language;

  app.innerHTML = `
    <section class="auth-shell">
      <header class="auth-topbar">
        <a class="brand" href="${mainAppUrl}" aria-label="${copy.brandAria}">
          <span class="brand-mark" aria-hidden="true">26</span>
          <span>World Cup Picks</span>
        </a>
        <div class="topbar-actions">
          ${renderLanguageMenu(language, copy)}
        </div>
      </header>

      <section class="auth-layout" aria-labelledby="auth-title">
        <div class="auth-panel">
          <div class="auth-heading">
            <p class="eyebrow">${copy.eyebrow}</p>
            <h1 id="auth-title">${resetCopy.requestTitle}</h1>
            <p>${resetCopy.requestSummary}</p>
          </div>

          <form class="auth-form" id="password-reset-request-form" aria-label="${resetCopy.requestTitle}">
            <label>
              <span>${resetCopy.identifierLabel}</span>
              <input type="text" name="identifier" autocomplete="username" required />
            </label>
            <p class="form-message" id="form-message" role="status" data-state="${resetFeedback?.state ?? ""}">
              ${resetFeedback?.text ?? ""}
            </p>
            ${
              devPasswordResetUrl
                ? `<a class="dev-verification-link" href="${devPasswordResetUrl}">${resetCopy.devResetLink}</a>`
                : ""
            }
            <button class="submit-button" type="submit">${resetCopy.requestSubmit}</button>
          </form>

          <p class="alternate-action">
            <button type="button" id="back-to-signin">${resetCopy.backToSignIn}</button>
          </p>
        </div>
      </section>
    </section>
  `;

  wireLanguageMenu(() => renderPasswordResetRequestPage(getStoredLanguage()));
  document.querySelector<HTMLButtonElement>("#back-to-signin")?.addEventListener("click", () => {
    resetFeedback = null;
    devPasswordResetUrl = "";
    window.history.replaceState({}, "", window.location.pathname);
    render("signin", language);
  });
  document.querySelector<HTMLFormElement>("#password-reset-request-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const response = await fetch(`${authApiUrl}/password-resets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ identifier: String(formData.get("identifier") ?? "") })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? resetCopy.requestError);
      }

      devPasswordResetUrl = result.devResetUrl ?? "";
      resetFeedback = { state: "success", text: resetCopy.requestSent };
      renderPasswordResetRequestPage(language);
    } catch (error) {
      resetFeedback = {
        state: "error",
        text: error instanceof Error ? error.message : resetCopy.serviceUnavailable
      };
      renderPasswordResetRequestPage(language);
    }
  });
};

const renderPasswordResetPage = (token: string, language: Language = getStoredLanguage()) => {
  const copy = authCopy[language].signin;
  const resetCopy = passwordResetCopy[language];

  document.documentElement.lang = language;

  app.innerHTML = `
    <section class="auth-shell">
      <header class="auth-topbar">
        <a class="brand" href="${mainAppUrl}" aria-label="${copy.brandAria}">
          <span class="brand-mark" aria-hidden="true">26</span>
          <span>World Cup Picks</span>
        </a>
        <div class="topbar-actions">
          ${renderLanguageMenu(language, copy)}
        </div>
      </header>

      <section class="auth-layout" aria-labelledby="auth-title">
        <div class="auth-panel">
          <div class="auth-heading">
            <p class="eyebrow">${copy.eyebrow}</p>
            <h1 id="auth-title">${resetCopy.resetTitle}</h1>
            <p>${resetCopy.resetSummary}</p>
          </div>

          <form class="auth-form" id="password-reset-form" aria-label="${resetCopy.resetTitle}">
            <label>
              <span>${resetCopy.newPasswordLabel}</span>
              <span class="password-field">
                <input id="password-input" type="password" name="password" autocomplete="new-password" required />
                <button class="password-toggle" type="button" aria-label="Show password" aria-pressed="false">
                  ${eyeIcon}
                </button>
              </span>
            </label>
            <label>
              <span>${resetCopy.confirmPasswordLabel}</span>
              <input type="password" name="confirmPassword" autocomplete="new-password" required />
            </label>
            <div class="password-guidance" aria-live="polite">
              <p>${resetCopy.passwordGuidance}</p>
              <ul id="password-requirements">
                ${renderPasswordRequirements("", copy.passwordRequirements)}
              </ul>
            </div>
            <p class="form-message" id="form-message" role="status" data-state="${resetFeedback?.state ?? ""}">
              ${resetFeedback?.text ?? ""}
            </p>
            <button class="submit-button" type="submit">${resetCopy.resetSubmit}</button>
          </form>

          <p class="alternate-action">
            <button type="button" id="back-to-signin">${resetCopy.backToSignIn}</button>
          </p>
        </div>
      </section>
    </section>
  `;

  wireLanguageMenu(() => renderPasswordResetPage(token, getStoredLanguage()));
  wirePasswordControls(copy.passwordRequirements);
  document.querySelector<HTMLButtonElement>("#back-to-signin")?.addEventListener("click", () => {
    resetFeedback = null;
    window.history.replaceState({}, "", window.location.pathname);
    render("signin", language);
  });
  document.querySelector<HTMLFormElement>("#password-reset-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const missingRequirements = copy.passwordRequirements.filter((requirement) => !requirement.test(password));

    if (missingRequirements.length > 0) {
      resetFeedback = { state: "error", text: resetCopy.passwordIncomplete };
      renderPasswordResetPage(token, language);
      return;
    }

    if (password !== confirmPassword) {
      resetFeedback = { state: "error", text: resetCopy.passwordMismatch };
      renderPasswordResetPage(token, language);
      return;
    }

    try {
      const response = await fetch(`${authApiUrl}/password-resets/${encodeURIComponent(token)}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? resetCopy.resetError);
      }

      resetFeedback = { state: "success", text: resetCopy.resetSuccess };
      window.history.replaceState({}, "", window.location.pathname);
      render("signin", language);
    } catch (error) {
      resetFeedback = {
        state: "error",
        text: error instanceof Error ? error.message : resetCopy.serviceUnavailable
      };
      renderPasswordResetPage(token, language);
    }
  });
};

const render = (mode: AuthMode, language: Language = getStoredLanguage()) => {
  const copy = authCopy[language][mode];
  const isCreateMode = mode === "create";
  const alternateMode: AuthMode = isCreateMode ? "signin" : "create";

  document.documentElement.lang = language;

  app.innerHTML = `
    <section class="auth-shell">
      <header class="auth-topbar">
        <a class="brand" href="${mainAppUrl}" aria-label="${copy.brandAria}">
          <span class="brand-mark" aria-hidden="true">26</span>
          <span>World Cup Picks</span>
        </a>
        <div class="topbar-actions">
          ${renderLanguageMenu(language, copy)}
        </div>
      </header>

      <section class="auth-layout" aria-labelledby="auth-title">
        <div class="auth-panel">
          <div class="auth-tabs" role="tablist" aria-label="Account mode">
            <button
              class="auth-tab"
              type="button"
              role="tab"
              data-mode="signin"
              aria-selected="${mode === "signin"}"
            >
              ${copy.signInTab}
            </button>
            <button
              class="auth-tab"
              type="button"
              role="tab"
              data-mode="create"
              aria-selected="${mode === "create"}"
            >
              ${copy.createTab}
            </button>
          </div>

          <div class="auth-heading">
            <p class="eyebrow">${copy.eyebrow}</p>
            <h1 id="auth-title">${copy.heading}</h1>
            <p>${copy.summary}</p>
          </div>

          <form class="auth-form" aria-label="${copy.heading}">
            ${
              isCreateMode
                ? `
                  <label>
                    <span>${copy.nameLabel}</span>
                    <input type="text" name="displayName" autocomplete="name" required />
                  </label>
                  <label>
                    <span>${copy.usernameLabel}</span>
                    <input type="text" name="username" autocomplete="username" required />
                  </label>
                `
                : ""
            }
            ${
              isCreateMode
                ? `
                  <label>
                    <span>${copy.emailLabel}</span>
                    <input type="email" name="email" autocomplete="email" required />
                  </label>
                `
                : `
                  <label>
                    <span>${copy.identifierLabel}</span>
                    <input type="text" name="identifier" autocomplete="username" required />
                  </label>
                `
            }
            <label>
              <span>${copy.passwordLabel}</span>
              <span class="password-field">
                <input
                  id="password-input"
                  type="password"
                  name="password"
                  autocomplete="${isCreateMode ? "new-password" : "current-password"}"
                  required
                />
                <button
                  class="password-toggle"
                  type="button"
                  aria-label="Show password"
                  aria-pressed="false"
                >
                  ${eyeIcon}
                </button>
              </span>
            </label>
            ${
              !isCreateMode
                ? `
                  <p class="alternate-action compact-auth-action">
                    <button type="button" id="forgot-password">${passwordResetCopy[language].forgotPassword}</button>
                  </p>
                `
                : ""
            }
            ${
              isCreateMode
                ? `
                  <div class="password-guidance" aria-live="polite">
                    <p>${copy.passwordGuidance}</p>
                    <ul id="password-requirements">
                      ${renderPasswordRequirements("", copy.passwordRequirements)}
                    </ul>
                  </div>
                `
                : ""
            }
            <p
              class="form-message"
              id="form-message"
              role="status"
              data-state="${verificationFeedback?.state ?? ""}"
            >${verificationFeedback?.text ?? ""}</p>
            ${
              pendingVerificationEmail
                ? `
                  <div class="verification-actions">
                    <p>${copy.verificationInstructions(pendingVerificationEmail)}</p>
                    <button class="secondary-submit-button" id="resend-verification" type="button">
                      ${copy.resendVerification}
                    </button>
                    ${
                      devVerificationUrl
                        ? `<a class="dev-verification-link" href="${devVerificationUrl}">${copy.devVerificationLink}</a>`
                        : ""
                    }
                  </div>
                `
                : ""
            }
            <button class="submit-button" type="submit">${copy.submit}</button>
          </form>

          <p class="alternate-action">
            <span>${copy.alternatePrompt}</span>
            <button type="button" data-mode="${alternateMode}">${copy.alternateAction}</button>
          </p>
        </div>
      </section>
    </section>
  `;

  const passwordInput = document.querySelector<HTMLInputElement>("#password-input");
  const passwordToggle = document.querySelector<HTMLButtonElement>(".password-toggle");
  const requirementsList = document.querySelector<HTMLUListElement>("#password-requirements");
  const formMessage = document.querySelector<HTMLParagraphElement>("#form-message");
  const languageTrigger = document.querySelector<HTMLButtonElement>("#language-trigger");
  const languageMenu = document.querySelector<HTMLDivElement>("#language-menu");
  const languageButtons = document.querySelectorAll<HTMLButtonElement>("[data-language]");
  const resendVerificationButton = document.querySelector<HTMLButtonElement>("#resend-verification");
  const forgotPasswordButton = document.querySelector<HTMLButtonElement>("#forgot-password");

  const closeLanguageMenu = () => {
    languageMenu?.setAttribute("hidden", "");
    languageTrigger?.setAttribute("aria-expanded", "false");
  };

  languageTrigger?.addEventListener("click", () => {
    const isOpen = languageMenu?.hasAttribute("hidden") === false;

    if (isOpen) {
      closeLanguageMenu();
      return;
    }

    languageMenu?.removeAttribute("hidden");
    languageTrigger.setAttribute("aria-expanded", "true");
  });

  languageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextLanguage = button.dataset.language === "es" ? "es" : "en";

      window.localStorage.setItem(languageStorageKey, nextLanguage);
      render(mode, nextLanguage);
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      verificationFeedback = null;
      render(button.dataset.mode === "create" ? "create" : "signin", language);
    });
  });

  forgotPasswordButton?.addEventListener("click", () => {
    resetFeedback = null;
    devPasswordResetUrl = "";
    window.history.replaceState({}, "", window.location.pathname);
    renderPasswordResetRequestPage(language);
  });

  passwordInput?.addEventListener("input", () => {
    if (requirementsList) {
      requirementsList.innerHTML = renderPasswordRequirements(
        passwordInput.value,
        copy.passwordRequirements
      );
    }
  });

  passwordToggle?.addEventListener("click", () => {
    if (!passwordInput) {
      return;
    }

    const isHidden = passwordInput.type === "password";

    passwordInput.type = isHidden ? "text" : "password";
    passwordToggle.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
    passwordToggle.setAttribute("aria-pressed", String(isHidden));
    passwordToggle.innerHTML = isHidden ? eyeSlashIcon : eyeIcon;
  });

  resendVerificationButton?.addEventListener("click", async () => {
    if (!pendingVerificationEmail) {
      return;
    }

    try {
      const response = await fetch(`${authApiUrl}/email-verifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: pendingVerificationEmail })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? copy.verificationSendError);
      }

      devVerificationUrl = result.devVerificationUrl ?? "";
      verificationFeedback = {
        state: "success",
        text: copy.verificationSent
      };
      render(mode, language);
    } catch (error) {
      verificationFeedback = {
        state: "error",
        text: error instanceof Error ? error.message : copy.verificationSendError
      };
      render(mode, language);
    }
  });

  document.querySelector<HTMLFormElement>(".auth-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isCreateMode) {
      const form = event.currentTarget as HTMLFormElement;
      const formData = new FormData(form);

      let response: Response;

      try {
        response = await fetch(`${authApiUrl}/sessions`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            identifier: String(formData.get("identifier") ?? ""),
            password: String(formData.get("password") ?? "")
          })
        });
      } catch {
        if (formMessage) {
          formMessage.dataset.state = "error";
          formMessage.textContent = copy.serviceUnavailable;
        }
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        if (formMessage) {
          formMessage.dataset.state = "error";
          formMessage.textContent =
            result.code === "email_not_verified"
              ? copy.emailNotVerified
              : result.error ?? copy.genericSignInError;
        }
        if (result.code === "email_not_verified") {
          const identifier = String(formData.get("identifier") ?? "");
          pendingVerificationEmail =
            typeof result.email === "string" && result.email
              ? result.email
              : identifier.includes("@")
                ? identifier
                : "";
          devVerificationUrl = "";
          verificationFeedback = {
            state: "error",
            text: copy.emailNotVerified
          };
          render(mode, language);
        }
        return;
      }

      if (formMessage) {
        formMessage.dataset.state = "success";
        formMessage.textContent = copy.signedIn(result.user.username);
      }
      window.location.assign(mainAppUrl);
      return;
    }

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const missingRequirements = copy.passwordRequirements.filter(
      (requirement) => !requirement.test(password)
    );

    if (missingRequirements.length > 0) {
      if (formMessage) {
        formMessage.dataset.state = "error";
        formMessage.textContent = copy.passwordIncomplete;
      }
      return;
    }

    let response: Response;

    try {
      response = await fetch(`${authApiUrl}/users`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          displayName: String(formData.get("displayName") ?? ""),
          username: String(formData.get("username") ?? ""),
          email: String(formData.get("email") ?? ""),
          password
        })
      });
    } catch {
      if (formMessage) {
        formMessage.dataset.state = "error";
        formMessage.textContent = copy.serviceUnavailable;
      }
      return;
    }

    const result = await response.json();

    if (!response.ok) {
      if (formMessage) {
        formMessage.dataset.state = "error";
        formMessage.textContent = result.error ?? copy.genericCreateError;
      }
      return;
    }

    form.reset();
    pendingVerificationEmail = String(formData.get("email") ?? "");
    devVerificationUrl = result.devVerificationUrl ?? "";
    verificationFeedback = null;
    if (requirementsList) {
      requirementsList.innerHTML = renderPasswordRequirements("", copy.passwordRequirements);
    }
    render("signin", language);
  });
};

const verificationToken = new URLSearchParams(window.location.search).get("verify");
const resetToken = new URLSearchParams(window.location.search).get("reset");

if (verificationToken) {
  verificationStatus = "loading";
  renderVerificationPage();
  fetch(`${authApiUrl}/email-verifications/${encodeURIComponent(verificationToken)}`)
    .then((response) => {
      verificationStatus = response.ok ? "success" : "error";
      renderVerificationPage();
    })
    .catch(() => {
      verificationStatus = "error";
      renderVerificationPage();
    });
} else if (resetToken) {
  resetFeedback = null;
  renderPasswordResetPage(resetToken);
} else {
  render("signin");
}
