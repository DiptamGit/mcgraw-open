import "server-only";

import { DataLayerError } from "../data/errors";
import {
  parseTournamentSnapshot,
  type TournamentSnapshot,
} from "../data/schema";
import { createPrivilegedSupabaseClient } from "../supabase/clients";
import { createReconciliationPreview } from "./knockout-2026";

const conflictCodes = new Set([
  "RECONCILIATION_ALREADY_APPLIED",
  "RECONCILIATION_CONFLICT",
  "RECONCILIATION_BASELINE_INVALID",
  "RECONCILIATION_IDENTITIES_INVALID",
  "RECONCILIATION_FUTURE_RESULT",
]);

export class ReconciliationConflictError extends Error {}

export async function previewKnockoutReconciliation() {
  const client = createPrivilegedSupabaseClient();
  const { data, error } = await client.rpc("get_tournament_snapshot");
  if (error) {
    throw new DataLayerError("Could not read the reconciliation baseline.", {
      cause: error,
    });
  }
  const { count, error: auditError } = await client
    .from("audit_log")
    .select("id", { count: "exact", head: true })
    .eq("entity_type", "tournament_reconciliation")
    .eq("entity_key", "MGO-033");
  if (auditError) {
    throw new DataLayerError("Could not check reconciliation history.", {
      cause: auditError,
    });
  }
  if (count === null) {
    throw new DataLayerError(
      "Supabase did not return a reconciliation history count.",
    );
  }
  if (count > 0) {
    throw new ReconciliationConflictError("This reconciliation was already applied.");
  }
  return createReconciliationPreview(parseTournamentSnapshot(data));
}

export async function applyKnockoutReconciliation(
  expectedSnapshot: TournamentSnapshot,
) {
  createReconciliationPreview(expectedSnapshot);
  const client = createPrivilegedSupabaseClient();
  const { data, error } = await client.rpc("reconcile_2026_knockout", {
    p_expected_snapshot: expectedSnapshot,
  });
  if (error) {
    if (error.code === "P0001" && conflictCodes.has(error.message)) {
      throw new ReconciliationConflictError(
        error.message === "RECONCILIATION_ALREADY_APPLIED"
          ? "This reconciliation was already applied."
          : "The reviewed baseline is no longer eligible. Request a new preview before applying.",
      );
    }
    throw new DataLayerError("Could not apply the knockout reconciliation.", {
      cause: error,
    });
  }
  return parseTournamentSnapshot(data);
}
