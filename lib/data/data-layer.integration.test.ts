import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const hasPublicEnvironment = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY,
);
const hasPrivilegedEnvironment = Boolean(
  hasPublicEnvironment && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

describe.skipIf(!hasPublicEnvironment)("seeded Supabase reads", () => {
  it("loads and normalizes the complete fixture set", async () => {
    const { getTournamentData } = await import("./queries");
    const tournament = await getTournamentData();

    expect(tournament.teams).toHaveLength(11);
    expect(tournament.matches).toHaveLength(32);
    expect(
      tournament.matches.filter((match) => match.stage === "group"),
    ).toHaveLength(25);
    expect(tournament.state).toMatchObject({
      id: 1,
      group_stage_status: "open",
    });
  });

  it("surfaces Supabase query failures", async () => {
    const originalKey = process.env.SUPABASE_ANON_KEY;
    process.env.SUPABASE_ANON_KEY = "invalid-key";

    try {
      const { getTeams } = await import("./queries");
      await expect(getTeams()).rejects.toThrow(
        "Could not load teams from Supabase.",
      );
    } finally {
      process.env.SUPABASE_ANON_KEY = originalKey;
    }
  });
});

describe.skipIf(!hasPrivilegedEnvironment)("versioned Supabase writes", () => {
  it("schedules, reschedules, and unschedules one fixture with audit history", async () => {
    const { createPrivilegedSupabaseClient } = await import(
      "../supabase/clients"
    );
    const { updateMatchWithVersion } = await import("./mutations");
    const client = createPrivilegedSupabaseClient();
    const { data: original, error } = await client
      .from("matches")
      .select("*")
      .eq("code", "GA-01")
      .single();

    expect(error).toBeNull();
    expect(original).not.toBeNull();
    if (!original) {
      throw new Error("Seeded GA-01 match is missing.");
    }

    const scheduled = await updateMatchWithVersion({
      id: original.id,
      expectedUpdatedAt: original.updated_at,
      changes: {
        status: "scheduled",
        scheduled_at: "2026-08-04T00:30:00Z",
        venue: "McGraw Park Court 2",
      },
    });

    expect(scheduled.status).toBe("updated");
    if (scheduled.status !== "updated") {
      throw new Error("GA-01 was not scheduled.");
    }
    expect(scheduled.match).toMatchObject({
      status: "scheduled",
      scheduled_at: "2026-08-04T00:30:00+00:00",
      venue: "McGraw Park Court 2",
    });

    const rescheduled = await updateMatchWithVersion({
      id: original.id,
      expectedUpdatedAt: scheduled.match.updated_at,
      changes: {
        scheduled_at: "2026-08-05T01:00:00Z",
        venue: "McGraw Park Court 3",
      },
    });

    expect(rescheduled.status).toBe("updated");
    if (rescheduled.status !== "updated") {
      throw new Error("GA-01 was not rescheduled.");
    }

    const stale = await updateMatchWithVersion({
      id: original.id,
      expectedUpdatedAt: original.updated_at,
      changes: {
        scheduled_at: "2026-08-06T01:00:00Z",
        venue: "Stale court",
      },
    });

    expect(stale.status).toBe("conflict");
    if (stale.status !== "conflict") {
      throw new Error("The stale GA-01 update did not conflict.");
    }
    expect(stale.current).toMatchObject({
      scheduled_at: "2026-08-05T01:00:00+00:00",
      venue: "McGraw Park Court 3",
    });

    const unscheduled = await updateMatchWithVersion({
      id: original.id,
      expectedUpdatedAt: rescheduled.match.updated_at,
      changes: {
        status: "unscheduled",
        scheduled_at: null,
        venue: null,
      },
    });

    expect(unscheduled.status).toBe("updated");
    if (unscheduled.status !== "updated") {
      throw new Error("GA-01 was not returned to unscheduled.");
    }
    expect(unscheduled.match).toMatchObject({
      status: "unscheduled",
      scheduled_at: null,
      venue: null,
    });

    const { count, error: auditError } = await client
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("entity_type", "matches")
      .eq("entity_key", "GA-01")
      .eq("action", "update")
      .gte("created_at", original.updated_at);

    expect(auditError).toBeNull();
    expect(count).not.toBeNull();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it("rejects stale or invalid updates without orphaning audit records", async () => {
    const { createPrivilegedSupabaseClient } = await import(
      "../supabase/clients"
    );
    const { updateMatchWithVersion } = await import("./mutations");
    const client = createPrivilegedSupabaseClient();
    const { data: original, error } = await client
      .from("matches")
      .select("*")
      .eq("code", "QF1")
      .single();

    expect(error).toBeNull();
    expect(original).not.toBeNull();
    if (!original) {
      throw new Error("Seeded QF1 match is missing.");
    }

    const updated = await updateMatchWithVersion({
      id: original.id,
      expectedUpdatedAt: original.updated_at,
      changes: { label: original.label },
    });

    expect(updated.status).toBe("updated");
    if (updated.status !== "updated") {
      throw new Error("The versioned QF1 update did not succeed.");
    }

    const { count: auditCountBeforeFailure, error: firstAuditError } =
      await client
        .from("audit_log")
        .select("id", { count: "exact", head: true })
        .eq("entity_type", "matches")
        .eq("entity_key", "QF1")
        .eq("action", "update")
        .gte("created_at", original.updated_at);

    expect(firstAuditError).toBeNull();
    expect(auditCountBeforeFailure).not.toBeNull();

    await expect(
      updateMatchWithVersion({
        id: original.id,
        expectedUpdatedAt: updated.match.updated_at,
        changes: { status: "scheduled" },
      }),
    ).rejects.toThrow("Supabase could not update the match.");

    const conflict = await updateMatchWithVersion({
      id: original.id,
      expectedUpdatedAt: original.updated_at,
      changes: { label: original.label },
    });

    expect(conflict.status).toBe("conflict");

    const { count: auditCountAfterFailure, error: auditError } = await client
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("entity_type", "matches")
      .eq("entity_key", "QF1")
      .eq("action", "update")
      .gte("created_at", original.updated_at);

    expect(auditError).toBeNull();
    expect(auditCountAfterFailure).toBe(auditCountBeforeFailure);
    expect(auditCountAfterFailure).toBeGreaterThan(0);
  });
});
