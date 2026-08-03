import { MatchSummary } from "@/components/matches/match-summary";
import { PageIntro } from "@/components/page-intro";
import { getMatches } from "@/lib/data/queries";
import { partitionMatches } from "@/lib/matches/presentation";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const matches = await getMatches();
  const sections = partitionMatches(matches);

  return (
    <>
      <PageIntro
        eyebrow="Schedule and results"
        title="Matches"
        description="Find the next court time and every completed score."
      />

      <div className="page-content">
        {matches.length === 0 ? (
          <section className="content-panel" aria-labelledby="match-list-empty">
            <p className="utility-label">Tournament fixtures</p>
            <h2 id="match-list-empty">No matches are available yet.</h2>
            <p className="supporting-copy">
              Tournament fixtures will appear here when they are added.
            </p>
          </section>
        ) : (
          <div className="matches-view">
            <p className="matches-view__count" aria-live="polite">
              {matches.length} tournament matches
            </p>

            {sections.fixtures.length > 0 ? (
              <section className="match-section" aria-labelledby="fixtures-title">
                <div className="match-section__heading">
                  <div>
                    <p className="utility-label">Schedule</p>
                    <h2 id="fixtures-title">Fixtures</h2>
                  </div>
                  <span>{sections.fixtures.length} matches</span>
                </div>
                <div className="match-list">
                  {sections.fixtures.map((match) => (
                    <MatchSummary key={match.id} match={match} />
                  ))}
                </div>
              </section>
            ) : null}

            {sections.completed.length > 0 ? (
              <section className="match-section" aria-labelledby="results-title">
                <div className="match-section__heading">
                  <div>
                    <p className="utility-label">Played</p>
                    <h2 id="results-title">Results</h2>
                  </div>
                  <span>{sections.completed.length} matches</span>
                </div>
                <div className="match-list">
                  {sections.completed.map((match) => (
                    <MatchSummary key={match.id} match={match} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
