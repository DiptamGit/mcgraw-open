"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { updateMatchResult } from "@/app/matches/[code]/result/actions";
import {
  NETWORK_FAILURE_MESSAGE,
  useResilientFormAction,
} from "@/components/forms/use-resilient-form-action";
import type { TournamentMatch } from "@/lib/data/schema";
import type {
  ResultField,
  ResultFormState,
  ResultFormValues,
} from "@/lib/matches/result";
import { ResultSubmitButton } from "./result-submit-button";

type ResultFormProps = {
  initialState: ResultFormState;
  match: Pick<
    TournamentMatch,
    "id" | "team1" | "team1_id" | "team2" | "team2_id"
  >;
};

type ResultOutcome = "normal" | "retirement" | "walkover";

function normalizeOutcome(value: string): ResultOutcome {
  return value === "retirement" || value === "walkover"
    ? value
    : "normal";
}

function readValue(formData: FormData, name: keyof ResultFormValues): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function networkFailureState(
  previousState: ResultFormState,
  formData: FormData,
): ResultFormState {
  const fields: (keyof ResultFormValues)[] = [
    "outcomeType",
    "winnerId",
    "decidingSetFormat",
    "playedDate",
    "playedTime",
    "set1Team1",
    "set1Team2",
    "set2Team1",
    "set2Team2",
    "set3Team1",
    "set3Team2",
  ];

  return {
    ...previousState,
    status: "error",
    message: NETWORK_FAILURE_MESSAGE,
    fieldErrors: {},
    values: fields.reduce(
      (values, field) => ({ ...values, [field]: readValue(formData, field) }),
      { ...previousState.values },
    ),
  };
}

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
  required,
}: {
  field: ResultField;
  label: string;
  defaultValue: string;
  error?: string;
  required: boolean;
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
        required={required}
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
  const [state, formAction] = useResilientFormAction(
    updateMatchResult,
    networkFailureState,
    initialState,
  );
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [outcomeSelection, setOutcomeSelection] = useState<{
    version: string;
    outcome: ResultOutcome;
  }>({
    version: state.expectedUpdatedAt,
    outcome: normalizeOutcome(state.values.outcomeType),
  });
  const formRef = useRef<HTMLFormElement>(null);
  const clearButtonRef = useRef<HTMLButtonElement>(null);
  const keepButtonRef = useRef<HTMLButtonElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const previousHasResult = useRef(state.hasResult);
  const selectedOutcome =
    outcomeSelection.version === state.expectedUpdatedAt
      ? outcomeSelection.outcome
      : normalizeOutcome(state.values.outcomeType);
  const team1Name = match.team1?.name ?? "Team 1";
  const team2Name = match.team2?.name ?? "Team 2";
  const setErrors = [1, 2, 3].map((setNumber) => {
    const team1Field = `set${setNumber}Team1` as ResultField;
    const team2Field = `set${setNumber}Team2` as ResultField;
    return state.fieldErrors[team1Field] ?? state.fieldErrors[team2Field];
  });

  useEffect(() => {
    formRef.current?.setAttribute("data-hydrated", "true");
  }, []);

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
      ref={formRef}
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
        <legend>Outcome (required)</legend>
        <p id="outcome-help" className="form-help">
          Choose how the match ended.
        </p>
        <div className="result-choice__options result-choice__options--outcome">
          {[
            ["normal", "Normal result"],
            ["retirement", "Retirement"],
            ["walkover", "Walkover"],
          ].map(([value, label]) => {
            const outcome = value as ResultOutcome;
            return (
              <label key={outcome}>
                <input
                  type="radio"
                  name="outcomeType"
                  value={outcome}
                  required
                  checked={selectedOutcome === outcome}
                  onChange={() =>
                    setOutcomeSelection({
                      version: state.expectedUpdatedAt,
                      outcome,
                    })
                  }
                  aria-describedby={describedBy(
                    "outcome-help",
                    state.fieldErrors.outcomeType,
                  )}
                />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
        {state.fieldErrors.outcomeType ? (
          <p id="outcome-help-error" className="form-error" role="alert">
            {state.fieldErrors.outcomeType}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="result-choice">
        <legend>Winner (required)</legend>
        <p id="winner-help" className="form-help">
          {selectedOutcome === "normal"
            ? "Choose the team that won two sets."
            : "Choose the team awarded the match win."}
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

      {selectedOutcome === "walkover" ? (
        <div className="result-outcome-note">
          <strong>No score for a walkover.</strong>
          <p>
            The winner and played time will be recorded without set scores or
            a deciding set format.
          </p>
        </div>
      ) : (
        <>
          <fieldset className="score-entry">
            <legend>
              {selectedOutcome === "normal"
                ? "Set scores (required)"
                : "Score at retirement (optional)"}
            </legend>
            <p className="form-help" id="score-entry-help">
              {selectedOutcome === "normal"
                ? "Enter both scores for sets one and two. Use set three only when the teams split the first two sets."
                : "Enter the score reached before retirement. Complete both scores in each set used and leave unused later sets empty."}
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
                    required={
                      selectedOutcome === "normal" && setNumber < 3
                    }
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
                    required={
                      selectedOutcome === "normal" && setNumber < 3
                    }
                  />
                );
              })}
            </div>
            {setErrors.map((error, index) =>
              error ? (
                <p
                  className="form-error"
                  role="alert"
                  key={`set-error-${index}`}
                >
                  Set {index + 1}: {error}
                </p>
              ) : null,
            )}
          </fieldset>

          <fieldset className="result-choice">
            <legend>Deciding set format (required)</legend>
            <p id="format-help" className="form-help">
              Record the format agreed for a third set, even if the match ended
              earlier.
            </p>
            <div className="result-choice__options">
              <label>
                <input
                  type="radio"
                  name="decidingSetFormat"
                  value="full_set"
                  required
                  defaultChecked={
                    state.values.decidingSetFormat === "full_set"
                  }
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
        </>
      )}

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
