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

describe("StandingsTable", () => {
  it("renders a known live table with explicit advancement zones", () => {
    const markup = renderToStaticMarkup(
      <StandingsTable
        completedMatches={15}
        standings={standings()}
        totalMatches={15}
        tournamentStatus="open"
      />,
    );

    expect(markup).toContain("<strong>15</strong> of 15 matches complete");
    expect(markup).toContain("The current order includes all completed results");
    expect(markup).toContain("Team 1 / Partner 1");
    expect(markup).toContain(">+17<");
    expect(markup.match(/>Advancing</g)).toHaveLength(4);
    expect(markup.match(/>Outside top 4</g)).toHaveLength(2);
    expect(markup).toContain('title="Set difference"');
  });

  it("marks an unresolved tie across the cut line without choosing a qualifier", () => {
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

    expect(markup).toContain(">Provisional<");
    expect(markup.match(/>Cut line tie</g)).toHaveLength(2);
    expect(markup.match(/>Advancing</g)).toHaveLength(3);
    expect(markup).toContain("Rank 4: Team 4 / Partner 4, Team 5 / Partner 5");
    expect(markup).toContain(
      "Remaining head-to-head matches may resolve this order.",
    );
  });

  it("presents an unplayed group without choosing an arbitrary top four", () => {
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

    expect(markup.match(/>All tied</g)).toHaveLength(6);
    expect(markup).not.toContain(">Advancing<");
    expect(markup).not.toContain(">Cut line tie<");
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

    expect(markup).toContain(">Finalized<");
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
