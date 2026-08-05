import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { CourtDevice } from "@/components/court-device";

type FocusedTaskShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  backHref: string;
  backLabel: string;
  badge?: string;
  badgeTone?: "neutral" | "warning";
  hero?: boolean;
  children: React.ReactNode;
};

/**
 * The single-task shell for every organizer route. It caps content at 640px on
 * desktop, stays full width on phone, and gives each task a back link, a match
 * or stage eyebrow, a display title, and a context subtitle. The global
 * OrganizerBanner already marks organizer mode above this shell, so it is not
 * repeated here.
 */
export function FocusedTaskShell({
  eyebrow,
  title,
  subtitle,
  backHref,
  backLabel,
  badge,
  badgeTone = "neutral",
  hero = false,
  children,
}: FocusedTaskShellProps) {
  return (
    <div className="focused-task">
      <div className="focused-task__frame">
        <Link className="focused-task__back" href={backHref}>
          <ArrowLeft size={18} weight="bold" aria-hidden="true" />
          {backLabel}
        </Link>

        <header
          className={`focused-task__head${hero ? " focused-task__head--hero" : ""}`}
        >
          {hero ? <CourtDevice /> : null}
          <div className="focused-task__head-content">
            <div className="focused-task__eyebrow-row">
              <p className="utility-label utility-label--inverse">{eyebrow}</p>
              {badge ? (
                <span
                  className={`status-badge status-badge--${
                    badgeTone === "warning" ? "warning" : "locked"
                  }`}
                >
                  {badge}
                </span>
              ) : null}
            </div>
            <h1 className="focused-task__title">{title}</h1>
            <p className="focused-task__subtitle">{subtitle}</p>
          </div>
        </header>

        <div className="focused-task__body">{children}</div>
      </div>
    </div>
  );
}
