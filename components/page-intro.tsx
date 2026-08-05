import { CourtDevice } from "@/components/court-device";

type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  hero?: boolean;
};

export function PageIntro({
  eyebrow,
  title,
  description,
  badge,
  hero = false,
}: PageIntroProps) {
  return (
    <header className={`page-intro${hero ? " page-intro--hero" : ""}`}>
      <CourtDevice />
      <div className="page-frame page-intro__content">
        <div className="page-intro__label-row">
          <p className="utility-label utility-label--inverse">{eyebrow}</p>
          {badge ? <span className="status-badge">{badge}</span> : null}
        </div>
        <h1>{title}</h1>
        <p className="page-intro__description">{description}</p>
      </div>
    </header>
  );
}
