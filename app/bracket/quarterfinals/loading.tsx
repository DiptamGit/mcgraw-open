import { FocusedTaskLoading } from "@/components/feedback/focused-task-loading";
import { SkeletonBlock } from "@/components/feedback/skeletons";

export default function QuarterfinalAssignmentLoading() {
  return (
    <FocusedTaskLoading label="Loading the quarterfinal assignment preview.">
      <div className="quarterfinal-assignment-preview" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="quarterfinal-assignment-row" key={index}>
            <SkeletonBlock className="skeleton--label" width="4rem" />
            <SkeletonBlock className="skeleton--title" width="80%" />
            <SkeletonBlock className="skeleton--title" width="70%" />
          </div>
        ))}
      </div>
    </FocusedTaskLoading>
  );
}
