import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(), from: vi.fn(), count: vi.fn(), preview: vi.fn(),
}));
vi.mock("../supabase/clients", () => ({
  createPrivilegedSupabaseClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
vi.mock("./knockout-2026", () => ({
  createReconciliationPreview: mocks.preview,
}));
import { applyKnockoutReconciliation, previewKnockoutReconciliation, ReconciliationConflictError } from "./server";
import type { TournamentSnapshot } from "../data/schema";

const snapshot: TournamentSnapshot = {
  teams: [], matches: [],
  state: {
    id: 1, group_stage_status: "open", groups_finalized_at: null,
    tie_resolution_note: null, updated_at: "2026-10-15T02:00:00Z",
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  const chain = {
    select: () => chain,
    eq: (...args: string[]) => args[0] === "entity_key" ? mocks.count() : chain,
  };
  mocks.from.mockReturnValue(chain);
  mocks.rpc.mockResolvedValue({ data: snapshot, error: null });
  mocks.count.mockResolvedValue({ count: 0, error: null });
  mocks.preview.mockReturnValue({ expectedSnapshot: snapshot });
});

describe("server-only reconciliation boundary", () => {
  it("checks history and validates snapshot evidence before returning a preview", async () => {
    await expect(previewKnockoutReconciliation()).resolves.toEqual({ expectedSnapshot: snapshot });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("get_tournament_snapshot");
    expect(mocks.preview).toHaveBeenCalledExactlyOnceWith(snapshot);
  });

  it("does not accept unknown history counts, audit errors, or an existing reconciliation", async () => {
    mocks.count.mockResolvedValueOnce({ count: null, error: null });
    await expect(previewKnockoutReconciliation()).rejects.toThrow("history count");
    mocks.count.mockResolvedValueOnce({ count: null, error: { code: "XX000" } });
    await expect(previewKnockoutReconciliation()).rejects.toThrow("history");
    mocks.count.mockResolvedValueOnce({ count: 1, error: null });
    await expect(previewKnockoutReconciliation()).rejects.toBeInstanceOf(ReconciliationConflictError);
    expect(mocks.preview).not.toHaveBeenCalled();
  });

  it("passes only the reviewed snapshot to the atomic RPC", async () => {
    await expect(applyKnockoutReconciliation(snapshot)).resolves.toEqual(snapshot);
    expect(mocks.preview).toHaveBeenCalledExactlyOnceWith(snapshot);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("reconcile_2026_knockout", {
      p_expected_snapshot: snapshot,
    });
  });

  it("surfaces SQL conflicts and unknown database failures explicitly", async () => {
    for (const message of ["RECONCILIATION_CONFLICT", "RECONCILIATION_ALREADY_APPLIED", "RECONCILIATION_IDENTITIES_INVALID"]) {
      mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "P0001", message } });
      await expect(applyKnockoutReconciliation(snapshot)).rejects.toBeInstanceOf(ReconciliationConflictError);
    }
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "08006", message: "database unavailable" } });
    await expect(applyKnockoutReconciliation(snapshot)).rejects.toThrow("Could not apply");
  });
});
