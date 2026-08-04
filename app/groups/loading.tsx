import {
  LoadingAnnouncement,
  SkeletonBlock,
} from "@/components/feedback/skeletons";
import { PageIntro } from "@/components/page-intro";

export default function GroupsLoading() {
  return (
    <>
      <PageIntro
        eyebrow="Round robin"
        title="Groups"
        description="Live tables and the road to the top four in each group."
      />

      <div className="page-content">
        <LoadingAnnouncement label="Loading group standings." />
        <div className="groups-view">
          <section className="standings-overview" aria-hidden="true">
            <p className="utility-label">Group stage</p>
            <h2>Two groups. Four advance from each.</h2>
            <SkeletonBlock className="skeleton--line" width="90%" />
            <SkeletonBlock className="skeleton--line" width="70%" />
          </section>

          <div className="standings-grid">
            {(["A", "B"] as const).map((groupLabel) => (
              <section
                className={`standings-group standings-group--${groupLabel.toLowerCase()}`}
                key={groupLabel}
                aria-hidden="true"
              >
                <div className="standings-group__header">
                  <div className="standings-group__identity">
                    <span className="group-shield">{groupLabel}</span>
                    <div>
                      <p className="utility-label">Round robin</p>
                      <h2>Group {groupLabel}</h2>
                    </div>
                  </div>
                </div>
                <div className="skeleton-table">
                  {Array.from({ length: 5 }, (_, index) => (
                    <SkeletonBlock className="skeleton--row" key={index} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
