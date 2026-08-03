import Link from "next/link";

import { StandingsTable } from "@/components/groups/standings-table";
import { PageIntro } from "@/components/page-intro";
import { hasOrganizerSession } from "@/lib/auth/session";
import { getTournamentData } from "@/lib/data/queries";
import { calculateGroupStandings } from "@/lib/standings/calculate";

export const dynamic = "force-dynamic";

type GroupsPageProps = {
  searchParams: Promise<{ transition?: string }>;
};

export default async function GroupsPage({
  searchParams,
}: GroupsPageProps) {
  const [tournament, isOrganizer, query] = await Promise.all([
    getTournamentData(),
    hasOrganizerSession(),
    searchParams,
  ]);
  const standings = {
    A: calculateGroupStandings(tournament.teams, tournament.matches, "A"),
    B: calculateGroupStandings(tournament.teams, tournament.matches, "B"),
  };
  const groupMatchCounts = {
    A: tournament.matches.filter(
      (match) => match.stage === "group" && match.group_label === "A",
    ),
    B: tournament.matches.filter(
      (match) => match.stage === "group" && match.group_label === "B",
    ),
  };
  const isFinalized = tournament.state.group_stage_status === "finalized";

  return (
    <>
      <PageIntro
        eyebrow="Round robin"
        title="Groups"
        description="Live tables and the road to the top four in each group."
        badge={isFinalized ? "Finalized" : "Live standings"}
      />

      <div className="page-content">
        <div className="groups-view">
          {query.transition === "finalized" ||
          query.transition === "reopened" ? (
            <div
              className="form-feedback form-feedback--success"
              role="status"
              aria-live="polite"
            >
              <p>
                {query.transition === "finalized"
                  ? "Groups finalized. Group results and ranks are now locked."
                  : "Groups reopened. Standings are live and group-result corrections are available."}
              </p>
            </div>
          ) : null}

          <section
            className="standings-overview"
            aria-labelledby="group-play"
          >
            <p className="utility-label">Group stage</p>
            <h2 id="group-play">Two groups. Four advance from each.</h2>
            <p>
              {isFinalized
                ? "The group order is locked for the knockout draw."
                : "Standings update as completed results are recorded. The top-four rail marks the current qualifying places."}
            </p>
            {isFinalized && tournament.state.tie_resolution_note ? (
              <p>
                <strong>Tie resolution:</strong>{" "}
                {tournament.state.tie_resolution_note}
              </p>
            ) : null}
          </section>

          <div className="standings-grid">
            {(["A", "B"] as const).map((groupLabel) => {
              const matches = groupMatchCounts[groupLabel];

              return (
                <StandingsTable
                  completedMatches={
                    matches.filter((match) => match.status === "completed")
                      .length
                  }
                  key={groupLabel}
                  standings={standings[groupLabel]}
                  totalMatches={matches.length}
                  tournamentStatus={tournament.state.group_stage_status}
                />
              );
            })}
          </div>

          {isOrganizer ? (
            <section
              className="group-organizer-actions"
              aria-labelledby="group-organizer-heading"
            >
              <p className="utility-label">Organizer action</p>
              <h2 id="group-organizer-heading">
                {isFinalized
                  ? "Need to correct a group result?"
                  : "Ready to close group play?"}
              </h2>
              <p>
                {isFinalized
                  ? "Reopening clears locked ranks and allows score corrections. It is unavailable after a quarterfinal is scheduled or completed."
                  : "Finalization requires every group result, snapshots both tables, and locks group score editing."}
              </p>
              <Link
                className={
                  isFinalized
                    ? "group-action-link group-action-link--destructive"
                    : "group-action-link"
                }
                href={isFinalized ? "/groups/reopen" : "/groups/finalize"}
              >
                {isFinalized ? "Review reopening" : "Review final ranks"}
              </Link>
            </section>
          ) : null}

          <aside
            className="standings-tiebreak-guide"
            aria-labelledby="tiebreak-order"
          >
            <p className="utility-label">How ties are ranked</p>
            <h2 id="tiebreak-order">Wins lead. Head-to-head breaks ties.</h2>
            <p>
              Two-team ties use the head-to-head result. Ties among three or
              more teams use results between those tied teams: wins, then set
              difference, then game difference. Overall set and game
              difference follow when needed.
            </p>
            <p>
              If required head-to-head matches are still unplayed, the order is
              marked provisional.
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}
