import { MatchFilters } from "@/components/matches/match-filters";
import { MatchSummary } from "@/components/matches/match-summary";
import { PageIntro } from "@/components/page-intro";
import { hasOrganizerSession } from "@/lib/auth/session";
import { getTournamentData } from "@/lib/data/queries";
import type { TournamentMatch } from "@/lib/data/schema";
import {
  describeActiveMatchFilters,
  organizeMatches,
  parseMatchFilters,
  type MatchFilterSelection,
  type MatchSearchParams,
} from "@/lib/matches/presentation";
import {
  getResultEditability,
  type ResultEditability,
} from "@/lib/matches/result";
import { createPublicPageMetadata } from "@/lib/site-metadata";

export const dynamic = "force-dynamic";

export const metadata = createPublicPageMetadata({
  title: "Matches",
  description:
    "View McGraw Open match schedules, court locations, results, and scores.",
  path: "/matches",
});

type MatchesPageProps = {
  searchParams: Promise<MatchSearchParams>;
};

type MatchSectionProps = {
  canSchedule: boolean;
  id: string;
  eyebrow: string;
  title: string;
  matches: TournamentMatch[];
  resultEditability: Map<string, ResultEditability>;
};

function MatchSection({
  canSchedule,
  id,
  eyebrow,
  title,
  matches,
  resultEditability,
}: MatchSectionProps) {
  if (matches.length === 0) {
    return null;
  }

  return (
    <section className="match-section" aria-labelledby={id}>
      <div className="match-section__heading">
        <p className="utility-label">{eyebrow}</p>
        <h2 className="match-section__title" id={id}>
          {title}
        </h2>
        <span className="match-section__count">
          <span className="figure">{matches.length}</span>{" "}
          {matches.length === 1 ? "match" : "matches"}
        </span>
      </div>
      <div className="match-list">
        {matches.map((match) => (
          <MatchSummary
            canSchedule={canSchedule}
            key={match.id}
            match={match}
            resultEditability={resultEditability.get(match.id)}
          />
        ))}
      </div>
    </section>
  );
}

function FilteredEmptyState({ filters }: { filters: MatchFilterSelection }) {
  const activeFilters = describeActiveMatchFilters(filters);

  return (
    <section
      className="content-panel match-filter-empty"
      aria-labelledby="match-filter-empty-title"
    >
      <p className="utility-label">No results</p>
      <h2 id="match-filter-empty-title">No matches match these filters.</h2>
      <p className="supporting-copy">
        {activeFilters.length > 0 ? (
          <>
            Nothing is listed under{" "}
            <strong>{activeFilters.join(" and ")}</strong>. Clear the filters to
            see every fixture.
          </>
        ) : (
          <>Clear the filters to see every fixture.</>
        )}
      </p>
      <a className="btn btn--volt" href="/matches">
        Show all matches
      </a>
    </section>
  );
}

export default async function MatchesPage({
  searchParams,
}: MatchesPageProps) {
  const [tournament, resolvedSearchParams, canSchedule] = await Promise.all([
    getTournamentData(),
    searchParams,
    hasOrganizerSession(),
  ]);
  const { matches } = tournament;
  const filters = parseMatchFilters(resolvedSearchParams);
  const sections = organizeMatches(matches, filters);
  const resultEditability = new Map(
    canSchedule
      ? matches.map((match) => [
          match.id,
          getResultEditability(match, matches, tournament.state),
        ])
      : [],
  );
  const filteredMatchCount =
    sections.scheduled.length +
    sections.unscheduled.length +
    sections.completed.length;

  return (
    <>
      <PageIntro
        eyebrow="Schedule and results"
        title="Matches"
        description="Find the next court time and every completed score."
      />

      {matches.length === 0 ? (
        <div className="page-content">
          <section className="content-panel" aria-labelledby="match-list-empty">
            <p className="utility-label">Tournament fixtures</p>
            <h2 id="match-list-empty">No matches are available yet.</h2>
            <p className="supporting-copy">
              Tournament fixtures will appear here when they are added.
            </p>
          </section>
        </div>
      ) : (
        <>
          <MatchFilters filters={filters} resultCount={filteredMatchCount} />

          <div className="page-content matches-view">
            {filteredMatchCount === 0 ? (
              <FilteredEmptyState filters={filters} />
            ) : (
              <>
                <MatchSection
                  canSchedule={canSchedule}
                  id="scheduled-title"
                  eyebrow="Next on court"
                  title="Scheduled"
                  matches={sections.scheduled}
                  resultEditability={resultEditability}
                />
                <MatchSection
                  canSchedule={canSchedule}
                  id="unscheduled-title"
                  eyebrow="Awaiting a time"
                  title="Unscheduled"
                  matches={sections.unscheduled}
                  resultEditability={resultEditability}
                />
                <MatchSection
                  canSchedule={canSchedule}
                  id="completed-title"
                  eyebrow="Played"
                  title="Completed"
                  matches={sections.completed}
                  resultEditability={resultEditability}
                />
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
