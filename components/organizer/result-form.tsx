"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import { updateMatchResult } from "@/app/matches/[code]/result/actions";
import type { TournamentMatch } from "@/lib/data/schema";
import type {
  ResultField,
  ResultFormState,
} from "@/lib/matches/result";
import { ResultSubmitButton } from "./result-submit-button";

type ResultFormProps = {
  initialState: ResultFormState;
  match: Pick<
    TournamentMatch,
    "id" | "team1" | "team1_id" | "team2" | "team2_id"
  >;
};

function describedBy(
  helpId: string,
  error?: string,
): string {
  return error ? `${helpId} ${helpId}-error` : helpId;
}

function ScoreInput({
  field,
  label,
  defaultValue,
  error,
}: {
  field: ResultField;
  label: string;
  defaultValue: string;
  error?: string;
}) {
  return (
    <div className="score-entry__input">
      <label className="sr-only" htmlFor={field}>
        {label}
      </label>
      <input
        id={field}
        name={field}
        type="number"
        inputMode="numeric"
        min="0"
        step="1"
        required={field.startsWith("set1") || field.startsWith("set2")}
        defaultValue={defaultValue}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${field}-error` : undefined}
      />
      {error ? (
        <span className="sr-only" id={`${field}-error`}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function ResultForm({
  initialState,
  match,
}: ResultFormProps) {
  const [state, formAction] = useActionState(
    updateMatchResult,
    initialState,
  );
  const [confirmingClear, setConfirmingClear] = useState(false);
  const clearButtonRef = useRef<HTMLButtonElement>(null);
  const keepButtonRef = useRef<HTMLButtonElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const previousHasResult = useRef(state.hasResult);
  const team1Name = match.team1?.name ?? "Team 1";
  const team2Name = match.team2?.name ?? "Team 2";
  const setErrors = [1, 2, 3].map((setNumber) => {
    const team1Field = `set${setNumber}Team1` as ResultField;
    const team2Field = `set${setNumber}Team2` as ResultField;
    return state.fieldErrors[team1Field] ?? state.fieldErrors[team2Field];
  });

  useEffect(() => {
    if (confirmingClear) {
      keepButtonRef.current?.focus();
    }
  }, [confirmingClear]);

  useEffect(() => {
    if (previousHasResult.current && !state.hasResult) {
      feedbackRef.current?.focus();
    }
    previousHasResult.current = state.hasResult;
  }, [state.hasResult]);

  function cancelClear(): void {
    setConfirmingClear(false);
    requestAnimationFrame(() => clearButtonRef.current?.focus());
  }

  return (
    <form
      className="result-form"
      action={formAction}
      key={state.expectedUpdatedAt}
    >
      <input type="hidden" name="matchId" value={match.id} />
      <input
        type="hidden"
        name="expectedUpdatedAt"
        value={state.expectedUpdatedAt}
      />

      {state.message ? (
        <div
          ref={feedbackRef}
          tabIndex={-1}
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
              Reload match
            </button>
          ) : null}
        </div>
      ) : null}

      <fieldset className="result-choice">
        <legend>Winner (required)</legend>
        <p id="winner-help" className="form-help">
          Choose the team that won two sets.
        </p>
        <div className="result-choice__options">
          {[
            [match.team1_id, team1Name],
            [match.team2_id, team2Name],
          ].map(([teamId, teamName]) => (
            <label key={teamId}>
              <input
                type="radio"
                name="winnerId"
                value={teamId ?? ""}
                required
                defaultChecked={state.values.winnerId === teamId}
                aria-describedby={describedBy(
                  "winner-help",
                  state.fieldErrors.winnerId,
                )}
              />
              <span>{teamName}</span>
            </label>
          ))}
        </div>
        {state.fieldErrors.winnerId ? (
          <p id="winner-help-error" className="form-error" role="alert">
            {state.fieldErrors.winnerId}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="score-entry">
        <legend>Set scores (required)</legend>
        <p className="form-help" id="score-entry-help">
          Enter both scores for sets one and two. Use set three only when the
          teams split the first two sets.
        </p>
        <div
          className="score-entry__grid"
          aria-describedby="score-entry-help"
        >
          <span className="score-entry__corner" aria-hidden="true" />
          <span className="score-entry__heading">Set 1</span>
          <span className="score-entry__heading">Set 2</span>
          <span className="score-entry__heading">Set 3</span>

          <span className="score-entry__team">{team1Name}</span>
          {[1, 2, 3].map((setNumber) => {
            const field = `set${setNumber}Team1` as ResultField;
            return (
              <ScoreInput
                key={field}
                field={field}
                label={`${team1Name}, set ${setNumber}`}
                defaultValue={state.values[field]}
                error={state.fieldErrors[field]}
              />
            );
          })}

          <span className="score-entry__team">{team2Name}</span>
          {[1, 2, 3].map((setNumber) => {
            const field = `set${setNumber}Team2` as ResultField;
            return (
              <ScoreInput
                key={field}
                field={field}
                label={`${team2Name}, set ${setNumber}`}
                defaultValue={state.values[field]}
                error={state.fieldErrors[field]}
              />
            );
          })}
        </div>
        {setErrors.map((error, index) =>
          error ? (
            <p className="form-error" role="alert" key={`set-error-${index}`}>
              Set {index + 1}: {error}
            </p>
          ) : null,
        )}
      </fieldset>

      <fieldset className="result-choice">
        <legend>Deciding set format (required)</legend>
        <p id="format-help" className="form-help">
          Record the format agreed for a third set, even if the match ended in
          two.
        </p>
        <div className="result-choice__options">
          <label>
            <input
              type="radio"
              name="decidingSetFormat"
              value="full_set"
              required
              defaultChecked={state.values.decidingSetFormat === "full_set"}
              aria-describedby={describedBy(
                "format-help",
                state.fieldErrors.decidingSetFormat,
              )}
            />
            <span>Full third set</span>
          </label>
          <label>
            <input
              type="radio"
              name="decidingSetFormat"
              value="match_tiebreak"
              required
              defaultChecked={
                state.values.decidingSetFormat === "match_tiebreak"
              }
              aria-describedby={describedBy(
                "format-help",
                state.fieldErrors.decidingSetFormat,
              )}
            />
            <span>10-point match tiebreak</span>
          </label>
        </div>
        {state.fieldErrors.decidingSetFormat ? (
          <p id="format-help-error" className="form-error" role="alert">
            {state.fieldErrors.decidingSetFormat}
          </p>
        ) : null}
      </fieldset>

      <div className="schedule-form__date-time">
        <div className="form-field">
          <label htmlFor="playedDate">Played date (required)</label>
          <p id="played-date-help" className="form-help">
            Tournament dates use Central Time.
          </p>
          <input
            id="playedDate"
            name="playedDate"
            type="date"
            defaultValue={state.values.playedDate}
            required
            aria-describedby={describedBy(
              "played-date-help",
              state.fieldErrors.playedDate,
            )}
            aria-invalid={state.fieldErrors.playedDate ? true : undefined}
          />
          {state.fieldErrors.playedDate ? (
            <p id="played-date-help-error" className="form-error" role="alert">
              {state.fieldErrors.playedDate}
            </p>
          ) : null}
        </div>

        <div className="form-field">
          <label htmlFor="playedTime">Played time (required)</label>
          <p id="played-time-help" className="form-help">
            Enter the local court time.
          </p>
          <input
            id="playedTime"
            name="playedTime"
            type="time"
            defaultValue={state.values.playedTime}
            required
            aria-describedby={describedBy(
              "played-time-help",
              state.fieldErrors.playedTime,
            )}
            aria-invalid={state.fieldErrors.playedTime ? true : undefined}
          />
          {state.fieldErrors.playedTime ? (
            <p id="played-time-help-error" className="form-error" role="alert">
              {state.fieldErrors.playedTime}
            </p>
          ) : null}
        </div>
      </div>

      <div className="result-form__actions">
        <ResultSubmitButton
          intent="save"
          pendingLabel="Recording result…"
          variant="primary"
        >
          {state.hasResult ? "Save correction" : "Record result"}
        </ResultSubmitButton>
      </div>

      {state.hasResult ? (
        <div className="result-clear">
          <h3>Clear this result</h3>
          <p>
            This removes the winner, scores, and played time. The existing
            schedule remains when one is set.
          </p>
          {confirmingClear ? (
            <div className="result-clear__confirmation" role="group" aria-label="Confirm clear result">
              <button
                ref={keepButtonRef}
                className="result-button result-button--quiet"
                type="button"
                onClick={cancelClear}
              >
                Keep result
              </button>
              <ResultSubmitButton
                intent="clear"
                pendingLabel="Clearing result…"
                variant="destructive"
              >
                Clear result
              </ResultSubmitButton>
            </div>
          ) : (
            <button
              ref={clearButtonRef}
              className="result-button result-button--destructive"
              type="button"
              onClick={() => setConfirmingClear(true)}
            >
              Clear result
            </button>
          )}
        </div>
      ) : null}
    </form>
  );
}
