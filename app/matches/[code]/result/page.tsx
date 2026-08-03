import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MatchSummary } from "@/components/matches/match-summary";
import { ResultForm } from "@/components/organizer/result-form";
import { PageIntro } from "@/components/page-intro";
import { hasOrganizerSession } from "@/lib/auth/session";
import { getTournamentData } from "@/lib/data/queries";
import {
  createResultFormState,
  getResultEditability,
} from "@/lib/matches/result";
import { getTeamDisplayName } from "@/lib/matches/presentation";

export const dynamic = "force-dynamic";

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

  return (
    <>
      <PageIntro
        eyebrow={`${match.code} · Normal result`}
        title={match.status === "completed" ? "Edit result" : "Record result"}
        description={`${team1Name} versus ${team2Name}.`}
      />

      <div className="page-content schedule-page">
        <Link className="schedule-back-link" href="/matches">
          Back to matches
        </Link>

        <section
          className="schedule-match-context"
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
            <h2 id="result-locked-title">Result locked</h2>
            <p>{editability.reason}</p>
          </section>
        ) : (
          <section
            className="schedule-form-panel result-form-panel"
            aria-labelledby="result-form-title"
          >
            <p className="utility-label">Best of three</p>
            <h2 id="result-form-title">
              {match.status === "completed"
                ? "Correct the match result"
                : "Enter the match result"}
            </h2>
            <p className="supporting-copy">
              Record a normally completed match. Retirements and walkovers are
              handled in a later organizer flow.
            </p>
            <ResultForm
              initialState={createResultFormState(match)}
              match={match}
            />
          </section>
        )}
      </div>
    </>
  );
}
