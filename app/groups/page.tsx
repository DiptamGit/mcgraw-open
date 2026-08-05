import Link from "next/link";

import { StandingsBoard } from "@/components/groups/standings-board";
import { PageIntro } from "@/components/page-intro";
import { hasOrganizerSession } from "@/lib/auth/session";
import { getTournamentData } from "@/lib/data/queries";
import { createPublicPageMetadata } from "@/lib/site-metadata";
import { calculateGroupStandings } from "@/lib/standings/calculate";

export const dynamic = "force-dynamic";

export const metadata = createPublicPageMetadata({
  title: "Group standings",
  description:
    "Live Group A and Group B standings for the 2026 McGraw Open doubles tennis tournament.",
  path: "/groups",
});

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
  const isProvisional =
    !isFinalized && (standings.A.provisional || standings.B.provisional);

  return (
    <>
      <PageIntro
        eyebrow="Round robin"
        title="Groups"
        description={
          isFinalized
            ? "The final group order is locked in for the knockout draw."
            : isProvisional
              ? "While a decisive head-to-head is still unplayed, tied teams are ordered by overall set difference, then game difference."
              : "Two groups. The top four in each advance to the knockout draw."
        }
        badge={
          isFinalized ? "Locked" : isProvisional ? "Live standings" : undefined
        }
        badgeTone={isFinalized ? "locked" : isProvisional ? "live" : undefined}
        badgeDot={isProvisional}
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

          {isFinalized && tournament.state.tie_resolution_note ? (
            <section
              className="standings-tie-note"
              aria-labelledby="tie-note-heading"
            >
              <p className="utility-label">Manual tie resolution</p>
              <h2 id="tie-note-heading">Recorded tiebreak decision</h2>
              <p>{tournament.state.tie_resolution_note}</p>
            </section>
          ) : null}

          <StandingsBoard
            groups={{
              A: {
                standings: standings.A,
                completedMatches: groupMatchCounts.A.filter(
                  (match) => match.status === "completed",
                ).length,
                totalMatches: groupMatchCounts.A.length,
              },
              B: {
                standings: standings.B,
                completedMatches: groupMatchCounts.B.filter(
                  (match) => match.status === "completed",
                ).length,
                totalMatches: groupMatchCounts.B.length,
              },
            }}
            tournamentStatus={tournament.state.group_stage_status}
          />

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
