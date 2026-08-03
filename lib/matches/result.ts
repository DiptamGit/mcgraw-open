import { DateTime } from "luxon";
import { z } from "zod";

import {
  DOWNSTREAM_ASSIGNMENTS,
  isKnockoutMatchCode,
} from "../bracket";
import { DataIntegrityError } from "../data/errors";
import type {
  MatchRecord,
  TournamentMatch,
  TournamentState,
} from "../data/schema";
import {
  parseTournamentDateTime,
  TOURNAMENT_TIME_ZONE,
} from "./schedule";

const matchIdSchema = z.uuid("The match reference is invalid.");
const versionSchema = z.iso.datetime({
  offset: true,
  message: "The match version is invalid. Reload and try again.",
});
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid played date.");
const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Enter a valid played time.");
const scoreInputSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)?$/, "Enter a whole number of zero or more.");

const scoreFields = {
  set1Team1: scoreInputSchema,
  set1Team2: scoreInputSchema,
  set2Team1: scoreInputSchema,
  set2Team2: scoreInputSchema,
  set3Team1: scoreInputSchema,
  set3Team2: scoreInputSchema,
};
const uncheckedScoreFields = {
  set1Team1: z.string(),
  set1Team2: z.string(),
  set2Team1: z.string(),
  set2Team2: z.string(),
  set3Team1: z.string(),
  set3Team2: z.string(),
};

export const resultSubmissionSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("save"),
    matchId: matchIdSchema,
    expectedUpdatedAt: versionSchema,
    winnerId: z.uuid("Choose the winning team."),
    decidingSetFormat: z.enum(["full_set", "match_tiebreak"], {
      message: "Choose the deciding set format.",
    }),
    playedDate: dateSchema,
    playedTime: timeSchema,
    ...scoreFields,
  }),
  z.object({
    intent: z.literal("clear"),
    matchId: matchIdSchema,
    expectedUpdatedAt: versionSchema,
    winnerId: z.string(),
    decidingSetFormat: z.string(),
    playedDate: z.string(),
    playedTime: z.string(),
    ...uncheckedScoreFields,
  }),
]);

export type ResultSubmission = z.infer<typeof resultSubmissionSchema>;
export type ResultField =
  | "winnerId"
  | "decidingSetFormat"
  | "playedDate"
  | "playedTime"
  | keyof typeof scoreFields;

export type ResultFormValues = {
  winnerId: string;
  decidingSetFormat: string;
  playedDate: string;
  playedTime: string;
  set1Team1: string;
  set1Team2: string;
  set2Team1: string;
  set2Team2: string;
  set3Team1: string;
  set3Team2: string;
};

export type ResultFormState = {
  status: "idle" | "error" | "success" | "conflict";
  message: string | null;
  fieldErrors: Partial<Record<ResultField, string>>;
  expectedUpdatedAt: string;
  hasResult: boolean;
  values: ResultFormValues;
};

type ScorePair = [number, number];
type WinnerSide = "team1" | "team2";

export type NormalScoreValidationResult =
  | { success: true; sets: ScorePair[] }
  | {
      success: false;
      message: string;
      setIndex?: number;
      winnerError?: boolean;
    };

export type ResultEditability =
  | { editable: true }
  | { editable: false; reason: string };

function winningSide([team1Score, team2Score]: ScorePair): WinnerSide | null {
  if (team1Score === team2Score) {
    return null;
  }

  return team1Score > team2Score ? "team1" : "team2";
}

function isValidFullSet([team1Score, team2Score]: ScorePair): boolean {
  const winnerScore = Math.max(team1Score, team2Score);
  const loserScore = Math.min(team1Score, team2Score);

  return (
    (winnerScore === 6 && loserScore <= 4) ||
    (winnerScore === 7 && (loserScore === 5 || loserScore === 6))
  );
}

function isValidMatchTiebreak([team1Score, team2Score]: ScorePair): boolean {
  const winnerScore = Math.max(team1Score, team2Score);
  const loserScore = Math.min(team1Score, team2Score);

  return (
    (winnerScore === 10 && loserScore <= 8) ||
    (loserScore >= 9 && winnerScore - loserScore === 2)
  );
}

export function validateNormalScore(input: {
  sets: ScorePair[];
  decidingSetFormat: "full_set" | "match_tiebreak";
  winnerSide: WinnerSide;
}): NormalScoreValidationResult {
  if (input.sets.length < 2 || input.sets.length > 3) {
    return {
      success: false,
      message: "Enter two sets for a straight-set result or all three sets.",
    };
  }

  for (const [index, set] of input.sets.entries()) {
    if (
      set.some(
        (score) =>
          !Number.isSafeInteger(score) || score < 0,
      )
    ) {
      return {
        success: false,
        setIndex: index,
        message: "Enter whole-number scores of zero or more.",
      };
    }

    if (!winningSide(set)) {
      return {
        success: false,
        setIndex: index,
        message: `Set ${index + 1} cannot end in a tie.`,
      };
    }

    const isDecidingMatchTiebreak =
      index === 2 && input.decidingSetFormat === "match_tiebreak";
    const isValid = isDecidingMatchTiebreak
      ? isValidMatchTiebreak(set)
      : isValidFullSet(set);

    if (!isValid) {
      return {
        success: false,
        setIndex: index,
        message: isDecidingMatchTiebreak
          ? "A match tiebreak is first to 10 points by two."
          : "Use 6-0 through 6-4, 7-5, or 7-6 for a full set.",
      };
    }
  }

  const setWinners = input.sets.map(winningSide);
  if (setWinners[0] === setWinners[1]) {
    if (input.sets.length === 3) {
      return {
        success: false,
        setIndex: 2,
        message: "Do not enter a third set after the match was won in two.",
      };
    }
  } else if (input.sets.length !== 3) {
    return {
      success: false,
      message: "Enter the deciding third set after the teams split two sets.",
    };
  }

  const team1Sets = setWinners.filter((side) => side === "team1").length;
  const team2Sets = setWinners.filter((side) => side === "team2").length;
  const scoreWinner =
    team1Sets === 2 ? "team1" : team2Sets === 2 ? "team2" : null;

  if (!scoreWinner || scoreWinner !== input.winnerSide) {
    return {
      success: false,
      winnerError: true,
      message: "The selected winner must be the team that won two sets.",
    };
  }

  return { success: true, sets: input.sets };
}

export function parseSubmittedSets(
  values: Pick<
    ResultFormValues,
    | "set1Team1"
    | "set1Team2"
    | "set2Team1"
    | "set2Team2"
    | "set3Team1"
    | "set3Team2"
  >,
):
  | { success: true; sets: ScorePair[] }
  | {
      success: false;
      message: string;
      fieldErrors: Partial<Record<ResultField, string>>;
    } {
  const rows = [
    [values.set1Team1, values.set1Team2],
    [values.set2Team1, values.set2Team2],
    [values.set3Team1, values.set3Team2],
  ] as const;
  const sets: ScorePair[] = [];

  for (const [index, row] of rows.entries()) {
    const [team1Score, team2Score] = row;
    const isEmpty = team1Score === "" && team2Score === "";
    const team1Field = `set${index + 1}Team1` as ResultField;
    const team2Field = `set${index + 1}Team2` as ResultField;

    if (isEmpty) {
      if (index < 2) {
        const message = `Enter both scores for set ${index + 1}.`;
        return {
          success: false,
          message,
          fieldErrors: {
            [team1Field]: message,
            [team2Field]: message,
          },
        };
      }
      continue;
    }

    if (team1Score === "" || team2Score === "") {
      const message = `Enter both scores for set ${index + 1}.`;
      return {
        success: false,
        message,
        fieldErrors: {
          [team1Field]: message,
          [team2Field]: message,
        },
      };
    }

    sets.push([Number(team1Score), Number(team2Score)]);
  }

  return { success: true, sets };
}

export function parsePlayedAt(
  date: string,
  time: string,
  completedAt: string,
):
  | { success: true; timestamp: string }
  | { success: false; message: string } {
  const parsed = parseTournamentDateTime(date, time);
  if (!parsed.success) {
    return parsed;
  }

  if (new Date(parsed.timestamp).getTime() > new Date(completedAt).getTime()) {
    return {
      success: false,
      message: "Played time cannot be in the future.",
    };
  }

  return parsed;
}

export function getResultEditability(
  match: TournamentMatch,
  matches: TournamentMatch[],
  tournamentState: TournamentState,
): ResultEditability {
  if (!match.team1_id || !match.team2_id) {
    return {
      editable: false,
      reason: "Both teams must be assigned before recording a result.",
    };
  }

  if (
    match.stage === "group" &&
    tournamentState.group_stage_status === "finalized"
  ) {
    return {
      editable: false,
      reason:
        "Group results are locked because the group standings are finalized.",
    };
  }

  if (match.stage !== "group") {
    if (!isKnockoutMatchCode(match.code)) {
      throw new DataIntegrityError(
        `Knockout match ${match.code} has no bracket source mapping.`,
      );
    }

    if (match.code === "Final") {
      return { editable: true };
    }

    const downstreamDefinition = DOWNSTREAM_ASSIGNMENTS[match.code];
    const downstreamMatch = matches.find(
      (candidate) => candidate.code === downstreamDefinition.matchCode,
    );

    if (!downstreamMatch) {
      throw new DataIntegrityError(
        `Knockout match ${match.code} is missing downstream match ${downstreamDefinition.matchCode}.`,
      );
    }

    if (downstreamMatch[downstreamDefinition.teamField] !== null) {
      return {
        editable: false,
        reason: `This result is locked because its winner is assigned to ${downstreamMatch.code}.`,
      };
    }
  }

  return { editable: true };
}

function resultValues(
  match: Pick<
    MatchRecord,
    | "deciding_set_format"
    | "played_at"
    | "scheduled_at"
    | "sets"
    | "winner_id"
  >,
  now: DateTime,
): ResultFormValues {
  const currentTimestamp = now.toUTC().toISO();
  if (!currentTimestamp) {
    throw new Error("The current tournament time is invalid.");
  }

  const sourceTimestamp =
    match.played_at ?? match.scheduled_at ?? currentTimestamp;
  const localDateTime = DateTime.fromISO(sourceTimestamp, {
    setZone: true,
  }).setZone(TOURNAMENT_TIME_ZONE);

  if (!localDateTime.isValid) {
    throw new Error("The stored match time is invalid.");
  }

  return {
    winnerId: match.winner_id ?? "",
    decidingSetFormat: match.deciding_set_format ?? "full_set",
    playedDate: localDateTime.toFormat("yyyy-MM-dd"),
    playedTime: localDateTime.toFormat("HH:mm"),
    set1Team1: match.sets?.[0]?.[0].toString() ?? "",
    set1Team2: match.sets?.[0]?.[1].toString() ?? "",
    set2Team1: match.sets?.[1]?.[0].toString() ?? "",
    set2Team2: match.sets?.[1]?.[1].toString() ?? "",
    set3Team1: match.sets?.[2]?.[0].toString() ?? "",
    set3Team2: match.sets?.[2]?.[1].toString() ?? "",
  };
}

export function createResultFormState(
  match: Pick<
    MatchRecord,
    | "deciding_set_format"
    | "played_at"
    | "scheduled_at"
    | "sets"
    | "status"
    | "updated_at"
    | "winner_id"
  >,
  status: ResultFormState["status"] = "idle",
  message: string | null = null,
  now: DateTime = DateTime.now(),
): ResultFormState {
  return {
    status,
    message,
    fieldErrors: {},
    expectedUpdatedAt: match.updated_at,
    hasResult: match.status === "completed",
    values: resultValues(match, now),
  };
}
