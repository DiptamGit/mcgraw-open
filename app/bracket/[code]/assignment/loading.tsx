import {
  LoadingAnnouncement,
  SkeletonBlock,
} from "@/components/feedback/skeletons";
import { PageIntro } from "@/components/page-intro";

export default function KnockoutAssignmentLoading() {
  return (
    <>
      <PageIntro
        eyebrow="Bracket progression"
        title="Manage knockout teams"
        description="Confirm each completed-match winner before placing that team in the next round."
        badge="Manual progression"
      />

      <div className="page-content schedule-page">
        <LoadingAnnouncement label="Loading the knockout progression paths." />
        <div className="knockout-assignment-slots" aria-hidden="true">
          {Array.from({ length: 2 }, (_, index) => (
            <div className="knockout-assignment-slot" key={index}>
              <SkeletonBlock className="skeleton--label" width="6rem" />
              <SkeletonBlock className="skeleton--title" width="75%" />
              <SkeletonBlock className="skeleton--display" width="100%" />
              <SkeletonBlock className="skeleton--action" width="100%" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
