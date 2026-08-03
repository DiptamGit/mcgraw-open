import { DateTime } from "luxon";
import { z } from "zod";

import type { MatchRecord } from "../data/schema";

export const TOURNAMENT_TIME_ZONE = "America/Chicago";

const matchIdSchema = z.uuid("The match reference is invalid.");
const versionSchema = z.iso.datetime({
  offset: true,
  message: "The match version is invalid. Reload and try again.",
});
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");
const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Enter a valid time.");
const venueSchema = z
  .string()
  .trim()
  .min(1, "Enter a court or venue.")
  .max(160, "Keep the court or venue to 160 characters or fewer.");

export const scheduleSubmissionSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("save"),
    matchId: matchIdSchema,
    expectedUpdatedAt: versionSchema,
    date: dateSchema,
    time: timeSchema,
    venue: venueSchema,
  }),
  z.object({
    intent: z.literal("clear"),
    matchId: matchIdSchema,
    expectedUpdatedAt: versionSchema,
    date: z.string(),
    time: z.string(),
    venue: z.string(),
  }),
]);

export type ScheduleSubmission = z.infer<typeof scheduleSubmissionSchema>;
export type ScheduleField = "date" | "time" | "venue";
export type ScheduleFormState = {
  status: "idle" | "error" | "success" | "conflict";
  message: string | null;
  fieldErrors: Partial<Record<ScheduleField, string>>;
  expectedUpdatedAt: string;
  values: {
    date: string;
    time: string;
    venue: string;
  };
};

export type TournamentDateTimeResult =
  | { success: true; timestamp: string }
  | { success: false; message: string };

export function parseTournamentDateTime(
  date: string,
  time: string,
): TournamentDateTimeResult {
  const localDateTime = DateTime.fromISO(`${date}T${time}`, {
    zone: TOURNAMENT_TIME_ZONE,
    setZone: true,
  });

  if (
    !localDateTime.isValid ||
    localDateTime.toFormat("yyyy-MM-dd") !== date ||
    localDateTime.toFormat("HH:mm") !== time
  ) {
    return {
      success: false,
      message:
        "This date and time does not exist in Central Time. Choose another time.",
    };
  }

  if (localDateTime.getPossibleOffsets().length !== 1) {
    return {
      success: false,
      message:
        "This time occurs twice in Central Time when clocks change. Choose another time.",
    };
  }

  const timestamp = localDateTime
    .toUTC()
    .toISO({ suppressMilliseconds: true });

  if (!timestamp) {
    return {
      success: false,
      message: "Enter a valid Central Time date and time.",
    };
  }

  return { success: true, timestamp };
}

export function formatScheduleFields(
  timestamp: string | null,
): ScheduleFormState["values"] {
  if (!timestamp) {
    return { date: "", time: "", venue: "" };
  }

  const localDateTime = DateTime.fromISO(timestamp, { setZone: true }).setZone(
    TOURNAMENT_TIME_ZONE,
  );

  if (!localDateTime.isValid) {
    throw new Error("The stored schedule time is invalid.");
  }

  return {
    date: localDateTime.toFormat("yyyy-MM-dd"),
    time: localDateTime.toFormat("HH:mm"),
    venue: "",
  };
}

export function createScheduleFormState(
  match: Pick<MatchRecord, "scheduled_at" | "updated_at" | "venue">,
  status: ScheduleFormState["status"] = "idle",
  message: string | null = null,
): ScheduleFormState {
  const values = formatScheduleFields(match.scheduled_at);

  return {
    status,
    message,
    fieldErrors: {},
    expectedUpdatedAt: match.updated_at,
    values: {
      ...values,
      venue: match.venue ?? "",
    },
  };
}
