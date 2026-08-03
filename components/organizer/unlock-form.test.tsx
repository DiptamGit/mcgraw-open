import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { UnlockForm } from "./unlock-form";

describe("UnlockForm", () => {
  it("associates generic errors with the PIN field", () => {
    const markup = renderToStaticMarkup(
      <UnlockForm
        errorMessage="Unlock was not accepted. Check the PIN and try again."
        returnTo="/matches"
      />,
    );

    expect(markup).toContain('type="password"');
    expect(markup).toContain('autoComplete="off"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain(
      'aria-describedby="organizer-pin-help organizer-pin-error"',
    );
    expect(markup).toContain('role="alert"');
    expect(markup).not.toContain("court-2026");
  });
});
