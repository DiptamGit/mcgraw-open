import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { Team } from "@/lib/data/schema";
import type {
  GroupStandings,
  StandingRow,
} from "@/lib/standings/calculate";

import { StandingsTable } from "./standings-table";

function team(index: number, finalRank: number | null = null): Team {
  return {
    id: `a000000${index}-0000-4000-8000-00000000000${index}`,
    name: `Team ${index} / Partner ${index}`,
    group_label: "A",
    final_rank: finalRank,
  };
}

function row(
  index: number,
  overrides: Partial<StandingRow> = {},
): StandingRow {
  return {
    rank: index,
    team: team(index),
    played: 5,
    wins: 6 - index,
    losses: index - 1,
    setsFor: 8,
    setsAgainst: index,
    setDifference: 8 - index,
    gamesFor: 48,
    gamesAgainst: 30 + index,
    gameDifference: 18 - index,
    ...overrides,
  };
}

function standings(
  overrides: Partial<GroupStandings> = {},
): GroupStandings {
  return {
    groupLabel: "A",
    rows: [1, 2, 3, 4, 5, 6].map((index) => row(index)),
    provisional: false,
    unresolvedTies: [],
    ...overrides,
  };
}

function countMatches(markup: string, pattern: RegExp): number {
  return markup.match(pattern)?.length ?? 0;
}

describe("StandingsTable", () => {
  it("renders a live table with a compact badge and advancing rails", () => {
    const markup = renderToStaticMarkup(
      <StandingsTable
        completedMatches={15}
        standings={standings()}
        totalMatches={15}
        tournamentStatus="open"
      />,
    );

    expect(markup).toContain('<strong class="figure">15</strong> of ');
    expect(markup).toContain("</span> complete");
    expect(markup).toContain("status-badge--live");
    expect(markup).toContain("status-badge__dot");
    expect(markup).toContain(">Live<");
    expect(markup).toContain("Team 1 / Partner 1");
    expect(markup).toContain(">+17<");
    expect(markup).toContain('title="Set difference"');
    expect(countMatches(markup, /standings-table__zone--in/g)).toBe(4);
    expect(countMatches(markup, /standings-table__zone--out/g)).toBe(2);
    expect(markup).toContain("standings-row--leader");
    expect(markup).toContain("standings-row--cut");
  });

  it("marks a cut-line tie without choosing a qualifier", () => {
    const fourth = row(4);
    const fifth = row(5, { rank: 4 });
    const markup = renderToStaticMarkup(
      <StandingsTable
        completedMatches={6}
        standings={standings({
          rows: [row(1), row(2), row(3), fourth, fifth],
          provisional: true,
          unresolvedTies: [
            {
              rank: 4,
              teamIds: [fourth.team.id, fifth.team.id],
            },
          ],
        })}
        totalMatches={15}
        tournamentStatus="open"
      />,
    );

    expect(markup).toContain("status-badge--warning");
    expect(markup).toContain(">Cut-line tie<");
    expect(countMatches(markup, /standings-table__zone--tie/g)).toBe(2);
    expect(countMatches(markup, /standings-table__zone--in/g)).toBe(3);
    expect(markup).toContain("Rank 4: Team 4 / Partner 4, Team 5 / Partner 5");
    expect(markup).toContain(
      "Remaining head-to-head matches may resolve this order.",
    );
  });

  it("presents an unplayed group without an arbitrary top four", () => {
    const rows = [1, 2, 3, 4, 5, 6].map((index) =>
      row(index, {
        rank: 1,
        played: 0,
        wins: 0,
        losses: 0,
        setsFor: 0,
        setsAgainst: 0,
        setDifference: 0,
        gamesFor: 0,
        gamesAgainst: 0,
        gameDifference: 0,
      }),
    );
    const markup = renderToStaticMarkup(
      <StandingsTable
        completedMatches={0}
        standings={standings({
          rows,
          provisional: true,
          unresolvedTies: [
            { rank: 1, teamIds: rows.map((standing) => standing.team.id) },
          ],
        })}
        totalMatches={15}
        tournamentStatus="open"
      />,
    );

    expect(countMatches(markup, />All tied</g)).toBe(6);
    expect(markup).toContain(">Live<");
    expect(markup).not.toContain(">Advancing<");
    expect(markup).not.toContain(">Cut-line tie<");
    expect(markup).not.toContain("standings-row--leader");
    expect(markup).toContain("All positions are currently tied");
  });

  it("uses locked final ranks and labels eliminated teams when finalized", () => {
    const rows = [1, 2, 3, 4, 5, 6].map((index) =>
      row(index, { team: team(index, 7 - index) }),
    );
    const markup = renderToStaticMarkup(
      <StandingsTable
        completedMatches={15}
        standings={standings({ rows })}
        totalMatches={15}
        tournamentStatus="finalized"
      />,
    );

    expect(markup).toContain(">Locked<");
    expect(markup).toContain("status-badge--locked");
    expect(markup.indexOf("Team 6 / Partner 6")).toBeLessThan(
      markup.indexOf("Team 1 / Partner 1"),
    );
    expect(markup).toContain(">Eliminated<");
  });

  it("rejects incomplete finalized rank snapshots", () => {
    expect(() =>
      renderToStaticMarkup(
        <StandingsTable
          completedMatches={15}
          standings={standings()}
          totalMatches={15}
          tournamentStatus="finalized"
        />,
      ),
    ).toThrow("Finalized standings are missing a complete set of group ranks.");
  });
});
