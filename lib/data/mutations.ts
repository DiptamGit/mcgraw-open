import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { createPrivilegedSupabaseClient } from "../supabase/clients";
import {
  DataLayerError,
  GroupStageMutationError,
  type GroupStageMutationIssue,
} from "./errors";
import {
  parseMatchRecord,
  parseTournamentState,
  versionedMatchUpdateSchema,
  type MatchRecord,
  type TournamentState,
  type VersionedMatchUpdate,
} from "./schema";

export type VersionedMatchUpdateResult =
  | { status: "updated"; match: MatchRecord }
  | { status: "conflict"; current: MatchRecord }
  | { status: "not_found" };

function throwMutationError(operation: string, error: PostgrestError): never {
  throw new DataLayerError(`Supabase could not ${operation}.`, {
    cause: error,
  });
}

const groupStageMutationIssues = new Set<GroupStageMutationIssue>([
  "GROUPS_ALREADY_FINALIZED",
  "GROUPS_ALREADY_OPEN",
  "GROUP_MATCHES_INCOMPLETE",
  "GROUP_MATCH_CONFLICT",
  "GROUP_STATE_CONFLICT",
  "INVALID_GROUP_MATCH_VERSIONS",
  "INVALID_GROUP_RANKINGS",
  "QUARTERFINAL_ACTIVITY_EXISTS",
  "TOURNAMENT_STATE_MISSING",
]);

function throwGroupStageMutationError(
  operation: string,
  error: PostgrestError,
): never {
  if (
    error.code === "P0001" &&
    groupStageMutationIssues.has(error.message as GroupStageMutationIssue)
  ) {
    throw new GroupStageMutationError(
      error.message as GroupStageMutationIssue,
      { cause: error },
    );
  }

  throwMutationError(operation, error);
}

export async function updateMatchWithVersion(
  input: VersionedMatchUpdate,
): Promise<VersionedMatchUpdateResult> {
  const parsedInput = versionedMatchUpdateSchema.parse(input);
  const client = createPrivilegedSupabaseClient();
  const { data, error } = await client
    .from("matches")
    .update(parsedInput.changes)
    .eq("id", parsedInput.id)
    .eq("updated_at", parsedInput.expectedUpdatedAt)
    .select("*")
    .maybeSingle();

  if (error) {
    throwMutationError("update the match", error);
  }

  if (data) {
    return {
      status: "updated",
      match: parseMatchRecord(data),
    };
  }

  const { data: current, error: currentError } = await client
    .from("matches")
    .select("*")
    .eq("id", parsedInput.id)
    .maybeSingle();

  if (currentError) {
    throwMutationError("check the current match version", currentError);
  }

  if (!current) {
    return { status: "not_found" };
  }

  return {
    status: "conflict",
    current: parseMatchRecord(current),
  };
}

export type GroupMatchVersion = {
  match_id: string;
  updated_at: string;
};

export type FinalRanking = {
  team_id: string;
  final_rank: number;
};

export async function finalizeGroupStandings(input: {
  expectedStateUpdatedAt: string;
  matchVersions: GroupMatchVersion[];
  rankings: FinalRanking[];
  tieResolutionNote: string | null;
}): Promise<TournamentState> {
  const client = createPrivilegedSupabaseClient();
  const { data, error } = await client.rpc("finalize_group_standings", {
    p_expected_state_updated_at: input.expectedStateUpdatedAt,
    p_match_versions: input.matchVersions,
    p_rankings: input.rankings,
    p_tie_resolution_note: input.tieResolutionNote ?? "",
  });

  if (error) {
    throwGroupStageMutationError("finalize group standings", error);
  }

  return parseTournamentState(data);
}

export async function reopenGroupStandings(
  expectedStateUpdatedAt: string,
): Promise<TournamentState> {
  const client = createPrivilegedSupabaseClient();
  const { data, error } = await client.rpc("reopen_group_standings", {
    p_expected_state_updated_at: expectedStateUpdatedAt,
  });

  if (error) {
    throwGroupStageMutationError("reopen group standings", error);
  }

  return parseTournamentState(data);
}
