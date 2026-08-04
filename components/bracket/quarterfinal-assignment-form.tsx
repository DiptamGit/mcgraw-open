"use client";

import { useEffect, useRef, useState } from "react";

import {
  assignQuarterfinals,
  type QuarterfinalAssignmentFormState,
} from "@/app/bracket/quarterfinals/actions";
import {
  NETWORK_FAILURE_MESSAGE,
  useResilientFormAction,
} from "@/components/forms/use-resilient-form-action";
import type { ExpectedQuarterfinalVersion } from "@/lib/quarterfinal-assignment";
import { GroupTransitionSubmitButton } from "../groups/group-transition-submit-button";

function networkFailureState(
  previousState: QuarterfinalAssignmentFormState,
): QuarterfinalAssignmentFormState {
  return {
    ...previousState,
    status: "error",
    message: NETWORK_FAILURE_MESSAGE,
  };
}

export function QuarterfinalAssignmentForm({
  expectedMatchVersions,
  expectedStateUpdatedAt,
  initialState,
}: {
  expectedMatchVersions: ExpectedQuarterfinalVersion[];
  expectedStateUpdatedAt: string;
  initialState: QuarterfinalAssignmentFormState;
}) {
  const [state, formAction] = useResilientFormAction(
    assignQuarterfinals,
    networkFailureState,
    initialState,
  );
  const [confirming, setConfirming] = useState(false);
  const assignButtonRef = useRef<HTMLButtonElement>(null);
  const keepButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) {
      keepButtonRef.current?.focus();
    }
  }, [confirming]);

  function cancelConfirmation() {
    setConfirming(false);
    requestAnimationFrame(() => assignButtonRef.current?.focus());
  }

  return (
    <form className="quarterfinal-assignment-form" action={formAction}>
      <input
        type="hidden"
        name="expectedStateUpdatedAt"
        value={expectedStateUpdatedAt}
      />
      <input
        type="hidden"
        name="expectedMatchVersions"
        value={JSON.stringify(expectedMatchVersions)}
      />

      {state.message ? (
        <div
          className={`form-feedback form-feedback--${state.status}`}
          role={
            state.status === "error" || state.status === "conflict"
              ? "alert"
              : "status"
          }
          aria-live="polite"
        >
          <p>{state.message}</p>
          {state.status === "conflict" ? (
            <button
              className="schedule-reload"
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload draw
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="quarterfinal-assignment-note">
        <strong>What this changes</strong>
        <p>
          The eight previewed teams will fill QF1-QF4 in one transaction.
          Reopening groups can clear them only before quarterfinal activity.
        </p>
      </div>

      <div className="group-transition-actions">
        {confirming ? (
          <div
            className="group-transition-confirmation"
            role="group"
            aria-label="Confirm quarterfinal assignments"
          >
            <div>
              <strong>Place these teams in the bracket?</strong>
              <p>The fixed seed paths shown above will be assigned together.</p>
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
              pendingLabel="Assigning quarterfinals…"
              variant="primary"
            >
              Assign quarterfinals
            </GroupTransitionSubmitButton>
          </div>
        ) : (
          <button
            ref={assignButtonRef}
            className="group-transition-button group-transition-button--primary"
            type="button"
            onClick={() => setConfirming(true)}
          >
            Assign quarterfinals
          </button>
        )}
      </div>
    </form>
  );
}
