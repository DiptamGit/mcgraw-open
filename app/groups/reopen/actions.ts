"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { OrganizerAuthorizationError } from "@/lib/auth/request";
import { requireOrganizerServerAction } from "@/lib/auth/server-action";
import {
  DataLayerError,
  GroupStageMutationError,
} from "@/lib/data/errors";
import { reopenGroupStandings } from "@/lib/data/mutations";
import { getTournamentData } from "@/lib/data/queries";
import { revalidateTournamentData } from "@/lib/data/revalidation";

export type ReopenGroupsFormState = {
  status: "idle" | "error" | "conflict";
  message: string | null;
};

const submissionSchema = z.object({
  expectedStateUpdatedAt: z.iso.datetime({
    offset: true,
    message: "The standings version is invalid. Reload and try again.",
  }),
});

function errorState(
  message: string,
  status: ReopenGroupsFormState["status"] = "error",
): ReopenGroupsFormState {
  return { status, message };
}

export async function reopenGroups(
  _previousState: ReopenGroupsFormState,
  formData: FormData,
): Promise<ReopenGroupsFormState> {
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

  const submission = submissionSchema.safeParse({
    expectedStateUpdatedAt: formData.get("expectedStateUpdatedAt"),
  });
  if (!submission.success) {
    return errorState(
      "The reopen request is invalid. Reload and try again.",
    );
  }

  const tournament = await getTournamentData();
  if (tournament.state.group_stage_status !== "finalized") {
    return errorState(
      "The group standings are already live. Reload the Groups page.",
      "conflict",
    );
  }
  if (
    tournament.state.updated_at !==
    submission.data.expectedStateUpdatedAt
  ) {
    return errorState(
      "The group-stage status changed on another device. Reload before reopening.",
      "conflict",
    );
  }

  const activeQuarterfinal = tournament.matches.find(
    (match) =>
      match.stage === "quarterfinal" && match.status !== "unscheduled",
  );
  if (activeQuarterfinal) {
    return errorState(
      `Groups cannot be reopened because ${activeQuarterfinal.code} is ${activeQuarterfinal.status}.`,
    );
  }

  try {
    await reopenGroupStandings(tournament.state.updated_at);
  } catch (error) {
    if (error instanceof GroupStageMutationError) {
      if (
        error.issue === "GROUP_STATE_CONFLICT" ||
        error.issue === "GROUPS_ALREADY_OPEN"
      ) {
        return errorState(
          "The group-stage status changed while reopening. Reload and try again.",
          "conflict",
        );
      }
      if (error.issue === "QUARTERFINAL_ACTIVITY_EXISTS") {
        return errorState(
          "A quarterfinal has been scheduled or completed. Groups can no longer be reopened.",
        );
      }
    }
    if (error instanceof DataLayerError) {
      return errorState(
        "The group standings could not be reopened. Try again.",
      );
    }
    throw error;
  }

  revalidateTournamentData();
  redirect("/groups?transition=reopened");
}
