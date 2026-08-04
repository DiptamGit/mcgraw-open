import { SkeletonBlock } from "./skeletons";

export function PageIntroSkeleton() {
  return (
    <header className="page-intro" aria-hidden="true">
      <div className="court-lines" aria-hidden="true">
        <span className="court-lines__horizontal" />
        <span className="court-lines__vertical" />
        <span className="court-lines__service" />
        <span className="court-lines__ball" />
      </div>
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
