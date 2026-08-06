import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { Fragment } from "react";

type RulesSegment = string | { figure: string };

type RulesCategory = {
  id: string;
  title: string;
  defaultOpen: boolean;
  paragraphs: RulesSegment[][];
};

/**
 * Static, verbatim tournament copy. This is fixed repository content, never
 * tournament data, a query, or an editable record. Segments flagged as
 * `figure` render in the mono type with tabular figures.
 */
const RULES_CATEGORIES: readonly RulesCategory[] = [
  {
    id: "tournament-format",
    title: "Tournament format",
    defaultOpen: true,
    paragraphs: [
      [
        "Twelve teams, two groups of six. Every team plays every other in its group once — a full round robin. The top four from each group reach the quarterfinals: A1 vs B4, A2 vs B3, A3 vs B2, A4 vs B1. Quarterfinal winners are drawn into the semifinals by lottery.",
      ],
    ],
  },
  {
    id: "match-rules",
    title: "Match rules",
    defaultOpen: false,
    paragraphs: [
      [
        "Every match is best of three sets. The first two sets use a standard 7-point tiebreak at ",
        { figure: "6–6" },
        ". The deciding set is a full set or a 10-point match tiebreak — the two teams agree on match day — and either way it counts as one set. Receiving position is fixed for a set: whoever receives in the deuce (right) court takes every deuce-court return that set, switching only at the start of a new set. Change ends after every odd game; between sets, stay on the same side when the previous set ended on an even game total (",
        { figure: "6–4" },
        ", ",
        { figure: "6–2" },
        ", ",
        { figure: "7–5" },
        "); in a match tiebreak, change ends at ",
        { figure: "1, 5, 9, 13" },
        "…",
      ],
    ],
  },
  {
    id: "starting-the-match",
    title: "Starting the match",
    defaultOpen: false,
    paragraphs: [
      [
        "Before the warm-up, spin a racquet or toss a coin. The winner picks one — serve or receive, which end to start on, or defer the choice to the opponent, who can't defer back. The other team takes whatever choice is left.",
      ],
    ],
  },
];

/**
 * The Home "Rules & format" section: static repository copy rendered as a
 * native `<details>/<summary>` accordion with the first category open. The
 * caret indicates open/closed state only and flips instantly, so the section
 * adds nothing to the motion budget and stays legible under reduced motion.
 */
export function RulesFormat() {
  return (
    <section
      className="home-section home-rules"
      id="rules"
      aria-labelledby="rules-title"
    >
      <header className="home-section__heading">
        <div>
          <p className="utility-label">Know before you play</p>
          <h2 id="rules-title">Rules &amp; format</h2>
        </div>
      </header>

      <div className="rules-accordion">
        {RULES_CATEGORIES.map((category) => (
          <details
            className="rules-item"
            key={category.id}
            open={category.defaultOpen}
          >
            <summary className="rules-summary">
              <h3 className="rules-summary__title">{category.title}</h3>
              <CaretDown
                className="rules-caret"
                size={18}
                weight="bold"
                aria-hidden="true"
              />
            </summary>
            <div className="rules-body">
              {category.paragraphs.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex}>
                  {paragraph.map((segment, segmentIndex) =>
                    typeof segment === "string" ? (
                      <Fragment key={segmentIndex}>{segment}</Fragment>
                    ) : (
                      <span className="rules-figure" key={segmentIndex}>
                        {segment.figure}
                      </span>
                    ),
                  )}
                </p>
              ))}
            </div>
          </details>
        ))}
      </div>

      <p className="rules-closing">
        Play hard. Have fun. Questions? Contact Srini or Shishir.
      </p>
    </section>
  );
}
