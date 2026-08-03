"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  reopenGroups,
  type ReopenGroupsFormState,
} from "@/app/groups/reopen/actions";
import { GroupTransitionSubmitButton } from "./group-transition-submit-button";

export function ReopenGroupsForm({
  expectedStateUpdatedAt,
  initialState,
  assignedQuarterfinals,
}: {
  expectedStateUpdatedAt: string;
  initialState: ReopenGroupsFormState;
  assignedQuarterfinals: number;
}) {
  const [state, formAction] = useActionState(reopenGroups, initialState);
  const [confirming, setConfirming] = useState(false);
  const reopenButtonRef = useRef<HTMLButtonElement>(null);
  const keepFinalizedButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) {
      keepFinalizedButtonRef.current?.focus();
    }
  }, [confirming]);

  function cancelConfirmation() {
    setConfirming(false);
    requestAnimationFrame(() => reopenButtonRef.current?.focus());
  }

  return (
    <form className="reopen-groups-form" action={formAction}>
      <input
        type="hidden"
        name="expectedStateUpdatedAt"
        value={expectedStateUpdatedAt}
      />

      {state.message ? (
        <div
          className={`form-feedback form-feedback--${state.status}`}
          role="alert"
          aria-live="polite"
        >
          <p>{state.message}</p>
          {state.status === "conflict" ? (
            <button
              className="schedule-reload"
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload standings
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="reopen-consequences">
        <h2>What reopening changes</h2>
        <ul>
          <li>All locked group ranks return to live standings.</li>
          <li>Group-result corrections become available again.</li>
          <li>The finalization time and any tie note are cleared.</li>
          {assignedQuarterfinals > 0 ? (
            <li>
              Team assignments in {assignedQuarterfinals} quarterfinal
              {assignedQuarterfinals === 1 ? "" : "s"} are cleared.
            </li>
          ) : null}
        </ul>
      </div>

      <div className="group-transition-actions">
        {confirming ? (
          <div
            className="group-transition-confirmation group-transition-confirmation--danger"
            role="group"
            aria-label="Confirm reopening groups"
          >
            <div>
              <strong>Return standings to live?</strong>
              <p>The current final ranks will no longer be locked.</p>
            </div>
            <button
              ref={keepFinalizedButtonRef}
              className="group-transition-button group-transition-button--quiet"
              type="button"
              onClick={cancelConfirmation}
            >
              Keep finalized
            </button>
            <GroupTransitionSubmitButton
              pendingLabel="Reopening groups…"
              variant="destructive"
            >
              Reopen groups
            </GroupTransitionSubmitButton>
          </div>
        ) : (
          <button
            ref={reopenButtonRef}
            className="group-transition-button group-transition-button--destructive"
            type="button"
            onClick={() => setConfirming(true)}
          >
            Reopen groups
          </button>
        )}
      </div>
    </form>
  );
}
