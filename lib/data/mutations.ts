import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { createPrivilegedSupabaseClient } from "../supabase/clients";
import {
  DataLayerError,
  GroupStageMutationError,
  KnockoutAssignmentError,
  type KnockoutAssignmentIssue,
  MatchMutationError,
  type GroupStageMutationIssue,
  QuarterfinalAssignmentError,
  type QuarterfinalAssignmentIssue,
} from "./errors";
import {
  parseKnockoutAssignmentResult,
  type KnockoutAssignmentSubmission,
} from "../knockout-assignment";
import {
  parseQuarterfinalAssignments,
  type ExpectedQuarterfinalVersion,
} from "../quarterfinal-assignment";
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

function throwMatchMutationError(
  operation: string,
  error: PostgrestError,
): never {
  if (error.code === "P0001" && error.message === "UPSTREAM_RESULT_LOCKED") {
    throw new MatchMutationError("UPSTREAM_RESULT_LOCKED", {
      cause: error,
    });
  }

  throwMutationError(operation, error);
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

const quarterfinalAssignmentIssues =
  new Set<QuarterfinalAssignmentIssue>([
    "FINAL_RANKS_INCOMPLETE",
    "GROUPS_NOT_FINALIZED",
    "GROUP_STATE_CONFLICT",
    "INVALID_QUARTERFINAL_MATCH_VERSIONS",
    "QUARTERFINAL_ACTIVITY_EXISTS",
    "QUARTERFINAL_ASSIGNMENT_CONFLICT",
    "QUARTERFINAL_MATCH_CONFLICT",
    "QUARTERFINAL_MATCHES_INVALID",
    "TOURNAMENT_STATE_MISSING",
  ]);

function throwQuarterfinalAssignmentError(
  operation: string,
  error: PostgrestError,
): never {
  if (
    error.code === "P0001" &&
    quarterfinalAssignmentIssues.has(
      error.message as QuarterfinalAssignmentIssue,
    )
  ) {
    throw new QuarterfinalAssignmentError(
      error.message as QuarterfinalAssignmentIssue,
      { cause: error },
    );
  }

  throwMutationError(operation, error);
}

const knockoutAssignmentIssues = new Set<KnockoutAssignmentIssue>([
  "DOWNSTREAM_ASSIGNMENT_CONFLICT",
  "DOWNSTREAM_ASSIGNMENT_EXISTS",
  "DOWNSTREAM_ASSIGNMENT_MISSING",
  "DOWNSTREAM_MATCH_CONFLICT",
  "DOWNSTREAM_MATCH_PROTECTED",
  "DUPLICATE_DOWNSTREAM_TEAM",
  "INVALID_SOURCE_WINNER",
  "KNOCKOUT_ASSIGNMENT_INTENT_INVALID",
  "KNOCKOUT_PATH_INVALID",
  "SOURCE_MATCH_CONFLICT",
  "SOURCE_RESULT_INCOMPLETE",
]);

function throwKnockoutAssignmentError(
  operation: string,
  error: PostgrestError,
): never {
  if (
    error.code === "P0001" &&
    knockoutAssignmentIssues.has(error.message as KnockoutAssignmentIssue)
  ) {
    throw new KnockoutAssignmentError(
      error.message as KnockoutAssignmentIssue,
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
    throwMatchMutationError("update the match", error);
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

export async function assignQuarterfinalTeams(input: {
  expectedStateUpdatedAt: string;
  matchVersions: ExpectedQuarterfinalVersion[];
}) {
  const client = createPrivilegedSupabaseClient();
  const { data, error } = await client.rpc("assign_quarterfinal_teams", {
    p_expected_state_updated_at: input.expectedStateUpdatedAt,
    p_match_versions: input.matchVersions,
  });

  if (error) {
    throwQuarterfinalAssignmentError(
      "assign finalized teams to quarterfinals",
      error,
    );
  }

  return parseQuarterfinalAssignments(data);
}

export async function updateKnockoutAssignment(
  input: KnockoutAssignmentSubmission,
) {
  const client = createPrivilegedSupabaseClient();
  const { data, error } = await client.rpc("update_knockout_assignment", {
    p_intent: input.intent,
    p_downstream_code: input.downstreamCode,
    p_team_slot: input.teamSlot,
    p_expected_downstream_updated_at:
      input.expectedDownstreamUpdatedAt,
    p_expected_source_updated_at: input.expectedSourceUpdatedAt,
    p_team_id: input.teamId,
  });

  if (error) {
    throwKnockoutAssignmentError("update the knockout assignment", error);
  }

  return parseKnockoutAssignmentResult(data);
}
