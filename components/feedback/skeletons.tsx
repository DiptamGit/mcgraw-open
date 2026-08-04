type SkeletonProps = {
  className?: string;
  width?: string;
};

export function SkeletonBlock({ className, width }: SkeletonProps) {
  return (
    <span
      className={className ? `skeleton ${className}` : "skeleton"}
      style={width ? { width } : undefined}
      aria-hidden="true"
    />
  );
}

export function SkeletonMatchList({ count = 3 }: { count?: number }) {
  return (
    <div className="match-list" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton-match" key={index}>
          <SkeletonBlock className="skeleton--label" width="7.5rem" />
          <SkeletonBlock className="skeleton--title" width="80%" />
          <SkeletonBlock className="skeleton--title" width="70%" />
          <SkeletonBlock className="skeleton--line" width="55%" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonFormPanel({ fields = 3 }: { fields?: number }) {
  return (
    <div className="skeleton-form" aria-hidden="true">
      {Array.from({ length: fields }, (_, index) => (
        <div className="skeleton-form__field" key={index}>
          <SkeletonBlock className="skeleton--label" width="9rem" />
          <SkeletonBlock className="skeleton--control" />
        </div>
      ))}
      <SkeletonBlock className="skeleton--action" width="12rem" />
    </div>
  );
}

export function LoadingAnnouncement({ label }: { label: string }) {
  return (
    <p className="sr-only" role="status">
      {label}
    </p>
  );
}
