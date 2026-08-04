import {
  LoadingAnnouncement,
  SkeletonBlock,
  SkeletonMatchList,
} from "@/components/feedback/skeletons";
import { PageIntro } from "@/components/page-intro";

export default function HomeLoading() {
  return (
    <>
      <PageIntro
        eyebrow="August 1 - September 30, 2026"
        title="McGraw Open"
        description="Eleven doubles teams play across two groups for one late-summer title."
        hero
      />

      <div className="page-content">
        <LoadingAnnouncement label="Loading tournament summary." />
        <div className="home-view">
          <section className="home-section" aria-hidden="true">
            <header className="home-section__heading">
              <div>
                <p className="utility-label">Next on court</p>
                <h2>Upcoming matches</h2>
              </div>
            </header>
            <SkeletonMatchList count={3} />
          </section>

          <section className="home-section" aria-hidden="true">
            <header className="home-section__heading">
              <div>
                <p className="utility-label">Group stage</p>
                <h2>Current leaders</h2>
              </div>
            </header>
            <div className="home-leader-grid">
              {(["A", "B"] as const).map((groupLabel) => (
                <article className="home-leader" key={groupLabel}>
                  <header>
                    <span className="group-shield">{groupLabel}</span>
                    <div>
                      <p className="utility-label">Round robin</p>
                      <h3>Group {groupLabel}</h3>
                    </div>
                  </header>
                  <SkeletonBlock className="skeleton--line" width="45%" />
                  <SkeletonBlock className="skeleton--title" width="85%" />
                  <SkeletonBlock className="skeleton--line" width="60%" />
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
