import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  OrganizerAuthorizationError,
  requireOrganizerMutation,
} from "@/lib/auth/request";
import { DataIntegrityError, DataLayerError } from "@/lib/data/errors";
import { revalidateTournamentData } from "@/lib/data/revalidation";
import { tournamentSnapshotSchema } from "@/lib/data/schema";
import { RECONCILIATION_ID } from "@/lib/reconciliation/knockout-2026";
import {
  applyKnockoutReconciliation,
  previewKnockoutReconciliation,
  ReconciliationConflictError,
} from "@/lib/reconciliation/server";

export const runtime = "nodejs";

const requestSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("preview") }).strict(),
  z
    .object({
      intent: z.literal("apply"),
      reconciliationId: z.literal(RECONCILIATION_ID),
      confirmation: z.literal("Apply the reviewed MGO-033 reconciliation"),
      expectedSnapshot: tournamentSnapshotSchema,
    })
    .strict(),
]);

function response(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireOrganizerMutation(request);
  } catch (error) {
    if (error instanceof OrganizerAuthorizationError) {
      return response(
        { error: "A valid same-origin organizer session is required." },
        403,
      );
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return response({ error: "Request body must be valid JSON." }, 400);
    }
    throw error;
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return response(
      { error: "The reconciliation request or explicit confirmation is invalid." },
      400,
    );
  }
  try {
    if (parsed.data.intent === "preview") {
      return response(await previewKnockoutReconciliation());
    }
    const snapshot = await applyKnockoutReconciliation(
      parsed.data.expectedSnapshot,
    );
    revalidateTournamentData();
    return response({
      reconciliationId: RECONCILIATION_ID,
      status: "applied",
      snapshot,
    });
  } catch (error) {
    if (
      error instanceof ReconciliationConflictError ||
      error instanceof DataIntegrityError
    ) {
      return response({ error: error.message }, 409);
    }
    if (error instanceof DataLayerError) {
      console.error("tournament_reconciliation_failed", {
        action: RECONCILIATION_ID,
        intent: parsed.data.intent,
      });
      return response(
        { error: "Reconciliation could not be completed. Review its recorded state before retrying." },
        503,
      );
    }
    throw error;
  }
}
