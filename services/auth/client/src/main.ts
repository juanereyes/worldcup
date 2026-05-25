import "./styles.css";

type AuthMode = "signin" | "create";
type Language = "en" | "es";

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
  serviceLabel: string;
  serviceHeading: string;
  serviceSummary: string;
  serviceUnavailable: string;
  passwordIncomplete: string;
  genericSignInError: string;
  genericCreateError: string;
  signedIn: (username: string) => string;
  accountCreated: (username: string) => string;
  passwordRequirements: PasswordRequirement[];
};

const authApiUrl = "http://127.0.0.1:8001";
const mainAppUrl = "http://127.0.0.1:5173/";
const languageStorageKey = "worldcup-language";

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
      serviceLabel: "Auth Service",
      serviceHeading: "Separate client and Python API",
      serviceSummary: "New users are stored in this service's SQLite database with unique usernames and emails.",
      serviceUnavailable: "Auth service is not running. Start the backend and try again.",
      passwordIncomplete: "Please complete all password requirements.",
      genericSignInError: "Could not sign in.",
      genericCreateError: "Could not create the account.",
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
      serviceLabel: "Auth Service",
      serviceHeading: "Separate client and Python API",
      serviceSummary: "New users are stored in this service's SQLite database with unique usernames and emails.",
      serviceUnavailable: "Auth service is not running. Start the backend and try again.",
      passwordIncomplete: "Please complete all password requirements.",
      genericSignInError: "Could not sign in.",
      genericCreateError: "Could not create the account.",
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
      serviceLabel: "Servicio de autenticación",
      serviceHeading: "Cliente separado y API en Python",
      serviceSummary: "Los usuarios nuevos se guardan en la base SQLite de este servicio con usuarios y correos únicos.",
      serviceUnavailable: "El servicio de autenticación no está corriendo. Inicia el backend e inténtalo de nuevo.",
      passwordIncomplete: "Completa todos los requisitos de la contraseña.",
      genericSignInError: "No se pudo iniciar sesión.",
      genericCreateError: "No se pudo crear la cuenta.",
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
      serviceLabel: "Servicio de autenticación",
      serviceHeading: "Cliente separado y API en Python",
      serviceSummary: "Los usuarios nuevos se guardan en la base SQLite de este servicio con usuarios y correos únicos.",
      serviceUnavailable: "El servicio de autenticación no está corriendo. Inicia el backend e inténtalo de nuevo.",
      passwordIncomplete: "Completa todos los requisitos de la contraseña.",
      genericSignInError: "No se pudo iniciar sesión.",
      genericCreateError: "No se pudo crear la cuenta.",
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
            <p class="form-message" id="form-message" role="status"></p>
            <button class="submit-button" type="submit">${copy.submit}</button>
          </form>

          <p class="alternate-action">
            <span>${copy.alternatePrompt}</span>
            <button type="button" data-mode="${alternateMode}">${copy.alternateAction}</button>
          </p>
        </div>

        <aside class="service-card" aria-label="${copy.serviceLabel}">
          <span>${copy.serviceLabel}</span>
          <strong>${copy.serviceHeading}</strong>
          <p>${copy.serviceSummary}</p>
        </aside>
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
      render(button.dataset.mode === "create" ? "create" : "signin", language);
    });
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
          formMessage.textContent = result.error ?? copy.genericSignInError;
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
    if (requirementsList) {
      requirementsList.innerHTML = renderPasswordRequirements("", copy.passwordRequirements);
    }
    if (formMessage) {
      formMessage.dataset.state = "success";
      formMessage.textContent = copy.accountCreated(result.user.username);
    }
    window.location.assign(mainAppUrl);
  });
};

render("signin");
