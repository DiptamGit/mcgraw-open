"use server";

import { OrganizerAuthorizationError } from "@/lib/auth/request";
import { requireOrganizerServerAction } from "@/lib/auth/server-action";
import { DataLayerError } from "@/lib/data/errors";
import { updateMatchWithVersion } from "@/lib/data/mutations";
import { getMatchRecordById } from "@/lib/data/queries";
import { revalidateTournamentData } from "@/lib/data/revalidation";
import {
  createScheduleFormState,
  parseTournamentDateTime,
  scheduleSubmissionSchema,
  type ScheduleField,
  type ScheduleFormState,
} from "@/lib/matches/schedule";

function submittedState(
  previousState: ScheduleFormState,
  formData: FormData,
): ScheduleFormState {
  const readValue = (name: string): string => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };

  return {
    ...previousState,
    status: "error",
    message: null,
    fieldErrors: {},
    expectedUpdatedAt:
      readValue("expectedUpdatedAt") || previousState.expectedUpdatedAt,
    values: {
      date: readValue("date"),
      time: readValue("time"),
      venue: readValue("venue"),
    },
  };
}

function fieldErrorsFromIssues(
  issues: { path: PropertyKey[]; message: string }[],
): ScheduleFormState["fieldErrors"] {
  const fieldErrors: ScheduleFormState["fieldErrors"] = {};

  for (const issue of issues) {
    const field = issue.path[0];
    if (
      (field === "date" || field === "time" || field === "venue") &&
      !fieldErrors[field as ScheduleField]
    ) {
      fieldErrors[field as ScheduleField] = issue.message;
    }
  }

  return fieldErrors;
}

export async function updateMatchSchedule(
  previousState: ScheduleFormState,
  formData: FormData,
): Promise<ScheduleFormState> {
  const pendingState = submittedState(previousState, formData);

  try {
    await requireOrganizerServerAction();
  } catch (error) {
    if (error instanceof OrganizerAuthorizationError) {
      return {
        ...pendingState,
        message:
          "Organizer access expired or this request was not accepted. Unlock this device and try again.",
      };
    }

    throw error;
  }

  const parsedSubmission = scheduleSubmissionSchema.safeParse({
    intent: formData.get("intent"),
    matchId: formData.get("matchId"),
    expectedUpdatedAt: formData.get("expectedUpdatedAt"),
    date: formData.get("date"),
    time: formData.get("time"),
    venue: formData.get("venue"),
  });

  if (!parsedSubmission.success) {
    const fieldErrors = fieldErrorsFromIssues(parsedSubmission.error.issues);
    return {
      ...pendingState,
      message:
        Object.keys(fieldErrors).length > 0
          ? "Check the highlighted schedule details."
          : "The schedule request is invalid. Reload and try again.",
      fieldErrors,
    };
  }

  const submission = parsedSubmission.data;
  const currentMatch = await getMatchRecordById(submission.matchId);

  if (!currentMatch) {
    return {
      ...pendingState,
      message: "This match is no longer available. Return to the match list.",
    };
  }

  if (currentMatch.updated_at !== submission.expectedUpdatedAt) {
    return {
      ...pendingState,
      status: "conflict",
      message:
        "This match changed on another device. Reload before saving again.",
    };
  }

  if (currentMatch.status === "completed") {
    return {
      ...pendingState,
      message: "Completed matches cannot be scheduled or rescheduled.",
    };
  }

  let changes;
  let successMessage;

  if (submission.intent === "clear") {
    if (currentMatch.status === "unscheduled") {
      return {
        ...pendingState,
        message: "This match is already unscheduled. Reload to see its status.",
      };
    }

    changes = {
      status: "unscheduled" as const,
      scheduled_at: null,
      venue: null,
    };
    successMessage = "Schedule removed. This match is now unscheduled.";
  } else {
    const parsedDateTime = parseTournamentDateTime(
      submission.date,
      submission.time,
    );

    if (!parsedDateTime.success) {
      return {
        ...pendingState,
        message: "Check the highlighted schedule details.",
        fieldErrors: {
          ...pendingState.fieldErrors,
          time: parsedDateTime.message,
        },
      };
    }

    changes = {
      status: "scheduled" as const,
      scheduled_at: parsedDateTime.timestamp,
      venue: submission.venue,
    };
    successMessage =
      currentMatch.status === "scheduled"
        ? "Schedule updated."
        : "Match scheduled.";
  }

  try {
    const result = await updateMatchWithVersion({
      id: submission.matchId,
      expectedUpdatedAt: submission.expectedUpdatedAt,
      changes,
    });

    if (result.status === "conflict") {
      return {
        ...pendingState,
        status: "conflict",
        message:
          "This match changed on another device. Reload before saving again.",
      };
    }

    if (result.status === "not_found") {
      return {
        ...pendingState,
        message: "This match is no longer available. Return to the match list.",
      };
    }

    revalidateTournamentData(currentMatch.code);
    return createScheduleFormState(
      result.match,
      "success",
      successMessage,
    );
  } catch (error) {
    if (error instanceof DataLayerError) {
      return {
        ...pendingState,
        message: "The schedule could not be saved. Try again.",
      };
    }

    throw error;
  }
}
