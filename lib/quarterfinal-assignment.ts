import { z } from "zod";

import {
  BRACKET_MAPPING,
  BRACKET_ROUND_CODES,
  organizeKnockoutBracket,
} from "./bracket";
import { DataIntegrityError } from "./data/errors";
import type {
  Team,
  TournamentMatch,
} from "./data/schema";

const timestampSchema = z.iso.datetime({ offset: true });

const expectedQuarterfinalVersionSchema = z.object({
  match_id: z.uuid(),
  updated_at: timestampSchema,
});

export const expectedQuarterfinalVersionsSchema = z
  .array(expectedQuarterfinalVersionSchema)
  .length(4)
  .refine(
    (versions) =>
      new Set(versions.map((version) => version.match_id)).size ===
      versions.length,
    { message: "Quarterfinal match versions must be unique." },
  );

export const quarterfinalAssignmentsSchema = z
  .array(
    z.object({
      code: z.enum(BRACKET_ROUND_CODES.quarterfinals),
      team1_id: z.uuid(),
      team2_id: z.uuid(),
    }),
  )
  .length(4);

export type ExpectedQuarterfinalVersion = z.infer<
  typeof expectedQuarterfinalVersionSchema
>;

export type QuarterfinalAssignmentRow = {
  code: (typeof BRACKET_ROUND_CODES.quarterfinals)[number];
  match: TournamentMatch;
  team1: Team;
  team1Source: string;
  team2: Team;
  team2Source: string;
};

export type QuarterfinalAssignmentPreview = {
  status: "ready" | "assigned" | "activity" | "conflict";
  rows: QuarterfinalAssignmentRow[];
  expectedMatchVersions: ExpectedQuarterfinalVersion[];
};

type QuarterfinalMatchCode =
  (typeof BRACKET_ROUND_CODES.quarterfinals)[number];

function isQuarterfinalMatchCode(
  value: string,
): value is QuarterfinalMatchCode {
  return BRACKET_ROUND_CODES.quarterfinals.some(
    (code) => code === value,
  );
}

function groupRankTeam(
  teams: Team[],
  groupLabel: "A" | "B",
  finalRank: number,
): Team {
  const matches = teams.filter(
    (team) =>
      team.group_label === groupLabel && team.final_rank === finalRank,
  );

  if (matches.length !== 1) {
    throw new DataIntegrityError(
      `Finalized standings must contain exactly one Group ${groupLabel} rank ${finalRank} team.`,
    );
  }

  return matches[0];
}

function quarterfinalRow(
  match: TournamentMatch,
  teams: Team[],
): QuarterfinalAssignmentRow {
  if (!isQuarterfinalMatchCode(match.code)) {
    throw new DataIntegrityError(
      `${match.code} is not a quarterfinal match.`,
    );
  }

  const definition = BRACKET_MAPPING[match.code];

  if (
    definition.team1Source.type !== "group-rank" ||
    definition.team2Source.type !== "group-rank"
  ) {
    throw new DataIntegrityError(
      `${match.code} does not use finalized group ranks.`,
    );
  }

  const team1 = groupRankTeam(
    teams,
    definition.team1Source.group,
    definition.team1Source.rank,
  );
  const team2 = groupRankTeam(
    teams,
    definition.team2Source.group,
    definition.team2Source.rank,
  );

  return {
    code: match.code,
    match,
    team1,
    team1Source: `${definition.team1Source.group}${definition.team1Source.rank}`,
    team2,
    team2Source: `${definition.team2Source.group}${definition.team2Source.rank}`,
  };
}

export function createQuarterfinalAssignmentPreview(input: {
  teams: Team[];
  matches: TournamentMatch[];
  hasActivityHistory?: boolean;
}): QuarterfinalAssignmentPreview {
  const quarterfinals = organizeKnockoutBracket(
    input.matches,
  ).quarterfinals;
  const rows = quarterfinals.map((match) =>
    quarterfinalRow(match, input.teams),
  );
  const hasCurrentActivity = rows.some(
    ({ match }) => match.status !== "unscheduled",
  );
  const allBlank = rows.every(
    ({ match }) => match.team1_id === null && match.team2_id === null,
  );
  const allAssigned = rows.every(
    ({ match, team1, team2 }) =>
      match.team1_id === team1.id && match.team2_id === team2.id,
  );

  let status: QuarterfinalAssignmentPreview["status"];
  if (hasCurrentActivity || input.hasActivityHistory) {
    status = "activity";
  } else if (allAssigned) {
    status = "assigned";
  } else if (allBlank) {
    status = "ready";
  } else {
    status = "conflict";
  }

  return {
    status,
    rows,
    expectedMatchVersions: rows.map(({ match }) => ({
      match_id: match.id,
      updated_at: match.updated_at,
    })),
  };
}

export function quarterfinalVersionsMatch(
  submitted: ExpectedQuarterfinalVersion[],
  current: ExpectedQuarterfinalVersion[],
): boolean {
  if (submitted.length !== current.length) {
    return false;
  }

  const currentById = new Map(
    current.map((version) => [version.match_id, version.updated_at]),
  );
  return submitted.every(
    (version) =>
      currentById.get(version.match_id) === version.updated_at,
  );
}

export function parseQuarterfinalAssignments(value: unknown) {
  const result = quarterfinalAssignmentsSchema.safeParse(value);
  if (!result.success) {
    throw new DataIntegrityError(
      "Supabase returned invalid quarterfinal assignment data.",
      { cause: result.error },
    );
  }

  return result.data;
}
