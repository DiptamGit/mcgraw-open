export type KnockoutMatchCode =
  | "QF1"
  | "QF2"
  | "QF3"
  | "QF4"
  | "SF1"
  | "SF2"
  | "Final";

export function isKnockoutMatchCode(
  code: string,
): code is KnockoutMatchCode {
  return Object.hasOwn(BRACKET_MAPPING, code);
}

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

export const DOWNSTREAM_ASSIGNMENTS = {
  QF1: { matchCode: "SF1", teamField: "team1_id" },
  QF2: { matchCode: "SF1", teamField: "team2_id" },
  QF3: { matchCode: "SF2", teamField: "team1_id" },
  QF4: { matchCode: "SF2", teamField: "team2_id" },
  SF1: { matchCode: "Final", teamField: "team1_id" },
  SF2: { matchCode: "Final", teamField: "team2_id" },
} as const satisfies Partial<
  Record<
    KnockoutMatchCode,
    {
      matchCode: KnockoutMatchCode;
      teamField: "team1_id" | "team2_id";
    }
  >
>;
