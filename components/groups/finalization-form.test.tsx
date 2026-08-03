import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { FinalizationPreview } from "@/lib/groups/finalization";
import {
  createFinalizationFormState,
} from "@/lib/groups/finalization";
import { FinalizationForm } from "./finalization-form";

vi.mock("server-only", () => ({}));

const timestamp = "2026-08-03T18:00:00Z";
const alpha = "a0000001-0000-4000-8000-000000000001";
const bravo = "a0000002-0000-4000-8000-000000000002";
const tieKey = `A-1-${alpha}-${bravo}`;

const preview: FinalizationPreview = {
  groups: [
    {
      groupLabel: "A",
      rows: [
        {
          teamId: alpha,
          teamName: "Alpha",
          automaticRank: 1,
          tieKey,
        },
        {
          teamId: bravo,
          teamName: "Bravo",
          automaticRank: 1,
          tieKey,
        },
      ],
    },
    {
      groupLabel: "B",
      rows: [],
    },
  ],
  ties: [
    {
      key: tieKey,
      groupLabel: "A",
      rank: 1,
      teamIds: [alpha, bravo],
    },
  ],
  completedMatches: 1,
  totalMatches: 1,
  allMatchesComplete: true,
  expectedMatchVersions: [
    {
      match_id: "c0000001-0000-4000-8000-000000000001",
      updated_at: timestamp,
    },
  ],
};

describe("FinalizationForm", () => {
  it("renders a complete preview with explicit tie controls and rationale", () => {
    const markup = renderToStaticMarkup(
      <FinalizationForm
        expectedStateUpdatedAt={timestamp}
        initialState={createFinalizationFormState(preview)}
        preview={preview}
      />,
    );

    expect(markup).toContain("Locked rank preview");
    expect(markup).toContain("Manual tie order");
    expect(markup).toContain('aria-label="Move Alpha up"');
    expect(markup).toContain('aria-label="Move Bravo down"');
    expect(markup).toContain("Tie-resolution reason (required)");
    expect(markup).toContain("Finalize groups");
  });
});
