"use server";

import { redirect } from "next/navigation";

import { OrganizerAuthorizationError } from "@/lib/auth/request";
import { requireOrganizerServerAction } from "@/lib/auth/server-action";
import {
  DataLayerError,
  KnockoutAssignmentError,
} from "@/lib/data/errors";
import { updateKnockoutAssignment as persistKnockoutAssignment } from "@/lib/data/mutations";
import { getTournamentData } from "@/lib/data/queries";
import { revalidateTournamentData } from "@/lib/data/revalidation";
import {
  createKnockoutAssignmentPreview,
  findKnockoutAssignmentSlot,
  knockoutAssignmentSubmissionSchema,
} from "@/lib/knockout-assignment";

export type KnockoutAssignmentFormState = {
  status: "idle" | "error" | "conflict";
  message: string | null;
};

function errorState(
  message: string,
  status: KnockoutAssignmentFormState["status"] = "error",
): KnockoutAssignmentFormState {
  return { status, message };
}

export async function updateKnockoutAssignment(
  _previousState: KnockoutAssignmentFormState,
  formData: FormData,
): Promise<KnockoutAssignmentFormState> {
  try {
    await requireOrganizerServerAction();
  } catch (error) {
    if (error instanceof OrganizerAuthorizationError) {
      return errorState(
        "Organizer access expired or this request was not accepted. Unlock this device and try again.",
      );
    }
    throw error;
  }

  const submission = knockoutAssignmentSubmissionSchema.safeParse({
    intent: formData.get("intent"),
    downstreamCode: formData.get("downstreamCode"),
    teamSlot: formData.get("teamSlot"),
    teamId: formData.get("teamId"),
    expectedDownstreamUpdatedAt: formData.get(
      "expectedDownstreamUpdatedAt",
    ),
    expectedSourceUpdatedAt: formData.get("expectedSourceUpdatedAt"),
  });

  if (!submission.success) {
    return errorState(
      "The bracket assignment request is invalid. Reload and review the progression path.",
    );
  }

  const tournament = await getTournamentData();
  const preview = createKnockoutAssignmentPreview(
    tournament.matches,
    submission.data.downstreamCode,
  );
  const slot = findKnockoutAssignmentSlot(
    preview,
    submission.data.teamSlot,
  );

  if (
    preview.downstreamMatch.updated_at !==
      submission.data.expectedDownstreamUpdatedAt ||
    slot.sourceMatch.updated_at !==
      submission.data.expectedSourceUpdatedAt
  ) {
    return errorState(
      "The source result or downstream match changed on another device. Reload before continuing.",
      "conflict",
    );
  }

  if (preview.protected) {
    return errorState(
      `${preview.downstreamMatch.code} is ${preview.downstreamMatch.status}. Its team assignments cannot be changed.`,
    );
  }

  if (submission.data.intent === "assign") {
    if (slot.status === "waiting") {
      return errorState(
        `Complete ${slot.sourceMatch.code} before assigning its winner to ${preview.downstreamMatch.code}.`,
      );
    }
    if (slot.status === "assigned") {
      return errorState(
        `${slot.assignedTeam?.name ?? "This team"} is already assigned from ${slot.sourceMatch.code}.`,
      );
    }
    if (
      slot.status === "conflict" ||
      slot.eligibleWinner?.id !== submission.data.teamId
    ) {
      return errorState(
        "The selected team does not match the completed source winner. Reload and review the bracket.",
        "conflict",
      );
    }
  } else {
    if (slot.status !== "assigned") {
      return errorState(
        "This downstream assignment is no longer eligible to clear. Reload and review the bracket.",
        "conflict",
      );
    }
    if (slot.assignedTeam?.id !== submission.data.teamId) {
      return errorState(
        "The assigned team changed on another device. Reload before clearing it.",
        "conflict",
      );
    }
  }

  try {
    await persistKnockoutAssignment(submission.data);
  } catch (error) {
    if (error instanceof KnockoutAssignmentError) {
      if (
        error.issue === "SOURCE_MATCH_CONFLICT" ||
        error.issue === "DOWNSTREAM_MATCH_CONFLICT" ||
        error.issue === "DOWNSTREAM_ASSIGNMENT_CONFLICT"
      ) {
        return errorState(
          "The source result or downstream match changed while saving. Reload and review the bracket.",
          "conflict",
        );
      }
      if (error.issue === "DOWNSTREAM_MATCH_PROTECTED") {
        return errorState(
          `${submission.data.downstreamCode} was scheduled or completed on another device. Its team assignments are protected.`,
        );
      }
      if (error.issue === "SOURCE_RESULT_INCOMPLETE") {
        return errorState(
          "The source match no longer has a completed result. Record its result before assigning a winner.",
        );
      }
      if (error.issue === "DOWNSTREAM_ASSIGNMENT_EXISTS") {
        return errorState(
          "That team is already assigned to this bracket slot. Reload to see the current bracket.",
        );
      }
      if (
        error.issue === "DUPLICATE_DOWNSTREAM_TEAM" ||
        error.issue === "INVALID_SOURCE_WINNER"
      ) {
        return errorState(
          "The selected team is not eligible for this bracket slot.",
        );
      }
      if (error.issue === "DOWNSTREAM_ASSIGNMENT_MISSING") {
        return errorState(
          "That team assignment was already cleared. Reload to see the current bracket.",
          "conflict",
        );
      }
    }

    if (error instanceof DataLayerError) {
      return errorState(
        "The bracket assignment could not be saved. Try again.",
      );
    }
    throw error;
  }

  revalidateTournamentData();
  const query = new URLSearchParams({
    progression:
      submission.data.intent === "assign" ? "assigned" : "cleared",
    match: submission.data.downstreamCode,
  });
  redirect(`/bracket?${query.toString()}`);
}
