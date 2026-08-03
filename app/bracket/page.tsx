import { PageIntro } from "@/components/page-intro";

export default function BracketPage() {
  return (
    <>
      <PageIntro
        eyebrow="Knockout stage"
        title="Bracket"
        description="Four quarterfinals lead to one McGraw Open champion."
        badge="Soon"
      />

      <div className="page-content">
        <section className="content-panel" aria-labelledby="bracket-release">
          <p className="utility-label">Later this tournament</p>
          <h2 id="bracket-release">The knockout bracket opens after groups.</h2>
          <p className="supporting-copy">
            Quarterfinal places will be filled from the finalized Group A and
            Group B standings.
          </p>
        </section>
      </div>
    </>
  );
}
