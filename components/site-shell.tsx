import Link from "next/link";
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
          <Link
            href="/"
            className="wordmark focus-inverse"
            aria-label="McGraw Open home"
          >
            <span className="wordmark__court" aria-hidden="true">
              <span />
            </span>
            <span>McGRAW OPEN</span>
          </Link>
          <SiteNavigation variant="desktop" />
        </div>
      </header>

      <main id="main-content">{children}</main>
      <SiteNavigation variant="mobile" />
    </div>
  );
}
