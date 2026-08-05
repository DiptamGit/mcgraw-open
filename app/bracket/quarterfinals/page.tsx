import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { QuarterfinalAssignmentForm } from "@/components/bracket/quarterfinal-assignment-form";
import { FocusedTaskShell } from "@/components/organizer/focused-task-shell";
import { hasOrganizerSession } from "@/lib/auth/session";
import {
  getTournamentData,
  hasQuarterfinalActivityHistory,
} from "@/lib/data/queries";
import { createQuarterfinalAssignmentPreview } from "@/lib/quarterfinal-assignment";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Assign quarterfinals",
  description:
    "Review and assign finalized McGraw Open group ranks to the quarterfinal bracket.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function QuarterfinalAssignmentPage() {
  const returnTo = "/bracket/quarterfinals";
  if (!(await hasOrganizerSession())) {
    redirect(`/organizer/unlock?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const [tournament, hasActivityHistory] = await Promise.all([
    getTournamentData(),
    hasQuarterfinalActivityHistory(),
  ]);
  const isFinalized =
    tournament.state.group_stage_status === "finalized";
  const preview = isFinalized
    ? createQuarterfinalAssignmentPreview({
        teams: tournament.teams,
        matches: tournament.matches,
        hasActivityHistory,
      })
    : null;

  return (
    <FocusedTaskShell
      eyebrow="Organizer · Knockout stage"
      title="Assign quarterfinals"
      subtitle="Confirm how locked group ranks enter the knockout draw."
      backHref="/bracket"
      backLabel="Back to bracket"
      badge="Bracket assignment"
    >
      <section
        className="group-transition-intro"
        aria-labelledby="quarterfinal-assignment-readiness"
      >
        <p className="utility-label">Assignment readiness</p>
        <h2 id="quarterfinal-assignment-readiness">
          {!isFinalized
            ? "Final group ranks are required."
            : preview?.status === "ready"
              ? "The locked draw is ready."
              : preview?.status === "assigned"
                ? "Quarterfinal teams are assigned."
                : preview?.status === "activity"
                  ? "The quarterfinal draw is protected."
                  : "The current draw needs review."}
        </h2>
        <p>
          The fixed paths are A1/B4, A2/B3, A3/B2, and A4/B1.
          Assigning the draw never changes the locked group order.
        </p>
      </section>

      {!isFinalized ? (
        <section
          className="form-feedback form-feedback--error"
          aria-labelledby="quarterfinal-finalization-required"
        >
          <h2 id="quarterfinal-finalization-required">
            Assignment blocked
          </h2>
          <p>
            Finalize both group standings before placing teams in the
            quarterfinal bracket.
          </p>
          <Link className="schedule-reload" href="/groups">
            View group standings
          </Link>
        </section>
      ) : preview ? (
        <>
          <section
            className="quarterfinal-assignment-preview"
            aria-labelledby="quarterfinal-assignment-preview"
          >
            <h2 className="sr-only" id="quarterfinal-assignment-preview">
              Quarterfinal assignment preview
            </h2>
            {preview.rows.map((row) => (
              <section
                className="quarterfinal-assignment-row"
                key={row.code}
                aria-labelledby={`assignment-${row.code}`}
              >
                <header>
                  <p className="utility-label">Quarterfinal</p>
                  <h3 id={`assignment-${row.code}`}>{row.code}</h3>
                </header>
                <div className="quarterfinal-assignment-team">
                  <span>{row.team1Source}</span>
                  <strong>{row.team1.name}</strong>
                </div>
                <p className="quarterfinal-assignment-versus">vs</p>
                <div className="quarterfinal-assignment-team">
                  <span>{row.team2Source}</span>
                  <strong>{row.team2.name}</strong>
                </div>
              </section>
            ))}
          </section>

          {preview.status === "ready" ? (
            <QuarterfinalAssignmentForm
              expectedMatchVersions={preview.expectedMatchVersions}
              expectedStateUpdatedAt={tournament.state.updated_at}
              initialState={{ status: "idle", message: null }}
            />
          ) : (
            <section
              className={`form-feedback ${
                preview.status === "assigned"
                  ? "form-feedback--success"
                  : "form-feedback--error"
              }`}
              aria-labelledby="quarterfinal-assignment-status"
            >
              <h2 id="quarterfinal-assignment-status">
                {preview.status === "assigned"
                  ? "No assignment needed"
                  : "Assignment blocked"}
              </h2>
              <p>
                {preview.status === "assigned"
                  ? "Every quarterfinal already matches the finalized group ranks."
                  : preview.status === "activity"
                    ? "A quarterfinal has been scheduled or completed. Existing teams cannot be replaced."
                    : "One or more existing quarterfinal teams do not match the locked group ranks. Review the stored bracket before changing it."}
              </p>
            </section>
          )}
        </>
      ) : null}
    </FocusedTaskShell>
  );
}
