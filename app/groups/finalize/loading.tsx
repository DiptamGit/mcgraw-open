import { FocusedTaskLoading } from "@/components/feedback/focused-task-loading";
import { SkeletonBlock } from "@/components/feedback/skeletons";

export default function FinalizeGroupsLoading() {
  return (
    <FocusedTaskLoading label="Loading the final rank preview.">
      <div className="final-rank-preview" aria-hidden="true">
        {(["A", "B"] as const).map((groupLabel) => (
          <section className="final-rank-group" key={groupLabel}>
            <header>
              <span
                className={`group-shield group-shield--${groupLabel.toLowerCase()}`}
              >
                {groupLabel}
              </span>
              <div>
                <p className="utility-label">Locked rank preview</p>
                <h2>Group {groupLabel}</h2>
              </div>
            </header>
            <div className="skeleton-table">
              {Array.from({ length: 5 }, (_, index) => (
                <SkeletonBlock className="skeleton--row" key={index} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </FocusedTaskLoading>
  );
}
