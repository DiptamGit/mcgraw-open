import {
  LoadingAnnouncement,
  SkeletonBlock,
  SkeletonMatchList,
} from "@/components/feedback/skeletons";
import { PageIntro } from "@/components/page-intro";

export default function MatchesLoading() {
  return (
    <>
      <PageIntro
        eyebrow="Schedule and results"
        title="Matches"
        description="Find the next court time and every completed score."
      />

      <div className="match-filters" aria-hidden="true">
        <div className="page-frame match-filters__inner">
          <div className="skeleton-filters">
            <SkeletonBlock className="skeleton--chip" width="6.5rem" />
            <SkeletonBlock className="skeleton--chip" width="6rem" />
            <SkeletonBlock className="skeleton--chip" width="6rem" />
            <SkeletonBlock className="skeleton--chip" width="7rem" />
          </div>
        </div>
      </div>

      <div className="page-content matches-view">
        <LoadingAnnouncement label="Loading tournament matches." />

        <section className="match-section" aria-hidden="true">
          <div className="match-section__heading">
            <p className="utility-label">Next on court</p>
            <h2 className="match-section__title">Scheduled</h2>
          </div>
          <SkeletonMatchList count={4} />
        </section>
      </div>
    </>
  );
}
