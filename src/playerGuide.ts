import playerGuideData from "./playerGuideData.json";

export type PlayerGuideEntry = {
  country: string;
  name: string;
  number: number;
  goals: number;
  assists: number;
  isTopScorer: boolean;
  isGoldenBall: boolean;
};

// Player names are hardcoded from The Guardian World Cup 2026 player guide.
// Goals, assists, top scorer, and Golden Ball are manually maintained during the tournament.
export const playerGuide: PlayerGuideEntry[] = playerGuideData;
