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

    expect(markup).toContain(">0</strong> matches");
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

    expect(markup).toContain(">1</strong> match<");
    expect(markup).not.toContain("match<span");
  });

  it("labels both chip groups and keeps every stage reachable", () => {
    const markup = renderToStaticMarkup(
      <MatchFilters filters={{ group: "all", stage: "all" }} resultCount={37} />,
    );

    expect(markup).toContain('role="group" aria-label="Group"');
    expect(markup).toContain('role="group" aria-label="Stage"');
    expect(markup).toContain("Quarterfinals");
    expect(markup).toContain("Semifinals");
    expect(markup).toContain(">Final<");
    // Every chip is a plain link, so a shared filter URL restores the view.
    expect(markup.match(/class="chip"/g)).toHaveLength(8);
  });
});
