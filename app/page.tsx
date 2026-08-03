import Link from "next/link";
import { PageIntro } from "@/components/page-intro";

export default function HomePage() {
  return (
    <>
      <PageIntro
        eyebrow="Local doubles tennis"
        title="McGraw Open"
        description="Eleven teams. Two groups. One late-summer title."
        hero
      />

      <div className="page-content">
        <section
          className="tournament-window"
          aria-labelledby="tournament-window"
        >
          <div>
            <p className="utility-label">Tournament window</p>
            <h2 id="tournament-window">August 1 — September 30</h2>
          </div>
          <div className="tournament-window__details">
            <p>
              Follow every fixture, result, standing, and knockout round from
              one court-side home.
            </p>
            <div className="inline-links" aria-label="Tournament views">
              <Link href="/matches">View matches</Link>
              <Link href="/groups">View groups</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
