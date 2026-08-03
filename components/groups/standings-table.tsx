import { DataIntegrityError } from "@/lib/data/errors";
import type { TournamentState } from "@/lib/data/schema";
import type {
  GroupStandings,
  StandingRow,
  UnresolvedTie,
} from "@/lib/standings/calculate";
import { getDisplayedStandingsRows } from "@/lib/standings/presentation";

type StandingsTableProps = {
  standings: GroupStandings;
  tournamentStatus: TournamentState["group_stage_status"];
  completedMatches: number;
  totalMatches: number;
};

type StandingsState = "finalized" | "provisional" | "live" | "unresolved";

function formatDifference(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function getStandingsState(
  standings: GroupStandings,
  tournamentStatus: TournamentState["group_stage_status"],
): StandingsState {
  if (tournamentStatus === "finalized") {
    return "finalized";
  }
  if (standings.provisional) {
    return "provisional";
  }
  if (standings.unresolvedTies.length > 0) {
    return "unresolved";
  }
  return "live";
}

function getStateCopy(
  state: StandingsState,
  completedMatches: number,
): { label: string; description: string } {
  if (state === "finalized") {
    return {
      label: "Finalized",
      description: "These are the locked group-stage ranks.",
    };
  }
  if (completedMatches === 0) {
    return {
      label: "Provisional",
      description:
        "No results yet. Every team begins level and the order will change as matches finish.",
    };
  }
  if (state === "provisional") {
    return {
      label: "Provisional",
      description:
        "A required head-to-head result is incomplete, so tied teams use overall set and game difference for now.",
    };
  }
  if (state === "unresolved") {
    return {
      label: "Unresolved tie",
      description:
        "The completed results and every automatic tiebreak still leave teams level.",
    };
  }
  return {
    label: "Live",
    description:
      "The current order includes all completed results and the required tiebreak data.",
  };
}

function getTieNames(
  tie: UnresolvedTie,
  rows: StandingRow[],
): string[] {
  const teamsById = new Map(rows.map((row) => [row.team.id, row.team.name]));
  const names = tie.teamIds.map((teamId) => teamsById.get(teamId));

  if (names.some((name) => name === undefined)) {
    throw new DataIntegrityError(
      "Standings contain an unresolved tie for an unknown team.",
    );
  }

  return names.filter((name): name is string => name !== undefined);
}

export function StandingsTable({
  standings,
  tournamentStatus,
  completedMatches,
  totalMatches,
}: StandingsTableProps) {
  const { groupLabel } = standings;
  const groupId = `group-${groupLabel.toLowerCase()}`;
  const state = getStandingsState(standings, tournamentStatus);
  const stateCopy = getStateCopy(state, completedMatches);
  const rows = getDisplayedStandingsRows(standings, tournamentStatus);
  const cutLineTieTeamIds = new Set(
    standings.unresolvedTies
      .filter(
        (tie) =>
          tie.rank <= 4 && tie.rank + tie.teamIds.length - 1 > 4,
      )
      .flatMap((tie) => tie.teamIds),
  );
  const visibleTies =
    tournamentStatus === "finalized" ? [] : standings.unresolvedTies;
  const isAllUnplayed = completedMatches === 0;

  return (
    <section
      className={`standings-group standings-group--${groupLabel.toLowerCase()}`}
      aria-labelledby={`${groupId}-title`}
    >
      <header className="standings-group__header">
        <div className="standings-group__identity">
          <span className="group-shield" aria-hidden="true">
            {groupLabel}
          </span>
          <div>
            <p className="utility-label">Round robin</p>
            <h2 id={`${groupId}-title`}>Group {groupLabel}</h2>
          </div>
        </div>
        <p className="standings-group__progress">
          <strong>{completedMatches}</strong> of {totalMatches} matches complete
        </p>
      </header>

      <div className={`standings-state standings-state--${state}`}>
        <span className="standings-state__label">{stateCopy.label}</span>
        <p>{stateCopy.description}</p>
      </div>

      {rows.length === 0 ? (
        <div className="standings-empty">
          <h3>No teams are assigned to Group {groupLabel}.</h3>
          <p>The standings table will appear when the group roster is added.</p>
        </div>
      ) : (
        <>
          <div
            className="standings-table-region"
            role="region"
            aria-label={`Group ${groupLabel} standings table`}
            tabIndex={0}
          >
            <table className="standings-table">
              <caption className="sr-only">
                Group {groupLabel} standings. P is played, W is wins, L is
                losses, sets is set difference, and games is game difference.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Team</th>
                  <th scope="col">
                    <abbr title="Played">P</abbr>
                  </th>
                  <th scope="col">
                    <abbr title="Wins">W</abbr>
                  </th>
                  <th scope="col">
                    <abbr title="Losses">L</abbr>
                  </th>
                  <th scope="col">
                    <abbr title="Set difference">Sets</abbr>
                  </th>
                  <th scope="col">
                    <abbr title="Game difference">Games</abbr>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const isCutLineTie = cutLineTieTeamIds.has(row.team.id);
                  const isAdvancing = index < 4 && !isCutLineTie;
                  const zoneLabel = isAllUnplayed
                    ? "All tied"
                    : isCutLineTie
                    ? "Cut line tie"
                    : isAdvancing
                      ? "Advancing"
                      : tournamentStatus === "finalized"
                        ? "Eliminated"
                        : "Outside top 4";

                  return (
                    <tr
                      className={
                        isAllUnplayed
                          ? "standings-row standings-row--unplayed"
                          : isCutLineTie
                          ? "standings-row standings-row--cut-line"
                          : isAdvancing
                            ? "standings-row standings-row--advancing"
                            : "standings-row standings-row--outside"
                      }
                      key={row.team.id}
                    >
                      <td>{row.rank}</td>
                      <th scope="row">
                        <span className="standings-table__team-name">
                          {row.team.name}
                        </span>
                        <span className="standings-table__zone">
                          {zoneLabel}
                        </span>
                      </th>
                      <td>{row.played}</td>
                      <td>{row.wins}</td>
                      <td>{row.losses}</td>
                      <td>{formatDifference(row.setDifference)}</td>
                      <td>{formatDifference(row.gameDifference)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {visibleTies.length > 0 ? (
            <div className="standings-ties" role="status">
              <h3>
                {completedMatches === 0
                  ? "All positions are currently tied"
                  : "Ties to watch"}
              </h3>
              <ul>
                {visibleTies.map((tie) => (
                  <li key={`${tie.rank}-${tie.teamIds.join("-")}`}>
                    Rank {tie.rank}: {getTieNames(tie, rows).join(", ")}
                  </li>
                ))}
              </ul>
              <p>
                {standings.provisional
                  ? "Remaining head-to-head matches may resolve this order."
                  : "Automatic tiebreaks cannot separate these teams."}
              </p>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
