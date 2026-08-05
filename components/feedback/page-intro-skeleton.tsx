import { CourtDevice } from "@/components/court-device";
import { SkeletonBlock } from "./skeletons";

export function PageIntroSkeleton() {
  return (
    <header className="page-intro" aria-hidden="true">
      <CourtDevice />
      <div className="page-frame page-intro__content">
        <div className="page-intro__label-row">
          <SkeletonBlock
            className="skeleton--inverse skeleton--label"
            width="11rem"
          />
        </div>
        <SkeletonBlock
          className="skeleton--inverse skeleton--display"
          width="70%"
        />
        <SkeletonBlock
          className="skeleton--inverse skeleton--line"
          width="85%"
        />
      </div>
    </header>
  );
}
