import { PageIntro } from "@/components/page-intro";

export default function GroupsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Round robin"
        title="Groups"
        description="Live tables and the road to the top four in each group."
      />

      <div className="page-content">
        <section className="content-panel" aria-labelledby="group-play">
          <p className="utility-label">Group stage</p>
          <h2 id="group-play">Two groups. Eight places advance.</h2>
          <div className="group-preview" aria-label="Tournament groups">
            <div>
              <span className="group-shield" aria-hidden="true">A</span>
              <p><strong>Group A</strong><span>5 doubles teams</span></p>
            </div>
            <div className="group-preview__striped">
              <span className="group-shield" aria-hidden="true">B</span>
              <p><strong>Group B</strong><span>6 doubles teams</span></p>
            </div>
          </div>
          <p className="supporting-copy">
            Standings will appear here as tournament results are recorded.
          </p>
        </section>
      </div>
    </>
  );
}
