import { FocusedTaskLoading } from "@/components/feedback/focused-task-loading";
import { SkeletonBlock } from "@/components/feedback/skeletons";

export default function KnockoutAssignmentLoading() {
  return (
    <FocusedTaskLoading label="Loading the knockout progression paths.">
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
    </FocusedTaskLoading>
  );
}
