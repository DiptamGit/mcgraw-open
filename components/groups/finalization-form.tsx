"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { finalizeGroups } from "@/app/groups/finalize/actions";
import type {
  FinalizationFormState,
  FinalizationPreview,
  FinalizationPreviewGroup,
  ManualTieOrders,
} from "@/lib/groups/finalization";
import { GroupTransitionSubmitButton } from "./group-transition-submit-button";

function orderedRows(
  group: FinalizationPreviewGroup,
  orders: ManualTieOrders,
) {
  const rowsById = new Map(group.rows.map((row) => [row.teamId, row]));
  const addedTies = new Set<string>();

  return group.rows.flatMap((row) => {
    if (!row.tieKey) {
      return [{ ...row, finalRank: row.automaticRank }];
    }
    if (addedTies.has(row.tieKey)) {
      return [];
    }

    addedTies.add(row.tieKey);
    const order = orders[row.tieKey] ?? [];
    return order.map((teamId, index) => {
      const tiedRow = rowsById.get(teamId);
      if (!tiedRow) {
        return {
          teamId,
          teamName: "Unknown tied team",
          automaticRank: row.automaticRank,
          tieKey: row.tieKey,
          finalRank: row.automaticRank + index,
        };
      }
      return {
        ...tiedRow,
        finalRank: row.automaticRank + index,
      };
    });
  });
}

export function FinalizationForm({
  expectedStateUpdatedAt,
  initialState,
  preview,
}: {
  expectedStateUpdatedAt: string;
  initialState: FinalizationFormState;
  preview: FinalizationPreview;
}) {
  const [state, formAction] = useActionState(finalizeGroups, initialState);
  const [orders, setOrders] = useState(state.values.manualOrders);
  const [note, setNote] = useState(state.values.tieResolutionNote);
  const [confirming, setConfirming] = useState(false);
  const finalizeButtonRef = useRef<HTMLButtonElement>(null);
  const keepLiveButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) {
      keepLiveButtonRef.current?.focus();
    }
  }, [confirming]);

  function moveTeam(tieKey: string, teamId: string, offset: -1 | 1) {
    setOrders((current) => {
      const order = current[tieKey] ?? [];
      const index = order.indexOf(teamId);
      const destination = index + offset;
      if (index < 0 || destination < 0 || destination >= order.length) {
        return current;
      }

      const nextOrder = [...order];
      [nextOrder[index], nextOrder[destination]] = [
        nextOrder[destination],
        nextOrder[index],
      ];
      return { ...current, [tieKey]: nextOrder };
    });
    setConfirming(false);
  }

  function cancelConfirmation() {
    setConfirming(false);
    requestAnimationFrame(() => finalizeButtonRef.current?.focus());
  }

  return (
    <form className="finalization-form" action={formAction}>
      <input
        type="hidden"
        name="expectedStateUpdatedAt"
        value={expectedStateUpdatedAt}
      />
      <input
        type="hidden"
        name="expectedMatchVersions"
        value={JSON.stringify(preview.expectedMatchVersions)}
      />
      <input
        type="hidden"
        name="manualOrders"
        value={JSON.stringify(orders)}
      />

      {state.message ? (
        <div
          className={`form-feedback form-feedback--${state.status}`}
          role={state.status === "error" || state.status === "conflict" ? "alert" : "status"}
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

      <div className="final-rank-preview">
        {preview.groups.map((group) => (
          <section
            className="final-rank-group"
            key={group.groupLabel}
            aria-labelledby={`final-rank-group-${group.groupLabel}`}
          >
            <header>
              <span className="group-shield" aria-hidden="true">
                {group.groupLabel}
              </span>
              <div>
                <p className="utility-label">Locked rank preview</p>
                <h2 id={`final-rank-group-${group.groupLabel}`}>
                  Group {group.groupLabel}
                </h2>
              </div>
            </header>
            <ol>
              {orderedRows(group, orders).map((row) => {
                const tieOrder = row.tieKey
                  ? orders[row.tieKey] ?? []
                  : [];
                const tieIndex = tieOrder.indexOf(row.teamId);

                return (
                  <li
                    className={row.tieKey ? "final-rank-row final-rank-row--tie" : "final-rank-row"}
                    key={row.teamId}
                  >
                    <span className="final-rank-row__rank">
                      {row.finalRank}
                    </span>
                    <span className="final-rank-row__team">
                      {row.teamName}
                      {row.tieKey ? <small>Manual tie order</small> : null}
                    </span>
                    {row.tieKey ? (
                      <span className="final-rank-row__controls">
                        <button
                          type="button"
                          onClick={() =>
                            moveTeam(row.tieKey!, row.teamId, -1)
                          }
                          disabled={tieIndex <= 0}
                          aria-label={`Move ${row.teamName} up`}
                        >
                          Move up
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            moveTeam(row.tieKey!, row.teamId, 1)
                          }
                          disabled={
                            tieIndex < 0 || tieIndex === tieOrder.length - 1
                          }
                          aria-label={`Move ${row.teamName} down`}
                        >
                          Move down
                        </button>
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      {preview.ties.length > 0 ? (
        <div className="form-field tie-resolution-field">
          <label htmlFor="tieResolutionNote">
            Tie-resolution reason (required)
          </label>
          <p id="tie-resolution-help" className="form-help">
            Explain the fair method used to choose the final order shown above.
          </p>
          <textarea
            id="tieResolutionNote"
            name="tieResolutionNote"
            rows={5}
            maxLength={1000}
            required
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setConfirming(false);
            }}
            aria-describedby={
              state.fieldErrors.tieResolutionNote
                ? "tie-resolution-help tie-resolution-error"
                : "tie-resolution-help"
            }
            aria-invalid={
              state.fieldErrors.tieResolutionNote ? true : undefined
            }
          />
          {state.fieldErrors.tieResolutionNote ? (
            <p
              id="tie-resolution-error"
              className="form-error"
              role="alert"
            >
              {state.fieldErrors.tieResolutionNote}
            </p>
          ) : null}
        </div>
      ) : (
        <input type="hidden" name="tieResolutionNote" value="" />
      )}

      {state.fieldErrors.manualOrders ? (
        <p className="form-error" role="alert">
          {state.fieldErrors.manualOrders}
        </p>
      ) : null}

      <div className="group-transition-actions">
        {confirming ? (
          <div
            className="group-transition-confirmation"
            role="group"
            aria-label="Confirm group finalization"
          >
            <div>
              <strong>Lock all group results?</strong>
              <p>
                Corrections will require reopening the entire group stage.
              </p>
            </div>
            <button
              ref={keepLiveButtonRef}
              className="group-transition-button group-transition-button--quiet"
              type="button"
              onClick={cancelConfirmation}
            >
              Keep groups live
            </button>
            <GroupTransitionSubmitButton
              pendingLabel="Finalizing groups…"
              variant="primary"
            >
              Finalize groups
            </GroupTransitionSubmitButton>
          </div>
        ) : (
          <button
            ref={finalizeButtonRef}
            className="group-transition-button group-transition-button--primary"
            type="button"
            onClick={() => setConfirming(true)}
          >
            Finalize groups
          </button>
        )}
      </div>
    </form>
  );
}
