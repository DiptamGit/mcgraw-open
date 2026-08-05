import { Lock } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MatchSummary } from "@/components/matches/match-summary";
import { FocusedTaskShell } from "@/components/organizer/focused-task-shell";
import { ResultForm } from "@/components/organizer/result-form";
import { hasOrganizerSession } from "@/lib/auth/session";
import { getTournamentData } from "@/lib/data/queries";
import {
  createResultFormState,
  getResultEditability,
} from "@/lib/matches/result";
import { getTeamDisplayName } from "@/lib/matches/presentation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Record match result",
  description: "Record or correct a McGraw Open tournament match result.",
  robots: {
    index: false,
    follow: false,
  },
};

type ResultMatchPageProps = {
  params: Promise<{ code: string }>;
};

export default async function ResultMatchPage({
  params,
}: ResultMatchPageProps) {
  const { code } = await params;
  const tournament = await getTournamentData();
  const match =
    tournament.matches.find((candidate) => candidate.code === code) ?? null;

  if (!match) {
    notFound();
  }

  const returnTo = `/matches/${encodeURIComponent(match.code)}/result`;
  if (!(await hasOrganizerSession())) {
    redirect(`/organizer/unlock?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const editability = getResultEditability(
    match,
    tournament.matches,
    tournament.state,
  );
  const team1Name = getTeamDisplayName(match, "team1");
  const team2Name = getTeamDisplayName(match, "team2");

  const unlockAction =
    match.stage === "group"
      ? { href: "/groups/reopen", label: "Reopen the group stage" }
      : { href: "/bracket", label: "Clear the downstream assignment" };

  return (
    <FocusedTaskShell
      eyebrow={`${match.code} · Match result`}
      title={match.status === "completed" ? "Edit result" : "Record result"}
      subtitle={`${team1Name} versus ${team2Name}.`}
      backHref="/matches"
      backLabel="Back to matches"
    >
      <section
        className="task-panel task-panel--readonly"
        aria-labelledby="result-match-context-title"
      >
        <p className="utility-label">Current match</p>
        <h2 id="result-match-context-title">Review before updating</h2>
        <MatchSummary match={match} />
      </section>

      {!editability.editable ? (
        <section
          className="form-feedback form-feedback--error"
          aria-labelledby="result-locked-title"
        >
          <span className="status-badge status-badge--locked">
            <Lock size={14} weight="fill" aria-hidden="true" />
            Locked
          </span>
          <h2 id="result-locked-title">Result locked</h2>
          <p>{editability.reason}</p>
          <p>
            To edit it,{" "}
            <Link className="schedule-reload" href={unlockAction.href}>
              {unlockAction.label}
            </Link>{" "}
            first, then return here.
          </p>
        </section>
      ) : (
        <section
          className="task-form-section"
          aria-labelledby="result-form-title"
        >
          <p className="utility-label utility-label--inverse">Best of three</p>
          <h2 id="result-form-title">
            {match.status === "completed"
              ? "Correct the match result"
              : "Enter the match result"}
          </h2>
          <p className="supporting-copy">
            Record a normal result, retirement, or walkover.
          </p>
          <ResultForm
            initialState={createResultFormState(match)}
            match={match}
          />
        </section>
      )}
    </FocusedTaskShell>
  );
}
