import Link from "next/link";
import { redirect } from "next/navigation";

import { ReopenGroupsForm } from "@/components/groups/reopen-groups-form";
import { PageIntro } from "@/components/page-intro";
import { hasOrganizerSession } from "@/lib/auth/session";
import {
  getTournamentData,
  hasQuarterfinalActivityHistory,
} from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function ReopenGroupsPage() {
  const returnTo = "/groups/reopen";
  if (!(await hasOrganizerSession())) {
    redirect(`/organizer/unlock?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const [tournament, hasQuarterfinalHistory] = await Promise.all([
    getTournamentData(),
    hasQuarterfinalActivityHistory(),
  ]);
  if (tournament.state.group_stage_status === "open") {
    redirect("/groups");
  }

  const quarterfinals = tournament.matches.filter(
    (match) => match.stage === "quarterfinal",
  );
  const activeQuarterfinal = quarterfinals.find(
    (match) => match.status !== "unscheduled",
  );
  const assignedQuarterfinals = quarterfinals.filter(
    (match) => match.team1_id !== null || match.team2_id !== null,
  ).length;
  const finalizedTeams = [...tournament.teams].sort((left, right) => {
    if (left.group_label !== right.group_label) {
      return left.group_label.localeCompare(right.group_label);
    }
    return (left.final_rank ?? Number.MAX_SAFE_INTEGER) -
      (right.final_rank ?? Number.MAX_SAFE_INTEGER);
  });

  return (
    <>
      <PageIntro
        eyebrow="Organizer · Group stage"
        title="Reopen groups"
        description="Review what will be cleared before unlocking corrections."
        badge="Destructive action"
      />

      <div className="page-content group-transition-page">
        <Link className="schedule-back-link" href="/groups">
          Back to groups
        </Link>

        <section
          className="group-transition-intro"
          aria-labelledby="current-final-ranks"
        >
          <p className="utility-label">Current snapshot</p>
          <h2 id="current-final-ranks">Final group ranks</h2>
          <div className="reopen-rank-grid">
            {(["A", "B"] as const).map((groupLabel) => (
              <div key={groupLabel}>
                <h3>Group {groupLabel}</h3>
                <ol>
                  {finalizedTeams
                    .filter((team) => team.group_label === groupLabel)
                    .map((team) => (
                      <li key={team.id}>
                        <span>{team.final_rank}</span>
                        {team.name}
                      </li>
                    ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {activeQuarterfinal || hasQuarterfinalHistory ? (
          <section
            className="form-feedback form-feedback--error"
            aria-labelledby="reopen-blocked"
          >
            <h2 id="reopen-blocked">Reopening blocked</h2>
            <p>
              {activeQuarterfinal
                ? `${activeQuarterfinal.code} is ${activeQuarterfinal.status}. `
                : "A quarterfinal was previously scheduled or completed. "}
              Groups cannot be reopened after quarterfinal activity begins.
            </p>
          </section>
        ) : (
          <ReopenGroupsForm
            assignedQuarterfinals={assignedQuarterfinals}
            expectedStateUpdatedAt={tournament.state.updated_at}
            initialState={{ status: "idle", message: null }}
          />
        )}
      </div>
    </>
  );
}
