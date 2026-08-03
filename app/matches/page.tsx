import { PageIntro } from "@/components/page-intro";

export default function MatchesPage() {
  return (
    <>
      <PageIntro
        eyebrow="Schedule and results"
        title="Matches"
        description="Find the next court time and every completed score."
      />

      <div className="page-content">
        <section className="content-panel" aria-labelledby="match-list">
          <p className="utility-label">Tournament fixtures</p>
          <h2 id="match-list">Match tracking is warming up.</h2>
          <p className="supporting-copy">
            The complete group-stage schedule and knockout fixtures will live
            here.
          </p>
        </section>
      </div>
    </>
  );
}
