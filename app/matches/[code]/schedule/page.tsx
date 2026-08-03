import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MatchSummary } from "@/components/matches/match-summary";
import { ScheduleForm } from "@/components/organizer/schedule-form";
import { PageIntro } from "@/components/page-intro";
import { hasOrganizerSession } from "@/lib/auth/session";
import { getMatchByCode } from "@/lib/data/queries";
import { createScheduleFormState } from "@/lib/matches/schedule";
import { getTeamDisplayName } from "@/lib/matches/presentation";

export const dynamic = "force-dynamic";

type ScheduleMatchPageProps = {
  params: Promise<{ code: string }>;
};

export default async function ScheduleMatchPage({
  params,
}: ScheduleMatchPageProps) {
  const { code } = await params;
  const match = await getMatchByCode(code);

  if (!match) {
    notFound();
  }

  const returnTo = `/matches/${encodeURIComponent(match.code)}/schedule`;
  if (!(await hasOrganizerSession())) {
    redirect(`/organizer/unlock?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const team1Name = getTeamDisplayName(match, "team1");
  const team2Name = getTeamDisplayName(match, "team2");
  const isCompleted = match.status === "completed";

  return (
    <>
      <PageIntro
        eyebrow={`${match.code} · Match schedule`}
        title={match.status === "scheduled" ? "Reschedule match" : "Schedule match"}
        description={`${team1Name} versus ${team2Name}.`}
      />

      <div className="page-content schedule-page">
        <Link className="schedule-back-link" href="/matches">
          Back to matches
        </Link>

        <section
          className="schedule-match-context"
          aria-labelledby="schedule-match-context-title"
        >
          <p className="utility-label">Current match</p>
          <h2 id="schedule-match-context-title">Review before updating</h2>
          <MatchSummary match={match} />
        </section>

        {isCompleted ? (
          <section
            className="form-feedback form-feedback--error"
            aria-labelledby="completed-match-schedule"
          >
            <h2 id="completed-match-schedule">Schedule locked</h2>
            <p>Completed matches cannot be scheduled or rescheduled.</p>
          </section>
        ) : (
          <section
            className="schedule-form-panel"
            aria-labelledby="schedule-form-title"
          >
            <p className="utility-label">Central Time</p>
            <h2 id="schedule-form-title">
              {match.status === "scheduled"
                ? "Update when and where"
                : "Set when and where"}
            </h2>
            <p className="supporting-copy">
              Players will see this schedule immediately after it is saved.
            </p>
            <ScheduleForm
              initialState={createScheduleFormState(match)}
              matchId={match.id}
            />
          </section>
        )}
      </div>
    </>
  );
}
