"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { OrganizerAuthorizationError } from "@/lib/auth/request";
import { requireOrganizerServerAction } from "@/lib/auth/server-action";
import {
  DataLayerError,
  GroupStageMutationError,
} from "@/lib/data/errors";
import { finalizeGroupStandings } from "@/lib/data/mutations";
import { getTournamentData } from "@/lib/data/queries";
import { revalidateTournamentData } from "@/lib/data/revalidation";
import {
  createFinalizationPreview,
  expectedGroupMatchVersionsSchema,
  manualTieOrdersSchema,
  resolveFinalRankings,
  type FinalizationFormState,
} from "@/lib/groups/finalization";

const submissionSchema = z.object({
  expectedStateUpdatedAt: z.iso.datetime({
    offset: true,
    message: "The standings version is invalid. Reload and try again.",
  }),
  tieResolutionNote: z.string().max(
    1000,
    "Keep the tie-resolution note to 1,000 characters or fewer.",
  ),
});

function readString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function parseJson<T>(
  value: string,
  schema: z.ZodType<T>,
): T | null {
  try {
    const result = schema.safeParse(JSON.parse(value));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function versionsMatch(
  left: z.infer<typeof expectedGroupMatchVersionsSchema>,
  right: z.infer<typeof expectedGroupMatchVersionsSchema>,
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const rightById = new Map(
    right.map((version) => [version.match_id, version.updated_at]),
  );
  return left.every(
    (version) =>
      rightById.get(version.match_id) === version.updated_at,
  );
}

function transitionError(
  previousState: FinalizationFormState,
  message: string,
  status: FinalizationFormState["status"] = "error",
): FinalizationFormState {
  return {
    ...previousState,
    status,
    message,
  };
}

export async function finalizeGroups(
  previousState: FinalizationFormState,
  formData: FormData,
): Promise<FinalizationFormState> {
  const manualOrders =
    parseJson(
      readString(formData, "manualOrders"),
      manualTieOrdersSchema,
    ) ?? previousState.values.manualOrders;
  const pendingState: FinalizationFormState = {
    status: "error",
    message: null,
    fieldErrors: {},
    values: {
      manualOrders,
      tieResolutionNote: readString(formData, "tieResolutionNote"),
    },
  };

  try {
    await requireOrganizerServerAction();
  } catch (error) {
    if (error instanceof OrganizerAuthorizationError) {
      return transitionError(
        pendingState,
        "Organizer access expired or this request was not accepted. Unlock this device and try again.",
      );
    }
    throw error;
  }

  const parsedSubmission = submissionSchema.safeParse({
    expectedStateUpdatedAt: formData.get("expectedStateUpdatedAt"),
    tieResolutionNote: formData.get("tieResolutionNote"),
  });
  const expectedMatchVersions = parseJson(
    readString(formData, "expectedMatchVersions"),
    expectedGroupMatchVersionsSchema,
  );
  const parsedManualOrders = parseJson(
    readString(formData, "manualOrders"),
    manualTieOrdersSchema,
  );

  if (
    !parsedSubmission.success ||
    !expectedMatchVersions ||
    !parsedManualOrders
  ) {
    const noteError = parsedSubmission.success
      ? undefined
      : parsedSubmission.error.issues.find(
          (issue) => issue.path[0] === "tieResolutionNote",
        )?.message;
    return {
      ...pendingState,
      message: noteError
        ? "Check the tie-resolution note."
        : "The finalization preview is invalid. Reload and try again.",
      fieldErrors: {
        tieResolutionNote: noteError,
        manualOrders:
          parsedManualOrders && expectedMatchVersions
            ? undefined
            : "Reload and review the current standings.",
      },
    };
  }

  const tournament = await getTournamentData();
  if (tournament.state.group_stage_status !== "open") {
    return transitionError(
      pendingState,
      "The group standings are already finalized. Reload the Groups page.",
      "conflict",
    );
  }
  if (
    tournament.state.updated_at !==
    parsedSubmission.data.expectedStateUpdatedAt
  ) {
    return transitionError(
      pendingState,
      "The group-stage status changed on another device. Reload before finalizing.",
      "conflict",
    );
  }

  const preview = createFinalizationPreview(tournament);
  if (!preview.allMatchesComplete) {
    return transitionError(
      pendingState,
      `All group matches must be complete. ${preview.completedMatches} of ${preview.totalMatches} results are recorded.`,
    );
  }
  if (
    !versionsMatch(expectedMatchVersions, preview.expectedMatchVersions)
  ) {
    return transitionError(
      pendingState,
      "A group result changed after this preview was loaded. Reload and review the new standings.",
      "conflict",
    );
  }

  const resolution = resolveFinalRankings(
    preview,
    parsedManualOrders,
    parsedSubmission.data.tieResolutionNote,
  );
  if (!resolution.success) {
    return {
      ...pendingState,
      message: resolution.message,
      fieldErrors: resolution.fieldErrors,
    };
  }

  try {
    await finalizeGroupStandings({
      expectedStateUpdatedAt: tournament.state.updated_at,
      matchVersions: preview.expectedMatchVersions,
      rankings: resolution.rankings,
      tieResolutionNote: resolution.tieResolutionNote,
    });
  } catch (error) {
    if (error instanceof GroupStageMutationError) {
      if (
        error.issue === "GROUP_STATE_CONFLICT" ||
        error.issue === "GROUP_MATCH_CONFLICT" ||
        error.issue === "GROUPS_ALREADY_FINALIZED"
      ) {
        return transitionError(
          pendingState,
          "The standings changed while finalizing. Reload and review them again.",
          "conflict",
        );
      }
      if (error.issue === "GROUP_MATCHES_INCOMPLETE") {
        return transitionError(
          pendingState,
          "Every group match needs a completed result before finalization.",
        );
      }
    }
    if (error instanceof DataLayerError) {
      return transitionError(
        pendingState,
        "The standings could not be finalized. Try again.",
      );
    }
    throw error;
  }

  revalidateTournamentData();
  redirect("/groups?transition=finalized");
}
