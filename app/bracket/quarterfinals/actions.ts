"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { OrganizerAuthorizationError } from "@/lib/auth/request";
import { requireOrganizerServerAction } from "@/lib/auth/server-action";
import {
  DataLayerError,
  QuarterfinalAssignmentError,
} from "@/lib/data/errors";
import { assignQuarterfinalTeams } from "@/lib/data/mutations";
import {
  getTournamentData,
  hasQuarterfinalActivityHistory,
} from "@/lib/data/queries";
import { revalidateTournamentData } from "@/lib/data/revalidation";
import {
  createQuarterfinalAssignmentPreview,
  expectedQuarterfinalVersionsSchema,
  quarterfinalVersionsMatch,
} from "@/lib/quarterfinal-assignment";

export type QuarterfinalAssignmentFormState = {
  status: "idle" | "error" | "conflict";
  message: string | null;
};

const submissionSchema = z.object({
  expectedStateUpdatedAt: z.iso.datetime({
    offset: true,
    message: "The finalized standings version is invalid.",
  }),
});

function errorState(
  message: string,
  status: QuarterfinalAssignmentFormState["status"] = "error",
): QuarterfinalAssignmentFormState {
  return { status, message };
}

function readVersions(formData: FormData) {
  const value = formData.get("expectedMatchVersions");
  if (typeof value !== "string") {
    return null;
  }

  try {
    const result = expectedQuarterfinalVersionsSchema.safeParse(
      JSON.parse(value),
    );
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export async function assignQuarterfinals(
  _previousState: QuarterfinalAssignmentFormState,
  formData: FormData,
): Promise<QuarterfinalAssignmentFormState> {
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
  const expectedMatchVersions = readVersions(formData);
  if (!submission.success || !expectedMatchVersions) {
    return errorState(
      "The quarterfinal preview is invalid. Reload and review the draw.",
    );
  }

  const [tournament, hasActivityHistory] = await Promise.all([
    getTournamentData(),
    hasQuarterfinalActivityHistory(),
  ]);
  if (tournament.state.group_stage_status !== "finalized") {
    return errorState(
      "Finalize the group standings before assigning quarterfinals.",
    );
  }
  if (
    tournament.state.updated_at !==
    submission.data.expectedStateUpdatedAt
  ) {
    return errorState(
      "The finalized standings changed on another device. Reload before assigning the draw.",
      "conflict",
    );
  }

  const preview = createQuarterfinalAssignmentPreview({
    teams: tournament.teams,
    matches: tournament.matches,
    hasActivityHistory,
  });

  if (preview.status === "activity") {
    return errorState(
      "Quarterfinal activity has started. Existing assignments cannot be replaced.",
    );
  }
  if (preview.status === "conflict") {
    return errorState(
      "The current quarterfinal assignments do not match the finalized ranks. Review the bracket data before continuing.",
      "conflict",
    );
  }
  if (preview.status === "assigned") {
    revalidateTournamentData();
    return redirect("/bracket?assignment=already-assigned");
  }
  if (
    !quarterfinalVersionsMatch(
      expectedMatchVersions,
      preview.expectedMatchVersions,
    )
  ) {
    return errorState(
      "The quarterfinal bracket changed on another device. Reload and review the draw.",
      "conflict",
    );
  }

  try {
    await assignQuarterfinalTeams({
      expectedStateUpdatedAt: tournament.state.updated_at,
      matchVersions: expectedMatchVersions,
    });
  } catch (error) {
    if (error instanceof QuarterfinalAssignmentError) {
      if (
        error.issue === "GROUP_STATE_CONFLICT" ||
        error.issue === "QUARTERFINAL_MATCH_CONFLICT" ||
        error.issue === "QUARTERFINAL_ASSIGNMENT_CONFLICT"
      ) {
        return errorState(
          "The finalized standings or bracket changed while assigning teams. Reload and review the draw.",
          "conflict",
        );
      }
      if (
        error.issue === "GROUPS_NOT_FINALIZED" ||
        error.issue === "FINAL_RANKS_INCOMPLETE"
      ) {
        return errorState(
          "Finalized group ranks are not available for every quarterfinal seed.",
        );
      }
      if (error.issue === "QUARTERFINAL_ACTIVITY_EXISTS") {
        return errorState(
          "Quarterfinal activity has started. Existing assignments cannot be replaced.",
        );
      }
    }
    if (error instanceof DataLayerError) {
      return errorState(
        "The quarterfinal teams could not be assigned. Try again.",
      );
    }
    throw error;
  }

  revalidateTournamentData();
  return redirect("/bracket?assignment=assigned");
}
