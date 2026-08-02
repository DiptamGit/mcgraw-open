import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { createPrivilegedSupabaseClient } from "../supabase/clients";
import { DataLayerError } from "./errors";
import {
  parseMatchRecord,
  versionedMatchUpdateSchema,
  type MatchRecord,
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
