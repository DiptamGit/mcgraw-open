import {
  LoadingAnnouncement,
  SkeletonBlock,
} from "@/components/feedback/skeletons";
import { PageIntro } from "@/components/page-intro";

export default function QuarterfinalAssignmentLoading() {
  return (
    <>
      <PageIntro
        eyebrow="Organizer · Knockout stage"
        title="Assign quarterfinals"
        description="Confirm how locked group ranks enter the knockout draw."
        badge="Bracket assignment"
      />

      <div className="page-content group-transition-page">
        <LoadingAnnouncement label="Loading the quarterfinal assignment preview." />
        <div
          className="quarterfinal-assignment-preview"
          aria-hidden="true"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <div className="quarterfinal-assignment-row" key={index}>
              <SkeletonBlock className="skeleton--label" width="4rem" />
              <SkeletonBlock className="skeleton--title" width="80%" />
              <SkeletonBlock className="skeleton--title" width="70%" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
