"use server";

import { OrganizerAuthorizationError } from "@/lib/auth/request";
import { requireOrganizerServerAction } from "@/lib/auth/server-action";
import { DataLayerError } from "@/lib/data/errors";
import { updateMatchWithVersion } from "@/lib/data/mutations";
import { getTournamentData } from "@/lib/data/queries";
import { revalidateTournamentData } from "@/lib/data/revalidation";
import {
  createResultFormState,
  getResultEditability,
  parsePlayedAt,
  parseRetirementSets,
  parseSubmittedSets,
  resultSubmissionSchema,
  validateNormalScore,
  validateRetirementScore,
  type ResultField,
  type ResultFormState,
} from "@/lib/matches/result";

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function submittedState(
  previousState: ResultFormState,
  formData: FormData,
): ResultFormState {
  return {
    ...previousState,
    status: "error",
    message: null,
    fieldErrors: {},
    expectedUpdatedAt:
      readFormValue(formData, "expectedUpdatedAt") ||
      previousState.expectedUpdatedAt,
    values: {
      outcomeType: readFormValue(formData, "outcomeType"),
      winnerId: readFormValue(formData, "winnerId"),
      decidingSetFormat: readFormValue(formData, "decidingSetFormat"),
      playedDate: readFormValue(formData, "playedDate"),
      playedTime: readFormValue(formData, "playedTime"),
      set1Team1: readFormValue(formData, "set1Team1"),
      set1Team2: readFormValue(formData, "set1Team2"),
      set2Team1: readFormValue(formData, "set2Team1"),
      set2Team2: readFormValue(formData, "set2Team2"),
      set3Team1: readFormValue(formData, "set3Team1"),
      set3Team2: readFormValue(formData, "set3Team2"),
    },
  };
}

function fieldErrorsFromIssues(
  issues: { path: PropertyKey[]; message: string }[],
): ResultFormState["fieldErrors"] {
  const fieldErrors: ResultFormState["fieldErrors"] = {};

  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field as ResultField]) {
      fieldErrors[field as ResultField] = issue.message;
    }
  }

  return fieldErrors;
}

function scoreFieldErrors(
  setIndex: number,
  message: string,
): ResultFormState["fieldErrors"] {
  const setNumber = setIndex + 1;
  return {
    [`set${setNumber}Team1` as ResultField]: message,
    [`set${setNumber}Team2` as ResultField]: message,
  };
}

export async function updateMatchResult(
  previousState: ResultFormState,
  formData: FormData,
): Promise<ResultFormState> {
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

  const parsedSubmission = resultSubmissionSchema.safeParse({
    intent: formData.get("intent"),
    matchId: formData.get("matchId"),
    expectedUpdatedAt: formData.get("expectedUpdatedAt"),
    outcomeType: formData.get("outcomeType"),
    winnerId: formData.get("winnerId"),
    decidingSetFormat: formData.get("decidingSetFormat"),
    playedDate: formData.get("playedDate"),
    playedTime: formData.get("playedTime"),
    set1Team1: formData.get("set1Team1"),
    set1Team2: formData.get("set1Team2"),
    set2Team1: formData.get("set2Team1"),
    set2Team2: formData.get("set2Team2"),
    set3Team1: formData.get("set3Team1"),
    set3Team2: formData.get("set3Team2"),
  });

  if (!parsedSubmission.success) {
    const fieldErrors = fieldErrorsFromIssues(parsedSubmission.error.issues);
    return {
      ...pendingState,
      message:
        Object.keys(fieldErrors).length > 0
          ? "Check the highlighted result details."
          : "The result request is invalid. Reload and try again.",
      fieldErrors,
    };
  }

  const submission = parsedSubmission.data;
  const tournament = await getTournamentData();
  const currentMatch =
    tournament.matches.find((match) => match.id === submission.matchId) ??
    null;

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

  const editability = getResultEditability(
    currentMatch,
    tournament.matches,
    tournament.state,
  );
  if (!editability.editable) {
    return {
      ...pendingState,
      message: editability.reason,
    };
  }

  let changes;
  let successMessage;

  if (submission.intent === "clear") {
    if (currentMatch.status !== "completed") {
      return {
        ...pendingState,
        message: "This match does not have a result to clear.",
      };
    }

    changes = {
      status: currentMatch.scheduled_at ? ("scheduled" as const) : ("unscheduled" as const),
      deciding_set_format: null,
      outcome_type: null,
      sets: null,
      winner_id: null,
      played_at: null,
      completed_at: null,
    };
    successMessage = currentMatch.scheduled_at
      ? "Result cleared. The match is scheduled again."
      : "Result cleared. The match is unscheduled again.";
  } else {
    if (!currentMatch.team1_id || !currentMatch.team2_id) {
      return {
        ...pendingState,
        message: "Both teams must be assigned before recording a result.",
      };
    }

    if (
      submission.winnerId !== currentMatch.team1_id &&
      submission.winnerId !== currentMatch.team2_id
    ) {
      return {
        ...pendingState,
        message: "Check the highlighted result details.",
        fieldErrors: {
          winnerId: "Choose one of the teams in this match.",
        },
      };
    }

    const completedAt = new Date().toISOString();
    const playedAt = parsePlayedAt(
      submission.playedDate,
      submission.playedTime,
      completedAt,
    );
    if (!playedAt.success) {
      return {
        ...pendingState,
        message: "Check the highlighted played time.",
        fieldErrors: { playedTime: playedAt.message },
      };
    }

    let resultDetails;
    if (submission.outcomeType === "normal") {
      const parsedSets = parseSubmittedSets(submission);
      if (!parsedSets.success) {
        return {
          ...pendingState,
          message: "Check the highlighted set scores.",
          fieldErrors: parsedSets.fieldErrors,
        };
      }

      const normalScoreValidation = validateNormalScore({
        sets: parsedSets.sets,
        decidingSetFormat: submission.decidingSetFormat,
        winnerSide:
          submission.winnerId === currentMatch.team1_id ? "team1" : "team2",
      });
      if (!normalScoreValidation.success) {
        return {
          ...pendingState,
          message: normalScoreValidation.message,
          fieldErrors: normalScoreValidation.winnerError
            ? { winnerId: normalScoreValidation.message }
            : normalScoreValidation.setIndex === undefined
              ? {}
              : scoreFieldErrors(
                  normalScoreValidation.setIndex,
                  normalScoreValidation.message,
                ),
        };
      }

      resultDetails = {
        deciding_set_format: submission.decidingSetFormat,
        outcome_type: "normal" as const,
        sets: normalScoreValidation.sets,
      };
    } else if (submission.outcomeType === "retirement") {
      const parsedSets = parseRetirementSets(submission);
      if (!parsedSets.success) {
        return {
          ...pendingState,
          message: "Check the highlighted retirement score.",
          fieldErrors: parsedSets.fieldErrors,
        };
      }

      const retirementScoreValidation = validateRetirementScore({
        sets: parsedSets.sets,
        decidingSetFormat: submission.decidingSetFormat,
      });
      if (!retirementScoreValidation.success) {
        return {
          ...pendingState,
          message: retirementScoreValidation.message,
          fieldErrors: scoreFieldErrors(
            retirementScoreValidation.setIndex,
            retirementScoreValidation.message,
          ),
        };
      }

      resultDetails = {
        deciding_set_format: submission.decidingSetFormat,
        outcome_type: "retirement" as const,
        sets: parsedSets.sets,
      };
    } else {
      resultDetails = {
        deciding_set_format: null,
        outcome_type: "walkover" as const,
        sets: null,
      };
    }

    changes = {
      status: "completed" as const,
      ...resultDetails,
      winner_id: submission.winnerId,
      played_at: playedAt.timestamp,
      completed_at: completedAt,
    };
    successMessage =
      currentMatch.status === "completed"
        ? "Result updated."
        : "Result recorded.";
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
    return createResultFormState(
      result.match,
      "success",
      successMessage,
    );
  } catch (error) {
    if (error instanceof DataLayerError) {
      return {
        ...pendingState,
        message: "The result could not be saved. Try again.",
      };
    }

    throw error;
  }
}
