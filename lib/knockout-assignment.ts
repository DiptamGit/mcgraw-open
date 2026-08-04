import { z } from "zod";

import {
  BRACKET_MAPPING,
  organizeKnockoutBracket,
  type KnockoutMatchCode,
} from "./bracket";
import { DataIntegrityError } from "./data/errors";
import type { Team, TournamentMatch } from "./data/schema";

export const KNOCKOUT_ASSIGNMENT_CODES = ["SF1", "SF2", "Final"] as const;
export const KNOCKOUT_TEAM_SLOTS = ["team1_id", "team2_id"] as const;

export type KnockoutAssignmentCode =
  (typeof KNOCKOUT_ASSIGNMENT_CODES)[number];
export type KnockoutTeamSlot = (typeof KNOCKOUT_TEAM_SLOTS)[number];
export type KnockoutAssignmentIntent = "assign" | "clear";
export type KnockoutAssignmentSlotStatus =
  | "waiting"
  | "ready"
  | "assigned"
  | "conflict";

export type KnockoutAssignmentSlot = {
  assignedTeam: Team | null;
  eligibleWinner: Team | null;
  sourceLabel: string;
  sourceMatch: TournamentMatch;
  status: KnockoutAssignmentSlotStatus;
  teamSlot: KnockoutTeamSlot;
};

export type KnockoutAssignmentPreview = {
  downstreamMatch: TournamentMatch;
  protected: boolean;
  slots: KnockoutAssignmentSlot[];
};

const timestampSchema = z.iso.datetime({ offset: true });

export const knockoutAssignmentSubmissionSchema = z.object({
  intent: z.enum(["assign", "clear"]),
  downstreamCode: z.enum(KNOCKOUT_ASSIGNMENT_CODES),
  teamSlot: z.enum(KNOCKOUT_TEAM_SLOTS),
  teamId: z.uuid("The selected team is invalid."),
  expectedDownstreamUpdatedAt: timestampSchema,
  expectedSourceUpdatedAt: timestampSchema,
});

const knockoutAssignmentResultSchema = z.object({
  intent: z.enum(["assign", "clear"]),
  downstream_code: z.enum(KNOCKOUT_ASSIGNMENT_CODES),
  source_code: z.enum(["QF1", "QF2", "QF3", "QF4", "SF1", "SF2"]),
  team_slot: z.enum(KNOCKOUT_TEAM_SLOTS),
  team_id: z.uuid(),
  updated_at: timestampSchema,
});

export type KnockoutAssignmentSubmission = z.infer<
  typeof knockoutAssignmentSubmissionSchema
>;

export function isKnockoutAssignmentCode(
  value: string,
): value is KnockoutAssignmentCode {
  return KNOCKOUT_ASSIGNMENT_CODES.some((code) => code === value);
}

function sourceMatchCode(
  downstreamCode: KnockoutAssignmentCode,
  teamSlot: KnockoutTeamSlot,
): Exclude<KnockoutMatchCode, "Final"> {
  const definition = BRACKET_MAPPING[downstreamCode];
  const source =
    teamSlot === "team1_id"
      ? definition.team1Source
      : definition.team2Source;

  if (source.type !== "match-winner") {
    throw new DataIntegrityError(
      `${downstreamCode} does not use a match winner for ${teamSlot}.`,
    );
  }

  return source.matchCode;
}

function findMatch(
  matches: TournamentMatch[],
  code: KnockoutMatchCode,
): TournamentMatch {
  const match = matches.find((candidate) => candidate.code === code);
  if (!match) {
    throw new DataIntegrityError(
      `Knockout bracket is missing match ${code}.`,
    );
  }

  return match;
}

export function createKnockoutAssignmentPreview(
  matches: TournamentMatch[],
  downstreamCode: KnockoutAssignmentCode,
): KnockoutAssignmentPreview {
  organizeKnockoutBracket(matches);
  const downstreamMatch = findMatch(matches, downstreamCode);
  const slots = KNOCKOUT_TEAM_SLOTS.map((teamSlot) => {
    const sourceCode = sourceMatchCode(downstreamCode, teamSlot);
    const sourceMatch = findMatch(matches, sourceCode);
    const eligibleWinner =
      sourceMatch.status === "completed" ? sourceMatch.winner : null;
    const assignedTeam =
      teamSlot === "team1_id"
        ? downstreamMatch.team1
        : downstreamMatch.team2;

    if (sourceMatch.status === "completed" && !eligibleWinner) {
      throw new DataIntegrityError(
        `Completed source match ${sourceCode} has no winner.`,
      );
    }

    let status: KnockoutAssignmentSlotStatus;
    if (assignedTeam) {
      status =
        eligibleWinner?.id === assignedTeam.id ? "assigned" : "conflict";
    } else {
      status = eligibleWinner ? "ready" : "waiting";
    }

    return {
      assignedTeam,
      eligibleWinner,
      sourceLabel: `Winner ${sourceCode}`,
      sourceMatch,
      status,
      teamSlot,
    };
  });

  if (
    slots[0].eligibleWinner &&
    slots[0].eligibleWinner.id === slots[1].eligibleWinner?.id
  ) {
    return {
      downstreamMatch,
      protected: downstreamMatch.status !== "unscheduled",
      slots: slots.map((slot) => ({ ...slot, status: "conflict" })),
    };
  }

  return {
    downstreamMatch,
    protected: downstreamMatch.status !== "unscheduled",
    slots,
  };
}

export function findKnockoutAssignmentSlot(
  preview: KnockoutAssignmentPreview,
  teamSlot: KnockoutTeamSlot,
): KnockoutAssignmentSlot {
  const slot = preview.slots.find(
    (candidate) => candidate.teamSlot === teamSlot,
  );
  if (!slot) {
    throw new DataIntegrityError(
      `${preview.downstreamMatch.code} is missing ${teamSlot}.`,
    );
  }

  return slot;
}

export function parseKnockoutAssignmentResult(value: unknown) {
  const result = knockoutAssignmentResultSchema.safeParse(value);
  if (!result.success) {
    throw new DataIntegrityError(
      "Supabase returned invalid knockout assignment data.",
      { cause: result.error },
    );
  }

  return result.data;
}
