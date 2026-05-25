import "./styles.css";

type AuthMode = "signin" | "create";

type AuthCopy = {
  brandAria: string;
  signInTab: string;
  createTab: string;
  heading: string;
  summary: string;
  emailLabel: string;
  passwordLabel: string;
  nameLabel: string;
  submit: string;
  alternatePrompt: string;
  alternateAction: string;
};

const authCopy: Record<AuthMode, AuthCopy> = {
  signin: {
    brandAria: "World Cup Picks home",
    signInTab: "Sign in",
    createTab: "Create account",
    heading: "Welcome back",
    summary: "Enter your account details to continue to your World Cup groups.",
    emailLabel: "Email",
    passwordLabel: "Password",
    nameLabel: "Name",
    submit: "Sign in",
    alternatePrompt: "New to World Cup Picks?",
    alternateAction: "Create an account"
  },
  create: {
    brandAria: "World Cup Picks home",
    signInTab: "Sign in",
    createTab: "Create account",
    heading: "Create your account",
    summary: "Set up your profile before joining or creating prediction groups.",
    emailLabel: "Email",
    passwordLabel: "Password",
    nameLabel: "Name",
    submit: "Create account",
    alternatePrompt: "Already have an account?",
    alternateAction: "Sign in"
  }
};

const app = document.querySelector<HTMLDivElement>("#auth-app");

if (!app) {
  throw new Error("Auth app root was not found.");
}

const render = (mode: AuthMode) => {
  const copy = authCopy[mode];
  const isCreateMode = mode === "create";
  const alternateMode: AuthMode = isCreateMode ? "signin" : "create";

  app.innerHTML = `
    <section class="auth-shell">
      <header class="auth-topbar">
        <a class="brand" href="/" aria-label="${copy.brandAria}">
          <span class="brand-mark" aria-hidden="true">26</span>
          <span>World Cup Picks</span>
        </a>
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
            <p class="eyebrow">FIFA World Cup 2026</p>
            <h1 id="auth-title">${copy.heading}</h1>
            <p>${copy.summary}</p>
          </div>

          <form class="auth-form" aria-label="${copy.heading}">
            ${
              isCreateMode
                ? `
                  <label>
                    <span>${copy.nameLabel}</span>
                    <input type="text" name="name" autocomplete="name" />
                  </label>
                `
                : ""
            }
            <label>
              <span>${copy.emailLabel}</span>
              <input type="email" name="email" autocomplete="email" />
            </label>
            <label>
              <span>${copy.passwordLabel}</span>
              <input
                type="password"
                name="password"
                autocomplete="${isCreateMode ? "new-password" : "current-password"}"
              />
            </label>
            <button class="submit-button" type="submit">${copy.submit}</button>
          </form>

          <p class="alternate-action">
            <span>${copy.alternatePrompt}</span>
            <button type="button" data-mode="${alternateMode}">${copy.alternateAction}</button>
          </p>
        </div>

        <aside class="service-card" aria-label="Auth service status">
          <span>Auth Service</span>
          <strong>Separate client scaffold</strong>
          <p>Container, API, and SQLite wiring will be added when the backend shape is specified.</p>
        </aside>
      </section>
    </section>
  `;

  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      render(button.dataset.mode === "create" ? "create" : "signin");
    });
  });

  document.querySelector<HTMLFormElement>(".auth-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
  });
};

render("signin");
