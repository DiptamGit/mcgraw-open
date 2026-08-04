import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { QuarterfinalAssignmentForm } from "./quarterfinal-assignment-form";

vi.mock("server-only", () => ({}));

describe("QuarterfinalAssignmentForm", () => {
  it("renders a deliberate confirmation action with version data", () => {
    const markup = renderToStaticMarkup(
      <QuarterfinalAssignmentForm
        expectedMatchVersions={[
          {
            match_id: "c1000000-0000-4000-8000-000000000001",
            updated_at: "2026-08-04T17:00:00Z",
          },
          {
            match_id: "c1000000-0000-4000-8000-000000000002",
            updated_at: "2026-08-04T17:00:00Z",
          },
          {
            match_id: "c1000000-0000-4000-8000-000000000003",
            updated_at: "2026-08-04T17:00:00Z",
          },
          {
            match_id: "c1000000-0000-4000-8000-000000000004",
            updated_at: "2026-08-04T17:00:00Z",
          },
        ]}
        expectedStateUpdatedAt="2026-08-04T17:00:00Z"
        initialState={{ status: "idle", message: null }}
      />,
    );

    expect(markup).toContain("What this changes");
    expect(markup).toContain("one transaction");
    expect(markup).toContain('name="expectedMatchVersions"');
    expect(markup).toContain("Assign quarterfinals");
    expect(markup).not.toContain("Confirm quarterfinal assignments");
  });
});
