import Link from "next/link";
import { MatchSummary } from "@/components/matches/match-summary";
import { PageIntro } from "@/components/page-intro";
import { getTournamentData } from "@/lib/data/queries";
import { getUpcomingMatches } from "@/lib/home/presentation";
import { createPublicPageMetadata } from "@/lib/site-metadata";
import { calculateGroupStandings } from "@/lib/standings/calculate";
import { getGroupLeaders } from "@/lib/standings/presentation";

export const dynamic = "force-dynamic";

export const metadata = createPublicPageMetadata({
  title: "McGraw Open 2026",
  description:
    "Schedules, results, and group standings for the 2026 McGraw Open doubles tennis tournament.",
  path: "/",
  absoluteTitle: true,
});

export default async function HomePage() {
  const tournament = await getTournamentData();
  const upcomingMatches = getUpcomingMatches(tournament.matches);
  const groupSummaries = (["A", "B"] as const).map((groupLabel) => {
    const standings = calculateGroupStandings(
      tournament.teams,
      tournament.matches,
      groupLabel,
    );
    const completedMatches = tournament.matches.filter(
      (match) =>
        match.stage === "group" &&
        match.group_label === groupLabel &&
        match.status === "completed",
    ).length;

    return {
      groupLabel,
      leaders: getGroupLeaders(
        standings,
        tournament.state.group_stage_status,
        completedMatches,
      ),
    };
  });

  return (
    <>
      <PageIntro
        eyebrow="August 1 - September 30, 2026"
        title="McGraw Open"
        description="Twelve doubles teams play across two groups for one late-summer title."
        hero
      />

      <div className="page-content">
        <div className="home-view">
          <section className="home-section" aria-labelledby="upcoming-title">
            <header className="home-section__heading">
              <div>
                <p className="utility-label">Next on court</p>
                <h2 id="upcoming-title">Upcoming matches</h2>
              </div>
              <Link href="/matches">View all matches</Link>
            </header>

            {upcomingMatches.length > 0 ? (
              <div className="match-list">
                {upcomingMatches.map((match) => (
                  <MatchSummary key={match.id} match={match} />
                ))}
              </div>
            ) : (
              <div className="home-empty">
                <h3>No matches are scheduled yet.</h3>
                <p>
                  Check the full fixture list for matches awaiting a court time.
                </p>
                <Link href="/matches">See all fixtures</Link>
              </div>
            )}
          </section>

          <section className="home-section" aria-labelledby="leaders-title">
            <header className="home-section__heading">
              <div>
                <p className="utility-label">Group stage</p>
                <h2 id="leaders-title">Current leaders</h2>
              </div>
              <Link href="/groups">View standings</Link>
            </header>

            <div className="home-leader-grid">
              {groupSummaries.map(({ groupLabel, leaders }) => (
                <article
                  className={`home-leader home-leader--${groupLabel.toLowerCase()}`}
                  key={groupLabel}
                >
                  <header>
                    <span
                      className={`group-shield group-shield--${groupLabel.toLowerCase()}`}
                      aria-hidden="true"
                    >
                      {groupLabel}
                    </span>
                    <div>
                      <p className="utility-label">Round robin</p>
                      <h3>Group {groupLabel}</h3>
                    </div>
                  </header>

                  {leaders.length > 0 ? (
                    <>
                      <p className="home-leader__status">
                        {leaders.length === 1 ? "Leader" : "Joint leaders"}
                      </p>
                      <ol>
                        {leaders.map((leader) => (
                          <li key={leader.team.id}>
                            <strong>{leader.team.name}</strong>
                            <span>
                              {leader.wins}{" "}
                              {leader.wins === 1 ? "win" : "wins"} ·{" "}
                              {leader.played} played
                            </span>
                          </li>
                        ))}
                      </ol>
                    </>
                  ) : (
                    <div className="home-leader__empty">
                      <h4>No leader yet.</h4>
                      <p>
                        The first completed result will start the Group{" "}
                        {groupLabel} race.
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>

            <div className="home-bracket-link">
              <p className="utility-label">Knockout stage</p>
              <Link href="/bracket">View the knockout bracket</Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
