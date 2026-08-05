import { FocusedTaskLoading } from "./focused-task-loading";
import { SkeletonBlock, SkeletonFormPanel } from "./skeletons";

export function OrganizerFormLoading({
  fields,
  label,
}: {
  fields: number;
  label: string;
}) {
  return (
    <FocusedTaskLoading label={label}>
      <div className="task-panel task-panel--readonly" aria-hidden="true">
        <p className="utility-label">Current match</p>
        <SkeletonBlock className="skeleton--title" width="60%" />
        <SkeletonBlock className="skeleton--line" width="80%" />
      </div>
      <div className="task-form-section" aria-hidden="true">
        <SkeletonFormPanel fields={fields} />
      </div>
    </FocusedTaskLoading>
  );
}
