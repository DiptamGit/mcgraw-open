export class DataLayerError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DataLayerError";
  }
}

export class DataIntegrityError extends DataLayerError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DataIntegrityError";
  }
}

export type GroupStageMutationIssue =
  | "GROUPS_ALREADY_FINALIZED"
  | "GROUPS_ALREADY_OPEN"
  | "GROUP_MATCHES_INCOMPLETE"
  | "GROUP_MATCH_CONFLICT"
  | "GROUP_STATE_CONFLICT"
  | "INVALID_GROUP_MATCH_VERSIONS"
  | "INVALID_GROUP_RANKINGS"
  | "QUARTERFINAL_ACTIVITY_EXISTS"
  | "TOURNAMENT_STATE_MISSING";

export class GroupStageMutationError extends DataLayerError {
  constructor(
    public readonly issue: GroupStageMutationIssue,
    options?: ErrorOptions,
  ) {
    super("Supabase rejected the group-stage transition.", options);
    this.name = "GroupStageMutationError";
  }
}

export type QuarterfinalAssignmentIssue =
  | "FINAL_RANKS_INCOMPLETE"
  | "GROUPS_NOT_FINALIZED"
  | "GROUP_STATE_CONFLICT"
  | "INVALID_QUARTERFINAL_MATCH_VERSIONS"
  | "QUARTERFINAL_ACTIVITY_EXISTS"
  | "QUARTERFINAL_ASSIGNMENT_CONFLICT"
  | "QUARTERFINAL_MATCH_CONFLICT"
  | "QUARTERFINAL_MATCHES_INVALID"
  | "TOURNAMENT_STATE_MISSING";

export class QuarterfinalAssignmentError extends DataLayerError {
  constructor(
    public readonly issue: QuarterfinalAssignmentIssue,
    options?: ErrorOptions,
  ) {
    super("Supabase rejected the quarterfinal assignment.", options);
    this.name = "QuarterfinalAssignmentError";
  }
}

export type KnockoutAssignmentIssue =
  | "DOWNSTREAM_ASSIGNMENT_CONFLICT"
  | "DOWNSTREAM_ASSIGNMENT_EXISTS"
  | "DOWNSTREAM_ASSIGNMENT_MISSING"
  | "DOWNSTREAM_MATCH_CONFLICT"
  | "DOWNSTREAM_MATCH_PROTECTED"
  | "DUPLICATE_DOWNSTREAM_TEAM"
  | "INVALID_SOURCE_WINNER"
  | "KNOCKOUT_ASSIGNMENT_INTENT_INVALID"
  | "KNOCKOUT_PATH_INVALID"
  | "SOURCE_MATCH_CONFLICT"
  | "SOURCE_RESULT_INCOMPLETE";

export class KnockoutAssignmentError extends DataLayerError {
  constructor(
    public readonly issue: KnockoutAssignmentIssue,
    options?: ErrorOptions,
  ) {
    super("Supabase rejected the knockout assignment.", options);
    this.name = "KnockoutAssignmentError";
  }
}

export class MatchMutationError extends DataLayerError {
  constructor(
    public readonly issue: "UPSTREAM_RESULT_LOCKED",
    options?: ErrorOptions,
  ) {
    super("Supabase rejected the match update.", options);
    this.name = "MatchMutationError";
  }
}
