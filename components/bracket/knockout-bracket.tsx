import { Trophy } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import {
  computeChampionPath,
  type KnockoutBracketRounds,
} from "@/lib/bracket";
import { isKnockoutAssignmentCode } from "@/lib/knockout-assignment";

import { MatchSummary } from "../matches/match-summary";
import { TeamName } from "../matches/team-name";
import { BracketConnectors } from "./bracket-connectors";

type KnockoutBracketProps = {
  isOrganizer?: boolean;
  rounds: KnockoutBracketRounds;
};

type RoundHeadingProps = {
  eyebrow: string;
  id: string;
  meta: string;
  title: string;
};

function RoundHeading({ eyebrow, id, meta, title }: RoundHeadingProps) {
  return (
    <header className="bracket-round__heading">
      <div>
        <p className="utility-label">{eyebrow}</p>
        <h2 id={id}>{title}</h2>
      </div>
      <span>{meta}</span>
    </header>
  );
}

function BracketMatch({
  isFinal = false,
  isOrganizer,
  match,
}: {
  isFinal?: boolean;
  isOrganizer: boolean;
  match: KnockoutBracketRounds["quarterfinals"][number];
}) {
  return (
    <div
      className={`bracket-match${isFinal ? " bracket-match--final" : ""}`}
      data-bracket-node={match.code}
    >
      {isFinal ? <p className="bracket-match__crown">Championship</p> : null}
      <MatchSummary match={match} showBracketSources />
      {isOrganizer && isKnockoutAssignmentCode(match.code) ? (
        <Link
          className="bracket-progression-link"
          href={`/bracket/${encodeURIComponent(match.code)}/assignment`}
        >
          Manage {match.code} teams
        </Link>
      ) : null}
    </div>
  );
}

function ChampionCell({ championName }: { championName: string | null }) {
  return (
    <section className="bracket-champion" aria-labelledby="champion-title">
      <header className="bracket-round__heading">
        <div>
          <p className="utility-label">The trophy</p>
          <h2 id="champion-title">Champion</h2>
        </div>
      </header>
      <div
        className={`bracket-champion__panel${
          championName ? " is-crowned" : ""
        }`}
        data-bracket-node="Champion"
      >
        <Trophy
          className="bracket-champion__icon"
          size={32}
          weight={championName ? "fill" : "regular"}
          aria-hidden="true"
        />
        {championName ? (
          <>
            <p className="utility-label">McGraw Open champion</p>
            <TeamName className="bracket-champion__name" name={championName} />
          </>
        ) : (
          <p className="bracket-champion__waiting">Awaits the final</p>
        )}
      </div>
    </section>
  );
}

export function KnockoutBracket({
  isOrganizer = false,
  rounds,
}: KnockoutBracketProps) {
  const quarterfinalPairs = [
    rounds.quarterfinals.slice(0, 2),
    rounds.quarterfinals.slice(2, 4),
  ];
  const championPath = computeChampionPath(rounds);

  return (
    <div
      className="bracket-board"
      role="group"
      aria-label="McGraw Open knockout bracket"
    >
      <BracketConnectors
        ballRoute={championPath.ballRoute}
        highlightedEdges={championPath.highlightedEdges}
      />

      <section
        className="bracket-round bracket-round--quarterfinals"
        aria-labelledby="quarterfinals-title"
      >
        <RoundHeading
          eyebrow="Round of eight"
          id="quarterfinals-title"
          meta="4 matches"
          title="Quarterfinals"
        />
        <div className="bracket-round__matches">
          {quarterfinalPairs.map((pair) => (
            <div className="bracket-pair" key={pair[0]?.code}>
              {pair.map((match) => (
                <BracketMatch
                  isOrganizer={isOrganizer}
                  key={match.id}
                  match={match}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      <section
        className="bracket-round bracket-round--semifinals"
        aria-labelledby="semifinals-title"
      >
        <RoundHeading
          eyebrow="Last four"
          id="semifinals-title"
          meta="2 matches"
          title="Semifinals"
        />
        <div className="bracket-round__matches">
          {rounds.semifinals.map((match) => (
            <BracketMatch
              isOrganizer={isOrganizer}
              key={match.id}
              match={match}
            />
          ))}
        </div>
      </section>

      <section
        className="bracket-round bracket-round--final"
        aria-labelledby="final-title"
      >
        <RoundHeading
          eyebrow="Title match"
          id="final-title"
          meta="1 match"
          title="Final"
        />
        <div className="bracket-round__matches">
          {rounds.final.map((match) => (
            <BracketMatch
              isFinal
              isOrganizer={isOrganizer}
              key={match.id}
              match={match}
            />
          ))}
        </div>
      </section>

      <ChampionCell championName={championPath.championName} />
    </div>
  );
}
