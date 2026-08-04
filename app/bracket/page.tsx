import Link from "next/link";

import { KnockoutBracket } from "@/components/bracket/knockout-bracket";
import { PageIntro } from "@/components/page-intro";
import { hasOrganizerSession } from "@/lib/auth/session";
import { organizeKnockoutBracket } from "@/lib/bracket";
import { getTournamentData } from "@/lib/data/queries";
import { createQuarterfinalAssignmentPreview } from "@/lib/quarterfinal-assignment";
import { createPublicPageMetadata } from "@/lib/site-metadata";

export const dynamic = "force-dynamic";

export const metadata = createPublicPageMetadata({
  title: "Knockout bracket",
  description:
    "Follow the McGraw Open quarterfinals, semifinals, and championship match.",
  path: "/bracket",
});

type BracketPageProps = {
  searchParams: Promise<{ assignment?: string }>;
};

export default async function BracketPage({
  searchParams,
}: BracketPageProps) {
  const [tournament, isOrganizer, query] = await Promise.all([
    getTournamentData(),
    hasOrganizerSession(),
    searchParams,
  ]);
  const rounds = organizeKnockoutBracket(tournament.matches);
  const assignmentPreview =
    tournament.state.group_stage_status === "finalized"
      ? createQuarterfinalAssignmentPreview({
          teams: tournament.teams,
          matches: tournament.matches,
        })
      : null;

  return (
    <>
      <PageIntro
        eyebrow="Knockout stage"
        title="Bracket"
        description="Four quarterfinals lead to one McGraw Open champion."
      />

      <div className="page-content">
        {query.assignment === "assigned" ||
        query.assignment === "already-assigned" ? (
          <div
            className="form-feedback form-feedback--success"
            role="status"
            aria-live="polite"
          >
            <p>
              {query.assignment === "assigned"
                ? "Quarterfinal teams assigned from the locked group ranks."
                : "Quarterfinal teams already match the locked group ranks."}
            </p>
          </div>
        ) : null}
        <p className="bracket-guide">
          Seed labels show where each team enters. Later rounds name the match
          whose winner advances.
        </p>
        <KnockoutBracket rounds={rounds} />

        {isOrganizer ? (
          <section
            className="group-organizer-actions bracket-organizer-actions"
            aria-labelledby="bracket-organizer-heading"
          >
            <p className="utility-label">Organizer action</p>
            <h2 id="bracket-organizer-heading">
              {tournament.state.group_stage_status !== "finalized"
                ? "The draw waits for final ranks."
                : assignmentPreview?.status === "ready"
                  ? "The quarterfinal draw is ready."
                  : assignmentPreview?.status === "assigned"
                    ? "Quarterfinal teams are in place."
                    : "The quarterfinal draw is protected."}
            </h2>
            <p>
              {tournament.state.group_stage_status !== "finalized"
                ? "Finalize both group standings before assigning the eight advancing teams."
                : assignmentPreview?.status === "ready"
                  ? "Review all four fixed seed paths before assigning the teams together."
                  : assignmentPreview?.status === "assigned"
                    ? "Every quarterfinal matches the locked A1/B4, A2/B3, A3/B2, and A4/B1 paths."
                    : assignmentPreview?.status === "activity"
                      ? "Quarterfinal activity has started, so existing team assignments cannot be replaced."
                      : "One or more stored teams do not match the locked group ranks and need data review."}
            </p>
            {tournament.state.group_stage_status !== "finalized" ? (
              <Link className="group-action-link" href="/groups">
                View group standings
              </Link>
            ) : assignmentPreview?.status === "ready" ? (
              <Link
                className="group-action-link"
                href="/bracket/quarterfinals"
              >
                Review quarterfinal assignments
              </Link>
            ) : null}
          </section>
        ) : null}
      </div>
    </>
  );
}
