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
