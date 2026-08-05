import Link from "next/link";
import { OrganizerHeaderControl } from "@/components/organizer/header-control";
import { OrganizerBanner } from "@/components/organizer/organizer-banner";
import { SiteNavigation } from "@/components/site-navigation";

type SiteShellProps = {
  children: React.ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="site-header">
        <div className="page-frame site-header__inner">
          <Link href="/" className="wordmark" aria-label="McGraw Open home">
            <span aria-hidden="true">
              McGraw <span className="wordmark__accent">Open</span>
            </span>
          </Link>

          <div className="site-header__actions">
            <SiteNavigation variant="desktop" />
            <OrganizerHeaderControl />
          </div>
        </div>
      </header>

      <OrganizerBanner />
      <main id="main-content">{children}</main>
      <SiteNavigation variant="mobile" />
    </div>
  );
}
