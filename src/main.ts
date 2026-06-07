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

type Page =
  | "home"
  | "groups"
  | "matches"
  | "bracket"
  | "lobby"
  | "my-lobbies"
  | "predictions"
  | "point-system"
  | "custom-settings";

type PointSystemId = "simple" | "regular" | "custom";

type PointSystemOption = {
  id: PointSystemId;
  name: string;
  summary: string;
  sections: Array<{
    title: string;
    items: string[];
  }>;
};

type CustomNumericFieldId =
  | "exactScore"
  | "resultGoalDifference"
  | "correctResult"
  | "homeGoal"
  | "awayGoal"
  | "champion"
  | "runnerUp"
  | "thirdPlace"
  | "fourthPlace"
  | "topScorer"
  | "goldenBall"
  | "favoritePlayerContributions"
  | "favoritePlayerPoints"
  | "roundOf32"
  | "roundOf16"
  | "quarterFinal"
  | "semiFinal"
  | "thirdPlaceMatch"
  | "final";

type CustomFeatureId = "chooseTeam" | "trackTeam" | "favoritePlayer" | "bracketHeavy";

type CustomSettingsState = {
  enabledFields: Record<CustomNumericFieldId, boolean>;
  values: Record<CustomNumericFieldId, string>;
  enabledFeatures: Record<CustomFeatureId, boolean>;
  trackedTeam: string;
  message: string | null;
  isSubmitting: boolean;
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

type LobbyMember = {
  userId: number;
  username: string;
  role: "admin" | "member";
};

type Lobby = {
  code: string;
  name: string;
  requiresPassword: boolean;
  memberCount: number;
  pointSystem: PointSystemId | null;
  customSettings?: {
    enabledFields: Record<string, boolean>;
    values: Record<string, string>;
    enabledFeatures: Record<string, boolean>;
    trackedTeam: string;
  } | null;
  members: LobbyMember[];
};

type MatchPrediction = {
  matchId: number;
  homeScore: number | null;
  awayScore: number | null;
};

type PredictionSaveState = "idle" | "saving" | "saved" | "error";

type CreateLobbyModalState = {
  isOpen: boolean;
  name: string;
  usePassword: boolean;
  password: string;
  message: string | null;
  isSubmitting: boolean;
};

type LobbyCreationDraft = {
  id: string;
  createdByUserId: number;
  createdByUsername: string;
  name: string;
  password?: string;
};

type JoinLobbyModalState = {
  isOpen: boolean;
  code: string;
  password: string;
  needsPassword: boolean;
  message: string | null;
  isSubmitting: boolean;
};

type LeaveLobbyModalState = {
  isOpen: boolean;
  lobby: Lobby | null;
  returnToHome: boolean;
  message: string | null;
  isSubmitting: boolean;
};

type KickMemberModalState = {
  isOpen: boolean;
  lobby: Lobby | null;
  member: LobbyMember | null;
  message: string | null;
  isSubmitting: boolean;
};

type DeleteLobbyModalState = {
  isOpen: boolean;
  lobby: Lobby | null;
  confirmationText: string;
  message: string | null;
  isSubmitting: boolean;
};

type PredictionCopyScope = "all" | "phase";

type PredictionCopyModalState = {
  isOpen: boolean;
  scope: PredictionCopyScope | null;
  message: string | null;
  isSubmitting: boolean;
};

type GlobalPlacementPredictionId = "champion" | "runnerUp" | "thirdPlace" | "fourthPlace";

type GlobalPredictionOption = {
  id: CustomNumericFieldId;
  label: string;
  isPlacement: boolean;
};

type GlobalPlacementPredictionModalState = {
  isOpen: boolean;
  predictionId: GlobalPlacementPredictionId | null;
  selectedTeam: string;
  isMenuOpen: boolean;
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
    myLobbies: string;
    predictions: string;
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
    leaveLobby: string;
    kickMember: string;
    deleteLobby: string;
    showRules: string;
    myPredictions: string;
    globalPredictions: string;
    chooseGlobalPrediction: (prediction: string) => string;
    chooseCountry: string;
    confirmGlobalPrediction: string;
    closeRules: string;
    rulesTitle: string;
    pointSystem: string;
    rulesUnavailable: string;
    customRulesTitle: string;
    enabledFeatures: string;
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
    passwordRequired: string;
    invalidPassword: string;
  };
  createLobby: {
    title: string;
    nameLabel: string;
    namePlaceholder: string;
    passwordToggle: string;
    passwordLabel: string;
    passwordHelp: string;
    submit: string;
    cancel: string;
    invalidName: string;
    invalidPassword: string;
  };
  myLobbiesPage: {
    title: string;
    aria: string;
    loading: string;
    error: string;
    empty: string;
    openLobby: string;
    groupCode: string;
    members: string;
  };
  predictionsPage: {
    title: string;
    aria: string;
    eyebrow: string;
    summary: string;
    loading: string;
    error: string;
    emptyLobbies: string;
    emptyMatches: string;
    lobbyLabel: string;
    phaseLabel: string;
    defaultLobby: string;
    copyAll: string;
    copyPhase: string;
    copyAllConfirm: string;
    copyPhaseConfirm: string;
    confirmTitle: string;
    confirmBody: string;
    confirmAction: string;
    cancelAction: string;
    copySuccess: string;
    allMatches: string;
    saveIdle: string;
    saveSaving: string;
    saveSaved: string;
    saveError: string;
    homeScore: string;
    awayScore: string;
  };
  pointSystemPage: {
    title: string;
    aria: string;
    eyebrow: string;
    summary: string;
    missingCode: string;
    select: string;
    selected: string;
    continue: string;
    saveError: string;
    disclaimerTitle: string;
    disclaimer: string;
    options: PointSystemOption[];
  };
  customSettingsPage: {
    title: string;
    aria: string;
    eyebrow: string;
    summary: string;
    missingCode: string;
    matchSpecific: string;
    global: string;
    special: string;
    bracketRounds: string;
    save: string;
    saveError: string;
    validationError: string;
    trackedTeamLabel: string;
    trackedTeamPlaceholder: string;
    fields: Record<CustomNumericFieldId, string>;
    features: Record<CustomFeatureId, { label: string; detail: string }>;
  };
  leaveLobby: {
    title: string;
    body: (name: string) => string;
    confirm: string;
    cancel: string;
    error: string;
  };
  kickMember: {
    title: string;
    body: (username: string, lobbyName: string) => string;
    confirm: string;
    cancel: string;
    error: string;
  };
  deleteLobby: {
    title: string;
    body: (name: string, phrase: string) => string;
    phrase: string;
    label: string;
    confirm: string;
    cancel: string;
    error: string;
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
const lobbyCreationDraftStorageKey = "worldcup-lobby-creation-draft";
const defaultPredictionLobbyCode = "__default__";
const defaultCustomSettingValues: Record<CustomNumericFieldId, string> = {
  exactScore: "5",
  resultGoalDifference: "4",
  correctResult: "3",
  homeGoal: "1",
  awayGoal: "1",
  champion: "20",
  runnerUp: "12",
  thirdPlace: "8",
  fourthPlace: "6",
  topScorer: "10",
  goldenBall: "8",
  favoritePlayerContributions: "3",
  favoritePlayerPoints: "5",
  roundOf32: "2",
  roundOf16: "4",
  quarterFinal: "6",
  semiFinal: "8",
  thirdPlaceMatch: "6",
  final: "10"
};
const defaultCustomEnabledFields: Record<CustomNumericFieldId, boolean> = {
  exactScore: true,
  resultGoalDifference: true,
  correctResult: true,
  homeGoal: true,
  awayGoal: true,
  champion: true,
  runnerUp: true,
  thirdPlace: true,
  fourthPlace: true,
  topScorer: true,
  goldenBall: true,
  favoritePlayerContributions: true,
  favoritePlayerPoints: true,
  roundOf32: true,
  roundOf16: true,
  quarterFinal: true,
  semiFinal: true,
  thirdPlaceMatch: true,
  final: true
};
const defaultCustomEnabledFeatures: Record<CustomFeatureId, boolean> = {
  chooseTeam: false,
  trackTeam: false,
  favoritePlayer: false,
  bracketHeavy: false
};
let currentUser: CurrentUser | null = null;
let carouselMatches: CarouselMatch[] = [];
let allMatches: CarouselMatch[] = [];
let currentLobby: Lobby | null = null;
let userLobbies: Lobby[] = [];
let matchPredictions: Record<number, MatchPrediction> = {};
let predictionSaveStates: Record<number, PredictionSaveState> = {};
let selectedPredictionLobbyCode = defaultPredictionLobbyCode;
let selectedPredictionPhase = "";
let openPredictionDropdown: "lobby" | "phase" | null = null;
let activeMatchIndex = 0;
let isCurrentUserLoading = true;
let isMatchesLoading = true;
let isAllMatchesLoading = false;
let isLobbyLoading = false;
let isUserLobbiesLoading = false;
let isPredictionsLoading = false;
let matchesError: string | null = null;
let allMatchesError: string | null = null;
let lobbyError: string | null = null;
let userLobbiesError: string | null = null;
let predictionsError: string | null = null;
let areLobbyRulesVisible = false;
let selectedPointSystem: PointSystemId | null = null;
let selectedPointSystemLobbyCode: string | null = null;
let pointSystemSetupError: string | null = null;
let customSettingsLobbyCode: string | null = null;
let customSettingsState: CustomSettingsState = {
  enabledFields: { ...defaultCustomEnabledFields },
  values: { ...defaultCustomSettingValues },
  enabledFeatures: { ...defaultCustomEnabledFeatures },
  trackedTeam: "",
  message: null,
  isSubmitting: false
};
let isTrackedTeamMenuOpen = false;
let createLobbyModal: CreateLobbyModalState = {
  isOpen: false,
  name: "",
  usePassword: false,
  password: "",
  message: null,
  isSubmitting: false
};
let joinLobbyModal: JoinLobbyModalState = {
  isOpen: false,
  code: "",
  password: "",
  needsPassword: false,
  message: null,
  isSubmitting: false
};
let leaveLobbyModal: LeaveLobbyModalState = {
  isOpen: false,
  lobby: null,
  returnToHome: false,
  message: null,
  isSubmitting: false
};
let kickMemberModal: KickMemberModalState = {
  isOpen: false,
  lobby: null,
  member: null,
  message: null,
  isSubmitting: false
};
let deleteLobbyModal: DeleteLobbyModalState = {
  isOpen: false,
  lobby: null,
  confirmationText: "",
  message: null,
  isSubmitting: false
};
let globalPlacementPredictionModal: GlobalPlacementPredictionModalState = {
  isOpen: false,
  predictionId: null,
  selectedTeam: "",
  isMenuOpen: false
};
let predictionCopyModal: PredictionCopyModalState = {
  isOpen: false,
  scope: null,
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
      groups: "Standings",
      bracket: "Bracket",
      matches: "Matches",
      myLobbies: "My lobbies",
      predictions: "Predictions"
    },
    signIn: "Sign in",
    signOut: "Sign out",
    eyebrow: "FIFA World Cup 2026",
    headline: "Run your tournament pool from kickoff to final whistle.",
    summary:
      "Invite your people, predict every match, and use a scoring system that fits how your group likes to compete.",
    actions: {
      createGroup: "Create a lobby",
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
      groupCode: "Group code",
      leaveLobby: "Leave lobby",
      kickMember: "Kick",
      deleteLobby: "Delete lobby",
      showRules: "View rules",
      myPredictions: "My predictions",
      globalPredictions: "Global predictions",
      chooseGlobalPrediction: (prediction) => `Choose the ${prediction} of the competition.`,
      chooseCountry: "Choose a country",
      confirmGlobalPrediction: "Confirm selection",
      closeRules: "Close rules",
      rulesTitle: "Lobby rules",
      pointSystem: "Point system",
      rulesUnavailable: "Rules are not available for this lobby yet.",
      customRulesTitle: "Custom scoring values",
      enabledFeatures: "Enabled features"
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
      notFound: "That group cannot be found.",
      passwordRequired: "This lobby requires a password.",
      invalidPassword: "That lobby password is not correct."
    },
    createLobby: {
      title: "Create a lobby",
      nameLabel: "Lobby name",
      namePlaceholder: "Friends pool",
      passwordToggle: "Require a password to join",
      passwordLabel: "Lobby password",
      passwordHelp: "At least 8 characters, one uppercase letter, one lowercase letter, and one number.",
      submit: "Create lobby",
      cancel: "Cancel",
      invalidName: "Enter a lobby name.",
      invalidPassword: "Lobby passwords need at least 8 characters, one uppercase letter, one lowercase letter, and one number."
    },
    myLobbiesPage: {
      title: "My lobbies",
      aria: "Your prediction lobbies",
      loading: "Loading your lobbies...",
      error: "Your lobbies are not available right now.",
      empty: "You are not in any lobbies yet.",
      openLobby: "Open lobby",
      groupCode: "Group code",
      members: "Members"
    },
    predictionsPage: {
      title: "Default predictions",
      aria: "Default match predictions",
      eyebrow: "Prediction board",
      summary: "Pick a lobby and a group or phase, then enter your score predictions. Changes save automatically.",
      loading: "Loading predictions...",
      error: "Predictions are not available right now.",
      emptyLobbies: "Join or create a lobby before making predictions.",
      emptyMatches: "No matches found for this selection.",
      lobbyLabel: "Lobby",
      phaseLabel: "Group or phase",
      defaultLobby: "Default",
      copyAll: "Apply default to lobby",
      copyPhase: "Apply default to selected group/phase",
      copyAllConfirm: "Apply all default predictions to this lobby?",
      copyPhaseConfirm: "Apply default predictions for the selected group/phase to this lobby?",
      confirmTitle: "Apply default predictions",
      confirmBody: "This will replace matching saved predictions in the selected lobby.",
      confirmAction: "Apply predictions",
      cancelAction: "Cancel",
      copySuccess: "Default predictions were applied.",
      allMatches: "All matches",
      saveIdle: "Not saved",
      saveSaving: "Saving...",
      saveSaved: "Saved",
      saveError: "Could not save",
      homeScore: "Home score",
      awayScore: "Away score"
    },
    pointSystemPage: {
      title: "Choose a point system",
      aria: "Lobby point system setup",
      eyebrow: "Lobby setup",
      summary: "Pick how this lobby will score predictions. You can review the structure now and enter the lobby after choosing one option.",
      missingCode: "Create or open a lobby before choosing a point system.",
      select: "Select",
      selected: "Selected",
      continue: "Continue to lobby",
      saveError: "Could not save the point system right now.",
      disclaimerTitle: "Prediction windows",
      disclaimer:
        "All match-specific prediction windows close one minute before the start of the respective game. Global predictions close either before the start of the first game or 24 hours after a player joins a lobby, whatever happens later.",
      options: [
        {
          id: "simple",
          name: "Simple",
          summary: "A compact setup for groups that want quick picks and easy scoring.",
          sections: [
            {
              title: "Match Specific",
              items: [
                "Hitting the exact score = 4 pts",
                "Hitting the correct result (A wins, B wins or Draw) = 2 pts",
                "Wrong result = 0 pts"
              ]
            },
            {
              title: "Global",
              items: ["Champion = 15 pts", "Runner-up = 10 pts", "Top scorer = 8 pts"]
            }
          ]
        },
        {
          id: "regular",
          name: "Regular",
          summary: "A balanced setup with partial credit for close score predictions.",
          sections: [
            {
              title: "Match Specific",
              items: [
                "Exact score = 5 pts",
                "Correct Result + Correct goal difference if winner = 4 pts",
                "Correct Result but not exact score = 3 pts",
                "Wrong result + Correct goals home but incorrect away = 1 pt",
                "Wrong result + Correct goals away but incorrect home = 1 pt"
              ]
            },
            {
              title: "Global",
              items: [
                "Champion = 20 pts",
                "Runner-up = 12 pts",
                "Third Place = 8 pts",
                "Fourth Place = 6 pts",
                "Top Scorer = 10 pts",
                "Golden Ball = 8 pts"
              ]
            }
          ]
        },
        {
          id: "custom",
          name: "Custom",
          summary: "Start from the regular setup and add extra prediction layers.",
          sections: [
            {
              title: "Regular scoring settings",
              items: ["Choose from the settings in the regular setup while choosing scores."]
            },
            {
              title: "Additional features",
              items: [
                "Choose your team: each player chooses one country to root for, and every match where this team plays has its points doubled.",
                "Track a team: the admin sets a country to track, and players guess how far that country will make it.",
                "Favorite player: players choose one player, and goal contributions award points at configurable milestones.",
                "Bracket heavy: after the group stage, players guess who advances in every knockout stage, with later stages awarding more points."
              ]
            }
          ]
        }
      ]
    },
    customSettingsPage: {
      title: "Customize scoring",
      aria: "Custom lobby scoring settings",
      eyebrow: "Custom setup",
      summary: "Start from the Regular scoring values, then turn individual rules on or off and edit the point values your lobby will use.",
      missingCode: "Choose Custom from a lobby setup before editing custom settings.",
      matchSpecific: "Match Specific",
      global: "Global",
      special: "Special settings",
      bracketRounds: "Bracket heavy rounds",
      save: "Save custom settings",
      saveError: "Could not save the custom settings right now.",
      validationError: "Every enabled setting must be completed with a non-negative integer, and Track a team needs a country.",
      trackedTeamLabel: "Tracked country",
      trackedTeamPlaceholder: "Choose a country",
      fields: {
        exactScore: "Exact score",
        resultGoalDifference: "Correct result + goal difference",
        correctResult: "Correct result",
        homeGoal: "Wrong result + correct home goals",
        awayGoal: "Wrong result + correct away goals",
        champion: "Champion",
        runnerUp: "Runner-up",
        thirdPlace: "Third place",
        fourthPlace: "Fourth place",
        topScorer: "Top scorer",
        goldenBall: "Golden Ball",
        favoritePlayerContributions: "Goal contributions per award",
        favoritePlayerPoints: "Points per award",
        roundOf32: "Round of 32",
        roundOf16: "Round of 16",
        quarterFinal: "Quarterfinal",
        semiFinal: "Semifinal",
        thirdPlaceMatch: "Third place match",
        final: "Final"
      },
      features: {
        chooseTeam: {
          label: "Choose your team",
          detail:
            "At the start of the game, each player chooses one country to root for. Every match where that team plays has its points doubled. This must be filled before the player's global prediction window closes."
        },
        trackTeam: {
          label: "Track a team",
          detail:
            "The admin chooses one country to track through the tournament. Players predict how far that country will go. The admin must choose the tracked country during lobby setup; players answer before their global prediction window closes."
        },
        favoritePlayer: {
          label: "Favorite player",
          detail:
            "At the start of the game, each player chooses one player. Points are awarded every time that player reaches the configured goals plus assists threshold. Player choices close with the global prediction window."
        },
        bracketHeavy: {
          label: "Bracket heavy",
          detail:
            "After the group stage and before the Round of 32 starts, players predict who advances in every knockout match. Later rounds are correct only if the previous matchup was also predicted correctly, and later stages can award more points."
        }
      }
    },
    leaveLobby: {
      title: "Leave lobby",
      body: (name) => `Are you sure you want to leave ${name}?`,
      confirm: "Leave lobby",
      cancel: "Cancel",
      error: "Could not leave this lobby right now."
    },
    kickMember: {
      title: "Kick member",
      body: (username, lobbyName) => `Are you sure you want to remove ${username} from ${lobbyName}?`,
      confirm: "Kick member",
      cancel: "Cancel",
      error: "Could not remove this member right now."
    },
    deleteLobby: {
      title: "Delete lobby",
      body: (name, phrase) => `This will permanently delete ${name}. Type "${phrase}" to confirm.`,
      phrase: "delete lobby",
      label: "Confirmation text",
      confirm: "Delete lobby",
      cancel: "Cancel",
      error: "Could not delete this lobby right now."
    }
  },
  es: {
    brandAria: "Inicio de World Cup Picks",
    navAria: "Navegación principal",
    matchAria: "Carrusel de partidos del Mundial",
    languageLabel: "Idioma",
    nav: {
      groups: "Posiciones",
      bracket: "Llaves",
      matches: "Partidos",
      myLobbies: "Mis lobbies",
      predictions: "Pronósticos"
    },
    signIn: "Iniciar sesión",
    signOut: "Cerrar sesión",
    eyebrow: "Copa Mundial FIFA 2026",
    headline: "Organiza tu polla mundialista desde el primer partido hasta la final.",
    summary:
      "Invita a tu gente, pronostica cada partido y usa un sistema de puntos que se ajuste a la forma en que compite tu grupo.",
    actions: {
      createGroup: "Crear lobby",
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
      groupCode: "Código del grupo",
      leaveLobby: "Salir del lobby",
      kickMember: "Expulsar",
      deleteLobby: "Eliminar lobby",
      showRules: "Ver reglas",
      myPredictions: "Mis pronósticos",
      globalPredictions: "Pronósticos globales",
      chooseGlobalPrediction: (prediction) => `Elige el ${prediction} de la competición.`,
      chooseCountry: "Elige un país",
      confirmGlobalPrediction: "Confirmar selección",
      closeRules: "Cerrar reglas",
      rulesTitle: "Reglas del lobby",
      pointSystem: "Sistema de puntos",
      rulesUnavailable: "Las reglas todavía no están disponibles para este lobby.",
      customRulesTitle: "Valores de puntaje personalizado",
      enabledFeatures: "Funciones activas"
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
      notFound: "No se pudo encontrar ese grupo.",
      passwordRequired: "Este lobby requiere contraseña.",
      invalidPassword: "La contraseña del lobby no es correcta."
    },
    createLobby: {
      title: "Crear lobby",
      nameLabel: "Nombre del lobby",
      namePlaceholder: "Polla de amigos",
      passwordToggle: "Requerir contraseña para unirse",
      passwordLabel: "Contraseña del lobby",
      passwordHelp: "Mínimo 8 caracteres, una mayúscula, una minúscula y un número.",
      submit: "Crear lobby",
      cancel: "Cancelar",
      invalidName: "Ingresa un nombre para el lobby.",
      invalidPassword: "La contraseña del lobby necesita mínimo 8 caracteres, una mayúscula, una minúscula y un número."
    },
    myLobbiesPage: {
      title: "Mis lobbies",
      aria: "Tus lobbies de pronósticos",
      loading: "Cargando tus lobbies...",
      error: "Tus lobbies no están disponibles en este momento.",
      empty: "Todavía no estás en ningún lobby.",
      openLobby: "Abrir lobby",
      groupCode: "Código del grupo",
      members: "Miembros"
    },
    predictionsPage: {
      title: "Pronósticos por defecto",
      aria: "Pronósticos por defecto de partidos",
      eyebrow: "Tablero de pronósticos",
      summary: "Elige un lobby y un grupo o fase, luego ingresa tus marcadores. Los cambios se guardan automáticamente.",
      loading: "Cargando pronósticos...",
      error: "Los pronósticos no están disponibles en este momento.",
      emptyLobbies: "Únete o crea un lobby antes de hacer pronósticos.",
      emptyMatches: "No se encontraron partidos para esta selección.",
      lobbyLabel: "Lobby",
      phaseLabel: "Grupo o fase",
      defaultLobby: "Por defecto",
      copyAll: "Aplicar por defecto al lobby",
      copyPhase: "Aplicar por defecto al grupo/fase",
      copyAllConfirm: "¿Aplicar todos los pronósticos por defecto a este lobby?",
      copyPhaseConfirm: "¿Aplicar los pronósticos por defecto del grupo/fase seleccionado a este lobby?",
      confirmTitle: "Aplicar pronósticos por defecto",
      confirmBody: "Esto reemplazará los pronósticos guardados que coincidan en el lobby seleccionado.",
      confirmAction: "Aplicar pronósticos",
      cancelAction: "Cancelar",
      copySuccess: "Los pronósticos por defecto fueron aplicados.",
      allMatches: "Todos los partidos",
      saveIdle: "Sin guardar",
      saveSaving: "Guardando...",
      saveSaved: "Guardado",
      saveError: "No se pudo guardar",
      homeScore: "Goles local",
      awayScore: "Goles visitante"
    },
    pointSystemPage: {
      title: "Elige un sistema de puntos",
      aria: "Configuración del sistema de puntos del lobby",
      eyebrow: "Configuración del lobby",
      summary: "Elige cómo este lobby va a puntuar los pronósticos. Puedes revisar la estructura ahora y entrar al lobby después de seleccionar una opción.",
      missingCode: "Crea o abre un lobby antes de elegir un sistema de puntos.",
      select: "Seleccionar",
      selected: "Seleccionado",
      continue: "Continuar al lobby",
      saveError: "No se pudo guardar el sistema de puntos en este momento.",
      disclaimerTitle: "Ventanas de pronóstico",
      disclaimer:
        "Todas las ventanas de pronósticos sobre partidos específicos cierran un minuto antes del inicio de dicho partido. Los pronósticos globales cierran antes del inicio del primer partido o 24 horas después de que un jugador se una al lobby, lo que ocurra más tarde.",
      options: [
        {
          id: "simple",
          name: "Simple",
          summary: "Una configuración compacta para grupos que quieren pronósticos rápidos y puntaje fácil.",
          sections: [
            {
              title: "Específico por partido",
              items: [
                "Acertar el marcador exacto = 4 pts",
                "Acertar el resultado correcto (A gana, B gana o empate) = 2 pts",
                "Resultado incorrecto = 0 pts"
              ]
            },
            {
              title: "Global",
              items: ["Campeón = 15 pts", "Subcampeón = 10 pts", "Goleador = 8 pts"]
            }
          ]
        },
        {
          id: "regular",
          name: "Regular",
          summary: "Una configuración balanceada con crédito parcial para pronósticos cercanos.",
          sections: [
            {
              title: "Específico por partido",
              items: [
                "Marcador exacto = 5 pts",
                "Resultado correcto + diferencia de gol correcta si hay ganador = 4 pts",
                "Resultado correcto pero no marcador exacto = 3 pts",
                "Resultado incorrecto + goles del local correctos pero visitante incorrecto = 1 pt",
                "Resultado incorrecto + goles del visitante correctos pero local incorrecto = 1 pt"
              ]
            },
            {
              title: "Global",
              items: [
                "Campeón = 20 pts",
                "Subcampeón = 12 pts",
                "Tercer lugar = 8 pts",
                "Cuarto lugar = 6 pts",
                "Goleador = 10 pts",
                "Balón de Oro = 8 pts"
              ]
            }
          ]
        },
        {
          id: "custom",
          name: "Personalizado",
          summary: "Parte de la configuración regular y agrega capas extra de pronóstico.",
          sections: [
            {
              title: "Configuración de puntaje regular",
              items: ["Elige entre las opciones de la configuración regular con puntajes personalizados."]
            },
            {
              title: "Funciones adicionales",
              items: [
                "Elige tu equipo: cada jugador escoge un país para apoyar; cada partido donde juegue ese equipo tendrá sus puntos duplicados.",
                "Sigue un equipo: el administrador define un país a seguir; los jugadores predicen hasta que instancia llegará dicho equipo.",
                "Jugador favorito: los jugadores eligen un futbolista; sus contribuciones de gol dan puntos en metas configurables.",
                "Llave pesada: después de la fase de grupos, los jugadores predicen todo el cuadro de eliminación directa, con más puntos en rondas posteriores."
              ]
            }
          ]
        }
      ]
    },
    customSettingsPage: {
      title: "Personaliza el puntaje",
      aria: "Configuración personalizada de puntaje del lobby",
      eyebrow: "Configuración personalizada",
      summary: "Empieza con los valores del sistema Regular, luego activa o desactiva reglas individuales y edita los puntos que usará tu lobby.",
      missingCode: "Elige Personalizado desde la configuración de un lobby antes de editar estos ajustes.",
      matchSpecific: "Específico por partido",
      global: "Global",
      special: "Ajustes especiales",
      bracketRounds: "Rondas de llave pesada",
      save: "Guardar ajustes personalizados",
      saveError: "No se pudieron guardar los ajustes personalizados en este momento.",
      validationError: "Cada ajuste activo debe completarse con un entero no negativo, y Sigue un equipo necesita un país.",
      trackedTeamLabel: "País a seguir",
      trackedTeamPlaceholder: "Elige un país",
      fields: {
        exactScore: "Marcador exacto",
        resultGoalDifference: "Resultado correcto + diferencia de gol",
        correctResult: "Resultado correcto",
        homeGoal: "Resultado incorrecto + goles del local correctos",
        awayGoal: "Resultado incorrecto + goles del visitante correctos",
        champion: "Campeón",
        runnerUp: "Subcampeón",
        thirdPlace: "Tercer lugar",
        fourthPlace: "Cuarto lugar",
        topScorer: "Goleador",
        goldenBall: "Balón de Oro",
        favoritePlayerContributions: "Contribuciones de gol por premio",
        favoritePlayerPoints: "Puntos por premio",
        roundOf32: "Ronda de 32",
        roundOf16: "Ronda de 16",
        quarterFinal: "Cuartos de final",
        semiFinal: "Semifinal",
        thirdPlaceMatch: "Partido por tercer lugar",
        final: "Final"
      },
      features: {
        chooseTeam: {
          label: "Elige tu equipo",
          detail:
            "Al inicio del juego, cada jugador elige un país para apoyar. Cada partido donde juegue ese equipo tendrá sus puntos duplicados. Esto debe completarse antes de que cierre la ventana global del jugador."
        },
        trackTeam: {
          label: "Sigue un equipo",
          detail:
            "El admin elige un país para seguir durante el torneo. Los jugadores predicen hasta dónde llegará ese país. El admin debe elegir el país durante la configuración del lobby; los jugadores responden antes de que cierre su ventana global."
        },
        favoritePlayer: {
          label: "Jugador favorito",
          detail:
            "Al inicio del juego, cada jugador elige un jugador. Se otorgan puntos cada vez que ese jugador alcanza la cantidad configurada de goles más asistencias. La elección cierra con la ventana global."
        },
        bracketHeavy: {
          label: "Llave pesada",
          detail:
            "Después de la fase de grupos y antes de que empiece la Ronda de 32, los jugadores predicen quién avanza en cada partido de eliminación. En rondas posteriores, el acierto cuenta solo si el cruce previo también fue predicho correctamente."
        }
      }
    },
    leaveLobby: {
      title: "Salir del lobby",
      body: (name) => `¿Seguro que quieres salir de ${name}?`,
      confirm: "Salir del lobby",
      cancel: "Cancelar",
      error: "No se pudo salir de este lobby en este momento."
    },
    kickMember: {
      title: "Expulsar miembro",
      body: (username, lobbyName) => `¿Seguro que quieres expulsar a ${username} de ${lobbyName}?`,
      confirm: "Expulsar miembro",
      cancel: "Cancelar",
      error: "No se pudo expulsar a este miembro en este momento."
    },
    deleteLobby: {
      title: "Eliminar lobby",
      body: (name, phrase) => `Esto eliminará ${name} permanentemente. Escribe "${phrase}" para confirmar.`,
      phrase: "eliminar lobby",
      label: "Texto de confirmación",
      confirm: "Eliminar lobby",
      cancel: "Cancelar",
      error: "No se pudo eliminar este lobby en este momento."
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

  if (
    document.body.dataset.page === "point-system" ||
    window.location.pathname.endsWith("/point-system.html")
  ) {
    return "point-system";
  }

  if (
    document.body.dataset.page === "custom-settings" ||
    window.location.pathname.endsWith("/custom-settings.html")
  ) {
    return "custom-settings";
  }

  if (document.body.dataset.page === "my-lobbies" || window.location.pathname.endsWith("/my-lobbies.html")) {
    return "my-lobbies";
  }

  if (document.body.dataset.page === "predictions" || window.location.pathname.endsWith("/predictions.html")) {
    return "predictions";
  }

  return "home";
};

const getLobbyCodeFromUrl = () => {
  const code = new URLSearchParams(window.location.search).get("code") ?? "";

  return code.trim().toUpperCase();
};

const getLobbyDraftIdFromUrl = () => new URLSearchParams(window.location.search).get("draft")?.trim() ?? "";

const getPredictionLobbyFromUrl = () => new URLSearchParams(window.location.search).get("lobby")?.trim().toUpperCase() ?? "";

const createLobbyDraftId = () => {
  if ("crypto" in window && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const saveLobbyCreationDraft = (draft: LobbyCreationDraft) => {
  window.sessionStorage.setItem(lobbyCreationDraftStorageKey, JSON.stringify(draft));
};

const getLobbyCreationDraft = (draftId = getLobbyDraftIdFromUrl()) => {
  const storedDraft = window.sessionStorage.getItem(lobbyCreationDraftStorageKey);

  if (!storedDraft || !draftId) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedDraft) as Partial<LobbyCreationDraft>;

    if (
      parsed.id !== draftId ||
      typeof parsed.name !== "string" ||
      typeof parsed.createdByUsername !== "string" ||
      typeof parsed.createdByUserId !== "number"
    ) {
      return null;
    }

    return {
      id: parsed.id,
      createdByUserId: parsed.createdByUserId,
      createdByUsername: parsed.createdByUsername,
      name: parsed.name,
      password: typeof parsed.password === "string" ? parsed.password : undefined
    };
  } catch {
    return null;
  }
};

const clearLobbyCreationDraft = () => {
  window.sessionStorage.removeItem(lobbyCreationDraftStorageKey);
};

const getPointSystemStorageKey = (code: string) => `worldcup-point-system-${code}`;
const getCustomSettingsStorageKey = (code: string) => `worldcup-custom-settings-${code}`;
const getGlobalPlacementPredictionsStorageKey = (lobby: Lobby) =>
  `worldcup-global-placement-predictions-${lobby.code}-${currentUser?.id ?? "anonymous"}`;

const getStoredGlobalPlacementPredictions = (lobby: Lobby): Partial<Record<GlobalPlacementPredictionId, string>> => {
  const storedPredictions = window.localStorage.getItem(getGlobalPlacementPredictionsStorageKey(lobby));

  if (!storedPredictions) {
    return {};
  }

  try {
    const parsed = JSON.parse(storedPredictions) as Partial<Record<GlobalPlacementPredictionId, unknown>>;

    return {
      champion: typeof parsed.champion === "string" ? parsed.champion : undefined,
      runnerUp: typeof parsed.runnerUp === "string" ? parsed.runnerUp : undefined,
      thirdPlace: typeof parsed.thirdPlace === "string" ? parsed.thirdPlace : undefined,
      fourthPlace: typeof parsed.fourthPlace === "string" ? parsed.fourthPlace : undefined
    };
  } catch {
    return {};
  }
};

const saveStoredGlobalPlacementPrediction = (
  lobby: Lobby,
  predictionId: GlobalPlacementPredictionId,
  teamName: string
) => {
  const predictions = {
    ...getStoredGlobalPlacementPredictions(lobby),
    [predictionId]: teamName
  };

  window.localStorage.setItem(getGlobalPlacementPredictionsStorageKey(lobby), JSON.stringify(predictions));
};

const matchSpecificCustomFields: CustomNumericFieldId[] = [
  "exactScore",
  "resultGoalDifference",
  "correctResult",
  "homeGoal",
  "awayGoal"
];
const globalCustomFields: CustomNumericFieldId[] = [
  "champion",
  "runnerUp",
  "thirdPlace",
  "fourthPlace",
  "topScorer",
  "goldenBall"
];
const globalPlacementFields: GlobalPlacementPredictionId[] = ["champion", "runnerUp", "thirdPlace", "fourthPlace"];
const favoritePlayerCustomFields: CustomNumericFieldId[] = ["favoritePlayerContributions", "favoritePlayerPoints"];
const bracketHeavyCustomFields: CustomNumericFieldId[] = [
  "roundOf32",
  "roundOf16",
  "quarterFinal",
  "semiFinal",
  "thirdPlaceMatch",
  "final"
];

const getParticipatingTeams = (language: Language) =>
  worldCupGroups
    .flatMap((group) => group.teams)
    .sort((a, b) => a.team[language].localeCompare(b.team[language], language));

const sanitizeNonNegativeIntegerInput = (value: string) => value.replace(/\D/g, "").replace(/^0+(\d)/, "$1");

const isNonNegativeIntegerValue = (value: string) => /^(0|[1-9]\d*)$/.test(value);

const isLobbyPasswordValid = (password: string) =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /\d/.test(password);

const isCurrentUserLobbyAdmin = (lobby: Lobby | null) => {
  if (!currentUser || !lobby) {
    return false;
  }

  const userId = currentUser.id;

  return lobby.members.some((member) => member.userId === userId && member.role === "admin");
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

const stageDisplayLabels: Record<string, string> = {
  "Last 16": "Round of 16"
};

const stageTranslations: Partial<Record<Language, Record<string, string>>> = {
  es: {
    "Last 32": "Dieciseisavos de final",
    "Last 16": "Octavos de final",
    "Quarter Finals": "Cuartos de final",
    "Semi Finals": "Semifinales",
    "Third Place": "Tercer puesto",
    Final: "Final"
  }
};

const localizeStageLabel = (stage: string, language: Language) =>
  stageTranslations[language]?.[stage] ?? stageDisplayLabels[stage] ?? stage;

const localizeMatchLabel = (label: string | null, language: Language) => {
  if (!label) {
    return "";
  }

  if (language === "es" && label.startsWith("Group ")) {
    return label.replace("Group", "Grupo");
  }

  if (language === "es" && label === "Group Stage") {
    return "Fase de grupos";
  }

  return localizeStageLabel(label, language);
};

const knockoutStageOrder = [
  "Last 32",
  "Last 16",
  "Quarter Finals",
  "Semi Finals",
  "Third Place",
  "Final"
];

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

const formatRulePoints = (value: string | undefined) => `${value ?? "0"} pts`;

const renderLobbyRuleText = (item: string) => {
  const equalsIndex = item.indexOf("=");

  if (equalsIndex === -1) {
    return item;
  }

  const label = item.slice(0, equalsIndex).trimEnd();
  const value = item.slice(equalsIndex).trim();

  return `<span>${label} </span><strong>${value}</strong>`;
};

const getCustomRuleValue = (lobby: Lobby, field: CustomNumericFieldId) => lobby.customSettings?.values?.[field] ?? "0";

const isCustomRuleEnabled = (lobby: Lobby, field: CustomNumericFieldId) =>
  Boolean(lobby.customSettings?.enabledFields?.[field]);

const isCustomFeatureEnabled = (lobby: Lobby, feature: CustomFeatureId) =>
  Boolean(lobby.customSettings?.enabledFeatures?.[feature]);

const renderCustomRuleList = (selectedCopy: Copy, lobby: Lobby, fields: CustomNumericFieldId[]) => {
  const items = fields.filter((field) => isCustomRuleEnabled(lobby, field));

  if (items.length === 0) {
    return `<p>${selectedCopy.lobbyPage.rulesUnavailable}</p>`;
  }

  return `
    <ul>
      ${items
        .map(
          (field) =>
            `<li><span>${selectedCopy.customSettingsPage.fields[field]} </span><strong>= ${formatRulePoints(getCustomRuleValue(lobby, field))}</strong></li>`
        )
        .join("")}
    </ul>
  `;
};

const renderCustomFeatureRules = (selectedCopy: Copy, language: Language, lobby: Lobby) => {
  const featureItems: string[] = [];

  if (isCustomFeatureEnabled(lobby, "chooseTeam")) {
    featureItems.push(
      `<li><span>${selectedCopy.customSettingsPage.features.chooseTeam.label}</span><p>${selectedCopy.customSettingsPage.features.chooseTeam.detail}</p></li>`
    );
  }

  if (isCustomFeatureEnabled(lobby, "trackTeam")) {
    const trackedTeam = lobby.customSettings?.trackedTeam
      ? getTeamDisplayName(lobby.customSettings.trackedTeam, language)
      : selectedCopy.customSettingsPage.trackedTeamPlaceholder;

    featureItems.push(
      `<li><span>${selectedCopy.customSettingsPage.features.trackTeam.label}: ${trackedTeam}</span><p>${selectedCopy.customSettingsPage.features.trackTeam.detail}</p></li>`
    );
  }

  if (isCustomFeatureEnabled(lobby, "favoritePlayer")) {
    featureItems.push(
      `<li><span>${selectedCopy.customSettingsPage.features.favoritePlayer.label}</span><p>${selectedCopy.customSettingsPage.features.favoritePlayer.detail}</p><strong>${selectedCopy.customSettingsPage.fields.favoritePlayerContributions}: ${getCustomRuleValue(lobby, "favoritePlayerContributions")} | ${selectedCopy.customSettingsPage.fields.favoritePlayerPoints}: ${formatRulePoints(getCustomRuleValue(lobby, "favoritePlayerPoints"))}</strong></li>`
    );
  }

  if (isCustomFeatureEnabled(lobby, "bracketHeavy")) {
    featureItems.push(`
      <li>
        <span>${selectedCopy.customSettingsPage.features.bracketHeavy.label}</span>
        <p>${selectedCopy.customSettingsPage.features.bracketHeavy.detail}</p>
        <div class="lobby-rules-mini-grid">
          ${bracketHeavyCustomFields
            .map(
              (field) => `
                <span>${selectedCopy.customSettingsPage.fields[field]}</span>
                <strong>${formatRulePoints(getCustomRuleValue(lobby, field))}</strong>
              `
            )
            .join("")}
        </div>
      </li>
    `);
  }

  if (featureItems.length === 0) {
    return `<p>${selectedCopy.lobbyPage.rulesUnavailable}</p>`;
  }

  return `<ul class="lobby-feature-rules">${featureItems.join("")}</ul>`;
};

const renderLobbyRulesPanel = (selectedCopy: Copy, language: Language, lobby: Lobby) => {
  const selectedPointSystemOption = selectedCopy.pointSystemPage.options.find((option) => option.id === lobby.pointSystem);

  if (!lobby.pointSystem || !selectedPointSystemOption) {
    return `
      <section class="lobby-rules-panel">
        <h3>${selectedCopy.lobbyPage.rulesTitle}</h3>
        <p>${selectedCopy.lobbyPage.rulesUnavailable}</p>
      </section>
    `;
  }

  if (lobby.pointSystem !== "custom") {
    return `
      <section class="lobby-rules-panel">
        <div class="lobby-rules-heading">
          <span>${selectedCopy.lobbyPage.pointSystem}</span>
          <strong>${selectedPointSystemOption.name}</strong>
        </div>
        <p>${selectedPointSystemOption.summary}</p>
        <div class="lobby-rules-grid">
          ${selectedPointSystemOption.sections
            .map(
              (section) => `
                <div class="lobby-rules-section">
                  <h4>${section.title}</h4>
                  <ul>
                    ${section.items.map((item) => `<li>${renderLobbyRuleText(item)}</li>`).join("")}
                  </ul>
                </div>
              `
            )
            .join("")}
        </div>
        <aside>${selectedCopy.pointSystemPage.disclaimer}</aside>
      </section>
    `;
  }

  return `
    <section class="lobby-rules-panel">
      <div class="lobby-rules-heading">
        <span>${selectedCopy.lobbyPage.pointSystem}</span>
        <strong>${selectedPointSystemOption.name}</strong>
      </div>
      <p>${selectedCopy.lobbyPage.customRulesTitle}</p>
      <div class="lobby-rules-grid">
        <div class="lobby-rules-section">
          <h4>${selectedCopy.customSettingsPage.matchSpecific}</h4>
          ${renderCustomRuleList(selectedCopy, lobby, matchSpecificCustomFields)}
        </div>
        <div class="lobby-rules-section">
          <h4>${selectedCopy.customSettingsPage.global}</h4>
          ${renderCustomRuleList(selectedCopy, lobby, globalCustomFields)}
        </div>
      </div>
      <div class="lobby-rules-section lobby-rules-section-wide">
        <h4>${selectedCopy.lobbyPage.enabledFeatures}</h4>
        ${renderCustomFeatureRules(selectedCopy, language, lobby)}
      </div>
      <aside>${selectedCopy.pointSystemPage.disclaimer}</aside>
    </section>
  `;
};

const isGlobalPlacementPredictionId = (field: CustomNumericFieldId): field is GlobalPlacementPredictionId =>
  globalPlacementFields.includes(field as GlobalPlacementPredictionId);

const getGlobalPredictionOptions = (selectedCopy: Copy, lobby: Lobby): GlobalPredictionOption[] => {
  const selectedPointSystemOption = selectedCopy.pointSystemPage.options.find((option) => option.id === lobby.pointSystem);

  if (!lobby.pointSystem || !selectedPointSystemOption) {
    return [];
  }

  if (lobby.pointSystem !== "custom") {
    const fieldsByPointSystem: Record<"simple" | "regular", CustomNumericFieldId[]> = {
      simple: ["champion", "runnerUp", "topScorer"],
      regular: ["champion", "runnerUp", "thirdPlace", "fourthPlace", "topScorer", "goldenBall"]
    };

    return fieldsByPointSystem[lobby.pointSystem].map((field) => ({
      id: field,
      label: selectedCopy.customSettingsPage.fields[field],
      isPlacement: isGlobalPlacementPredictionId(field)
    }));
  }

  return globalCustomFields
    .filter((field) => isCustomRuleEnabled(lobby, field))
    .map((field) => ({
      id: field,
      label: selectedCopy.customSettingsPage.fields[field],
      isPlacement: isGlobalPlacementPredictionId(field)
    }));
};

const renderGlobalPredictionOptionContent = (
  option: GlobalPredictionOption,
  lobby: Lobby,
  language: Language
) => {
  const selectedTeam = option.isPlacement
    ? getStoredGlobalPlacementPredictions(lobby)[option.id as GlobalPlacementPredictionId]
    : null;

  if (!selectedTeam) {
    return `<span>${option.label}</span>`;
  }

  return `
    <span>${option.label}</span>
    ${renderTeamBadge(selectedTeam, language)}
  `;
};

const renderGlobalPredictionsDropdown = (selectedCopy: Copy, language: Language, lobby: Lobby) => {
  const globalPredictionOptions = getGlobalPredictionOptions(selectedCopy, lobby);

  if (globalPredictionOptions.length === 0) {
    return "";
  }

  return `
    <details class="lobby-global-dropdown">
      <summary class="secondary-action compact-secondary-action">${selectedCopy.lobbyPage.globalPredictions}</summary>
      <div class="lobby-global-dropdown-menu">
        ${globalPredictionOptions
          .map(
            (option) => `
              <button
                class="secondary-action compact-secondary-action global-prediction-option"
                type="button"
                ${option.isPlacement ? `data-global-placement-prediction="${option.id}"` : ""}
              >
                ${renderGlobalPredictionOptionContent(option, lobby, language)}
              </button>
            `
          )
          .join("")}
      </div>
    </details>
  `;
};

const getGlobalPlacementPredictionLabel = (
  selectedCopy: Copy,
  predictionId: GlobalPlacementPredictionId | null
) => {
  if (!predictionId) {
    return selectedCopy.lobbyPage.globalPredictions;
  }

  return selectedCopy.customSettingsPage.fields[predictionId];
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

const getPredictionPhaseSortValue = (phase: string) => {
  const groupMatch = /^Group ([A-Z])$/.exec(phase);

  if (groupMatch) {
    const groupIndex = worldCupGroups.findIndex((group) => group.letter === groupMatch[1]);

    if (groupIndex !== -1) {
      return groupIndex;
    }
  }

  const knockoutIndex = knockoutStageOrder.indexOf(phase);

  if (knockoutIndex !== -1) {
    return worldCupGroups.length + knockoutIndex;
  }

  if (phase === "Group Stage") {
    return worldCupGroups.length + knockoutStageOrder.length;
  }

  return Number.MAX_SAFE_INTEGER;
};

const getPredictionPhaseOptions = (language: Language) => {
  const options = new Map<string, string>();

  allMatches.forEach((match) => {
    const key = match.group ?? match.stage;

    if (key) {
      options.set(key, localizeMatchLabel(key, language));
    }
  });

  return Array.from(options.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => {
      const orderDifference = getPredictionPhaseSortValue(a.value) - getPredictionPhaseSortValue(b.value);

      if (orderDifference !== 0) {
        return orderDifference;
      }

      return a.label.localeCompare(b.label, language);
    });
};

const getFilteredPredictionMatches = () => {
  if (!selectedPredictionPhase) {
    return allMatches;
  }

  return allMatches.filter((match) => (match.group ?? match.stage) === selectedPredictionPhase);
};

const getPredictionValue = (matchId: number, side: "home" | "away") => {
  const prediction = matchPredictions[matchId];
  const value = side === "home" ? prediction?.homeScore : prediction?.awayScore;

  return value === null || value === undefined ? "" : String(value);
};

const getPredictionSaveLabel = (selectedCopy: Copy, matchId: number) => {
  const state = predictionSaveStates[matchId] ?? "idle";

  return {
    error: selectedCopy.predictionsPage.saveError,
    idle: selectedCopy.predictionsPage.saveIdle,
    saved: selectedCopy.predictionsPage.saveSaved,
    saving: selectedCopy.predictionsPage.saveSaving
  }[state];
};

const renderPredictionMatchCard = (match: CarouselMatch, selectedCopy: Copy, language: Language) => {
  const saveState = predictionSaveStates[match.id] ?? "idle";

  return `
    <article class="prediction-match-card">
      <div class="match-list-meta">
        <span>${getMatchTime(match.utcDate, language)}</span>
        <strong>${localizeMatchLabel(match.group ?? match.stage, language)}</strong>
      </div>
      <div class="prediction-teams">
        <label class="prediction-team-row">
          ${renderTeamBadge(match.homeTeam, language)}
          <span>${getTeamDisplayName(match.homeTeam, language)}</span>
          <input
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            aria-label="${getTeamDisplayName(match.homeTeam, language)} ${selectedCopy.predictionsPage.homeScore}"
            data-prediction-match="${match.id}"
            data-prediction-side="home"
            value="${getPredictionValue(match.id, "home")}"
          />
        </label>
        <label class="prediction-team-row">
          ${renderTeamBadge(match.awayTeam, language)}
          <span>${getTeamDisplayName(match.awayTeam, language)}</span>
          <input
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            aria-label="${getTeamDisplayName(match.awayTeam, language)} ${selectedCopy.predictionsPage.awayScore}"
            data-prediction-match="${match.id}"
            data-prediction-side="away"
            value="${getPredictionValue(match.id, "away")}"
          />
        </label>
      </div>
      <p class="prediction-save-state is-${saveState}" data-prediction-save-state="${match.id}">${getPredictionSaveLabel(selectedCopy, match.id)}</p>
    </article>
  `;
};

const renderPredictionsPage = (selectedCopy: Copy, language: Language) => {
  const phaseOptions = getPredictionPhaseOptions(language);
  const filteredMatches = getFilteredPredictionMatches();
  const selectedLobby = userLobbies.find((lobby) => lobby.code === selectedPredictionLobbyCode) ?? null;
  const isDefaultSelected = selectedPredictionLobbyCode === defaultPredictionLobbyCode;
  const selectedLobbyLabel = selectedLobby
    ? `${selectedLobby.name} (${selectedLobby.code})`
    : selectedCopy.predictionsPage.defaultLobby;
  const selectedPhaseLabel =
    phaseOptions.find((option) => option.value === selectedPredictionPhase)?.label ?? selectedCopy.predictionsPage.allMatches;

  return `
    <section class="predictions-section" id="predictions" aria-label="${selectedCopy.predictionsPage.aria}">
      <div class="section-heading">
        <p class="eyebrow">${selectedCopy.predictionsPage.eyebrow}</p>
        <h2>${selectedCopy.predictionsPage.title}</h2>
        <p>${selectedCopy.predictionsPage.summary}</p>
      </div>
      ${
        isCurrentUserLoading || !currentUser || isUserLobbiesLoading || isAllMatchesLoading || isPredictionsLoading
          ? `<div class="matches-state">${selectedCopy.predictionsPage.loading}</div>`
          : userLobbiesError || allMatchesError || predictionsError
            ? `<div class="matches-state">${selectedCopy.predictionsPage.error}</div>`
            : `
                <div class="prediction-controls">
                  <div class="prediction-dropdown" data-prediction-dropdown="lobby">
                    <span>${selectedCopy.predictionsPage.lobbyLabel}</span>
                    <button class="prediction-dropdown-trigger" type="button" id="prediction-lobby-trigger" aria-expanded="${openPredictionDropdown === "lobby" ? "true" : "false"}" aria-haspopup="menu">
                      ${selectedLobbyLabel}
                    </button>
                    <div class="prediction-dropdown-menu" id="prediction-lobby-menu" role="menu" ${openPredictionDropdown === "lobby" ? "" : "hidden"}>
                      <button type="button" role="menuitem" data-prediction-lobby="${defaultPredictionLobbyCode}" aria-current="${isDefaultSelected ? "true" : "false"}">
                        ${selectedCopy.predictionsPage.defaultLobby}
                      </button>
                      ${userLobbies
                        .map(
                          (lobby) => `
                            <button type="button" role="menuitem" data-prediction-lobby="${lobby.code}" aria-current="${lobby.code === selectedPredictionLobbyCode ? "true" : "false"}">
                              ${lobby.name} (${lobby.code})
                            </button>
                          `
                        )
                        .join("")}
                    </div>
                  </div>
                  <div class="prediction-dropdown" data-prediction-dropdown="phase">
                    <span>${selectedCopy.predictionsPage.phaseLabel}</span>
                    <button class="prediction-dropdown-trigger" type="button" id="prediction-phase-trigger" aria-expanded="${openPredictionDropdown === "phase" ? "true" : "false"}" aria-haspopup="menu">
                      ${selectedPhaseLabel}
                    </button>
                    <div class="prediction-dropdown-menu" id="prediction-phase-menu" role="menu" ${openPredictionDropdown === "phase" ? "" : "hidden"}>
                      <button type="button" role="menuitem" data-prediction-phase="" aria-current="${selectedPredictionPhase ? "false" : "true"}">${selectedCopy.predictionsPage.allMatches}</button>
                      ${phaseOptions
                        .map(
                          (option) => `
                            <button type="button" role="menuitem" data-prediction-phase="${option.value}" aria-current="${option.value === selectedPredictionPhase ? "true" : "false"}">
                              ${option.label}
                            </button>
                          `
                        )
                        .join("")}
                    </div>
                  </div>
                  ${
                    selectedLobby
                      ? `<div class="prediction-copy-actions">
                          <button class="secondary-action" type="button" id="copy-default-all">
                            ${selectedCopy.predictionsPage.copyAll}
                          </button>
                          <button class="secondary-action" type="button" id="copy-default-phase" ${selectedPredictionPhase ? "" : "disabled"}>
                            ${selectedCopy.predictionsPage.copyPhase}
                          </button>
                        </div>`
                      : ""
                  }
                </div>
                ${
                  filteredMatches.length === 0
                    ? `<div class="matches-state">${selectedCopy.predictionsPage.emptyMatches}</div>`
                    : `<div class="prediction-match-grid">
                        ${filteredMatches.map((match) => renderPredictionMatchCard(match, selectedCopy, language)).join("")}
                      </div>`
                }
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

const renderLobbyPage = (selectedCopy: Copy, language: Language) => {
  const lobbyCode = getLobbyCodeFromUrl();
  const isAdmin = isCurrentUserLobbyAdmin(currentLobby);
  const isMember = Boolean(
    currentUser && currentLobby?.members.some((member) => member.userId === currentUser?.id)
  );

  return `
    <section class="lobby-section" id="lobby" aria-label="${selectedCopy.lobbyPage.aria}">
      ${
        !lobbyCode
          ? `<div class="section-heading">
              <p class="eyebrow">FIFA World Cup 2026</p>
              <h2>${selectedCopy.lobbyPage.title}</h2>
            </div>
            <div class="matches-state">${selectedCopy.lobbyPage.missingCode}</div>`
          : isLobbyLoading
            ? `<div class="section-heading">
                <p class="eyebrow">FIFA World Cup 2026</p>
                <h2>${selectedCopy.lobbyPage.title}</h2>
              </div>
              <div class="matches-state">${selectedCopy.lobbyPage.loading}</div>`
            : lobbyError
              ? `<div class="section-heading">
                  <p class="eyebrow">FIFA World Cup 2026</p>
                  <h2>${selectedCopy.lobbyPage.title}</h2>
                </div>
                <div class="matches-state">${selectedCopy.lobbyPage.error}</div>`
              : currentLobby
                ? `
                  <div class="lobby-content-layout">
                    <div class="lobby-main-column">
                      <div class="section-heading">
                        <p class="eyebrow">FIFA World Cup 2026</p>
                        <h2>${currentLobby.name}</h2>
                      </div>
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
                                        <span class="lobby-member-actions">
                                          ${
                                            member.role === "admin"
                                              ? `<strong>${selectedCopy.lobbyPage.admin}</strong>`
                                              : ""
                                          }
                                          ${
                                            isAdmin && currentUser?.id !== member.userId && member.role !== "admin"
                                              ? `<button class="leave-lobby-button is-visible" type="button" data-kick-member-id="${member.userId}" data-kick-member-name="${member.username}">${selectedCopy.lobbyPage.kickMember}</button>`
                                              : ""
                                          }
                                        </span>
                                      </li>
                                    `
                                  )
                                  .join("")}
                              </ul>
                            `
                        }
                      </article>
                    </div>
                    ${
                      isMember
                        ? `<aside class="lobby-action-panel" aria-label="${selectedCopy.lobbyPage.title}">
                            <button class="secondary-action compact-secondary-action" type="button" id="lobby-rules-toggle">
                              ${selectedCopy.lobbyPage.showRules}
                            </button>
                            <a class="secondary-action compact-secondary-action" href="/predictions.html?lobby=${encodeURIComponent(currentLobby.code)}">
                              ${selectedCopy.lobbyPage.myPredictions}
                            </a>
                            ${renderGlobalPredictionsDropdown(selectedCopy, language, currentLobby)}
                            <button class="leave-lobby-button is-visible" type="button" data-leave-lobby-code="${currentLobby.code}">${selectedCopy.lobbyPage.leaveLobby}</button>
                            ${
                              isAdmin
                                ? `<button class="danger-action compact-danger-action" type="button" data-delete-lobby-code="${currentLobby.code}">${selectedCopy.lobbyPage.deleteLobby}</button>`
                                : ""
                            }
                          </aside>`
                        : ""
                    }
                  </div>
                `
                : `<div class="matches-state">${selectedCopy.lobbyPage.empty}</div>`
      }
    </section>
  `;
};

const renderMyLobbiesPage = (selectedCopy: Copy) => `
  <section class="my-lobbies-section" id="my-lobbies" aria-label="${selectedCopy.myLobbiesPage.aria}">
    <div class="section-heading">
      <p class="eyebrow">FIFA World Cup 2026</p>
      <h2>${selectedCopy.myLobbiesPage.title}</h2>
    </div>
    ${
      isUserLobbiesLoading
        ? `<div class="matches-state">${selectedCopy.myLobbiesPage.loading}</div>`
        : userLobbiesError
          ? `<div class="matches-state">${selectedCopy.myLobbiesPage.error}</div>`
          : userLobbies.length === 0
            ? `<div class="matches-state">${selectedCopy.myLobbiesPage.empty}</div>`
            : `
              <div class="my-lobbies-list">
                ${userLobbies
                  .map(
                    (lobby) => `
                      <article class="my-lobby-card">
                        <a class="my-lobby-link" href="/lobby.html?code=${encodeURIComponent(lobby.code)}">
                          <span>
                            <strong>${lobby.name}</strong>
                            <small>${selectedCopy.myLobbiesPage.groupCode}: ${lobby.code}</small>
                          </span>
                          <span class="my-lobby-meta">
                            <span>${lobby.members.length} ${selectedCopy.myLobbiesPage.members}</span>
                            <strong>${selectedCopy.myLobbiesPage.openLobby}</strong>
                          </span>
                        </a>
                        <button class="leave-lobby-button" type="button" data-leave-lobby-code="${lobby.code}">
                          ${selectedCopy.lobbyPage.leaveLobby}
                        </button>
                      </article>
                    `
                  )
                  .join("")}
              </div>
            `
    }
  </section>
`;

const renderPointSystemPage = (selectedCopy: Copy) => {
  const draft = getLobbyCreationDraft();

  return `
    <section class="point-system-section" id="point-system" aria-label="${selectedCopy.pointSystemPage.aria}">
      <div class="section-heading">
        <p class="eyebrow">${selectedCopy.pointSystemPage.eyebrow}</p>
        <h2>${selectedCopy.pointSystemPage.title}</h2>
        <p>${selectedCopy.pointSystemPage.summary}</p>
      </div>
      ${
        !draft
          ? `<div class="matches-state">${selectedCopy.pointSystemPage.missingCode}</div>`
          : `
            <div class="point-system-grid">
              ${selectedCopy.pointSystemPage.options
                .map((option) => {
                  const isSelected = selectedPointSystem === option.id;

                  return `
                    <article class="point-system-card ${isSelected ? "is-selected" : ""}">
                      <div class="point-system-card-heading">
                        <h3>${option.name}</h3>
                        <p>${option.summary}</p>
                      </div>
                      <div class="point-system-rules">
                        ${option.sections
                          .map(
                            (section) => `
                              <div class="point-system-rule-section">
                                <strong>${section.title}</strong>
                                <ul>
                                  ${section.items.map((item) => `<li>${item}</li>`).join("")}
                                </ul>
                              </div>
                            `
                          )
                          .join("")}
                      </div>
                      <button class="${isSelected ? "primary-action" : "secondary-action"} point-system-select" type="button" data-point-system="${option.id}">
                        ${isSelected ? selectedCopy.pointSystemPage.selected : selectedCopy.pointSystemPage.select}
                      </button>
                    </article>
                  `;
                })
                .join("")}
            </div>
            <aside class="point-system-disclaimer">
              <strong>${selectedCopy.pointSystemPage.disclaimerTitle}</strong>
              <p>${selectedCopy.pointSystemPage.disclaimer}</p>
            </aside>
            ${pointSystemSetupError ? `<p class="join-lobby-message">${pointSystemSetupError}</p>` : ""}
            <div class="point-system-footer">
              <button class="primary-action" type="button" id="point-system-continue" ${selectedPointSystem ? "" : "disabled"}>
                ${selectedCopy.pointSystemPage.continue}
              </button>
            </div>
          `
      }
    </section>
  `;
};

const renderCustomNumberField = (selectedCopy: Copy, field: CustomNumericFieldId, options = { toggleable: true }) => {
  const isEnabled = options.toggleable ? customSettingsState.enabledFields[field] : true;

  return `
    <label class="custom-setting-row">
      <span class="custom-setting-toggle">
        ${
          options.toggleable
            ? `<input type="checkbox" data-custom-field-toggle="${field}" ${isEnabled ? "checked" : ""} />`
            : ""
        }
      </span>
      <span class="custom-setting-label">${selectedCopy.customSettingsPage.fields[field]}</span>
      <input
        class="custom-setting-input"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        data-custom-field-value="${field}"
        value="${customSettingsState.values[field]}"
        ${isEnabled ? "" : "disabled"}
      />
    </label>
  `;
};

const renderCustomFeatureHeader = (selectedCopy: Copy, feature: CustomFeatureId) => `
  <label class="custom-feature-header">
    <span class="custom-setting-toggle">
      <input type="checkbox" data-custom-feature-toggle="${feature}" ${customSettingsState.enabledFeatures[feature] ? "checked" : ""} />
    </span>
    <span>${selectedCopy.customSettingsPage.features[feature].label}</span>
    <span class="info-tooltip" tabindex="0" aria-label="${selectedCopy.customSettingsPage.features[feature].detail}">
      !
      <span role="tooltip">${selectedCopy.customSettingsPage.features[feature].detail}</span>
    </span>
  </label>
`;

const renderTrackedTeamDropdown = (selectedCopy: Copy, language: Language) => {
  const teams = getParticipatingTeams(language);
  const selectedTeam = teams.find((team) => team.team.en === customSettingsState.trackedTeam);

  return `
    <div class="tracked-team-control">
      <span>${selectedCopy.customSettingsPage.trackedTeamLabel}</span>
      <button
        class="tracked-team-trigger"
        type="button"
        id="tracked-team-trigger"
        aria-expanded="${isTrackedTeamMenuOpen ? "true" : "false"}"
      >
        ${
          selectedTeam
            ? `<img src="${selectedTeam.flagSrc}" alt="${selectedTeam.flagAlt[language]}" /><span>${selectedTeam.team[language]}</span>`
            : `<span>${selectedCopy.customSettingsPage.trackedTeamPlaceholder}</span>`
        }
      </button>
      <div class="tracked-team-menu" id="tracked-team-menu" ${isTrackedTeamMenuOpen ? "" : "hidden"}>
        ${teams
          .map(
            (team) => `
              <button type="button" data-tracked-team="${team.team.en}">
                <img src="${team.flagSrc}" alt="${team.flagAlt[language]}" />
                <span>${team.team[language]}</span>
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
};

const renderCustomSettingsPage = (selectedCopy: Copy, language: Language) => {
  const draft = getLobbyCreationDraft();

  return `
    <section class="custom-settings-section" id="custom-settings" aria-label="${selectedCopy.customSettingsPage.aria}">
      <div class="section-heading">
        <p class="eyebrow">${selectedCopy.customSettingsPage.eyebrow}</p>
        <h2>${selectedCopy.customSettingsPage.title}</h2>
        <p>${selectedCopy.customSettingsPage.summary}</p>
      </div>
      ${
        !draft
          ? `<div class="matches-state">${selectedCopy.customSettingsPage.missingCode}</div>`
          : `
            <div class="custom-settings-layout">
              <section class="custom-settings-card">
                <h3>${selectedCopy.customSettingsPage.matchSpecific}</h3>
                <div class="custom-settings-list">
                  ${matchSpecificCustomFields.map((field) => renderCustomNumberField(selectedCopy, field)).join("")}
                </div>
              </section>
              <section class="custom-settings-card">
                <h3>${selectedCopy.customSettingsPage.global}</h3>
                <div class="custom-settings-list">
                  ${globalCustomFields.map((field) => renderCustomNumberField(selectedCopy, field)).join("")}
                </div>
              </section>
              <section class="custom-settings-card custom-settings-wide">
                <h3>${selectedCopy.customSettingsPage.special}</h3>
                <div class="custom-feature-list">
                  <div class="custom-feature-block">
                    ${renderCustomFeatureHeader(selectedCopy, "chooseTeam")}
                  </div>
                  <div class="custom-feature-block">
                    ${renderCustomFeatureHeader(selectedCopy, "trackTeam")}
                    ${
                      customSettingsState.enabledFeatures.trackTeam
                        ? renderTrackedTeamDropdown(selectedCopy, language)
                        : ""
                    }
                  </div>
                  <div class="custom-feature-block">
                    ${renderCustomFeatureHeader(selectedCopy, "favoritePlayer")}
                    ${
                      customSettingsState.enabledFeatures.favoritePlayer
                        ? `<div class="custom-settings-list compact-custom-list">
                            ${favoritePlayerCustomFields
                              .map((field) => renderCustomNumberField(selectedCopy, field, { toggleable: false }))
                              .join("")}
                          </div>`
                        : ""
                    }
                  </div>
                  <div class="custom-feature-block">
                    ${renderCustomFeatureHeader(selectedCopy, "bracketHeavy")}
                    ${
                      customSettingsState.enabledFeatures.bracketHeavy
                        ? `<div class="custom-bracket-settings">
                            <strong>${selectedCopy.customSettingsPage.bracketRounds}</strong>
                            <div class="custom-settings-list compact-custom-list">
                              ${bracketHeavyCustomFields.map((field) => renderCustomNumberField(selectedCopy, field)).join("")}
                            </div>
                          </div>`
                        : ""
                    }
                  </div>
                </div>
              </section>
            </div>
            ${customSettingsState.message ? `<p class="join-lobby-message">${customSettingsState.message}</p>` : ""}
            <div class="point-system-footer">
              <button class="primary-action" type="button" id="custom-settings-save" ${customSettingsState.isSubmitting ? "disabled" : ""}>
                ${selectedCopy.customSettingsPage.save}
              </button>
            </div>
          `
      }
    </section>
  `;
};

const renderCreateLobbyModal = (selectedCopy: Copy) => {
  if (!createLobbyModal.isOpen) {
    return "";
  }

  return `
    <div class="modal-backdrop" role="presentation">
      <section class="join-lobby-modal" role="dialog" aria-modal="true" aria-labelledby="create-lobby-title">
        <form id="create-lobby-form">
          <div class="modal-header">
            <h2 id="create-lobby-title">${selectedCopy.createLobby.title}</h2>
            <button class="modal-close" type="button" id="create-lobby-close" aria-label="${selectedCopy.createLobby.cancel}">
              ×
            </button>
          </div>
          <label class="join-code-field" for="create-lobby-name">
            <span>${selectedCopy.createLobby.nameLabel}</span>
            <input
              id="create-lobby-name"
              name="name"
              type="text"
              autocomplete="off"
              maxlength="80"
              placeholder="${selectedCopy.createLobby.namePlaceholder}"
              value="${createLobbyModal.name}"
            />
          </label>
          <label class="lobby-password-toggle">
            <input id="create-lobby-password-toggle" type="checkbox" ${createLobbyModal.usePassword ? "checked" : ""} />
            <span>${selectedCopy.createLobby.passwordToggle}</span>
          </label>
          ${
            createLobbyModal.usePassword
              ? `
                <label class="join-code-field" for="create-lobby-password">
                  <span>${selectedCopy.createLobby.passwordLabel}</span>
                  <input
                    id="create-lobby-password"
                    name="password"
                    type="password"
                    autocomplete="new-password"
                    value="${createLobbyModal.password}"
                  />
                </label>
                <p class="field-help">${selectedCopy.createLobby.passwordHelp}</p>
              `
              : ""
          }
          ${createLobbyModal.message ? `<p class="join-lobby-message">${createLobbyModal.message}</p>` : ""}
          <div class="modal-actions">
            <button class="secondary-action" type="button" id="create-lobby-cancel">
              ${selectedCopy.createLobby.cancel}
            </button>
            <button class="primary-action" type="submit" ${createLobbyModal.isSubmitting ? "disabled" : ""}>
              ${selectedCopy.createLobby.submit}
            </button>
          </div>
        </form>
      </section>
    </div>
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
          ${
            joinLobbyModal.needsPassword
              ? `
                <label class="join-code-field" for="join-lobby-password">
                  <span>${selectedCopy.createLobby.passwordLabel}</span>
                  <input
                    id="join-lobby-password"
                    name="password"
                    type="password"
                    autocomplete="current-password"
                    value="${joinLobbyModal.password}"
                  />
                </label>
              `
              : ""
          }
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

const renderLeaveLobbyModal = (selectedCopy: Copy) => {
  if (!leaveLobbyModal.isOpen || !leaveLobbyModal.lobby) {
    return "";
  }

  return `
    <div class="modal-backdrop" role="presentation">
      <section class="join-lobby-modal" role="dialog" aria-modal="true" aria-labelledby="leave-lobby-title">
        <div class="modal-header">
          <h2 id="leave-lobby-title">${selectedCopy.leaveLobby.title}</h2>
          <button class="modal-close" type="button" id="leave-lobby-close" aria-label="${selectedCopy.leaveLobby.cancel}">
            ×
          </button>
        </div>
        <p class="leave-lobby-body">${selectedCopy.leaveLobby.body(leaveLobbyModal.lobby.name)}</p>
        ${leaveLobbyModal.message ? `<p class="join-lobby-message">${leaveLobbyModal.message}</p>` : ""}
        <div class="modal-actions">
          <button class="secondary-action" type="button" id="leave-lobby-cancel">
            ${selectedCopy.leaveLobby.cancel}
          </button>
          <button class="danger-action" type="button" id="leave-lobby-confirm" ${leaveLobbyModal.isSubmitting ? "disabled" : ""}>
            ${selectedCopy.leaveLobby.confirm}
          </button>
        </div>
      </section>
    </div>
  `;
};

const renderKickMemberModal = (selectedCopy: Copy) => {
  if (!kickMemberModal.isOpen || !kickMemberModal.lobby || !kickMemberModal.member) {
    return "";
  }

  return `
    <div class="modal-backdrop" role="presentation">
      <section class="join-lobby-modal" role="dialog" aria-modal="true" aria-labelledby="kick-member-title">
        <div class="modal-header">
          <h2 id="kick-member-title">${selectedCopy.kickMember.title}</h2>
          <button class="modal-close" type="button" id="kick-member-close" aria-label="${selectedCopy.kickMember.cancel}">
            ×
          </button>
        </div>
        <p class="leave-lobby-body">${selectedCopy.kickMember.body(kickMemberModal.member.username, kickMemberModal.lobby.name)}</p>
        ${kickMemberModal.message ? `<p class="join-lobby-message">${kickMemberModal.message}</p>` : ""}
        <div class="modal-actions">
          <button class="secondary-action" type="button" id="kick-member-cancel">
            ${selectedCopy.kickMember.cancel}
          </button>
          <button class="danger-action" type="button" id="kick-member-confirm" ${kickMemberModal.isSubmitting ? "disabled" : ""}>
            ${selectedCopy.kickMember.confirm}
          </button>
        </div>
      </section>
    </div>
  `;
};

const renderDeleteLobbyModal = (selectedCopy: Copy) => {
  if (!deleteLobbyModal.isOpen || !deleteLobbyModal.lobby) {
    return "";
  }

  const isConfirmationValid = deleteLobbyModal.confirmationText.trim().toLowerCase() === selectedCopy.deleteLobby.phrase;

  return `
    <div class="modal-backdrop" role="presentation">
      <section class="join-lobby-modal" role="dialog" aria-modal="true" aria-labelledby="delete-lobby-title">
        <div class="modal-header">
          <h2 id="delete-lobby-title">${selectedCopy.deleteLobby.title}</h2>
          <button class="modal-close" type="button" id="delete-lobby-close" aria-label="${selectedCopy.deleteLobby.cancel}">
            ×
          </button>
        </div>
        <p class="leave-lobby-body">${selectedCopy.deleteLobby.body(deleteLobbyModal.lobby.name, selectedCopy.deleteLobby.phrase)}</p>
        <label class="join-code-field delete-confirmation-field" for="delete-lobby-confirmation">
          <span>${selectedCopy.deleteLobby.label}</span>
          <input
            id="delete-lobby-confirmation"
            name="confirmation"
            type="text"
            autocomplete="off"
            value="${deleteLobbyModal.confirmationText}"
          />
        </label>
        ${deleteLobbyModal.message ? `<p class="join-lobby-message">${deleteLobbyModal.message}</p>` : ""}
        <div class="modal-actions">
          <button class="secondary-action" type="button" id="delete-lobby-cancel">
            ${selectedCopy.deleteLobby.cancel}
          </button>
          <button class="danger-action" type="button" id="delete-lobby-confirm" ${deleteLobbyModal.isSubmitting || !isConfirmationValid ? "disabled" : ""}>
            ${selectedCopy.deleteLobby.confirm}
          </button>
        </div>
      </section>
    </div>
  `;
};

const renderLobbyRulesModal = (selectedCopy: Copy, language: Language) => {
  if (!areLobbyRulesVisible || !currentLobby) {
    return "";
  }

  return `
    <div class="modal-backdrop" role="presentation" id="lobby-rules-backdrop">
      <section class="join-lobby-modal lobby-rules-modal" role="dialog" aria-modal="true" aria-labelledby="lobby-rules-title">
        <div class="modal-header">
          <h2 id="lobby-rules-title">${selectedCopy.lobbyPage.rulesTitle}</h2>
          <button class="modal-close" type="button" id="lobby-rules-close" aria-label="${selectedCopy.lobbyPage.closeRules}">
            ×
          </button>
        </div>
        ${renderLobbyRulesPanel(selectedCopy, language, currentLobby)}
      </section>
    </div>
  `;
};

const renderPredictionCopyModal = (selectedCopy: Copy) => {
  if (!predictionCopyModal.isOpen || !predictionCopyModal.scope) {
    return "";
  }

  const confirmation =
    predictionCopyModal.scope === "all"
      ? selectedCopy.predictionsPage.copyAllConfirm
      : selectedCopy.predictionsPage.copyPhaseConfirm;

  return `
    <div class="modal-backdrop" role="presentation" id="prediction-copy-backdrop">
      <section class="join-lobby-modal" role="dialog" aria-modal="true" aria-labelledby="prediction-copy-title">
        <div class="modal-header">
          <h2 id="prediction-copy-title">${selectedCopy.predictionsPage.confirmTitle}</h2>
          <button class="modal-close" type="button" id="prediction-copy-close" aria-label="${selectedCopy.predictionsPage.cancelAction}">
            ×
          </button>
        </div>
        <p class="leave-lobby-body">${confirmation}</p>
        <p class="leave-lobby-body">${selectedCopy.predictionsPage.confirmBody}</p>
        ${predictionCopyModal.message ? `<p class="join-lobby-message">${predictionCopyModal.message}</p>` : ""}
        <div class="modal-actions">
          <button class="secondary-action" type="button" id="prediction-copy-cancel">
            ${selectedCopy.predictionsPage.cancelAction}
          </button>
          <button class="primary-action" type="button" id="prediction-copy-confirm" ${predictionCopyModal.isSubmitting ? "disabled" : ""}>
            ${selectedCopy.predictionsPage.confirmAction}
          </button>
        </div>
      </section>
    </div>
  `;
};

const renderGlobalPlacementPredictionModal = (selectedCopy: Copy, language: Language) => {
  if (!globalPlacementPredictionModal.isOpen || !globalPlacementPredictionModal.predictionId) {
    return "";
  }

  const teams = getParticipatingTeams(language);
  const selectedTeam = teams.find((team) => team.team.en === globalPlacementPredictionModal.selectedTeam);
  const predictionLabel = getGlobalPlacementPredictionLabel(selectedCopy, globalPlacementPredictionModal.predictionId);

  return `
    <div class="modal-backdrop" role="presentation" id="global-placement-backdrop">
      <section class="join-lobby-modal global-placement-modal" role="dialog" aria-modal="true" aria-labelledby="global-placement-title">
        <div class="modal-header">
          <h2 id="global-placement-title">${selectedCopy.lobbyPage.globalPredictions}</h2>
          <button class="modal-close" type="button" id="global-placement-close" aria-label="${selectedCopy.leaveLobby.cancel}">
            &times;
          </button>
        </div>
        <p class="leave-lobby-body">${selectedCopy.lobbyPage.chooseGlobalPrediction(predictionLabel)}</p>
        <div class="tracked-team-control global-placement-country-control">
          <span>${selectedCopy.lobbyPage.chooseCountry}</span>
          <button
            class="tracked-team-trigger"
            type="button"
            id="global-placement-team-trigger"
            aria-expanded="${globalPlacementPredictionModal.isMenuOpen ? "true" : "false"}"
          >
            ${
              selectedTeam
                ? `<img src="${selectedTeam.flagSrc}" alt="${selectedTeam.flagAlt[language]}" /><span>${selectedTeam.team[language]}</span>`
                : `<span>${selectedCopy.customSettingsPage.trackedTeamPlaceholder}</span>`
            }
          </button>
          <div class="tracked-team-menu" id="global-placement-team-menu" ${globalPlacementPredictionModal.isMenuOpen ? "" : "hidden"}>
            ${teams
              .map(
                (team) => `
                  <button type="button" data-global-placement-team="${team.team.en}">
                    <img src="${team.flagSrc}" alt="${team.flagAlt[language]}" />
                    <span>${team.team[language]}</span>
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
        <div class="modal-actions">
          <button class="secondary-action" type="button" id="global-placement-cancel">
            ${selectedCopy.leaveLobby.cancel}
          </button>
          <button class="primary-action" type="button" id="global-placement-confirm" ${globalPlacementPredictionModal.selectedTeam ? "" : "disabled"}>
            ${selectedCopy.lobbyPage.confirmGlobalPrediction}
          </button>
        </div>
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
      ${currentUser ? `<a href="/predictions.html">${selectedCopy.nav.predictions}</a>` : ""}
      ${currentUser ? `<a href="/my-lobbies.html">${selectedCopy.nav.myLobbies}</a>` : ""}
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

  if (currentPage === "point-system") {
    const draftId = getLobbyDraftIdFromUrl();
    const storedPointSystem = draftId ? window.sessionStorage.getItem(getPointSystemStorageKey(draftId)) : null;

    if (selectedPointSystemLobbyCode !== draftId) {
      selectedPointSystem =
        storedPointSystem === "simple" || storedPointSystem === "regular" || storedPointSystem === "custom"
          ? storedPointSystem
          : null;
      selectedPointSystemLobbyCode = draftId;
    }
  }

  if (currentPage === "custom-settings") {
    const draftId = getLobbyDraftIdFromUrl();

    if (customSettingsLobbyCode !== draftId) {
      const storedSettings = draftId ? window.sessionStorage.getItem(getCustomSettingsStorageKey(draftId)) : null;

      if (storedSettings) {
        try {
          const parsed = JSON.parse(storedSettings) as Partial<CustomSettingsState>;

          customSettingsState = {
            enabledFields: {
              ...defaultCustomEnabledFields,
              ...(parsed.enabledFields ?? {})
            },
            values: {
              ...defaultCustomSettingValues,
              ...(parsed.values ?? {})
            },
            enabledFeatures: {
              ...defaultCustomEnabledFeatures,
              ...(parsed.enabledFeatures ?? {})
            },
            trackedTeam: typeof parsed.trackedTeam === "string" ? parsed.trackedTeam : "",
            message: null,
            isSubmitting: false
          };
        } catch {
          customSettingsState = {
            enabledFields: { ...defaultCustomEnabledFields },
            values: { ...defaultCustomSettingValues },
            enabledFeatures: { ...defaultCustomEnabledFeatures },
            trackedTeam: "",
            message: null,
            isSubmitting: false
          };
        }
      } else {
        customSettingsState = {
          enabledFields: { ...defaultCustomEnabledFields },
          values: { ...defaultCustomSettingValues },
          enabledFeatures: { ...defaultCustomEnabledFeatures },
          trackedTeam: "",
          message: null,
          isSubmitting: false
        };
      }

      customSettingsLobbyCode = draftId;
    }
  }

  const pageContent = {
    bracket: renderBracketPage(selectedCopy, language),
    "custom-settings": renderCustomSettingsPage(selectedCopy, language),
    groups: renderStandings(selectedCopy, language),
    home: renderHomePage(selectedCopy, language),
    lobby: renderLobbyPage(selectedCopy, language),
    matches: renderMatchesPage(selectedCopy, language),
    "my-lobbies": renderMyLobbiesPage(selectedCopy),
    predictions: renderPredictionsPage(selectedCopy, language),
    "point-system": renderPointSystemPage(selectedCopy)
  }[currentPage];

  document.documentElement.lang = language;

  app.innerHTML = `
  <section class="page-shell">
    ${renderTopbar(selectedCopy, selectedLanguage, language)}
    ${pageContent}
  </section>
  ${renderCreateLobbyModal(selectedCopy)}
  ${renderJoinLobbyModal(selectedCopy)}
  ${renderLeaveLobbyModal(selectedCopy)}
  ${renderKickMemberModal(selectedCopy)}
  ${renderDeleteLobbyModal(selectedCopy)}
  ${renderLobbyRulesModal(selectedCopy, language)}
  ${renderPredictionCopyModal(selectedCopy)}
  ${renderGlobalPlacementPredictionModal(selectedCopy, language)}
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
  const createLobbyForm = document.querySelector<HTMLFormElement>("#create-lobby-form");
  const createLobbyNameInput = document.querySelector<HTMLInputElement>("#create-lobby-name");
  const createLobbyPasswordToggle = document.querySelector<HTMLInputElement>("#create-lobby-password-toggle");
  const createLobbyPasswordInput = document.querySelector<HTMLInputElement>("#create-lobby-password");
  const createLobbyCloseButton = document.querySelector<HTMLButtonElement>("#create-lobby-close");
  const createLobbyCancelButton = document.querySelector<HTMLButtonElement>("#create-lobby-cancel");
  const joinLobbyButton = document.querySelector<HTMLButtonElement>("#join-lobby-button");
  const joinLobbyForm = document.querySelector<HTMLFormElement>("#join-lobby-form");
  const joinLobbyCodeInput = document.querySelector<HTMLInputElement>("#join-lobby-code");
  const joinLobbyPasswordInput = document.querySelector<HTMLInputElement>("#join-lobby-password");
  const joinLobbyCloseButton = document.querySelector<HTMLButtonElement>("#join-lobby-close");
  const joinLobbyCancelButton = document.querySelector<HTMLButtonElement>("#join-lobby-cancel");
  const leaveLobbyButtons = document.querySelectorAll<HTMLButtonElement>("[data-leave-lobby-code]");
  const leaveLobbyCloseButton = document.querySelector<HTMLButtonElement>("#leave-lobby-close");
  const leaveLobbyCancelButton = document.querySelector<HTMLButtonElement>("#leave-lobby-cancel");
  const leaveLobbyConfirmButton = document.querySelector<HTMLButtonElement>("#leave-lobby-confirm");
  const kickMemberButtons = document.querySelectorAll<HTMLButtonElement>("[data-kick-member-id]");
  const kickMemberCloseButton = document.querySelector<HTMLButtonElement>("#kick-member-close");
  const kickMemberCancelButton = document.querySelector<HTMLButtonElement>("#kick-member-cancel");
  const kickMemberConfirmButton = document.querySelector<HTMLButtonElement>("#kick-member-confirm");
  const deleteLobbyButtons = document.querySelectorAll<HTMLButtonElement>("[data-delete-lobby-code]");
  const lobbyRulesToggle = document.querySelector<HTMLButtonElement>("#lobby-rules-toggle");
  const lobbyRulesBackdrop = document.querySelector<HTMLDivElement>("#lobby-rules-backdrop");
  const lobbyRulesCloseButton = document.querySelector<HTMLButtonElement>("#lobby-rules-close");
  const deleteLobbyInput = document.querySelector<HTMLInputElement>("#delete-lobby-confirmation");
  const deleteLobbyCloseButton = document.querySelector<HTMLButtonElement>("#delete-lobby-close");
  const deleteLobbyCancelButton = document.querySelector<HTMLButtonElement>("#delete-lobby-cancel");
  const deleteLobbyConfirmButton = document.querySelector<HTMLButtonElement>("#delete-lobby-confirm");
  const pointSystemButtons = document.querySelectorAll<HTMLButtonElement>("[data-point-system]");
  const pointSystemContinueButton = document.querySelector<HTMLButtonElement>("#point-system-continue");
  const predictionDropdownControls = document.querySelectorAll<HTMLDivElement>("[data-prediction-dropdown]");
  const predictionLobbyTrigger = document.querySelector<HTMLButtonElement>("#prediction-lobby-trigger");
  const predictionPhaseTrigger = document.querySelector<HTMLButtonElement>("#prediction-phase-trigger");
  const predictionLobbyButtons = document.querySelectorAll<HTMLButtonElement>("[data-prediction-lobby]");
  const predictionPhaseButtons = document.querySelectorAll<HTMLButtonElement>("[data-prediction-phase]");
  const predictionInputs = document.querySelectorAll<HTMLInputElement>("[data-prediction-match]");
  const copyDefaultAllButton = document.querySelector<HTMLButtonElement>("#copy-default-all");
  const copyDefaultPhaseButton = document.querySelector<HTMLButtonElement>("#copy-default-phase");
  const predictionCopyBackdrop = document.querySelector<HTMLDivElement>("#prediction-copy-backdrop");
  const predictionCopyCloseButton = document.querySelector<HTMLButtonElement>("#prediction-copy-close");
  const predictionCopyCancelButton = document.querySelector<HTMLButtonElement>("#prediction-copy-cancel");
  const predictionCopyConfirmButton = document.querySelector<HTMLButtonElement>("#prediction-copy-confirm");
  const globalPlacementPredictionButtons = document.querySelectorAll<HTMLButtonElement>("[data-global-placement-prediction]");
  const globalPlacementBackdrop = document.querySelector<HTMLDivElement>("#global-placement-backdrop");
  const globalPlacementCloseButton = document.querySelector<HTMLButtonElement>("#global-placement-close");
  const globalPlacementCancelButton = document.querySelector<HTMLButtonElement>("#global-placement-cancel");
  const globalPlacementConfirmButton = document.querySelector<HTMLButtonElement>("#global-placement-confirm");
  const globalPlacementTeamTrigger = document.querySelector<HTMLButtonElement>("#global-placement-team-trigger");
  const globalPlacementTeamMenu = document.querySelector<HTMLDivElement>("#global-placement-team-menu");
  const globalPlacementTeamButtons = document.querySelectorAll<HTMLButtonElement>("[data-global-placement-team]");
  const customFieldToggles = document.querySelectorAll<HTMLInputElement>("[data-custom-field-toggle]");
  const customFieldInputs = document.querySelectorAll<HTMLInputElement>("[data-custom-field-value]");
  const customFeatureToggles = document.querySelectorAll<HTMLInputElement>("[data-custom-feature-toggle]");
  const trackedTeamTrigger = document.querySelector<HTMLButtonElement>("#tracked-team-trigger");
  const trackedTeamMenu = document.querySelector<HTMLDivElement>("#tracked-team-menu");
  const trackedTeamButtons = document.querySelectorAll<HTMLButtonElement>("[data-tracked-team]");
  const customSettingsSaveButton = document.querySelector<HTMLButtonElement>("#custom-settings-save");

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
      window.location.href = "/";
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

  lobbyRulesToggle?.addEventListener("click", () => {
    areLobbyRulesVisible = true;
    render(getStoredLanguage());
  });

  const closeLobbyRulesModal = () => {
    areLobbyRulesVisible = false;
    render(getStoredLanguage());
  };

  lobbyRulesCloseButton?.addEventListener("click", closeLobbyRulesModal);
  lobbyRulesBackdrop?.addEventListener("click", (event) => {
    if (event.target === lobbyRulesBackdrop) {
      closeLobbyRulesModal();
    }
  });

  if (areLobbyRulesVisible) {
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          closeLobbyRulesModal();
        }
      },
      { once: true }
    );
  }

  pointSystemButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const option = button.dataset.pointSystem as PointSystemId | undefined;

      if (!option) {
        return;
      }

      selectedPointSystem = option;
      selectedPointSystemLobbyCode = getLobbyDraftIdFromUrl();
      pointSystemSetupError = null;
      render(getStoredLanguage());
    });
  });

  pointSystemContinueButton?.addEventListener("click", () => {
    if (selectedPointSystem === "custom") {
      const draftId = getLobbyDraftIdFromUrl();

      if (draftId) {
        window.sessionStorage.setItem(getPointSystemStorageKey(draftId), "custom");
        window.location.href = `/custom-settings.html?draft=${encodeURIComponent(draftId)}`;
      }

      return;
    }

    void savePointSystemSelection(selectedCopy);
  });

  const togglePredictionDropdown = (dropdown: "lobby" | "phase") => {
    openPredictionDropdown = openPredictionDropdown === dropdown ? null : dropdown;
    render(getStoredLanguage());
  };

  predictionLobbyTrigger?.addEventListener("click", () => {
    togglePredictionDropdown("lobby");
  });

  predictionPhaseTrigger?.addEventListener("click", () => {
    togglePredictionDropdown("phase");
  });

  predictionLobbyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedPredictionLobbyCode = button.dataset.predictionLobby ?? defaultPredictionLobbyCode;
      openPredictionDropdown = null;
      matchPredictions = {};
      predictionSaveStates = {};
      void loadMatchPredictions();
      render(getStoredLanguage());
    });
  });

  predictionPhaseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedPredictionPhase = button.dataset.predictionPhase ?? "";
      openPredictionDropdown = null;
      render(getStoredLanguage());
    });
  });

  predictionDropdownControls.forEach((control) => {
    control.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  });

  if (openPredictionDropdown) {
    document.addEventListener(
      "click",
      () => {
        openPredictionDropdown = null;
        render(getStoredLanguage());
      },
      { once: true }
    );
  }

  copyDefaultAllButton?.addEventListener("click", () => {
    openPredictionCopyModal("all");
  });

  copyDefaultPhaseButton?.addEventListener("click", () => {
    openPredictionCopyModal("phase");
  });

  const closePredictionCopyModal = () => {
    predictionCopyModal = {
      isOpen: false,
      scope: null,
      message: null,
      isSubmitting: false
    };
    render(getStoredLanguage());
  };

  predictionCopyCloseButton?.addEventListener("click", closePredictionCopyModal);
  predictionCopyCancelButton?.addEventListener("click", closePredictionCopyModal);
  predictionCopyBackdrop?.addEventListener("click", (event) => {
    if (event.target === predictionCopyBackdrop) {
      closePredictionCopyModal();
    }
  });
  predictionCopyConfirmButton?.addEventListener("click", () => {
    if (predictionCopyModal.scope) {
      void copyDefaultPredictionsToSelectedLobby(predictionCopyModal.scope, selectedCopy);
    }
  });

  const closeGlobalPlacementPredictionModal = () => {
    globalPlacementPredictionModal = {
      isOpen: false,
      predictionId: null,
      selectedTeam: "",
      isMenuOpen: false
    };
    render(getStoredLanguage());
  };

  globalPlacementPredictionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const predictionId = button.dataset.globalPlacementPrediction as GlobalPlacementPredictionId | undefined;

      if (!currentLobby || !predictionId || !globalPlacementFields.includes(predictionId)) {
        return;
      }

      const storedPredictions = getStoredGlobalPlacementPredictions(currentLobby);

      globalPlacementPredictionModal = {
        isOpen: true,
        predictionId,
        selectedTeam: storedPredictions[predictionId] ?? "",
        isMenuOpen: false
      };
      render(getStoredLanguage());
    });
  });

  globalPlacementCloseButton?.addEventListener("click", closeGlobalPlacementPredictionModal);
  globalPlacementCancelButton?.addEventListener("click", closeGlobalPlacementPredictionModal);
  globalPlacementBackdrop?.addEventListener("click", (event) => {
    if (event.target === globalPlacementBackdrop) {
      closeGlobalPlacementPredictionModal();
    }
  });

  globalPlacementTeamTrigger?.addEventListener("click", () => {
    globalPlacementPredictionModal = {
      ...globalPlacementPredictionModal,
      isMenuOpen: !globalPlacementPredictionModal.isMenuOpen
    };
    render(getStoredLanguage());
  });

  globalPlacementTeamTrigger?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  globalPlacementTeamMenu?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  globalPlacementTeamButtons.forEach((button) => {
    button.addEventListener("click", () => {
      globalPlacementPredictionModal = {
        ...globalPlacementPredictionModal,
        selectedTeam: button.dataset.globalPlacementTeam ?? "",
        isMenuOpen: false
      };
      render(getStoredLanguage());
    });
  });

  globalPlacementConfirmButton?.addEventListener("click", () => {
    if (!currentLobby || !globalPlacementPredictionModal.predictionId || !globalPlacementPredictionModal.selectedTeam) {
      return;
    }

    saveStoredGlobalPlacementPrediction(
      currentLobby,
      globalPlacementPredictionModal.predictionId,
      globalPlacementPredictionModal.selectedTeam
    );
    closeGlobalPlacementPredictionModal();
  });

  if (globalPlacementPredictionModal.isMenuOpen) {
    document.addEventListener(
      "click",
      () => {
        globalPlacementPredictionModal = {
          ...globalPlacementPredictionModal,
          isMenuOpen: false
        };
        render(getStoredLanguage());
      },
      { once: true }
    );
  }

  predictionInputs.forEach((input) => {
    input.addEventListener("input", () => {
      const matchId = Number(input.dataset.predictionMatch);
      const side = input.dataset.predictionSide === "away" ? "away" : "home";

      if (!Number.isInteger(matchId) || matchId <= 0) {
        return;
      }

      const nextValue = sanitizeNonNegativeIntegerInput(input.value);
      input.value = nextValue;
      const existingPrediction = matchPredictions[matchId] ?? { matchId, homeScore: null, awayScore: null };
      const nextScore = nextValue === "" ? null : Number(nextValue);
      matchPredictions = {
        ...matchPredictions,
        [matchId]: {
          ...existingPrediction,
          [side === "home" ? "homeScore" : "awayScore"]: nextScore
        }
      };
      predictionSaveStates = {
        ...predictionSaveStates,
        [matchId]: "saving"
      };
      updatePredictionSaveIndicator(matchId);
      void saveMatchPrediction(matchId);
    });
  });

  customFieldToggles.forEach((toggle) => {
    toggle.addEventListener("change", () => {
      const field = toggle.dataset.customFieldToggle as CustomNumericFieldId | undefined;

      if (!field) {
        return;
      }

      customSettingsState = {
        ...customSettingsState,
        enabledFields: {
          ...customSettingsState.enabledFields,
          [field]: toggle.checked
        },
        message: null
      };
      render(getStoredLanguage());
    });
  });

  customFieldInputs.forEach((input) => {
    input.addEventListener("input", () => {
      const field = input.dataset.customFieldValue as CustomNumericFieldId | undefined;

      if (!field) {
        return;
      }

      const nextValue = sanitizeNonNegativeIntegerInput(input.value);
      input.value = nextValue;
      customSettingsState = {
        ...customSettingsState,
        values: {
          ...customSettingsState.values,
          [field]: nextValue
        },
        message: null
      };
    });
  });

  customFeatureToggles.forEach((toggle) => {
    toggle.addEventListener("change", () => {
      const feature = toggle.dataset.customFeatureToggle as CustomFeatureId | undefined;

      if (!feature) {
        return;
      }

      customSettingsState = {
        ...customSettingsState,
        enabledFeatures: {
          ...customSettingsState.enabledFeatures,
          [feature]: toggle.checked
        },
        message: null
      };
      render(getStoredLanguage());
    });
  });

  trackedTeamTrigger?.addEventListener("click", () => {
    isTrackedTeamMenuOpen = !isTrackedTeamMenuOpen;
    render(getStoredLanguage());
  });

  trackedTeamTrigger?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  trackedTeamMenu?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  trackedTeamMenu?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      isTrackedTeamMenuOpen = false;
      render(getStoredLanguage());
    }
  });

  trackedTeamButtons.forEach((button) => {
    button.addEventListener("click", () => {
      customSettingsState = {
        ...customSettingsState,
        trackedTeam: button.dataset.trackedTeam ?? "",
        message: null
      };
      isTrackedTeamMenuOpen = false;
      render(getStoredLanguage());
    });
  });

  if (isTrackedTeamMenuOpen) {
    document.addEventListener(
      "click",
      () => {
        isTrackedTeamMenuOpen = false;
        render(getStoredLanguage());
      },
      { once: true }
    );
  }

  customSettingsSaveButton?.addEventListener("click", () => {
    void saveCustomSettings(selectedCopy);
  });

  createLobbyButton?.addEventListener("click", () => {
    void openCreateLobbyModal();
  });

  joinLobbyButton?.addEventListener("click", () => {
    void openJoinLobbyModal();
  });

  createLobbyNameInput?.addEventListener("input", () => {
    createLobbyModal = {
      ...createLobbyModal,
      name: createLobbyNameInput.value,
      message: null
    };
  });

  createLobbyPasswordToggle?.addEventListener("change", () => {
    createLobbyModal = {
      ...createLobbyModal,
      usePassword: createLobbyPasswordToggle.checked,
      password: createLobbyPasswordToggle.checked ? createLobbyModal.password : "",
      message: null
    };
    render(getStoredLanguage());
  });

  createLobbyPasswordInput?.addEventListener("input", () => {
    createLobbyModal = {
      ...createLobbyModal,
      password: createLobbyPasswordInput.value,
      message: null
    };
  });

  const closeCreateLobbyModal = () => {
    createLobbyModal = {
      isOpen: false,
      name: "",
      usePassword: false,
      password: "",
      message: null,
      isSubmitting: false
    };
    render(getStoredLanguage());
  };

  createLobbyCloseButton?.addEventListener("click", closeCreateLobbyModal);
  createLobbyCancelButton?.addEventListener("click", closeCreateLobbyModal);
  createLobbyForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void createLobbyFromHome(selectedCopy);
  });

  joinLobbyCodeInput?.addEventListener("input", () => {
    joinLobbyModal = {
      ...joinLobbyModal,
      code: joinLobbyCodeInput.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 4),
      message: null
    };
    joinLobbyCodeInput.value = joinLobbyModal.code;
  });

  joinLobbyPasswordInput?.addEventListener("input", () => {
    joinLobbyModal = {
      ...joinLobbyModal,
      password: joinLobbyPasswordInput.value,
      message: null
    };
  });

  const closeJoinLobbyModal = () => {
    joinLobbyModal = {
      isOpen: false,
      code: "",
      password: "",
      needsPassword: false,
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

  const closeLeaveLobbyModal = () => {
    leaveLobbyModal = {
      isOpen: false,
      lobby: null,
      returnToHome: false,
      message: null,
      isSubmitting: false
    };
    render(getStoredLanguage());
  };

  leaveLobbyButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const lobbyCode = button.dataset.leaveLobbyCode ?? "";
      const lobby = currentLobby?.code === lobbyCode ? currentLobby : userLobbies.find((item) => item.code === lobbyCode);

      if (!lobby) {
        return;
      }

      leaveLobbyModal = {
        isOpen: true,
        lobby,
        returnToHome: getCurrentPage() === "lobby",
        message: null,
        isSubmitting: false
      };
      render(getStoredLanguage());
    });
  });

  leaveLobbyCloseButton?.addEventListener("click", closeLeaveLobbyModal);
  leaveLobbyCancelButton?.addEventListener("click", closeLeaveLobbyModal);
  leaveLobbyConfirmButton?.addEventListener("click", () => {
    void leaveCurrentLobby(selectedCopy);
  });

  const closeKickMemberModal = () => {
    kickMemberModal = {
      isOpen: false,
      lobby: null,
      member: null,
      message: null,
      isSubmitting: false
    };
    render(getStoredLanguage());
  };

  kickMemberButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!currentLobby) {
        return;
      }

      const userId = Number(button.dataset.kickMemberId ?? "0");
      const username = button.dataset.kickMemberName ?? "";
      const member = currentLobby.members.find((item) => item.userId === userId) ?? {
        userId,
        username,
        role: "member" as const
      };

      kickMemberModal = {
        isOpen: true,
        lobby: currentLobby,
        member,
        message: null,
        isSubmitting: false
      };
      render(getStoredLanguage());
    });
  });

  kickMemberCloseButton?.addEventListener("click", closeKickMemberModal);
  kickMemberCancelButton?.addEventListener("click", closeKickMemberModal);
  kickMemberConfirmButton?.addEventListener("click", () => {
    void kickLobbyMember(selectedCopy);
  });

  const closeDeleteLobbyModal = () => {
    deleteLobbyModal = {
      isOpen: false,
      lobby: null,
      confirmationText: "",
      message: null,
      isSubmitting: false
    };
    render(getStoredLanguage());
  };

  deleteLobbyButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const lobbyCode = button.dataset.deleteLobbyCode ?? "";
      const lobby = currentLobby?.code === lobbyCode ? currentLobby : null;

      if (!lobby) {
        return;
      }

      deleteLobbyModal = {
        isOpen: true,
        lobby,
        confirmationText: "",
        message: null,
        isSubmitting: false
      };
      render(getStoredLanguage());
      document.querySelector<HTMLInputElement>("#delete-lobby-confirmation")?.focus();
    });
  });

  deleteLobbyInput?.addEventListener("input", () => {
    deleteLobbyModal = {
      ...deleteLobbyModal,
      confirmationText: deleteLobbyInput.value,
      message: null
    };
    if (deleteLobbyConfirmButton) {
      deleteLobbyConfirmButton.disabled =
        deleteLobbyModal.confirmationText.trim().toLowerCase() !== selectedCopy.deleteLobby.phrase;
    }
  });

  deleteLobbyCloseButton?.addEventListener("click", closeDeleteLobbyModal);
  deleteLobbyCancelButton?.addEventListener("click", closeDeleteLobbyModal);
  deleteLobbyConfirmButton?.addEventListener("click", () => {
    void deleteCurrentLobby(selectedCopy);
  });
};

const loadCurrentUser = async () => {
  try {
    const response = await fetch(`${authApiUrl}/session`, {
      credentials: "include"
    });

    if (!response.ok) {
      currentUser = null;
      isCurrentUserLoading = false;
      if (getCurrentPage() === "predictions") {
        window.location.href = authClientUrl;
      }
      render(getStoredLanguage());
      return;
    }

    const result = (await response.json()) as { user?: CurrentUser };
    currentUser = result.user ?? null;
    isCurrentUserLoading = false;
    if (!currentUser && getCurrentPage() === "predictions") {
      window.location.href = authClientUrl;
      return;
    }
    render(getStoredLanguage());
  } catch {
    currentUser = null;
    isCurrentUserLoading = false;
    if (getCurrentPage() === "predictions") {
      window.location.href = authClientUrl;
      return;
    }
    render(getStoredLanguage());
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

const openCreateLobbyModal = async () => {
  const user = await getAuthenticatedUser();

  if (!user) {
    return;
  }

  createLobbyModal = {
    isOpen: true,
    name: "",
    usePassword: false,
    password: "",
    message: null,
    isSubmitting: false
  };
  render(getStoredLanguage());
  document.querySelector<HTMLInputElement>("#create-lobby-name")?.focus();
};

const createLobbyFromHome = async (selectedCopy: Copy) => {
  const user = await getAuthenticatedUser();

  if (!user) {
    return;
  }

  const lobbyName = createLobbyModal.name.trim();

  if (!lobbyName) {
    createLobbyModal = {
      ...createLobbyModal,
      message: selectedCopy.createLobby.invalidName,
      isSubmitting: false
    };
    render(getStoredLanguage());
    return;
  }

  if (createLobbyModal.usePassword && !isLobbyPasswordValid(createLobbyModal.password)) {
    createLobbyModal = {
      ...createLobbyModal,
      message: selectedCopy.createLobby.invalidPassword,
      isSubmitting: false
    };
    render(getStoredLanguage());
    return;
  }

  createLobbyModal = {
    ...createLobbyModal,
    message: null,
    isSubmitting: true
  };
  render(getStoredLanguage());

  const draft: LobbyCreationDraft = {
    id: createLobbyDraftId(),
    createdByUserId: user.id,
    createdByUsername: user.username,
    name: lobbyName,
    password: createLobbyModal.usePassword ? createLobbyModal.password : undefined
  };

  saveLobbyCreationDraft(draft);
  window.location.href = `/point-system.html?draft=${encodeURIComponent(draft.id)}`;
};

const createConfiguredLobby = async (
  draft: LobbyCreationDraft,
  selectedCopy: Copy,
  pointSystem: PointSystemId,
  customSettings?: Record<string, unknown>
) => {
  const response = await fetch(`${lobbiesApiUrl}/lobbies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      createdByUserId: draft.createdByUserId,
      createdByUsername: draft.createdByUsername,
      name: draft.name,
      password: draft.password,
      pointSystem,
      customSettings
    })
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as { code?: string };

    if (result.code === "invalid_password_policy") {
      throw new Error(selectedCopy.createLobby.invalidPassword);
    }

    throw new Error(selectedCopy.lobbyActions.createError);
  }

  const result = (await response.json()) as { lobby?: Lobby };

  if (!result.lobby) {
    throw new Error(selectedCopy.lobbyActions.createError);
  }

  return result.lobby;
};

const savePointSystemSelection = async (selectedCopy: Copy) => {
  const draftId = getLobbyDraftIdFromUrl();
  const draft = getLobbyCreationDraft(draftId);

  if (!draft || !selectedPointSystem) {
    return;
  }

  pointSystemSetupError = null;
  render(getStoredLanguage());

  try {
    const lobby = await createConfiguredLobby(draft, selectedCopy, selectedPointSystem);

    clearLobbyCreationDraft();
    window.localStorage.setItem(getPointSystemStorageKey(lobby.code), selectedPointSystem);
    window.location.href = `/lobby.html?code=${encodeURIComponent(lobby.code)}`;
  } catch (error) {
    pointSystemSetupError = error instanceof Error ? error.message : selectedCopy.pointSystemPage.saveError;
    render(getStoredLanguage());
  }
};

const updatePredictionSaveIndicator = (matchId: number) => {
  const language = getStoredLanguage();
  const selectedCopy = copy[language];
  const indicator = document.querySelector<HTMLElement>(`[data-prediction-save-state="${matchId}"]`);
  const state = predictionSaveStates[matchId] ?? "idle";

  if (!indicator) {
    return;
  }

  indicator.className = `prediction-save-state is-${state}`;
  indicator.textContent = getPredictionSaveLabel(selectedCopy, matchId);
};

const saveMatchPrediction = async (matchId: number) => {
  const lobbyCode = selectedPredictionLobbyCode;
  const prediction = matchPredictions[matchId];

  if (!lobbyCode || !prediction) {
    return;
  }

  const url =
    lobbyCode === defaultPredictionLobbyCode
      ? `${lobbiesApiUrl}/predictions/default/${encodeURIComponent(String(matchId))}`
      : `${lobbiesApiUrl}/lobbies/${encodeURIComponent(lobbyCode)}/predictions/${encodeURIComponent(String(matchId))}`;

  try {
    const response = await fetch(url, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore
      })
    });

    if (!response.ok) {
      throw new Error("Could not save prediction.");
    }

    const result = (await response.json()) as { prediction?: MatchPrediction };
    const savedPrediction = result.prediction ?? prediction;
    matchPredictions = {
      ...matchPredictions,
      [matchId]: savedPrediction
    };
    predictionSaveStates = {
      ...predictionSaveStates,
      [matchId]: "saved"
    };
  } catch {
    predictionSaveStates = {
      ...predictionSaveStates,
      [matchId]: "error"
    };
  }

  updatePredictionSaveIndicator(matchId);
};

const openPredictionCopyModal = (scope: PredictionCopyScope) => {
  predictionCopyModal = {
    isOpen: true,
    scope,
    message: null,
    isSubmitting: false
  };
  render(getStoredLanguage());
};

const copyDefaultPredictionsToSelectedLobby = async (scope: "all" | "phase", selectedCopy: Copy) => {
  if (!selectedPredictionLobbyCode || selectedPredictionLobbyCode === defaultPredictionLobbyCode) {
    return;
  }

  if (scope === "phase" && !selectedPredictionPhase) {
    return;
  }

  const matchIds = scope === "phase" ? getFilteredPredictionMatches().map((match) => match.id) : undefined;

  predictionCopyModal = {
    ...predictionCopyModal,
    message: null,
    isSubmitting: true
  };
  render(getStoredLanguage());

  try {
    const response = await fetch(
      `${lobbiesApiUrl}/lobbies/${encodeURIComponent(selectedPredictionLobbyCode)}/predictions-copy/${scope}`,
      {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          matchIds
        })
      }
    );

    if (!response.ok) {
      throw new Error("Could not copy predictions.");
    }

    const result = (await response.json()) as { predictions?: MatchPrediction[] };
    const predictions = Array.isArray(result.predictions) ? result.predictions : [];
    matchPredictions = {
      ...matchPredictions,
      ...predictions.reduce<Record<number, MatchPrediction>>((items, prediction) => {
        items[prediction.matchId] = prediction;
        return items;
      }, {})
    };
    predictionSaveStates = {
      ...predictionSaveStates,
      ...predictions.reduce<Record<number, PredictionSaveState>>((items, prediction) => {
        items[prediction.matchId] = "saved";
        return items;
      }, {})
    };
    predictionCopyModal = {
      isOpen: false,
      scope: null,
      message: null,
      isSubmitting: false
    };
    render(getStoredLanguage());
  } catch {
    predictionCopyModal = {
      ...predictionCopyModal,
      message: selectedCopy.predictionsPage.saveError,
      isSubmitting: false
    };
    render(getStoredLanguage());
  }
};

const getRequiredCustomFields = () => [
  ...matchSpecificCustomFields,
  ...globalCustomFields,
  ...(customSettingsState.enabledFeatures.favoritePlayer ? favoritePlayerCustomFields : []),
  ...(customSettingsState.enabledFeatures.bracketHeavy ? bracketHeavyCustomFields : [])
];

const areCustomSettingsValid = () => {
  const requiredFields = getRequiredCustomFields();
  const hasInvalidNumber = requiredFields.some((field) => {
    const isRequiredByFeature =
      customSettingsState.enabledFeatures.favoritePlayer && favoritePlayerCustomFields.includes(field);
    const shouldValidate = isRequiredByFeature || customSettingsState.enabledFields[field];

    return shouldValidate && !isNonNegativeIntegerValue(customSettingsState.values[field]);
  });

  if (hasInvalidNumber) {
    return false;
  }

  if (customSettingsState.enabledFeatures.trackTeam) {
    const trackedTeamNames = new Set(worldCupGroups.flatMap((group) => group.teams.map((team) => team.team.en)));

    if (!trackedTeamNames.has(customSettingsState.trackedTeam)) {
      return false;
    }
  }

  return true;
};

const saveCustomSettings = async (selectedCopy: Copy) => {
  const draftId = getLobbyDraftIdFromUrl();
  const draft = getLobbyCreationDraft(draftId);

  if (!draft) {
    return;
  }

  if (!areCustomSettingsValid()) {
    customSettingsState = {
      ...customSettingsState,
      message: selectedCopy.customSettingsPage.validationError
    };
    render(getStoredLanguage());
    return;
  }

  customSettingsState = {
    ...customSettingsState,
    message: null,
    isSubmitting: true
  };
  render(getStoredLanguage());

  try {
    const settings: Record<string, unknown> = {
      enabledFields: customSettingsState.enabledFields,
      values: customSettingsState.values,
      enabledFeatures: customSettingsState.enabledFeatures,
      trackedTeam: customSettingsState.trackedTeam
    };
    const lobby = await createConfiguredLobby(draft, selectedCopy, "custom", settings);

    clearLobbyCreationDraft();
    window.sessionStorage.removeItem(getPointSystemStorageKey(draftId));
    window.sessionStorage.removeItem(getCustomSettingsStorageKey(draftId));
    window.localStorage.setItem(getPointSystemStorageKey(lobby.code), "custom");
    window.localStorage.setItem(getCustomSettingsStorageKey(lobby.code), JSON.stringify(settings));
    window.location.href = `/lobby.html?code=${encodeURIComponent(lobby.code)}`;
  } catch (error) {
    customSettingsState = {
      ...customSettingsState,
      message: error instanceof Error ? error.message : selectedCopy.customSettingsPage.saveError,
      isSubmitting: false
    };
    render(getStoredLanguage());
  }
};

const leaveCurrentLobby = async (selectedCopy: Copy) => {
  const user = await getAuthenticatedUser();
  const lobby = leaveLobbyModal.lobby;

  if (!user || !lobby) {
    return;
  }

  leaveLobbyModal = {
    ...leaveLobbyModal,
    isSubmitting: true,
    message: null
  };
  render(getStoredLanguage());

  try {
    const response = await fetch(`${lobbiesApiUrl}/lobbies/${encodeURIComponent(lobby.code)}/members/${user.id}`, {
      method: "DELETE",
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error("Could not leave lobby.");
    }

    const shouldReturnHome = leaveLobbyModal.returnToHome;
    leaveLobbyModal = {
      isOpen: false,
      lobby: null,
      returnToHome: false,
      message: null,
      isSubmitting: false
    };

    if (shouldReturnHome) {
      window.location.href = "/";
      return;
    }

    userLobbies = userLobbies.filter((item) => item.code !== lobby.code);
    render(getStoredLanguage());
  } catch {
    leaveLobbyModal = {
      ...leaveLobbyModal,
      message: selectedCopy.leaveLobby.error,
      isSubmitting: false
    };
    render(getStoredLanguage());
  }
};

const kickLobbyMember = async (selectedCopy: Copy) => {
  const user = await getAuthenticatedUser();
  const lobby = kickMemberModal.lobby;
  const member = kickMemberModal.member;

  if (!user || !lobby || !member) {
    return;
  }

  kickMemberModal = {
    ...kickMemberModal,
    isSubmitting: true,
    message: null
  };
  render(getStoredLanguage());

  try {
    const response = await fetch(`${lobbiesApiUrl}/lobbies/${encodeURIComponent(lobby.code)}/members/${member.userId}`, {
      method: "DELETE",
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error("Could not kick member.");
    }

    kickMemberModal = {
      isOpen: false,
      lobby: null,
      member: null,
      message: null,
      isSubmitting: false
    };
    await loadLobby();
  } catch {
    kickMemberModal = {
      ...kickMemberModal,
      message: selectedCopy.kickMember.error,
      isSubmitting: false
    };
    render(getStoredLanguage());
  }
};

const deleteCurrentLobby = async (selectedCopy: Copy) => {
  const user = await getAuthenticatedUser();
  const lobby = deleteLobbyModal.lobby;

  if (!user || !lobby) {
    return;
  }

  if (deleteLobbyModal.confirmationText.trim().toLowerCase() !== selectedCopy.deleteLobby.phrase) {
    return;
  }

  deleteLobbyModal = {
    ...deleteLobbyModal,
    isSubmitting: true,
    message: null
  };
  render(getStoredLanguage());

  try {
    const response = await fetch(`${lobbiesApiUrl}/lobbies/${encodeURIComponent(lobby.code)}`, {
      method: "DELETE",
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error("Could not delete lobby.");
    }

    deleteLobbyModal = {
      isOpen: false,
      lobby: null,
      confirmationText: "",
      message: null,
      isSubmitting: false
    };
    currentLobby = null;
    userLobbies = userLobbies.filter((item) => item.code !== lobby.code);
    window.location.href = "/my-lobbies.html";
  } catch {
    deleteLobbyModal = {
      ...deleteLobbyModal,
      message: selectedCopy.deleteLobby.error,
      isSubmitting: false
    };
    render(getStoredLanguage());
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
    password: "",
    needsPassword: false,
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
        username: user.username,
        password: joinLobbyModal.password || undefined
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

      if (response.status === 403 && result.code === "password_required") {
        joinLobbyModal = {
          ...joinLobbyModal,
          needsPassword: true,
          message: selectedCopy.lobbyActions.passwordRequired,
          isSubmitting: false
        };
        render(getStoredLanguage());
        return;
      }

      if (response.status === 403 && result.code === "invalid_lobby_password") {
        joinLobbyModal = {
          ...joinLobbyModal,
          needsPassword: true,
          message: selectedCopy.lobbyActions.invalidPassword,
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

  if (currentPage !== "matches" && currentPage !== "groups" && currentPage !== "bracket" && currentPage !== "predictions") {
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
  areLobbyRulesVisible = false;
  render(getStoredLanguage());

  try {
    const response = await fetch(`${lobbiesApiUrl}/lobbies/${encodeURIComponent(lobbyCode)}`, {
      credentials: "include"
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = authClientUrl;
        return;
      }

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

const loadUserLobbies = async () => {
  const currentPage = getCurrentPage();

  if (currentPage !== "my-lobbies" && currentPage !== "predictions") {
    return;
  }

  const user = await getAuthenticatedUser();

  if (!user) {
    return;
  }

  isUserLobbiesLoading = true;
  userLobbiesError = null;
  userLobbies = [];
  render(getStoredLanguage());

  try {
    const response = await fetch(`${lobbiesApiUrl}/users/${user.id}/lobbies`);

    if (!response.ok) {
      throw new Error("Could not load user lobbies.");
    }

    const result = (await response.json()) as { lobbies?: Lobby[] };
    userLobbies = Array.isArray(result.lobbies) ? result.lobbies : [];
    if (currentPage === "predictions" && !selectedPredictionLobbyCode) {
      selectedPredictionLobbyCode = defaultPredictionLobbyCode;
      void loadMatchPredictions();
    }
  } catch {
    userLobbies = [];
    userLobbiesError = "unavailable";
  } finally {
    isUserLobbiesLoading = false;
    render(getStoredLanguage());
  }
};

const loadMatchPredictions = async () => {
  if (getCurrentPage() !== "predictions" || !selectedPredictionLobbyCode) {
    return;
  }

  isPredictionsLoading = true;
  predictionsError = null;
  render(getStoredLanguage());

  try {
    const url =
      selectedPredictionLobbyCode === defaultPredictionLobbyCode
        ? `${lobbiesApiUrl}/predictions/default`
        : `${lobbiesApiUrl}/lobbies/${encodeURIComponent(selectedPredictionLobbyCode)}/predictions`;
    const response = await fetch(url, {
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error("Could not load predictions.");
    }

    const result = (await response.json()) as { predictions?: MatchPrediction[] };
    const predictions = Array.isArray(result.predictions) ? result.predictions : [];
    matchPredictions = predictions.reduce<Record<number, MatchPrediction>>((items, prediction) => {
      items[prediction.matchId] = prediction;
      return items;
    }, {});
    predictionSaveStates = predictions.reduce<Record<number, PredictionSaveState>>((items, prediction) => {
      items[prediction.matchId] = "saved";
      return items;
    }, {});
  } catch {
    matchPredictions = {};
    predictionSaveStates = {};
    predictionsError = "unavailable";
  } finally {
    isPredictionsLoading = false;
    render(getStoredLanguage());
  }
};

if (getCurrentPage() === "predictions") {
  const predictionLobbyCode = getPredictionLobbyFromUrl();

  if (predictionLobbyCode) {
    selectedPredictionLobbyCode = predictionLobbyCode;
    selectedPredictionPhase = "";
  }
}

render(getStoredLanguage());
void loadCurrentUser();
void loadCarouselMatches();
void loadAllMatches();
void loadLobby();
void loadUserLobbies();
void loadMatchPredictions();
