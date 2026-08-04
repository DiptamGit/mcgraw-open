import type { KnockoutBracketRounds } from "@/lib/bracket";

import { MatchSummary } from "../matches/match-summary";

type KnockoutBracketProps = {
  rounds: KnockoutBracketRounds;
};

type RoundHeadingProps = {
  eyebrow: string;
  id: string;
  matchCount: number;
  title: string;
};

function RoundHeading({
  eyebrow,
  id,
  matchCount,
  title,
}: RoundHeadingProps) {
  return (
    <header className="bracket-round__heading">
      <div>
        <p className="utility-label">{eyebrow}</p>
        <h2 id={id}>{title}</h2>
      </div>
      <span>
        {matchCount} {matchCount === 1 ? "match" : "matches"}
      </span>
    </header>
  );
}

function BracketMatch({
  match,
}: {
  match: KnockoutBracketRounds["quarterfinals"][number];
}) {
  return (
    <div className="bracket-match">
      <MatchSummary match={match} showBracketSources />
    </div>
  );
}

export function KnockoutBracket({ rounds }: KnockoutBracketProps) {
  const quarterfinalPairs = [
    rounds.quarterfinals.slice(0, 2),
    rounds.quarterfinals.slice(2, 4),
  ];

  return (
    <div
      className="bracket-board"
      role="group"
      aria-label="McGraw Open knockout bracket"
    >
      <section
        className="bracket-round bracket-round--quarterfinals"
        aria-labelledby="quarterfinals-title"
      >
        <RoundHeading
          eyebrow="Round of eight"
          id="quarterfinals-title"
          matchCount={rounds.quarterfinals.length}
          title="Quarterfinals"
        />
        <div className="bracket-round__matches">
          {quarterfinalPairs.map((pair) => (
            <div className="bracket-pair" key={pair[0]?.code}>
              {pair.map((match) => (
                <BracketMatch key={match.id} match={match} />
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
          matchCount={rounds.semifinals.length}
          title="Semifinals"
        />
        <div className="bracket-round__matches">
          {rounds.semifinals.map((match) => (
            <BracketMatch key={match.id} match={match} />
          ))}
        </div>
      </section>

      <section
        className="bracket-round bracket-round--final"
        aria-labelledby="final-title"
      >
        <RoundHeading
          eyebrow="Championship match"
          id="final-title"
          matchCount={rounds.final.length}
          title="Final"
        />
        <div className="bracket-round__matches">
          {rounds.final.map((match) => (
            <BracketMatch key={match.id} match={match} />
          ))}
        </div>
      </section>
    </div>
  );
}
