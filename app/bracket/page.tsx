import { KnockoutBracket } from "@/components/bracket/knockout-bracket";
import { PageIntro } from "@/components/page-intro";
import { organizeKnockoutBracket } from "@/lib/bracket";
import { getMatches } from "@/lib/data/queries";
import { createPublicPageMetadata } from "@/lib/site-metadata";

export const dynamic = "force-dynamic";

export const metadata = createPublicPageMetadata({
  title: "Knockout bracket",
  description:
    "Follow the McGraw Open quarterfinals, semifinals, and championship match.",
  path: "/bracket",
});

export default async function BracketPage() {
  const rounds = organizeKnockoutBracket(await getMatches());

  return (
    <>
      <PageIntro
        eyebrow="Knockout stage"
        title="Bracket"
        description="Four quarterfinals lead to one McGraw Open champion."
      />

      <div className="page-content">
        <p className="bracket-guide">
          Seed labels show where each team enters. Later rounds name the match
          whose winner advances.
        </p>
        <KnockoutBracket rounds={rounds} />
      </div>
    </>
  );
}
