import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MatchFilters } from "./match-filters";

describe("MatchFilters", () => {
  it("renders selected states and shareable filter links", () => {
    const markup = renderToStaticMarkup(
      <MatchFilters
        filters={{ group: "A", stage: "quarterfinal" }}
        resultCount={0}
      />,
    );

    expect(markup).toContain("0 matches");
    expect(markup).toContain('href="/matches?group=A&amp;stage=quarterfinal"');
    expect(markup).toContain('href="/matches?stage=quarterfinal"');
    expect(markup).toContain('href="/matches?group=A&amp;stage=semifinal"');
    expect(markup.match(/aria-current="true"/g)).toHaveLength(2);
  });

  it("uses a singular result label", () => {
    const markup = renderToStaticMarkup(
      <MatchFilters
        filters={{ group: "all", stage: "final" }}
        resultCount={1}
      />,
    );

    expect(markup).toContain("1 match");
    expect(markup).not.toContain("1 matches");
  });
});
