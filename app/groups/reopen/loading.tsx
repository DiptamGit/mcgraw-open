import {
  LoadingAnnouncement,
  SkeletonBlock,
} from "@/components/feedback/skeletons";
import { PageIntro } from "@/components/page-intro";

export default function ReopenGroupsLoading() {
  return (
    <>
      <PageIntro
        eyebrow="Organizer · Group stage"
        title="Reopen groups"
        description="Review what will be cleared before unlocking corrections."
        badge="Destructive action"
      />

      <div className="page-content schedule-page">
        <LoadingAnnouncement label="Loading the reopening summary." />
        <div className="reopen-consequences" aria-hidden="true">
          <h2>What reopening changes</h2>
          <SkeletonBlock className="skeleton--line" width="85%" />
          <SkeletonBlock className="skeleton--line" width="75%" />
          <SkeletonBlock className="skeleton--line" width="65%" />
        </div>
      </div>
    </>
  );
}
