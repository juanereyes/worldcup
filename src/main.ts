import "./styles.css";

type Language = "en" | "es";

type Feature = {
  title: string;
  detail: string;
};

type LanguageOption = {
  code: Language;
  label: string;
  flagAlt: string;
  flagSrc: string;
};

type Copy = {
  brandAria: string;
  navAria: string;
  matchAria: string;
  languageLabel: string;
  nav: {
    groups: string;
    scoring: string;
    matches: string;
  };
  signIn: string;
  eyebrow: string;
  headline: string;
  summary: string;
  actions: {
    createGroup: string;
    joinGroup: string;
  };
  match: {
    stage: string;
    closes: string;
    homeTeam: string;
    awayTeam: string;
    scoreType: string;
  };
  featuresAria: string;
  features: Feature[];
};

const languageOptions: LanguageOption[] = [
  {
    code: "en",
    label: "EN",
    flagAlt: "United Kingdom flag",
    flagSrc: "/assets/flags/united-kingdom.svg"
  },
  {
    code: "es",
    label: "ES",
    flagAlt: "Spain flag",
    flagSrc: "/assets/flags/spain.svg"
  }
];

const authClientUrl = "http://127.0.0.1:5174/";

const copy: Record<Language, Copy> = {
  en: {
    brandAria: "World Cup Picks home",
    navAria: "Main navigation",
    matchAria: "Example match card",
    languageLabel: "Language",
    nav: {
      groups: "Groups",
      scoring: "Scoring",
      matches: "Matches"
    },
    signIn: "Sign in",
    eyebrow: "FIFA World Cup 2026",
    headline: "Run your tournament pool from kickoff to final whistle.",
    summary:
      "Invite your people, predict every match, and use a scoring system that fits how your group likes to compete.",
    actions: {
      createGroup: "Create a group",
      joinGroup: "Join with a code"
    },
    match: {
      stage: "Group Stage",
      closes: "Prediction closes in 2h 14m",
      homeTeam: "United States",
      awayTeam: "Colombia",
      scoreType: "Exact score"
    },
    featuresAria: "Core features",
    features: [
      {
        title: "Private groups",
        detail: "Create groups for friends, family, offices, or tournament pools."
      },
      {
        title: "Match predictions",
        detail: "Pick scores before kickoff and track every result through the tournament."
      },
      {
        title: "Custom scoring",
        detail: "Shape the point rules around exact scores, winners, draws, and bonuses."
      }
    ]
  },
  es: {
    brandAria: "Inicio de World Cup Picks",
    navAria: "Navegación principal",
    matchAria: "Tarjeta de partido de ejemplo",
    languageLabel: "Idioma",
    nav: {
      groups: "Grupos",
      scoring: "Puntuación",
      matches: "Partidos"
    },
    signIn: "Iniciar sesión",
    eyebrow: "Copa Mundial FIFA 2026",
    headline: "Organiza tu polla mundialista desde el primer partido hasta la final.",
    summary:
      "Invita a tu gente, pronostica cada partido y usa un sistema de puntos que se ajuste a la forma en que compite tu grupo.",
    actions: {
      createGroup: "Crear grupo",
      joinGroup: "Unirse con código"
    },
    match: {
      stage: "Fase de grupos",
      closes: "El pronóstico cierra en 2h 14m",
      homeTeam: "Estados Unidos",
      awayTeam: "Colombia",
      scoreType: "Marcador exacto"
    },
    featuresAria: "Funciones principales",
    features: [
      {
        title: "Grupos privados",
        detail: "Crea grupos para amigos, familia, oficinas o pools del torneo."
      },
      {
        title: "Pronósticos de partidos",
        detail: "Elige marcadores antes del pitazo inicial y sigue cada resultado del torneo."
      },
      {
        title: "Puntuación personalizada",
        detail: "Define reglas para marcadores exactos, ganadores, empates y bonificaciones."
      }
    ]
  }
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root was not found.");
}

const getStoredLanguage = (): Language => {
  const language = window.localStorage.getItem("worldcup-language");
  return language === "es" ? "es" : "en";
};

const render = (language: Language) => {
  const selectedCopy = copy[language];
  const selectedLanguage = languageOptions.find((option) => option.code === language);

  document.documentElement.lang = language;

  app.innerHTML = `
  <section class="page-shell">
    <header class="topbar" aria-label="${selectedCopy.navAria}">
      <a class="brand" href="/" aria-label="${selectedCopy.brandAria}">
        <span class="brand-mark" aria-hidden="true">26</span>
        <span>World Cup Picks</span>
      </a>
      <nav class="nav-links" aria-label="${selectedCopy.navAria}">
        <a href="#groups">${selectedCopy.nav.groups}</a>
        <a href="#scoring">${selectedCopy.nav.scoring}</a>
        <a href="#matches">${selectedCopy.nav.matches}</a>
      </nav>
      <div class="topbar-actions">
        <div class="language-control">
          <button
            class="language-trigger"
            id="language-trigger"
            type="button"
            aria-expanded="false"
            aria-haspopup="menu"
            aria-label="${selectedCopy.languageLabel}"
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
        <a class="signin-link" href="${authClientUrl}">${selectedCopy.signIn}</a>
      </div>
    </header>

    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">${selectedCopy.eyebrow}</p>
        <h1 id="hero-title">${selectedCopy.headline}</h1>
        <p class="hero-summary">
          ${selectedCopy.summary}
        </p>
        <div class="hero-actions">
          <a class="primary-action" href="#create-group">${selectedCopy.actions.createGroup}</a>
          <a class="secondary-action" href="#join-group">${selectedCopy.actions.joinGroup}</a>
        </div>
      </div>

      <aside class="match-preview" aria-label="${selectedCopy.matchAria}">
        <div class="match-preview-header">
          <span>${selectedCopy.match.stage}</span>
          <strong>${selectedCopy.match.closes}</strong>
        </div>
        <div class="teams">
          <div class="team-row">
            <span class="flag">USA</span>
            <span>${selectedCopy.match.homeTeam}</span>
            <strong>2</strong>
          </div>
          <div class="team-row">
            <span class="flag">COL</span>
            <span>${selectedCopy.match.awayTeam}</span>
            <strong>1</strong>
          </div>
        </div>
        <div class="score-breakdown">
          <span>${selectedCopy.match.scoreType}</span>
          <strong>+5 pts</strong>
        </div>
      </aside>
    </section>

    <section class="feature-grid" aria-label="${selectedCopy.featuresAria}">
      ${selectedCopy.features
        .map(
          (feature) => `
            <article class="feature-card">
              <h2>${feature.title}</h2>
              <p>${feature.detail}</p>
            </article>
          `
        )
        .join("")}
    </section>
  </section>
`;
  const languageControl = document.querySelector<HTMLDivElement>(".language-control");
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

  languageControl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeLanguageMenu();
      languageTrigger?.focus();
    }
  });

  languageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextLanguage = button.dataset.language === "es" ? "es" : "en";

      window.localStorage.setItem("worldcup-language", nextLanguage);
      render(nextLanguage);
    });
  });
};

render(getStoredLanguage());
