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

type GroupStandingStats = Pick<
  GroupStanding,
  "played" | "points" | "goalDifference" | "goalsScored" | "goalsAgainst"
>;

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

type Page = "home" | "groups" | "matches" | "bracket" | "lobby";

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

type LobbyMember = {
  userId: number;
  username: string;
  role: "admin" | "member";
};

type Lobby = {
  code: string;
  name: string;
  members: LobbyMember[];
};

type JoinLobbyModalState = {
  isOpen: boolean;
  code: string;
  message: string | null;
  isSubmitting: boolean;
};

type Copy = {
  brandAria: string;
  navAria: string;
  matchAria: string;
  languageLabel: string;
  nav: {
    groups: string;
    bracket: string;
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
  matchesPage: {
    title: string;
    aria: string;
    loading: string;
    error: string;
    empty: string;
    allMatches: string;
  };
  bracketPage: {
    title: string;
    aria: string;
    loading: string;
    error: string;
    empty: string;
  };
  lobbyPage: {
    title: string;
    aria: string;
    loading: string;
    error: string;
    empty: string;
    missingCode: string;
    members: string;
    admin: string;
    groupCode: string;
  };
  lobbyActions: {
    joinTitle: string;
    codeLabel: string;
    codePlaceholder: string;
    submit: string;
    cancel: string;
    invalidCode: string;
    createError: string;
    joinError: string;
    alreadyInGroup: string;
    notFound: string;
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
const lobbiesApiUrl = "http://127.0.0.1:8003";
let currentUser: CurrentUser | null = null;
let carouselMatches: CarouselMatch[] = [];
let allMatches: CarouselMatch[] = [];
let currentLobby: Lobby | null = null;
let activeMatchIndex = 0;
let isMatchesLoading = true;
let isAllMatchesLoading = false;
let isLobbyLoading = false;
let matchesError: string | null = null;
let allMatchesError: string | null = null;
let lobbyError: string | null = null;
let joinLobbyModal: JoinLobbyModalState = {
  isOpen: false,
  code: "",
  message: null,
  isSubmitting: false
};

const emptyStandingStats = (): GroupStandingStats => ({
  played: 0,
  points: 0,
  goalDifference: 0,
  goalsScored: 0,
  goalsAgainst: 0
});

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
teamLookup.set(normalizeTeamName("Turkey"), teamLookup.get(normalizeTeamName("Türkiye")) as GroupStanding);
teamLookup.set(normalizeTeamName("Cape Verde Islands"), teamLookup.get(normalizeTeamName("Cape Verde")) as GroupStanding);
teamLookup.set(normalizeTeamName("Congo DR"), teamLookup.get(normalizeTeamName("DR Congo")) as GroupStanding);

const getStandingKey = (teamName: string) => normalizeTeamName(teamName);

const addMatchResult = (
  standings: Map<string, GroupStandingStats>,
  teamName: string,
  goalsFor: number,
  goalsAgainst: number
) => {
  const team = getTeamStanding(teamName);

  if (!team) {
    return;
  }

  const key = getStandingKey(team.team.en);
  const current = standings.get(key) ?? emptyStandingStats();
  const resultPoints = goalsFor > goalsAgainst ? 3 : goalsFor === goalsAgainst ? 1 : 0;

  standings.set(key, {
    played: current.played + 1,
    points: current.points + resultPoints,
    goalDifference: current.goalDifference + goalsFor - goalsAgainst,
    goalsScored: current.goalsScored + goalsFor,
    goalsAgainst: current.goalsAgainst + goalsAgainst
  });
};

const getComputedStandings = () => {
  const standings = new Map<string, GroupStandingStats>();

  allMatches.forEach((match) => {
    if (
      match.status !== "FINISHED" ||
      match.stage !== "Group Stage" ||
      match.score.home === null ||
      match.score.away === null
    ) {
      return;
    }

    addMatchResult(standings, match.homeTeam, match.score.home, match.score.away);
    addMatchResult(standings, match.awayTeam, match.score.away, match.score.home);
  });

  return standings;
};

const getStandingStats = (standings: Map<string, GroupStandingStats>, standing: GroupStanding) =>
  standings.get(getStandingKey(standing.team.en)) ?? emptyStandingStats();

const copy: Record<Language, Copy> = {
  en: {
    brandAria: "World Cup Picks home",
    navAria: "Main navigation",
    matchAria: "World Cup match carousel",
    languageLabel: "Language",
    nav: {
      groups: "Groups",
      bracket: "Bracket",
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
    },
    matchesPage: {
      title: "World Cup matches",
      aria: "World Cup matches and scores",
      loading: "Loading matches...",
      error: "Matches are not available right now.",
      empty: "No matches found.",
      allMatches: "All matches"
    },
    bracketPage: {
      title: "World Cup bracket",
      aria: "World Cup knockout bracket",
      loading: "Loading bracket...",
      error: "The bracket is not available right now.",
      empty: "No knockout matches found."
    },
    lobbyPage: {
      title: "Lobby",
      aria: "Prediction lobby members",
      loading: "Loading lobby...",
      error: "This lobby is not available right now.",
      empty: "No members are in this lobby yet.",
      missingCode: "Open a lobby with a code in the URL.",
      members: "Members",
      admin: "Admin",
      groupCode: "Group code"
    },
    lobbyActions: {
      joinTitle: "Join a group",
      codeLabel: "Group code",
      codePlaceholder: "ABCD",
      submit: "Join group",
      cancel: "Cancel",
      invalidCode: "Enter a valid 4-character lobby code.",
      createError: "Could not create the lobby right now.",
      joinError: "Could not join that lobby right now.",
      alreadyInGroup: "You are already in this group.",
      notFound: "That group cannot be found."
    }
  },
  es: {
    brandAria: "Inicio de World Cup Picks",
    navAria: "Navegación principal",
    matchAria: "Carrusel de partidos del Mundial",
    languageLabel: "Idioma",
    nav: {
      groups: "Grupos",
      bracket: "Llaves",
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
    },
    matchesPage: {
      title: "Partidos del Mundial",
      aria: "Partidos y marcadores del Mundial",
      loading: "Cargando partidos...",
      error: "Los partidos no están disponibles en este momento.",
      empty: "No se encontraron partidos.",
      allMatches: "Todos los partidos"
    },
    bracketPage: {
      title: "Llaves del Mundial",
      aria: "Llaves de eliminación directa del Mundial",
      loading: "Cargando llaves...",
      error: "Las llaves no están disponibles en este momento.",
      empty: "No se encontraron partidos de eliminación directa."
    },
    lobbyPage: {
      title: "Lobby",
      aria: "Miembros del lobby de pronósticos",
      loading: "Cargando lobby...",
      error: "Este lobby no está disponible en este momento.",
      empty: "Todavía no hay miembros en este lobby.",
      missingCode: "Abre un lobby con un código en la URL.",
      members: "Miembros",
      admin: "Admin",
      groupCode: "Código del grupo"
    },
    lobbyActions: {
      joinTitle: "Unirse a un grupo",
      codeLabel: "Código del grupo",
      codePlaceholder: "ABCD",
      submit: "Unirse al grupo",
      cancel: "Cancelar",
      invalidCode: "Ingresa un código de lobby válido de 4 caracteres.",
      createError: "No se pudo crear el lobby en este momento.",
      joinError: "No se pudo unir a ese lobby en este momento.",
      alreadyInGroup: "Ya estás en este grupo.",
      notFound: "No se pudo encontrar ese grupo."
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

const getCurrentPage = (): Page => {
  if (document.body.dataset.page === "groups" || window.location.pathname.endsWith("/groups.html")) {
    return "groups";
  }

  if (document.body.dataset.page === "matches" || window.location.pathname.endsWith("/matches.html")) {
    return "matches";
  }

  if (document.body.dataset.page === "bracket" || window.location.pathname.endsWith("/bracket.html")) {
    return "bracket";
  }

  if (document.body.dataset.page === "lobby" || window.location.pathname.endsWith("/lobby.html")) {
    return "lobby";
  }

  return "home";
};

const getLobbyCodeFromUrl = () => {
  const code = new URLSearchParams(window.location.search).get("code") ?? "";

  return code.trim().toUpperCase();
};

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

const formatBogotaTime = (date: Date, language: Language) =>
  `${new Intl.DateTimeFormat(language === "es" ? "es-CO" : "en-US", {
    timeZone: "America/Bogota",
    hour: "numeric",
    minute: "2-digit"
  }).format(date)} GMT-5`;

const formatMatchDate = (utcDate: string, language: Language) => {
  const date = new Date(utcDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const day = new Intl.DateTimeFormat(language === "es" ? "es-CO" : "en-US", {
    timeZone: "America/Bogota",
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(date);

  return `${day}, ${formatBogotaTime(date, language)}`;
};

const formatMatchDay = (utcDate: string, language: Language) => {
  const date = new Date(utcDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(language === "es" ? "es-CO" : "en-US", {
    timeZone: "America/Bogota",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
};

const getMatchDayKey = (utcDate: string) => {
  const date = new Date(utcDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
};

const getMatchTime = (utcDate: string, language: Language) => {
  const date = new Date(utcDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return formatBogotaTime(date, language);
};

const getMatchStatusLabel = (status: string, selectedCopy: Copy) => {
  if (status === "FINISHED") return selectedCopy.match.final;
  if (status === "IN_PLAY" || status === "PAUSED") return selectedCopy.match.live;

  return selectedCopy.match.scheduled;
};

const localizeMatchLabel = (label: string | null, language: Language) => {
  if (!label) {
    return "";
  }

  if (language === "en") {
    return label;
  }

  if (label.startsWith("Group ")) {
    return label.replace("Group", "Grupo");
  }

  if (label === "Group Stage") {
    return "Fase de grupos";
  }

  return label;
};

const knockoutStageOrder = [
  "Last 32",
  "Last 16",
  "Quarter Finals",
  "Semi Finals",
  "Third Place",
  "Final"
];

const stageDisplayLabels: Record<string, string> = {
  "Last 16": "Round of 16"
};

const stageTranslations: Partial<Record<Language, Record<string, string>>> = {
  es: {
    "Last 32": "Ronda de 32",
    "Last 16": "Octavos de final",
    "Quarter Finals": "Cuartos de final",
    "Semi Finals": "Semifinales",
    "Third Place": "Tercer puesto",
    Final: "Final"
  }
};

const localizeStageLabel = (stage: string, language: Language) =>
  stageTranslations[language]?.[stage] ?? stageDisplayLabels[stage] ?? stage;

const getKnockoutMatches = () =>
  allMatches
    .filter((match) => knockoutStageOrder.includes(match.stage))
    .sort((a, b) => {
      const stageDifference = knockoutStageOrder.indexOf(a.stage) - knockoutStageOrder.indexOf(b.stage);

      if (stageDifference !== 0) {
        return stageDifference;
      }

      return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
    });

const getWinnerSide = (match: CarouselMatch) => {
  if (match.status !== "FINISHED" || match.score.home === null || match.score.away === null) {
    return null;
  }

  if (match.score.home > match.score.away) return "home";
  if (match.score.away > match.score.home) return "away";

  return null;
};

const getBracketLayout = (stageMatchCount: number, matchIndex: number) => {
  const baseMatchCount = 16;
  const rowSpan = Math.max(1, Math.floor(baseMatchCount / Math.max(stageMatchCount, 1)));

  return {
    rowStart: matchIndex * rowSpan + 1,
    rowSpan
  };
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

const renderMatchListItem = (match: CarouselMatch, selectedCopy: Copy, language: Language) => {
  const hasScore = match.score.home !== null && match.score.away !== null;
  const status = getMatchStatusLabel(match.status, selectedCopy);
  const matchLabel = localizeMatchLabel(match.group ?? match.stage, language);

  return `
    <article class="match-list-card">
      <div class="match-list-meta">
        <span>${getMatchTime(match.utcDate, language)}</span>
        <strong>${status}</strong>
      </div>
      <div class="match-list-teams">
        <div class="match-list-team">
          ${renderTeamBadge(match.homeTeam, language)}
          <span>${getTeamDisplayName(match.homeTeam, language)}</span>
        </div>
        <div class="match-score">
          <strong>${hasScore ? match.score.home : "–"}</strong>
          <span>:</span>
          <strong>${hasScore ? match.score.away : "–"}</strong>
        </div>
        <div class="match-list-team match-list-team-away">
          <span>${getTeamDisplayName(match.awayTeam, language)}</span>
          ${renderTeamBadge(match.awayTeam, language)}
        </div>
      </div>
      <div class="match-list-footer">
        <span>${matchLabel}</span>
      </div>
    </article>
  `;
};

const renderMatchesPage = (selectedCopy: Copy, language: Language) => {
  const groupedMatches = allMatches.reduce<Record<string, CarouselMatch[]>>((groups, match) => {
    const key = getMatchDayKey(match.utcDate);

    if (!key) {
      return groups;
    }

    groups[key] = groups[key] ? [...groups[key], match] : [match];
    return groups;
  }, {});
  const dayKeys = Object.keys(groupedMatches).sort();

  return `
    <section class="matches-section" id="matches" aria-label="${selectedCopy.matchesPage.aria}">
      <div class="section-heading">
        <p class="eyebrow">FIFA World Cup 2026</p>
        <h2>${selectedCopy.matchesPage.title}</h2>
      </div>
      ${
        isAllMatchesLoading
          ? `<div class="matches-state">${selectedCopy.matchesPage.loading}</div>`
          : allMatchesError
            ? `<div class="matches-state">${selectedCopy.matchesPage.error}</div>`
            : dayKeys.length === 0
              ? `<div class="matches-state">${selectedCopy.matchesPage.empty}</div>`
              : `
                <div class="matches-list" aria-label="${selectedCopy.matchesPage.allMatches}">
                  ${dayKeys
                    .map((dayKey) => {
                      const matches = groupedMatches[dayKey];
                      const firstMatch = matches[0];

                      return `
                        <section class="match-day">
                          <h3>${formatMatchDay(firstMatch.utcDate, language)}</h3>
                          <div class="match-day-grid">
                            ${matches.map((match) => renderMatchListItem(match, selectedCopy, language)).join("")}
                          </div>
                        </section>
                      `;
                    })
                    .join("")}
                </div>
              `
      }
    </section>
  `;
};

const renderBracketTeam = (match: CarouselMatch, side: "home" | "away", language: Language) => {
  const teamName = side === "home" ? match.homeTeam : match.awayTeam;
  const score = side === "home" ? match.score.home : match.score.away;
  const winnerSide = getWinnerSide(match);
  const isWinner = winnerSide === side;

  return `
    <div class="bracket-team${isWinner ? " is-winner" : ""}">
      <span class="bracket-team-name">
        ${renderTeamBadge(teamName, language)}
        <span>${getTeamDisplayName(teamName, language)}</span>
      </span>
      ${score === null ? "" : `<strong>${score}</strong>`}
    </div>
  `;
};

const renderBracketMatchCard = (
  match: CarouselMatch,
  selectedCopy: Copy,
  language: Language,
  matchIndex: number,
  stageMatchCount: number
) => {
  const stage = localizeStageLabel(match.stage, language);
  const status = getMatchStatusLabel(match.status, selectedCopy);
  const layout = getBracketLayout(stageMatchCount, matchIndex);

  return `
    <article
      class="bracket-match-card"
      style="--bracket-row-start: ${layout.rowStart}; --bracket-row-span: ${layout.rowSpan};"
    >
      <div class="bracket-match-meta">
        <span>${formatMatchDate(match.utcDate, language)}</span>
        <strong>${status}</strong>
      </div>
      <div class="bracket-teams">
        ${renderBracketTeam(match, "home", language)}
        ${renderBracketTeam(match, "away", language)}
      </div>
      <div class="bracket-match-footer">
        <span>${stage}</span>
      </div>
    </article>
  `;
};

const renderBracketPage = (selectedCopy: Copy, language: Language) => {
  const knockoutMatches = getKnockoutMatches();
  const matchesByStage = knockoutStageOrder.map((stage) => ({
    stage,
    matches: knockoutMatches.filter((match) => match.stage === stage)
  }));
  const hasKnockoutMatches = knockoutMatches.length > 0;

  return `
    <section class="bracket-section" id="bracket" aria-label="${selectedCopy.bracketPage.aria}">
      <div class="section-heading">
        <p class="eyebrow">FIFA World Cup 2026</p>
        <h2>${selectedCopy.bracketPage.title}</h2>
      </div>
      ${
        isAllMatchesLoading
          ? `<div class="matches-state">${selectedCopy.bracketPage.loading}</div>`
          : allMatchesError
            ? `<div class="matches-state">${selectedCopy.bracketPage.error}</div>`
            : !hasKnockoutMatches
              ? `<div class="matches-state">${selectedCopy.bracketPage.empty}</div>`
              : `
                <div class="bracket-board">
                  ${matchesByStage
                    .filter(({ matches }) => matches.length > 0)
                    .map(
                      ({ stage, matches }) => `
                        <section class="bracket-round" aria-label="${localizeStageLabel(stage, language)}">
                          <h3>${localizeStageLabel(stage, language)}</h3>
                          <div class="bracket-round-matches">
                            ${matches
                              .map((match, index) =>
                                renderBracketMatchCard(match, selectedCopy, language, index, matches.length)
                              )
                              .join("")}
                          </div>
                        </section>
                      `
                    )
                    .join("")}
                </div>
              `
      }
    </section>
  `;
};

const renderLobbyPage = (selectedCopy: Copy) => {
  const lobbyCode = getLobbyCodeFromUrl();

  return `
    <section class="lobby-section" id="lobby" aria-label="${selectedCopy.lobbyPage.aria}">
      <div class="section-heading">
        <p class="eyebrow">FIFA World Cup 2026</p>
        <h2>${currentLobby?.name ?? selectedCopy.lobbyPage.title}</h2>
      </div>
      ${
        !lobbyCode
          ? `<div class="matches-state">${selectedCopy.lobbyPage.missingCode}</div>`
          : isLobbyLoading
            ? `<div class="matches-state">${selectedCopy.lobbyPage.loading}</div>`
            : lobbyError
              ? `<div class="matches-state">${selectedCopy.lobbyPage.error}</div>`
              : currentLobby
                ? `
                  <article class="lobby-card">
                    <div class="lobby-card-header">
                      <span>${selectedCopy.lobbyPage.members}</span>
                      <span class="lobby-code">
                        <span>${selectedCopy.lobbyPage.groupCode}</span>
                        <strong>${currentLobby.code}</strong>
                      </span>
                    </div>
                    ${
                      currentLobby.members.length === 0
                        ? `<div class="lobby-empty">${selectedCopy.lobbyPage.empty}</div>`
                        : `
                          <ul class="lobby-member-list">
                            ${currentLobby.members
                              .map(
                                (member) => `
                                  <li class="lobby-member">
                                    <span>${member.username}</span>
                                    ${
                                      member.role === "admin"
                                        ? `<strong>${selectedCopy.lobbyPage.admin}</strong>`
                                        : ""
                                    }
                                  </li>
                                `
                              )
                              .join("")}
                          </ul>
                        `
                    }
                  </article>
                `
                : `<div class="matches-state">${selectedCopy.lobbyPage.empty}</div>`
      }
    </section>
  `;
};

const renderJoinLobbyModal = (selectedCopy: Copy) => {
  if (!joinLobbyModal.isOpen) {
    return "";
  }

  return `
    <div class="modal-backdrop" role="presentation">
      <section class="join-lobby-modal" role="dialog" aria-modal="true" aria-labelledby="join-lobby-title">
        <form id="join-lobby-form">
          <div class="modal-header">
            <h2 id="join-lobby-title">${selectedCopy.lobbyActions.joinTitle}</h2>
            <button class="modal-close" type="button" id="join-lobby-close" aria-label="${selectedCopy.lobbyActions.cancel}">
              ×
            </button>
          </div>
          <label class="join-code-field" for="join-lobby-code">
            <span>${selectedCopy.lobbyActions.codeLabel}</span>
            <input
              id="join-lobby-code"
              name="code"
              type="text"
              inputmode="text"
              autocomplete="off"
              maxlength="4"
              placeholder="${selectedCopy.lobbyActions.codePlaceholder}"
              value="${joinLobbyModal.code}"
            />
          </label>
          ${joinLobbyModal.message ? `<p class="join-lobby-message">${joinLobbyModal.message}</p>` : ""}
          <div class="modal-actions">
            <button class="secondary-action" type="button" id="join-lobby-cancel">
              ${selectedCopy.lobbyActions.cancel}
            </button>
            <button class="primary-action" type="submit" ${joinLobbyModal.isSubmitting ? "disabled" : ""}>
              ${selectedCopy.lobbyActions.submit}
            </button>
          </div>
        </form>
      </section>
    </div>
  `;
};

const renderStandings = (selectedCopy: Copy, language: Language) => {
  const standings = getComputedStandings();

  return `
    <section class="groups-section" id="groups" aria-label="${selectedCopy.standings.aria}">
      <div class="section-heading">
        <p class="eyebrow">FIFA World Cup 2026</p>
        <h2>${selectedCopy.standings.title}</h2>
      </div>
      <div class="groups-grid">
        ${worldCupGroups
          .map((group) => {
            const sortedTeams = group.teams
              .map((standing, index) => ({
                index,
                standing,
                stats: getStandingStats(standings, standing)
              }))
              .sort((a, b) => {
                if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
                if (b.stats.goalDifference !== a.stats.goalDifference) {
                  return b.stats.goalDifference - a.stats.goalDifference;
                }
                if (b.stats.goalsScored !== a.stats.goalsScored) return b.stats.goalsScored - a.stats.goalsScored;
                return a.index - b.index;
              });

            return `
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
                    ${sortedTeams
                      .map(
                        ({ standing, stats }) => `
                          <tr>
                            <th scope="row">
                              <span class="team-name">
                                <img class="team-flag" src="${standing.flagSrc}" alt="${standing.flagAlt[language]}" />
                                <span>${standing.team[language]}</span>
                              </span>
                            </th>
                            <td>${stats.played}</td>
                            <td class="points-column">${stats.points}</td>
                            <td>${stats.goalDifference}</td>
                            <td>${stats.goalsScored}</td>
                            <td>${stats.goalsAgainst}</td>
                          </tr>
                        `
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            </article>
          `;
          })
          .join("")}
      </div>
    </section>
  `;
};

const renderTopbar = (selectedCopy: Copy, selectedLanguage: LanguageOption | undefined, language: Language) => `
  <header class="topbar" aria-label="${selectedCopy.navAria}">
    <a class="brand" href="/" aria-label="${selectedCopy.brandAria}">
      <span class="brand-mark" aria-hidden="true">26</span>
      <span>World Cup Picks</span>
    </a>
    <nav class="nav-links" aria-label="${selectedCopy.navAria}">
      <a href="/groups.html">${selectedCopy.nav.groups}</a>
      <a href="/bracket.html">${selectedCopy.nav.bracket}</a>
      <a href="/matches.html">${selectedCopy.nav.matches}</a>
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
        <button class="primary-action" type="button" id="create-lobby-button">${selectedCopy.actions.createGroup}</button>
        <button class="secondary-action" type="button" id="join-lobby-button">${selectedCopy.actions.joinGroup}</button>
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
  const pageContent = {
    bracket: renderBracketPage(selectedCopy, language),
    groups: renderStandings(selectedCopy, language),
    home: renderHomePage(selectedCopy, language),
    lobby: renderLobbyPage(selectedCopy),
    matches: renderMatchesPage(selectedCopy, language)
  }[currentPage];

  document.documentElement.lang = language;

  app.innerHTML = `
  <section class="page-shell">
    ${renderTopbar(selectedCopy, selectedLanguage, language)}
    ${pageContent}
  </section>
  ${renderJoinLobbyModal(selectedCopy)}
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
  const createLobbyButton = document.querySelector<HTMLButtonElement>("#create-lobby-button");
  const joinLobbyButton = document.querySelector<HTMLButtonElement>("#join-lobby-button");
  const joinLobbyForm = document.querySelector<HTMLFormElement>("#join-lobby-form");
  const joinLobbyCodeInput = document.querySelector<HTMLInputElement>("#join-lobby-code");
  const joinLobbyCloseButton = document.querySelector<HTMLButtonElement>("#join-lobby-close");
  const joinLobbyCancelButton = document.querySelector<HTMLButtonElement>("#join-lobby-cancel");

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

  createLobbyButton?.addEventListener("click", () => {
    void createLobbyFromHome(selectedCopy);
  });

  joinLobbyButton?.addEventListener("click", () => {
    void openJoinLobbyModal();
  });

  joinLobbyCodeInput?.addEventListener("input", () => {
    joinLobbyModal = {
      ...joinLobbyModal,
      code: joinLobbyCodeInput.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 4),
      message: null
    };
    joinLobbyCodeInput.value = joinLobbyModal.code;
  });

  const closeJoinLobbyModal = () => {
    joinLobbyModal = {
      isOpen: false,
      code: "",
      message: null,
      isSubmitting: false
    };
    render(getStoredLanguage());
  };

  joinLobbyCloseButton?.addEventListener("click", closeJoinLobbyModal);
  joinLobbyCancelButton?.addEventListener("click", closeJoinLobbyModal);
  joinLobbyForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void joinLobbyFromHome(selectedCopy);
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

const getAuthenticatedUser = async () => {
  if (currentUser) {
    return currentUser;
  }

  try {
    const response = await fetch(`${authApiUrl}/session`, {
      credentials: "include"
    });

    if (!response.ok) {
      window.location.href = authClientUrl;
      return null;
    }

    const result = (await response.json()) as { user?: CurrentUser };
    currentUser = result.user ?? null;
    render(getStoredLanguage());
  } catch {
    currentUser = null;
  }

  if (!currentUser) {
    window.location.href = authClientUrl;
  }

  return currentUser;
};

const createLobbyFromHome = async (selectedCopy: Copy) => {
  const user = await getAuthenticatedUser();

  if (!user) {
    return;
  }

  try {
    const response = await fetch(`${lobbiesApiUrl}/lobbies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        createdByUserId: user.id,
        createdByUsername: user.username,
        name: `${user.username}'s World Cup Lobby`
      })
    });

    if (!response.ok) {
      throw new Error("Could not create lobby.");
    }

    const result = (await response.json()) as { lobby?: Lobby };

    if (!result.lobby) {
      throw new Error("Lobby response was empty.");
    }

    window.location.href = `/lobby.html?code=${encodeURIComponent(result.lobby.code)}`;
  } catch {
    window.alert(selectedCopy.lobbyActions.createError);
  }
};

const openJoinLobbyModal = async () => {
  const user = await getAuthenticatedUser();

  if (!user) {
    return;
  }

  joinLobbyModal = {
    isOpen: true,
    code: "",
    message: null,
    isSubmitting: false
  };
  render(getStoredLanguage());
  document.querySelector<HTMLInputElement>("#join-lobby-code")?.focus();
};

const joinLobbyFromHome = async (selectedCopy: Copy) => {
  const user = await getAuthenticatedUser();

  if (!user) {
    return;
  }

  const lobbyCode = joinLobbyModal.code.trim().toUpperCase();

  if (!/^[A-Z2-9]{4}$/.test(lobbyCode)) {
    joinLobbyModal = {
      ...joinLobbyModal,
      message: selectedCopy.lobbyActions.invalidCode,
      isSubmitting: false
    };
    render(getStoredLanguage());
    return;
  }

  joinLobbyModal = {
    ...joinLobbyModal,
    message: null,
    isSubmitting: true
  };
  render(getStoredLanguage());

  try {
    const response = await fetch(`${lobbiesApiUrl}/lobbies/${encodeURIComponent(lobbyCode)}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: user.id,
        username: user.username
      })
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => ({}))) as { code?: string };

      if (response.status === 409 && result.code === "already_member") {
        joinLobbyModal = {
          ...joinLobbyModal,
          message: selectedCopy.lobbyActions.alreadyInGroup,
          isSubmitting: false
        };
        render(getStoredLanguage());
        return;
      }

      if (response.status === 404 && result.code === "lobby_not_found") {
        joinLobbyModal = {
          ...joinLobbyModal,
          message: selectedCopy.lobbyActions.notFound,
          isSubmitting: false
        };
        render(getStoredLanguage());
        return;
      }

      throw new Error("Could not join lobby.");
    }

    window.location.href = `/lobby.html?code=${encodeURIComponent(lobbyCode)}`;
  } catch {
    joinLobbyModal = {
      ...joinLobbyModal,
      message: selectedCopy.lobbyActions.joinError,
      isSubmitting: false
    };
    render(getStoredLanguage());
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

const loadAllMatches = async () => {
  const currentPage = getCurrentPage();

  if (currentPage !== "matches" && currentPage !== "groups" && currentPage !== "bracket") {
    return;
  }

  isAllMatchesLoading = true;
  allMatchesError = null;
  render(getStoredLanguage());

  try {
    const response = await fetch(`${matchesApiUrl}/matches`);

    if (!response.ok) {
      throw new Error("Could not load matches.");
    }

    const result = (await response.json()) as { matches?: CarouselMatch[] };
    allMatches = Array.isArray(result.matches) ? result.matches : [];
  } catch {
    allMatches = [];
    allMatchesError = "unavailable";
  } finally {
    isAllMatchesLoading = false;
    render(getStoredLanguage());
  }
};

const loadLobby = async () => {
  if (getCurrentPage() !== "lobby") {
    return;
  }

  const lobbyCode = getLobbyCodeFromUrl();

  if (!lobbyCode) {
    return;
  }

  isLobbyLoading = true;
  lobbyError = null;
  currentLobby = null;
  render(getStoredLanguage());

  try {
    const response = await fetch(`${lobbiesApiUrl}/lobbies/${encodeURIComponent(lobbyCode)}`);

    if (!response.ok) {
      throw new Error("Could not load lobby.");
    }

    const result = (await response.json()) as { lobby?: Lobby };
    currentLobby = result.lobby ?? null;
  } catch {
    currentLobby = null;
    lobbyError = "unavailable";
  } finally {
    isLobbyLoading = false;
    render(getStoredLanguage());
  }
};

render(getStoredLanguage());
void loadCurrentUser();
void loadCarouselMatches();
void loadAllMatches();
void loadLobby();
