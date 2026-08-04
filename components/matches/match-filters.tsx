import { Check } from "@phosphor-icons/react/dist/ssr";

import type {
  MatchFilterSelection,
  MatchGroupFilter,
  MatchStageFilter,
} from "../../lib/matches/presentation";

type MatchFiltersProps = {
  filters: MatchFilterSelection;
  resultCount: number;
};

const groupOptions: ReadonlyArray<{
  label: string;
  value: MatchGroupFilter;
}> = [
  { label: "All groups", value: "all" },
  { label: "Group A", value: "A" },
  { label: "Group B", value: "B" },
];

const stageOptions: ReadonlyArray<{
  label: string;
  value: MatchStageFilter;
}> = [
  { label: "All stages", value: "all" },
  { label: "Group stage", value: "group" },
  { label: "Quarterfinals", value: "quarterfinal" },
  { label: "Semifinals", value: "semifinal" },
  { label: "Final", value: "final" },
];

function getFilterHref(filters: MatchFilterSelection): string {
  const searchParams = new URLSearchParams();

  if (filters.group !== "all") {
    searchParams.set("group", filters.group);
  }

  if (filters.stage !== "all") {
    searchParams.set("stage", filters.stage);
  }

  const query = searchParams.toString();
  return query ? `/matches?${query}` : "/matches";
}

export function MatchFilters({ filters, resultCount }: MatchFiltersProps) {
  const resultLabel = `${resultCount} ${resultCount === 1 ? "match" : "matches"}`;

  return (
    <section className="match-filters" aria-labelledby="match-filters-title">
      <div className="match-filters__heading">
        <div>
          <p className="utility-label">Narrow the draw</p>
          <h2 id="match-filters-title">Filter matches</h2>
        </div>
        <p className="matches-view__count" aria-live="polite">
          {resultLabel}
        </p>
      </div>

      <div className="match-filters__groups">
        <div
          className="match-filter-group"
          role="group"
          aria-labelledby="group-filter-label"
        >
          <p id="group-filter-label">Group</p>
          <div className="match-filter-options">
            {groupOptions.map((option) => {
              const isSelected = filters.group === option.value;

              return (
                <a
                  key={option.value}
                  href={getFilterHref({ ...filters, group: option.value })}
                  className="match-filter-option"
                  aria-current={isSelected ? "true" : undefined}
                >
                  {isSelected ? (
                    <Check size={16} weight="bold" aria-hidden="true" />
                  ) : null}
                  <span>{option.label}</span>
                </a>
              );
            })}
          </div>
        </div>

        <div
          className="match-filter-group"
          role="group"
          aria-labelledby="stage-filter-label"
        >
          <p id="stage-filter-label">Stage</p>
          <div className="match-filter-options">
            {stageOptions.map((option) => {
              const isSelected = filters.stage === option.value;

              return (
                <a
                  key={option.value}
                  href={getFilterHref({ ...filters, stage: option.value })}
                  className="match-filter-option"
                  aria-current={isSelected ? "true" : undefined}
                >
                  {isSelected ? (
                    <Check size={16} weight="bold" aria-hidden="true" />
                  ) : null}
                  <span>{option.label}</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
