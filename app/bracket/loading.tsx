import {
  LoadingAnnouncement,
  SkeletonBlock,
} from "@/components/feedback/skeletons";
import { PageIntro } from "@/components/page-intro";

const loadingRounds = [
  {
    className: "bracket-round--quarterfinals",
    eyebrow: "Round of eight",
    matchCount: 4,
    title: "Quarterfinals",
  },
  {
    className: "bracket-round--semifinals",
    eyebrow: "Last four",
    matchCount: 2,
    title: "Semifinals",
  },
  {
    className: "bracket-round--final",
    eyebrow: "Title match",
    matchCount: 1,
    title: "Final",
  },
] as const;

function LoadingMatch() {
  return (
    <div className="bracket-match">
      <div className="skeleton-match">
        <SkeletonBlock className="skeleton--label" width="6rem" />
        <SkeletonBlock className="skeleton--title" width="82%" />
        <SkeletonBlock className="skeleton--title" width="72%" />
        <SkeletonBlock className="skeleton--line" width="55%" />
      </div>
    </div>
  );
}

export default function BracketLoading() {
  return (
    <>
      <PageIntro
        eyebrow="Knockout stage"
        title="Bracket"
        description="Four quarterfinals lead to one McGraw Open champion."
      />

      <div className="page-content">
        <LoadingAnnouncement label="Loading the knockout bracket." />
        <div className="bracket-board" aria-hidden="true">
          {loadingRounds.map((round) => (
            <section
              className={`bracket-round ${round.className}`}
              key={round.title}
            >
              <header className="bracket-round__heading">
                <div>
                  <p className="utility-label">{round.eyebrow}</p>
                  <h2>{round.title}</h2>
                </div>
                <span>
                  {round.matchCount}{" "}
                  {round.matchCount === 1 ? "match" : "matches"}
                </span>
              </header>
              <div className="bracket-round__matches">
                {round.matchCount === 4
                  ? Array.from({ length: 2 }, (_, pairIndex) => (
                      <div className="bracket-pair" key={pairIndex}>
                        <LoadingMatch />
                        <LoadingMatch />
                      </div>
                    ))
                  : Array.from(
                      { length: round.matchCount },
                      (_, matchIndex) => <LoadingMatch key={matchIndex} />,
                    )}
              </div>
            </section>
          ))}
          <section className="bracket-champion">
            <header className="bracket-round__heading">
              <div>
                <p className="utility-label">The trophy</p>
                <h2>Champion</h2>
              </div>
            </header>
            <div className="bracket-champion__panel">
              <SkeletonBlock className="skeleton--title" width="60%" />
              <SkeletonBlock className="skeleton--line" width="45%" />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
