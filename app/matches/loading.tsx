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

      <div className="page-content">
        <LoadingAnnouncement label="Loading tournament matches." />
        <div className="matches-view">
          <div className="skeleton-filters" aria-hidden="true">
            <SkeletonBlock className="skeleton--control" width="100%" />
          </div>

          <section className="match-section" aria-hidden="true">
            <div className="match-section__heading">
              <div>
                <p className="utility-label">Next on court</p>
                <h2>Scheduled</h2>
              </div>
            </div>
            <SkeletonMatchList count={4} />
          </section>
        </div>
      </div>
    </>
  );
}
