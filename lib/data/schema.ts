import { z } from "zod";

import { DataIntegrityError } from "./errors";

const timestampSchema = z.iso.datetime({ offset: true });
const scoreValueSchema = z.number().int().nonnegative();

export const setScoreSchema = z.tuple([scoreValueSchema, scoreValueSchema]);
export const matchSetsSchema = z.array(setScoreSchema).min(1).max(3);

export const teamSchema = z.object({
  id: z.uuid(),
  name: z.string().refine((name) => name.trim().length > 0, {
    message: "Team name cannot be blank.",
  }),
  group_label: z.enum(["A", "B"]),
  final_rank: z.number().int().positive().nullable(),
});

export const matchRecordSchema = z.object({
  id: z.uuid(),
  code: z.string().min(1),
  stage: z.enum(["group", "quarterfinal", "semifinal", "final"]),
  group_label: z.enum(["A", "B"]).nullable(),
  label: z.string().min(1).nullable(),
  team1_id: z.uuid().nullable(),
  team2_id: z.uuid().nullable(),
  status: z.enum(["unscheduled", "scheduled", "completed"]),
  scheduled_at: timestampSchema.nullable(),
  venue: z.string().min(1).nullable(),
  deciding_set_format: z.enum(["full_set", "match_tiebreak"]).nullable(),
  outcome_type: z.enum(["normal", "retirement", "walkover"]).nullable(),
  sets: matchSetsSchema.nullable(),
  winner_id: z.uuid().nullable(),
  played_at: timestampSchema.nullable(),
  completed_at: timestampSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export const tournamentStateSchema = z.object({
  id: z.literal(1),
  group_stage_status: z.enum(["open", "finalized"]),
  groups_finalized_at: timestampSchema.nullable(),
  tie_resolution_note: z.string().min(1).nullable(),
  updated_at: timestampSchema,
});

export const matchChangesSchema = matchRecordSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
  })
  .partial()
  .refine((changes) => Object.keys(changes).length > 0, {
    message: "At least one match field must change.",
  });

export const versionedMatchUpdateSchema = z.object({
  id: z.uuid(),
  expectedUpdatedAt: timestampSchema,
  changes: matchChangesSchema,
});

export type Team = z.infer<typeof teamSchema>;
export type MatchRecord = z.infer<typeof matchRecordSchema>;
export type TournamentState = z.infer<typeof tournamentStateSchema>;
export type VersionedMatchUpdate = z.input<typeof versionedMatchUpdateSchema>;

export type TournamentMatch = MatchRecord & {
  team1: Team | null;
  team2: Team | null;
  winner: Team | null;
};

function parseDatabaseValue<T>(
  schema: z.ZodType<T>,
  value: unknown,
  description: string,
): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new DataIntegrityError(
      `Supabase returned invalid ${description} data.`,
      { cause: result.error },
    );
  }

  return result.data;
}

export function parseTeams(value: unknown): Team[] {
  return parseDatabaseValue(z.array(teamSchema), value, "team");
}

export function parseMatchRecords(value: unknown): MatchRecord[] {
  return parseDatabaseValue(z.array(matchRecordSchema), value, "match");
}

export function parseMatchRecord(value: unknown): MatchRecord {
  return parseDatabaseValue(matchRecordSchema, value, "match");
}

export function parseTournamentState(value: unknown): TournamentState {
  return parseDatabaseValue(
    tournamentStateSchema,
    value,
    "tournament state",
  );
}

export function normalizeMatches(
  matchRecords: MatchRecord[],
  teams: Team[],
): TournamentMatch[] {
  const teamsById = new Map(teams.map((team) => [team.id, team]));

  const resolveTeam = (
    teamId: string | null,
    matchCode: string,
    role: string,
  ): Team | null => {
    if (teamId === null) {
      return null;
    }

    const team = teamsById.get(teamId);
    if (!team) {
      throw new DataIntegrityError(
        `Match ${matchCode} references a missing ${role} team.`,
      );
    }

    return team;
  };

  return matchRecords.map((match) => ({
    ...match,
    team1: resolveTeam(match.team1_id, match.code, "team 1"),
    team2: resolveTeam(match.team2_id, match.code, "team 2"),
    winner: resolveTeam(match.winner_id, match.code, "winner"),
  }));
}
