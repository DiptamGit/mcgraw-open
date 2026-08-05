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
          <div className="standings-board">
            <div className="standings-board__panels">
              {(["A", "B"] as const).map((groupLabel) => (
                <section
                  className={`standings-group standings-group--${groupLabel.toLowerCase()}`}
                  key={groupLabel}
                  aria-hidden="true"
                >
                  <div className="standings-group__header">
                    <div className="standings-group__identity">
                      <span
                        className={`group-shield group-shield--${groupLabel.toLowerCase()}`}
                      >
                        {groupLabel}
                      </span>
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
      </div>
    </>
  );
}
