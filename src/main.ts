import "./styles.css";

type Language = "en" | "es";

type Feature = {
  title: string;
  detail: string;
};

type GroupStanding = {
  team: Record<Language, string>;
  flagSrc: string;
  flagAlt: Record<Language, string>;
  played: number;
  points: number;
  goalDifference: number;
  goalsScored: number;
  goalsAgainst: number;
};

type WorldCupGroup = {
  letter: string;
  teams: GroupStanding[];
};

type LanguageOption = {
  code: Language;
  label: string;
  flagAlt: string;
  flagSrc: string;
};

type CurrentUser = {
  id: number;
  username: string;
  email: string;
  displayName: string;
};

type CarouselMatch = {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: string;
  awayTeam: string;
  score: {
    home: number | null;
    away: number | null;
  };
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
  signOut: string;
  eyebrow: string;
  headline: string;
  summary: string;
  actions: {
    createGroup: string;
    joinGroup: string;
  };
  match: {
    title: string;
    loading: string;
    error: string;
    empty: string;
    previous: string;
    next: string;
    scheduled: string;
    final: string;
    live: string;
  };
  featuresAria: string;
  features: Feature[];
  standings: {
    title: string;
    aria: string;
    groupLabel: (letter: string) => string;
    team: string;
    played: string;
    points: string;
    goalDifference: string;
    goalsScored: string;
    goalsAgainst: string;
  };
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
const authApiUrl = "http://127.0.0.1:8001";
const matchesApiUrl = "http://127.0.0.1:8002";
let currentUser: CurrentUser | null = null;
let carouselMatches: CarouselMatch[] = [];
let activeMatchIndex = 0;
let isMatchesLoading = true;
let matchesError: string | null = null;

const signOutIcon = `
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="M10 17l5-5-5-5" />
    <path d="M15 12H3" />
  </svg>
`;

const createGroup = (letter: string, teams: Array<[string, string, string]>): WorldCupGroup => ({
  letter,
  teams: teams.map((team) => ({
    team: {
      en: team[0],
      es: team[1]
    },
    flagSrc: `/assets/flags/${team[2]}.svg`,
    flagAlt: {
      en: `${team[0]} flag`,
      es: `Bandera de ${team[1]}`
    },
    played: 0,
    points: 0,
    goalDifference: 0,
    goalsScored: 0,
    goalsAgainst: 0
  }))
});

const worldCupGroups: WorldCupGroup[] = [
  createGroup("A", [
    ["Mexico", "México", "mexico"],
    ["South Africa", "Sudáfrica", "south_africa"],
    ["South Korea", "Corea del Sur", "south_korea"],
    ["Czechia", "Chequia", "czechia"]
  ]),
  createGroup("B", [
    ["Canada", "Canadá", "canada"],
    ["Bosnia and Herzegovina", "Bosnia y Herzegovina", "bosnia"],
    ["Qatar", "Catar", "qatar"],
    ["Switzerland", "Suiza", "switzerland"]
  ]),
  createGroup("C", [
    ["Brazil", "Brasil", "brazil"],
    ["Morocco", "Marruecos", "morocco"],
    ["Haiti", "Haití", "haiti"],
    ["Scotland", "Escocia", "scotland"]
  ]),
  createGroup("D", [
    ["USA", "Estados Unidos", "usa"],
    ["Paraguay", "Paraguay", "paraguay"],
    ["Australia", "Australia", "australia"],
    ["Türkiye", "Turquía", "turkiye"]
  ]),
  createGroup("E", [
    ["Germany", "Alemania", "germany"],
    ["Curaçao", "Curazao", "curacao"],
    ["Ivory Coast", "Costa de Marfil", "ivory_coast"],
    ["Ecuador", "Ecuador", "ecuador"]
  ]),
  createGroup("F", [
    ["Netherlands", "Países Bajos", "netherlands"],
    ["Japan", "Japón", "japan"],
    ["Sweden", "Suecia", "sweden"],
    ["Tunisia", "Túnez", "tunisia"]
  ]),
  createGroup("G", [
    ["Belgium", "Bélgica", "belgium"],
    ["Egypt", "Egipto", "egypt"],
    ["Iran", "Irán", "iran"],
    ["New Zealand", "Nueva Zelanda", "new_zealand"]
  ]),
  createGroup("H", [
    ["Spain", "España", "spain"],
    ["Cape Verde", "Cabo Verde", "cape_verde"],
    ["Saudi Arabia", "Arabia Saudita", "saudi_arabia"],
    ["Uruguay", "Uruguay", "uruguay"]
  ]),
  createGroup("I", [
    ["France", "Francia", "france"],
    ["Senegal", "Senegal", "senegal"],
    ["Iraq", "Irak", "iraq"],
    ["Norway", "Noruega", "norway"]
  ]),
  createGroup("J", [
    ["Argentina", "Argentina", "argentina"],
    ["Algeria", "Argelia", "algeria"],
    ["Austria", "Austria", "austria"],
    ["Jordan", "Jordania", "jordan"]
  ]),
  createGroup("K", [
    ["Portugal", "Portugal", "portugal"],
    ["DR Congo", "RD Congo", "dr_congo"],
    ["Uzbekistan", "Uzbekistán", "uzbekistan"],
    ["Colombia", "Colombia", "colombia"]
  ]),
  createGroup("L", [
    ["England", "Inglaterra", "england"],
    ["Croatia", "Croacia", "croatia"],
    ["Ghana", "Ghana", "ghana"],
    ["Panama", "Panamá", "panama"]
  ])
];

const normalizeTeamName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const teamLookup = new Map<string, GroupStanding>();

worldCupGroups.forEach((group) => {
  group.teams.forEach((team) => {
    teamLookup.set(normalizeTeamName(team.team.en), team);
    teamLookup.set(normalizeTeamName(team.team.es), team);
  });
});

teamLookup.set(normalizeTeamName("United States"), teamLookup.get(normalizeTeamName("USA")) as GroupStanding);
teamLookup.set(normalizeTeamName("United States of America"), teamLookup.get(normalizeTeamName("USA")) as GroupStanding);
teamLookup.set(
  normalizeTeamName("Bosnia-Herzegovina"),
  teamLookup.get(normalizeTeamName("Bosnia and Herzegovina")) as GroupStanding
);
teamLookup.set(normalizeTeamName("Cote d'Ivoire"), teamLookup.get(normalizeTeamName("Ivory Coast")) as GroupStanding);
teamLookup.set(normalizeTeamName("Côte d'Ivoire"), teamLookup.get(normalizeTeamName("Ivory Coast")) as GroupStanding);
teamLookup.set(normalizeTeamName("Korea Republic"), teamLookup.get(normalizeTeamName("South Korea")) as GroupStanding);
teamLookup.set(normalizeTeamName("Czech Republic"), teamLookup.get(normalizeTeamName("Czechia")) as GroupStanding);

const copy: Record<Language, Copy> = {
  en: {
    brandAria: "World Cup Picks home",
    navAria: "Main navigation",
    matchAria: "World Cup match carousel",
    languageLabel: "Language",
    nav: {
      groups: "Groups",
      scoring: "Scoring",
      matches: "Matches"
    },
    signIn: "Sign in",
    signOut: "Sign out",
    eyebrow: "FIFA World Cup 2026",
    headline: "Run your tournament pool from kickoff to final whistle.",
    summary:
      "Invite your people, predict every match, and use a scoring system that fits how your group likes to compete.",
    actions: {
      createGroup: "Create a group",
      joinGroup: "Join with a code"
    },
    match: {
      title: "Upcoming matches",
      loading: "Loading World Cup matches...",
      error: "Matches are not available right now.",
      empty: "No World Cup matches found.",
      previous: "Previous match",
      next: "Next match",
      scheduled: "Scheduled",
      final: "Final",
      live: "Live"
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
    ],
    standings: {
      title: "World Cup groups",
      aria: "World Cup group standings",
      groupLabel: (letter) => `Group ${letter}`,
      team: "Team",
      played: "P",
      points: "Pts",
      goalDifference: "GD",
      goalsScored: "GF",
      goalsAgainst: "GA"
    }
  },
  es: {
    brandAria: "Inicio de World Cup Picks",
    navAria: "Navegación principal",
    matchAria: "Carrusel de partidos del Mundial",
    languageLabel: "Idioma",
    nav: {
      groups: "Grupos",
      scoring: "Puntuación",
      matches: "Partidos"
    },
    signIn: "Iniciar sesión",
    signOut: "Cerrar sesión",
    eyebrow: "Copa Mundial FIFA 2026",
    headline: "Organiza tu polla mundialista desde el primer partido hasta la final.",
    summary:
      "Invita a tu gente, pronostica cada partido y usa un sistema de puntos que se ajuste a la forma en que compite tu grupo.",
    actions: {
      createGroup: "Crear grupo",
      joinGroup: "Unirse con código"
    },
    match: {
      title: "Próximos partidos",
      loading: "Cargando partidos del Mundial...",
      error: "Los partidos no están disponibles en este momento.",
      empty: "No se encontraron partidos del Mundial.",
      previous: "Partido anterior",
      next: "Siguiente partido",
      scheduled: "Programado",
      final: "Final",
      live: "En vivo"
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
    ],
    standings: {
      title: "Grupos del Mundial",
      aria: "Tabla de posiciones de los grupos del Mundial",
      groupLabel: (letter) => `Grupo ${letter}`,
      team: "Equipo",
      played: "PJ",
      points: "Pts",
      goalDifference: "DG",
      goalsScored: "GF",
      goalsAgainst: "GC"
    }
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

const getCurrentPage = () =>
  document.body.dataset.page === "groups" || window.location.pathname.endsWith("/groups.html")
    ? "groups"
    : "home";

const getTeamStanding = (teamName: string) => teamLookup.get(normalizeTeamName(teamName));

const renderTeamBadge = (teamName: string, language: Language) => {
  const team = getTeamStanding(teamName);

  if (!team) {
    return `<span class="match-team-code" aria-hidden="true">${teamName.slice(0, 3).toUpperCase()}</span>`;
  }

  return `<img class="match-team-flag" src="${team.flagSrc}" alt="${team.flagAlt[language]}" />`;
};

const getTeamDisplayName = (teamName: string, language: Language) => {
  const team = getTeamStanding(teamName);

  return team ? team.team[language] : teamName;
};

const formatMatchDate = (utcDate: string, language: Language) => {
  const date = new Date(utcDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(language === "es" ? "es-CO" : "en-US", {
    timeZone: "America/Bogota",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(date);
};

const getMatchStatusLabel = (status: string, selectedCopy: Copy) => {
  if (status === "FINISHED") return selectedCopy.match.final;
  if (status === "IN_PLAY" || status === "PAUSED") return selectedCopy.match.live;

  return selectedCopy.match.scheduled;
};

const getVisibleMatch = () => carouselMatches[activeMatchIndex] ?? carouselMatches[0];

const renderMatchCarousel = (selectedCopy: Copy, language: Language) => {
  if (isMatchesLoading) {
    return `
      <aside class="match-preview match-carousel" aria-label="${selectedCopy.matchAria}">
        <div class="match-empty-state">${selectedCopy.match.loading}</div>
      </aside>
    `;
  }

  if (matchesError) {
    return `
      <aside class="match-preview match-carousel" aria-label="${selectedCopy.matchAria}">
        <div class="match-empty-state">${selectedCopy.match.error}</div>
      </aside>
    `;
  }

  const match = getVisibleMatch();

  if (!match) {
    return `
      <aside class="match-preview match-carousel" aria-label="${selectedCopy.matchAria}">
        <div class="match-empty-state">${selectedCopy.match.empty}</div>
      </aside>
    `;
  }

  const hasScore = match.score.home !== null && match.score.away !== null;
  const matchDate = formatMatchDate(match.utcDate, language);

  return `
    <aside class="match-preview match-carousel" aria-label="${selectedCopy.matchAria}">
      <div class="match-preview-header">
        <span>${selectedCopy.match.title}</span>
        <strong>${getMatchStatusLabel(match.status, selectedCopy)}</strong>
      </div>
      <div class="match-meta">
        <span>${match.group ?? match.stage}</span>
        <strong>${matchDate}</strong>
      </div>
      <div class="teams">
        <div class="team-row">
          ${renderTeamBadge(match.homeTeam, language)}
          <span>${getTeamDisplayName(match.homeTeam, language)}</span>
          <strong>${hasScore ? match.score.home : "–"}</strong>
        </div>
        <div class="team-row">
          ${renderTeamBadge(match.awayTeam, language)}
          <span>${getTeamDisplayName(match.awayTeam, language)}</span>
          <strong>${hasScore ? match.score.away : "–"}</strong>
        </div>
      </div>
      <div class="carousel-controls">
        <button class="carousel-button" type="button" data-carousel-action="previous" aria-label="${selectedCopy.match.previous}">
          ‹
        </button>
        <div class="carousel-dots" aria-hidden="true">
          ${carouselMatches
            .map((_, index) => `<span class="carousel-dot${index === activeMatchIndex ? " is-active" : ""}"></span>`)
            .join("")}
        </div>
        <button class="carousel-button" type="button" data-carousel-action="next" aria-label="${selectedCopy.match.next}">
          ›
        </button>
      </div>
    </aside>
  `;
};

const renderStandings = (selectedCopy: Copy, language: Language) => `
  <section class="groups-section" id="groups" aria-label="${selectedCopy.standings.aria}">
    <div class="section-heading">
      <p class="eyebrow">FIFA World Cup 2026</p>
      <h2>${selectedCopy.standings.title}</h2>
    </div>
    <div class="groups-grid">
      ${worldCupGroups
        .map(
          (group) => `
            <article class="group-card">
              <h3>${selectedCopy.standings.groupLabel(group.letter)}</h3>
              <div class="standings-table-wrap">
                <table class="standings-table">
                  <thead>
                    <tr>
                      <th scope="col">${selectedCopy.standings.team}</th>
                      <th scope="col">${selectedCopy.standings.played}</th>
                      <th scope="col" class="points-column">${selectedCopy.standings.points}</th>
                      <th scope="col">${selectedCopy.standings.goalDifference}</th>
                      <th scope="col">${selectedCopy.standings.goalsScored}</th>
                      <th scope="col">${selectedCopy.standings.goalsAgainst}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${group.teams
                      .map(
                        (standing) => `
                          <tr>
                            <th scope="row">
                              <span class="team-name">
                                <img class="team-flag" src="${standing.flagSrc}" alt="${standing.flagAlt[language]}" />
                                <span>${standing.team[language]}</span>
                              </span>
                            </th>
                            <td>${standing.played}</td>
                            <td class="points-column">${standing.points}</td>
                            <td>${standing.goalDifference}</td>
                            <td>${standing.goalsScored}</td>
                            <td>${standing.goalsAgainst}</td>
                          </tr>
                        `
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  </section>
`;

const renderTopbar = (selectedCopy: Copy, selectedLanguage: LanguageOption | undefined, language: Language) => `
  <header class="topbar" aria-label="${selectedCopy.navAria}">
    <a class="brand" href="/" aria-label="${selectedCopy.brandAria}">
      <span class="brand-mark" aria-hidden="true">26</span>
      <span>World Cup Picks</span>
    </a>
    <nav class="nav-links" aria-label="${selectedCopy.navAria}">
      <a href="/groups.html">${selectedCopy.nav.groups}</a>
      <a href="/#scoring">${selectedCopy.nav.scoring}</a>
      <a href="/#matches">${selectedCopy.nav.matches}</a>
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
      ${
        currentUser
          ? `
            <div class="account-control">
              <button
                class="account-trigger"
                id="account-trigger"
                type="button"
                aria-expanded="false"
                aria-haspopup="menu"
              >
                ${currentUser.username}
              </button>
              <div class="account-menu" id="account-menu" role="menu" hidden>
                <button class="signout-option" id="signout-button" type="button" role="menuitem">
                  ${signOutIcon}
                  <span>${selectedCopy.signOut}</span>
                </button>
              </div>
            </div>
          `
          : `<a class="signin-link" href="${authClientUrl}">${selectedCopy.signIn}</a>`
      }
    </div>
  </header>
`;

const renderHomePage = (selectedCopy: Copy, language: Language) => `
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

    ${renderMatchCarousel(selectedCopy, language)}
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
`;

const render = (language: Language) => {
  const selectedCopy = copy[language];
  const selectedLanguage = languageOptions.find((option) => option.code === language);
  const currentPage = getCurrentPage();

  document.documentElement.lang = language;

  app.innerHTML = `
  <section class="page-shell">
    ${renderTopbar(selectedCopy, selectedLanguage, language)}
    ${currentPage === "groups" ? renderStandings(selectedCopy, language) : renderHomePage(selectedCopy, language)}
  </section>
`;
  const languageControl = document.querySelector<HTMLDivElement>(".language-control");
  const languageTrigger = document.querySelector<HTMLButtonElement>("#language-trigger");
  const languageMenu = document.querySelector<HTMLDivElement>("#language-menu");
  const languageButtons = document.querySelectorAll<HTMLButtonElement>("[data-language]");
  const accountControl = document.querySelector<HTMLDivElement>(".account-control");
  const accountTrigger = document.querySelector<HTMLButtonElement>("#account-trigger");
  const accountMenu = document.querySelector<HTMLDivElement>("#account-menu");
  const signOutButton = document.querySelector<HTMLButtonElement>("#signout-button");
  const carouselButtons = document.querySelectorAll<HTMLButtonElement>("[data-carousel-action]");

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

  const closeAccountMenu = () => {
    accountMenu?.setAttribute("hidden", "");
    accountTrigger?.setAttribute("aria-expanded", "false");
  };

  accountTrigger?.addEventListener("click", () => {
    const isOpen = accountMenu?.hasAttribute("hidden") === false;

    if (isOpen) {
      closeAccountMenu();
      return;
    }

    accountMenu?.removeAttribute("hidden");
    accountTrigger.setAttribute("aria-expanded", "true");
  });

  accountControl?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAccountMenu();
      accountTrigger?.focus();
    }
  });

  signOutButton?.addEventListener("click", async () => {
    try {
      await fetch(`${authApiUrl}/session`, {
        method: "DELETE",
        credentials: "include"
      });
    } finally {
      currentUser = null;
      render(getStoredLanguage());
    }
  });

  carouselButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (carouselMatches.length === 0) {
        return;
      }

      const direction = button.dataset.carouselAction === "previous" ? -1 : 1;
      activeMatchIndex = (activeMatchIndex + direction + carouselMatches.length) % carouselMatches.length;
      render(getStoredLanguage());
    });
  });
};

const loadCurrentUser = async () => {
  try {
    const response = await fetch(`${authApiUrl}/session`, {
      credentials: "include"
    });

    if (!response.ok) {
      return;
    }

    const result = (await response.json()) as { user?: CurrentUser };
    currentUser = result.user ?? null;
    render(getStoredLanguage());
  } catch {
    currentUser = null;
  }
};

const loadCarouselMatches = async () => {
  isMatchesLoading = true;
  matchesError = null;
  render(getStoredLanguage());

  try {
    const response = await fetch(`${matchesApiUrl}/matches/carousel`);

    if (!response.ok) {
      throw new Error("Could not load matches.");
    }

    const result = (await response.json()) as { matches?: CarouselMatch[] };
    carouselMatches = Array.isArray(result.matches) ? result.matches : [];
    activeMatchIndex = 0;
  } catch {
    carouselMatches = [];
    activeMatchIndex = 0;
    matchesError = "unavailable";
  } finally {
    isMatchesLoading = false;
    render(getStoredLanguage());
  }
};

render(getStoredLanguage());
void loadCurrentUser();
void loadCarouselMatches();
