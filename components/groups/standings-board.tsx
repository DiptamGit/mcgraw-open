"use client";

import { useState } from "react";

import type { TournamentState } from "@/lib/data/schema";
import type { GroupStandings } from "@/lib/standings/calculate";

import { StandingsTable } from "./standings-table";

type GroupPanel = {
  standings: GroupStandings;
  completedMatches: number;
  totalMatches: number;
};

type StandingsBoardProps = {
  groups: { A: GroupPanel; B: GroupPanel };
  tournamentStatus: TournamentState["group_stage_status"];
};

const GROUP_LABELS = ["A", "B"] as const;

/**
 * Renders both group tables. On phone a chip control chooses which table is
 * shown; both tables stay in the DOM and remain available to assistive
 * technology, and at 900px and above both appear side by side without chips.
 */
export function StandingsBoard({
  groups,
  tournamentStatus,
}: StandingsBoardProps) {
  const [active, setActive] = useState<(typeof GROUP_LABELS)[number]>("A");

  return (
    <div className="standings-board" data-active-group={active}>
      <div
        className="standings-board__switch"
        role="group"
        aria-label="Choose a group to view"
      >
        {GROUP_LABELS.map((label) => {
          const isActive = active === label;

          return (
            <button
              className="chip"
              key={label}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActive(label)}
            >
              <span
                className={`group-shield group-shield--sm group-shield--${label.toLowerCase()}`}
                aria-hidden="true"
              >
                {label}
              </span>
              <span>Group {label}</span>
            </button>
          );
        })}
      </div>

      <div className="standings-board__panels">
        {GROUP_LABELS.map((label) => (
          <div
            className="standings-board__panel"
            data-group={label}
            data-active={active === label ? "true" : "false"}
            key={label}
          >
            <StandingsTable
              completedMatches={groups[label].completedMatches}
              standings={groups[label].standings}
              totalMatches={groups[label].totalMatches}
              tournamentStatus={tournamentStatus}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
