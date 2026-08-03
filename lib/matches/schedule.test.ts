import { describe, expect, it } from "vitest";

import {
  createScheduleFormState,
  formatScheduleFields,
  parseTournamentDateTime,
  scheduleSubmissionSchema,
} from "./schedule";

describe("Central Time scheduling", () => {
  it("converts summer and winter court times to UTC", () => {
    expect(parseTournamentDateTime("2026-08-03", "19:30")).toEqual({
      success: true,
      timestamp: "2026-08-04T00:30:00Z",
    });
    expect(parseTournamentDateTime("2026-12-03", "19:30")).toEqual({
      success: true,
      timestamp: "2026-12-04T01:30:00Z",
    });
  });

  it("rejects nonexistent and ambiguous daylight-saving times", () => {
    expect(parseTournamentDateTime("2026-03-08", "02:30")).toMatchObject({
      success: false,
    });
    expect(parseTournamentDateTime("2026-11-01", "01:30")).toMatchObject({
      success: false,
    });
  });

  it("formats stored UTC values for editing in Central Time", () => {
    expect(formatScheduleFields("2026-08-04T00:30:00Z")).toEqual({
      date: "2026-08-03",
      time: "19:30",
      venue: "",
    });
  });
});

describe("schedule submission validation", () => {
  const validSubmission = {
    intent: "save",
    matchId: "a1000000-0000-4000-8000-000000000001",
    expectedUpdatedAt: "2026-08-01T19:00:00Z",
    date: "2026-08-03",
    time: "19:30",
    venue: "McGraw Park Court 2",
  };

  it("requires a valid date, time, and nonblank venue when saving", () => {
    expect(scheduleSubmissionSchema.safeParse(validSubmission).success).toBe(
      true,
    );
    expect(
      scheduleSubmissionSchema.safeParse({
        ...validSubmission,
        venue: " ",
      }).success,
    ).toBe(false);
  });

  it("allows schedule details to be blank only when clearing", () => {
    expect(
      scheduleSubmissionSchema.safeParse({
        ...validSubmission,
        intent: "clear",
        date: "",
        time: "",
        venue: "",
      }).success,
    ).toBe(true);
  });

  it("creates editable state from the stored schedule", () => {
    expect(
      createScheduleFormState({
        scheduled_at: "2026-08-04T00:30:00Z",
        updated_at: "2026-08-03T20:00:00Z",
        venue: "McGraw Park Court 2",
      }),
    ).toMatchObject({
      status: "idle",
      expectedUpdatedAt: "2026-08-03T20:00:00Z",
      values: {
        date: "2026-08-03",
        time: "19:30",
        venue: "McGraw Park Court 2",
      },
    });
  });
});
