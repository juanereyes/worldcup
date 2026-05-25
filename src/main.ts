import "./styles.css";

type Feature = {
  title: string;
  detail: string;
};

const features: Feature[] = [
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
];

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root was not found.");
}

app.innerHTML = `
  <section class="page-shell">
    <header class="topbar" aria-label="Primary">
      <a class="brand" href="/" aria-label="World Cup Picks home">
        <span class="brand-mark" aria-hidden="true">26</span>
        <span>World Cup Picks</span>
      </a>
      <nav class="nav-links" aria-label="Main navigation">
        <a href="#groups">Groups</a>
        <a href="#scoring">Scoring</a>
        <a href="#matches">Matches</a>
      </nav>
      <a class="signin-link" href="#signin">Sign in</a>
    </header>

    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">FIFA World Cup 2026</p>
        <h1 id="hero-title">Run your tournament pool from kickoff to final whistle.</h1>
        <p class="hero-summary">
          Invite your people, predict every match, and use a scoring system that fits how your group likes to compete.
        </p>
        <div class="hero-actions">
          <a class="primary-action" href="#create-group">Create a group</a>
          <a class="secondary-action" href="#join-group">Join with a code</a>
        </div>
      </div>

      <aside class="match-preview" aria-label="Example match card">
        <div class="match-preview-header">
          <span>Group Stage</span>
          <strong>Prediction closes in 2h 14m</strong>
        </div>
        <div class="teams">
          <div class="team-row">
            <span class="flag">USA</span>
            <span>United States</span>
            <strong>2</strong>
          </div>
          <div class="team-row">
            <span class="flag">COL</span>
            <span>Colombia</span>
            <strong>1</strong>
          </div>
        </div>
        <div class="score-breakdown">
          <span>Exact score</span>
          <strong>+5 pts</strong>
        </div>
      </aside>
    </section>

    <section class="feature-grid" aria-label="Core features">
      ${features
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
