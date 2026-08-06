import Link from "next/link";

import { CourtDevice } from "@/components/court-device";
import { BracketTeaser } from "@/components/home/bracket-teaser";
import { NextOnCourt } from "@/components/home/next-on-court";
import { RulesFormat } from "@/components/home/rules-format";
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
  const nextMatch = getUpcomingMatches(tournament.matches)[0] ?? null;
  const groupCount = new Set(
    tournament.teams.map((team) => team.group_label),
  ).size;
  const stats = [
    {
      key: "teams",
      value: tournament.teams.length,
      label: "Teams",
      accent: true,
    },
    { key: "groups", value: groupCount, label: "Groups", accent: false },
    {
      key: "matches",
      value: tournament.matches.length,
      label: "Matches",
      accent: false,
    },
    { key: "title", value: 1, label: "Title", accent: true },
  ];
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
      <header className="home-hero">
        <CourtDevice />
        <div className="page-frame home-hero__inner">
          <div className="home-hero__intro">
            <p className="home-hero__eyebrow">August 1 – September 30, 2026</p>
            <h1 className="home-hero__headline">
              Nine to five.{" "}
              <span className="home-hero__break">
                Then they <span className="home-hero__accent">serve.</span>
              </span>
            </h1>
            <p className="home-hero__subhead">
              Twelve doubles teams. Two groups. One late-summer title decided
              under the lights.
            </p>
            <div className="home-hero__actions">
              <Link className="btn btn--volt" href="/bracket">
                View the bracket
              </Link>
              <Link className="btn btn--outline" href="/matches">
                Full schedule
              </Link>
            </div>
          </div>

          <NextOnCourt match={nextMatch} />
        </div>
      </header>

      <div className="page-content">
        <div className="home-view">
          <section className="home-stats" aria-label="Tournament at a glance">
            {stats.map((stat) => (
              <div className="home-stat" key={stat.key}>
                <span
                  className={`home-stat__value${
                    stat.accent ? " home-stat__value--accent" : ""
                  }`}
                >
                  {stat.value}
                </span>
                <span className="home-stat__label">{stat.label}</span>
              </div>
            ))}
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
          </section>

          <BracketTeaser />

          <RulesFormat />
        </div>
      </div>
    </>
  );
}
