import { LoadingAnnouncement, SkeletonBlock } from "./skeletons";

/**
 * The loading placeholder for every organizer route. It matches the real
 * focused-task shell: a back link, the task head, then a route-specific body.
 */
export function FocusedTaskLoading({
  label,
  hero = false,
  children,
}: {
  label: string;
  hero?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="focused-task">
      <div className="focused-task__frame">
        <LoadingAnnouncement label={label} />
        <SkeletonBlock className="skeleton--line" width="9rem" />
        <div
          className={`focused-task__head${
            hero ? " focused-task__head--hero" : ""
          }`}
          aria-hidden="true"
        >
          <div className="focused-task__head-content">
            <SkeletonBlock className="skeleton--label" width="11rem" />
            <SkeletonBlock className="skeleton--display" width="70%" />
            <SkeletonBlock className="skeleton--line" width="85%" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
