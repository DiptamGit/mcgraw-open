"use client";

import { useEffect, useRef, useState } from "react";

import {
  updateKnockoutAssignment,
  type KnockoutAssignmentFormState,
} from "@/app/bracket/[code]/assignment/actions";
import {
  NETWORK_FAILURE_MESSAGE,
  useResilientFormAction,
} from "@/components/forms/use-resilient-form-action";
import { GroupTransitionSubmitButton } from "@/components/groups/group-transition-submit-button";
import type { Team, TournamentMatch } from "@/lib/data/schema";
import type {
  KnockoutAssignmentIntent,
  KnockoutTeamSlot,
} from "@/lib/knockout-assignment";

function networkFailureState(
  previousState: KnockoutAssignmentFormState,
): KnockoutAssignmentFormState {
  return {
    ...previousState,
    status: "error",
    message: NETWORK_FAILURE_MESSAGE,
  };
}

export function KnockoutAssignmentForm({
  downstreamMatch,
  initialState,
  intent,
  sourceMatch,
  team,
  teamSlot,
}: {
  downstreamMatch: TournamentMatch;
  initialState: KnockoutAssignmentFormState;
  intent: KnockoutAssignmentIntent;
  sourceMatch: TournamentMatch;
  team: Team;
  teamSlot: KnockoutTeamSlot;
}) {
  const [state, formAction] = useResilientFormAction(
    updateKnockoutAssignment,
    networkFailureState,
    initialState,
  );
  const [confirming, setConfirming] = useState(false);
  const actionButtonRef = useRef<HTMLButtonElement>(null);
  const keepButtonRef = useRef<HTMLButtonElement>(null);
  const choiceId = `${downstreamMatch.code}-${teamSlot}-${team.id}`;
  const isClear = intent === "clear";

  useEffect(() => {
    if (confirming) {
      keepButtonRef.current?.focus();
    }
  }, [confirming]);

  function cancelConfirmation() {
    setConfirming(false);
    requestAnimationFrame(() => actionButtonRef.current?.focus());
  }

  return (
    <form className="knockout-assignment-form" action={formAction}>
      <input type="hidden" name="intent" value={intent} />
      <input
        type="hidden"
        name="downstreamCode"
        value={downstreamMatch.code}
      />
      <input type="hidden" name="teamSlot" value={teamSlot} />
      <input
        type="hidden"
        name="expectedDownstreamUpdatedAt"
        value={downstreamMatch.updated_at}
      />
      <input
        type="hidden"
        name="expectedSourceUpdatedAt"
        value={sourceMatch.updated_at}
      />

      {state.message ? (
        <div
          className={`form-feedback form-feedback--${state.status}`}
          role={state.status === "idle" ? "status" : "alert"}
          aria-live="polite"
        >
          <p>{state.message}</p>
          {state.status === "conflict" ? (
            <button
              className="schedule-reload"
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload bracket
            </button>
          ) : null}
        </div>
      ) : null}

      {isClear ? (
        <input type="hidden" name="teamId" value={team.id} />
      ) : (
        <fieldset className="result-choice knockout-assignment-choice">
          <legend>Eligible winner (required)</legend>
          <p className="form-help" id={`${choiceId}-help`}>
            The completed {sourceMatch.code} winner is the only valid choice
            for this slot.
          </p>
          <div className="result-choice__options">
            <label htmlFor={choiceId}>
              <input
                id={choiceId}
                type="radio"
                name="teamId"
                value={team.id}
                defaultChecked
                required
                aria-describedby={`${choiceId}-help`}
              />
              <span>{team.name}</span>
            </label>
          </div>
        </fieldset>
      )}

      <div className="group-transition-actions">
        {confirming ? (
          <div
            className={`group-transition-confirmation${
              isClear ? " group-transition-confirmation--danger" : ""
            }`}
            role="group"
            aria-label={`${isClear ? "Confirm clear" : "Confirm"} ${downstreamMatch.code} assignment`}
          >
            <div>
              <strong>
                {isClear
                  ? `Clear ${team.name} from ${downstreamMatch.code}?`
                  : `Assign ${team.name} to ${downstreamMatch.code}?`}
              </strong>
              <p>
                {isClear
                  ? `${sourceMatch.code} becomes editable after this slot is cleared.`
                  : `${sourceMatch.code} locks until this downstream slot is cleared.`}
              </p>
            </div>
            <button
              ref={keepButtonRef}
              className="group-transition-button group-transition-button--quiet"
              type="button"
              onClick={cancelConfirmation}
            >
              Keep bracket unchanged
            </button>
            <GroupTransitionSubmitButton
              pendingLabel={
                isClear ? "Clearing assignment…" : "Assigning winner…"
              }
              variant={isClear ? "destructive" : "primary"}
            >
              {isClear ? "Clear assignment" : "Assign winner"}
            </GroupTransitionSubmitButton>
          </div>
        ) : (
          <button
            ref={actionButtonRef}
            className={`group-transition-button group-transition-button--${
              isClear ? "destructive" : "primary"
            }`}
            type="button"
            onClick={() => setConfirming(true)}
          >
            {isClear ? "Clear assignment" : "Review assignment"}
          </button>
        )}
      </div>
    </form>
  );
}
