import { Check } from "@phosphor-icons/react/dist/ssr";

import {
  buildMatchFilterHref,
  MATCH_GROUP_FILTER_OPTIONS,
  MATCH_STAGE_FILTER_OPTIONS,
  type MatchFilterOption,
  type MatchFilterSelection,
} from "../../lib/matches/presentation";

type MatchFiltersProps = {
  filters: MatchFilterSelection;
  resultCount: number;
};

function FilterChipSet<TValue extends string>({
  legend,
  options,
  selected,
  buildFilters,
}: {
  legend: string;
  options: ReadonlyArray<MatchFilterOption<TValue>>;
  selected: TValue;
  buildFilters: (value: TValue) => MatchFilterSelection;
}) {
  return (
    // The label is an attribute rather than a hidden element: an absolutely
    // positioned `.sr-only` span inside this scroller would be laid out
    // against the sticky bar and widen the page.
    <div className="match-filters__set" role="group" aria-label={legend}>
      {options.map((option) => {
        const isSelected = selected === option.value;

        return (
          <a
            key={option.value}
            href={buildMatchFilterHref(buildFilters(option.value))}
            className="chip"
            aria-current={isSelected ? "true" : undefined}
          >
            {isSelected ? (
              <Check size={14} weight="bold" aria-hidden="true" />
            ) : null}
            <span>{option.label}</span>
          </a>
        );
      })}
    </div>
  );
}

export function MatchFilters({ filters, resultCount }: MatchFiltersProps) {
  return (
    <section className="match-filters" aria-labelledby="match-filters-title">
      <h2 className="sr-only" id="match-filters-title">
        Filter matches
      </h2>
      <div className="page-frame match-filters__inner">
        <div className="match-filters__scroller">
          <FilterChipSet
            legend="Group"
            options={MATCH_GROUP_FILTER_OPTIONS}
            selected={filters.group}
            buildFilters={(group) => ({ ...filters, group })}
          />
          <span className="match-filters__divider" aria-hidden="true" />
          <FilterChipSet
            legend="Stage"
            options={MATCH_STAGE_FILTER_OPTIONS}
            selected={filters.stage}
            buildFilters={(stage) => ({ ...filters, stage })}
          />
        </div>
        <p className="matches-view__count" aria-live="polite">
          <strong className="figure">{resultCount}</strong>{" "}
          {resultCount === 1 ? "match" : "matches"}
        </p>
      </div>
    </section>
  );
}
