export type KnockoutMatchCode =
  | "QF1"
  | "QF2"
  | "QF3"
  | "QF4"
  | "SF1"
  | "SF2"
  | "Final";

type GroupRankSource = {
  type: "group-rank";
  group: "A" | "B";
  rank: 1 | 2 | 3 | 4;
};

type MatchWinnerSource = {
  type: "match-winner";
  matchCode: Exclude<KnockoutMatchCode, "Final">;
};

type BracketSource = GroupRankSource | MatchWinnerSource;

type KnockoutMatchDefinition = {
  stage: "quarterfinal" | "semifinal" | "final";
  label: string;
  team1Source: BracketSource;
  team2Source: BracketSource;
};

export const BRACKET_MAPPING = {
  QF1: {
    stage: "quarterfinal",
    label: "QF1: A1 vs B4",
    team1Source: { type: "group-rank", group: "A", rank: 1 },
    team2Source: { type: "group-rank", group: "B", rank: 4 },
  },
  QF2: {
    stage: "quarterfinal",
    label: "QF2: A2 vs B3",
    team1Source: { type: "group-rank", group: "A", rank: 2 },
    team2Source: { type: "group-rank", group: "B", rank: 3 },
  },
  QF3: {
    stage: "quarterfinal",
    label: "QF3: A3 vs B2",
    team1Source: { type: "group-rank", group: "A", rank: 3 },
    team2Source: { type: "group-rank", group: "B", rank: 2 },
  },
  QF4: {
    stage: "quarterfinal",
    label: "QF4: A4 vs B1",
    team1Source: { type: "group-rank", group: "A", rank: 4 },
    team2Source: { type: "group-rank", group: "B", rank: 1 },
  },
  SF1: {
    stage: "semifinal",
    label: "SF1: Winner QF1 vs Winner QF2",
    team1Source: { type: "match-winner", matchCode: "QF1" },
    team2Source: { type: "match-winner", matchCode: "QF2" },
  },
  SF2: {
    stage: "semifinal",
    label: "SF2: Winner QF3 vs Winner QF4",
    team1Source: { type: "match-winner", matchCode: "QF3" },
    team2Source: { type: "match-winner", matchCode: "QF4" },
  },
  Final: {
    stage: "final",
    label: "Final: Winner SF1 vs Winner SF2",
    team1Source: { type: "match-winner", matchCode: "SF1" },
    team2Source: { type: "match-winner", matchCode: "SF2" },
  },
} as const satisfies Record<KnockoutMatchCode, KnockoutMatchDefinition>;
