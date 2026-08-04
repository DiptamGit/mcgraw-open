import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FinalizationForm } from "@/components/groups/finalization-form";
import { PageIntro } from "@/components/page-intro";
import { hasOrganizerSession } from "@/lib/auth/session";
import { getTournamentData } from "@/lib/data/queries";
import {
  createFinalizationFormState,
  createFinalizationPreview,
} from "@/lib/groups/finalization";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finalize groups",
  description: "Review and lock the final McGraw Open group standings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function FinalizeGroupsPage() {
  const returnTo = "/groups/finalize";
  if (!(await hasOrganizerSession())) {
    redirect(`/organizer/unlock?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const tournament = await getTournamentData();
  if (tournament.state.group_stage_status === "finalized") {
    redirect("/groups");
  }

  const preview = createFinalizationPreview(tournament);

  return (
    <>
      <PageIntro
        eyebrow="Organizer · Group stage"
        title="Finalize groups"
        description="Review every rank before locking the group stage."
        badge="Locking action"
      />

      <div className="page-content group-transition-page">
        <Link className="schedule-back-link" href="/groups">
          Back to groups
        </Link>

        <section
          className="group-transition-intro"
          aria-labelledby="finalization-readiness"
        >
          <p className="utility-label">Finalization readiness</p>
          <h2 id="finalization-readiness">
            {preview.allMatchesComplete
              ? "Every group result is recorded."
              : "Group play is not complete."}
          </h2>
          <p>
            <strong>{preview.completedMatches}</strong> of{" "}
            {preview.totalMatches} group matches complete.
          </p>
          <p>
            Finalization snapshots both groups and locks every group result
            until an organizer deliberately reopens the stage.
          </p>
        </section>

        {!preview.allMatchesComplete ? (
          <section
            className="form-feedback form-feedback--error"
            aria-labelledby="finalization-blocked"
          >
            <h2 id="finalization-blocked">Finalization blocked</h2>
            <p>
              Record every remaining group result, then return to review the
              complete rank preview.
            </p>
            <Link className="schedule-reload" href="/matches">
              View remaining matches
            </Link>
          </section>
        ) : (
          <FinalizationForm
            expectedStateUpdatedAt={tournament.state.updated_at}
            initialState={createFinalizationFormState(preview)}
            preview={preview}
          />
        )}
      </div>
    </>
  );
}
