import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { KnockoutAssignmentForm } from "@/components/bracket/knockout-assignment-form";
import { MatchSummary } from "@/components/matches/match-summary";
import { PageIntro } from "@/components/page-intro";
import { hasOrganizerSession } from "@/lib/auth/session";
import { getTournamentData } from "@/lib/data/queries";
import {
  createKnockoutAssignmentPreview,
  isKnockoutAssignmentCode,
  type KnockoutAssignmentSlot,
} from "@/lib/knockout-assignment";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage knockout teams",
  description:
    "Assign completed McGraw Open knockout winners to the next round.",
  robots: {
    index: false,
    follow: false,
  },
};

type KnockoutAssignmentPageProps = {
  params: Promise<{ code: string }>;
};

function slotHeading(slot: KnockoutAssignmentSlot): string {
  return slot.teamSlot === "team1_id" ? "Team 1 path" : "Team 2 path";
}

export default async function KnockoutAssignmentPage({
  params,
}: KnockoutAssignmentPageProps) {
  const { code } = await params;
  if (!isKnockoutAssignmentCode(code)) {
    notFound();
  }

  const returnTo = `/bracket/${encodeURIComponent(code)}/assignment`;
  if (!(await hasOrganizerSession())) {
    redirect(`/organizer/unlock?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const tournament = await getTournamentData();
  const preview = createKnockoutAssignmentPreview(
    tournament.matches,
    code,
  );

  return (
    <>
      <PageIntro
        eyebrow={`${code} · Bracket progression`}
        title={`Manage ${code} teams`}
        description="Confirm each completed-match winner before placing that team in the next round."
        badge="Manual progression"
      />

      <div className="page-content schedule-page knockout-assignment-page">
        <Link className="schedule-back-link" href="/bracket">
          Back to bracket
        </Link>

        <section
          className="schedule-match-context"
          aria-labelledby="knockout-destination-title"
        >
          <p className="utility-label">Downstream match</p>
          <h2 id="knockout-destination-title">
            {preview.protected
              ? `${code} assignments are protected`
              : `Review ${code} progression`}
          </h2>
          <p className="supporting-copy">
            {preview.protected
              ? `${code} is ${preview.downstreamMatch.status}, so its teams cannot be reassigned or cleared.`
              : "Each source winner is assigned separately. Assigning a winner locks that source result."}
          </p>
          <MatchSummary
            match={preview.downstreamMatch}
            showBracketSources
          />
        </section>

        <div className="knockout-assignment-slots">
          {preview.slots.map((slot) => {
            const team =
              slot.status === "assigned"
                ? slot.assignedTeam
                : slot.eligibleWinner;

            return (
              <section
                className="knockout-assignment-slot"
                key={slot.teamSlot}
                aria-labelledby={`${code}-${slot.teamSlot}-title`}
              >
                <header className="knockout-assignment-slot__heading">
                  <div>
                    <p className="utility-label">{slotHeading(slot)}</p>
                    <h2 id={`${code}-${slot.teamSlot}-title`}>
                      {slot.sourceLabel} → {code}
                    </h2>
                  </div>
                  <span
                    className={`knockout-assignment-state knockout-assignment-state--${slot.status}`}
                  >
                    {slot.status === "waiting"
                      ? "Waiting for result"
                      : slot.status === "ready"
                        ? "Ready to assign"
                        : slot.status === "assigned"
                          ? "Assigned"
                          : "Needs review"}
                  </span>
                </header>

                <div className="knockout-assignment-source">
                  <p className="utility-label">Source match</p>
                  <MatchSummary match={slot.sourceMatch} />
                </div>

                {slot.status === "waiting" ? (
                  <div className="knockout-assignment-note">
                    <strong>Complete {slot.sourceMatch.code} first.</strong>
                    <p>
                      Its recorded winner becomes the eligible choice for this
                      slot.
                    </p>
                  </div>
                ) : slot.status === "conflict" || !team ? (
                  <div className="form-feedback form-feedback--error">
                    <p>
                      The stored assignment does not match the completed source
                      winner. Review the bracket data before continuing.
                    </p>
                  </div>
                ) : preview.protected ? (
                  <div className="knockout-assignment-note knockout-assignment-note--protected">
                    <strong>Assignment protected.</strong>
                    <p>
                      Scheduled or completed downstream matches keep their
                      current teams.
                    </p>
                  </div>
                ) : (
                  <KnockoutAssignmentForm
                    downstreamMatch={preview.downstreamMatch}
                    initialState={{ status: "idle", message: null }}
                    intent={
                      slot.status === "assigned" ? "clear" : "assign"
                    }
                    sourceMatch={slot.sourceMatch}
                    team={team}
                    teamSlot={slot.teamSlot}
                  />
                )}
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
