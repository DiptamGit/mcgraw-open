import { FocusedTaskLoading } from "@/components/feedback/focused-task-loading";
import { SkeletonBlock } from "@/components/feedback/skeletons";

export default function ReopenGroupsLoading() {
  return (
    <FocusedTaskLoading label="Loading the reopening summary.">
      <div className="reopen-consequences" aria-hidden="true">
        <h2>What reopening changes</h2>
        <SkeletonBlock className="skeleton--line" width="85%" />
        <SkeletonBlock className="skeleton--line" width="75%" />
        <SkeletonBlock className="skeleton--line" width="65%" />
      </div>
    </FocusedTaskLoading>
  );
}
