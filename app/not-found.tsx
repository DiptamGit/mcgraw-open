import type { Metadata } from "next";
import Link from "next/link";

import { PageIntro } from "@/components/page-intro";

export const metadata: Metadata = {
  title: "Page not found",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <>
      <PageIntro
        eyebrow="Tournament site"
        title="Page not found"
        description="That tournament page does not exist."
      />

      <div className="page-content">
        <section className="content-panel" aria-labelledby="not-found-title">
          <p className="utility-label">Nothing here</p>
          <h2 id="not-found-title">This link does not match a match or page.</h2>
          <p className="supporting-copy">
            Check the address, or start again from the tournament pages below.
          </p>
          <div className="not-found-links">
            <Link className="group-action-link" href="/">
              Go to home
            </Link>
            <Link className="match-filter-reset" href="/matches">
              See all matches
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
