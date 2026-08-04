import { PageIntroSkeleton } from "./page-intro-skeleton";
import {
  LoadingAnnouncement,
  SkeletonBlock,
  SkeletonFormPanel,
} from "./skeletons";

export function OrganizerFormLoading({
  fields,
  label,
}: {
  fields: number;
  label: string;
}) {
  return (
    <>
      <PageIntroSkeleton />

      <div className="page-content schedule-page">
        <LoadingAnnouncement label={label} />
        <div className="schedule-match-context" aria-hidden="true">
          <p className="utility-label">Current match</p>
          <SkeletonBlock className="skeleton--title" width="60%" />
          <SkeletonBlock className="skeleton--line" width="80%" />
        </div>
        <div className="schedule-form-panel" aria-hidden="true">
          <SkeletonFormPanel fields={fields} />
        </div>
      </div>
    </>
  );
}
