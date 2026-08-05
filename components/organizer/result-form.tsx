"use client";

import { Fragment, useEffect, useRef, useState } from "react";

import { updateMatchResult } from "@/app/matches/[code]/result/actions";
import { FormErrorSummary } from "@/components/forms/form-error-summary";
import {
  NETWORK_FAILURE_MESSAGE,
  useResilientFormAction,
} from "@/components/forms/use-resilient-form-action";
import { TeamName } from "@/components/matches/team-name";
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
type DerivedOutcome = { tone: "success" | "pending"; text: string };

function normalizeOutcome(value: string): ResultOutcome {
  return value === "retirement" || value === "walkover" ? value : "normal";
}

function normalizeFormat(value: string): "full_set" | "match_tiebreak" {
  return value === "match_tiebreak" ? "match_tiebreak" : "full_set";
}

const RESULT_FIELDS: (keyof ResultFormValues)[] = [
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

function readValue(formData: FormData, name: keyof ResultFormValues): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function networkFailureState(
  previousState: ResultFormState,
  formData: FormData,
): ResultFormState {
  return {
    ...previousState,
    status: "error",
    message: NETWORK_FAILURE_MESSAGE,
    fieldErrors: {},
    values: RESULT_FIELDS.reduce(
      (values, field) => ({ ...values, [field]: readValue(formData, field) }),
      { ...previousState.values },
    ),
  };
}

function describedBy(helpId: string, error?: string): string {
  return error ? `${helpId} ${helpId}-error` : helpId;
}

/**
 * Restates the entered result in words so an organizer can confirm it before
 * saving. It is a live preview only; the server action re-validates the score.
 */
function deriveOutcome(
  values: ResultFormValues,
  team1: { id: string | null; name: string },
  team2: { id: string | null; name: string },
): DerivedOutcome {
  const outcome = normalizeOutcome(values.outcomeType);
  const winnerName =
    values.winnerId && values.winnerId === team1.id
      ? team1.name
      : values.winnerId && values.winnerId === team2.id
        ? team2.name
        : null;

  if (!winnerName) {
    return {
      tone: "pending",
      text: "Choose the winning team to preview the result.",
    };
  }

  if (outcome === "walkover") {
    return {
      tone: "success",
      text: `Winner: ${winnerName} — awarded by walkover, no games played.`,
    };
  }

  const rows: [string, string][] = [
    [values.set1Team1, values.set1Team2],
    [values.set2Team1, values.set2Team2],
    [values.set3Team1, values.set3Team2],
  ];
  const parts: string[] = [];
  let team1Sets = 0;
  let team2Sets = 0;

  for (const [rawOne, rawTwo] of rows) {
    if (rawOne === "" || rawTwo === "") {
      continue;
    }
    const one = Number(rawOne);
    const two = Number(rawTwo);
    if (!Number.isFinite(one) || !Number.isFinite(two)) {
      continue;
    }
    parts.push(`${one}-${two}`);
    if (one > two) {
      team1Sets += 1;
    } else if (two > one) {
      team2Sets += 1;
    }
  }

  const scoreText = parts.join(", ");

  if (outcome === "retirement") {
    return {
      tone: "success",
      text: scoreText
        ? `Winner: ${winnerName} — awarded by retirement at ${scoreText}.`
        : `Winner: ${winnerName} — awarded by retirement.`,
    };
  }

  const winnerSets = values.winnerId === team1.id ? team1Sets : team2Sets;
  const loserSets = values.winnerId === team1.id ? team2Sets : team1Sets;

  if (winnerSets < 2) {
    return {
      tone: "pending",
      text: `Enter the sets ${winnerName} won to preview the result.`,
    };
  }

  return {
    tone: "success",
    text: `Winner: ${winnerName} — ${
      loserSets === 0 ? "two sets to love" : "two sets to one"
    }.`,
  };
}

function ScoreInput({
  field,
  label,
  defaultValue,
  error,
  required,
  isMatchTiebreak,
}: {
  field: ResultField;
  label: string;
  defaultValue: string;
  error?: string;
  required: boolean;
  isMatchTiebreak: boolean;
}) {
  return (
    <div
      className={`score-entry__input${
        isMatchTiebreak ? " score-entry__input--mtb" : ""
      }`}
    >
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

export function ResultForm({ initialState, match }: ResultFormProps) {
  const [state, formAction] = useResilientFormAction(
    updateMatchResult,
    networkFailureState,
    initialState,
  );
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [snapshot, setSnapshot] = useState<ResultFormValues>(state.values);
  const formRef = useRef<HTMLFormElement>(null);
  const clearButtonRef = useRef<HTMLButtonElement>(null);
  const keepButtonRef = useRef<HTMLButtonElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const previousHasResult = useRef(state.hasResult);

  const selectedOutcome = normalizeOutcome(snapshot.outcomeType);
  const selectedFormat = normalizeFormat(snapshot.decidingSetFormat);
  const isMatchTiebreak =
    selectedOutcome !== "walkover" && selectedFormat === "match_tiebreak";
  const team1Name = match.team1?.name ?? "Team 1";
  const team2Name = match.team2?.name ?? "Team 2";
  const teams: { id: string | null; name: string }[] = [
    { id: match.team1_id, name: team1Name },
    { id: match.team2_id, name: team2Name },
  ];
  const derived = deriveOutcome(snapshot, teams[0], teams[1]);

  const setErrors = [1, 2, 3].map((setNumber) => {
    const team1Field = `set${setNumber}Team1` as ResultField;
    const team2Field = `set${setNumber}Team2` as ResultField;
    return state.fieldErrors[team1Field] ?? state.fieldErrors[team2Field];
  });

  const errorSummary = (
    [
      ["outcomeType", "outcome-help"],
      ["winnerId", "winner-help"],
      ["set1Team1", "set1Team1"],
      ["set1Team2", "set1Team2"],
      ["set2Team1", "set2Team1"],
      ["set2Team2", "set2Team2"],
      ["set3Team1", "set3Team1"],
      ["set3Team2", "set3Team2"],
      ["decidingSetFormat", "format-help"],
      ["playedDate", "playedDate"],
      ["playedTime", "playedTime"],
    ] as const
  ).flatMap(([field, targetId]) => {
    const message = state.fieldErrors[field];
    return message ? [{ targetId, message }] : [];
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

  function refreshSnapshot() {
    const form = formRef.current;
    if (!form) {
      return;
    }
    const data = new FormData(form);
    setSnapshot((current) =>
      RESULT_FIELDS.reduce(
        (values, field) => ({ ...values, [field]: readValue(data, field) }),
        { ...current },
      ),
    );
  }

  function cancelClear(): void {
    setConfirmingClear(false);
    requestAnimationFrame(() => clearButtonRef.current?.focus());
  }

  return (
    <form
      className="result-form"
      action={formAction}
      key={state.expectedUpdatedAt}
      ref={formRef}
      onChange={refreshSnapshot}
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
          <FormErrorSummary errors={errorSummary} />
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

      <fieldset className="result-fieldset">
        <legend>Outcome (required)</legend>
        <p id="outcome-help" className="form-help">
          Choose how the match ended.
        </p>
        <div className="chip-group">
          {(
            [
              ["normal", "Normal result"],
              ["retirement", "Retirement"],
              ["walkover", "Walkover"],
            ] as const
          ).map(([value, label]) => (
            <label className="chip" key={value}>
              <input
                type="radio"
                name="outcomeType"
                value={value}
                required
                defaultChecked={
                  normalizeOutcome(state.values.outcomeType) === value
                }
                aria-describedby={describedBy(
                  "outcome-help",
                  state.fieldErrors.outcomeType,
                )}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        {state.fieldErrors.outcomeType ? (
          <p id="outcome-help-error" className="form-error" role="alert">
            {state.fieldErrors.outcomeType}
          </p>
        ) : null}
      </fieldset>

      {selectedOutcome === "walkover" ? (
        <>
          <fieldset className="result-fieldset">
            <legend>Winner (required)</legend>
            <p id="winner-help" className="form-help">
              Choose the team awarded the match win.
            </p>
            <div className="winner-choice">
              {teams.map((team) => (
                <label className="winner-ring" key={team.id ?? team.name}>
                  <input
                    type="radio"
                    name="winnerId"
                    value={team.id ?? ""}
                    required
                    defaultChecked={state.values.winnerId === team.id}
                    aria-describedby={describedBy(
                      "winner-help",
                      state.fieldErrors.winnerId,
                    )}
                  />
                  <span className="winner-ring__control" aria-hidden="true" />
                  <span className="winner-ring__name">
                    <TeamName name={team.name} />
                  </span>
                </label>
              ))}
            </div>
            {state.fieldErrors.winnerId ? (
              <p id="winner-help-error" className="form-error" role="alert">
                {state.fieldErrors.winnerId}
              </p>
            ) : null}
          </fieldset>

          <div className="result-outcome-note">
            <strong>No score for a walkover.</strong>
            <p>
              The winner and played time will be recorded without set scores or
              a deciding set format.
            </p>
          </div>
        </>
      ) : (
        <>
          <fieldset className="score-entry">
            <legend>
              {selectedOutcome === "normal"
                ? "Winner and set scores (required)"
                : "Winner and score at retirement"}
            </legend>
            <p className="form-help" id="score-entry-help">
              {selectedOutcome === "normal"
                ? "Select the winning team, then enter both scores for sets one and two. Use set three only when the teams split the first two sets."
                : "Select the team awarded the win, then enter the score reached before retirement."}
            </p>
            <p className="sr-only" id="winner-help">
              Select the winning team.
            </p>
            <div
              className="score-entry__grid"
              aria-describedby="score-entry-help"
            >
              <span className="score-entry__corner" aria-hidden="true" />
              <span className="score-entry__heading">S1</span>
              <span className="score-entry__heading">S2</span>
              <span
                className={`score-entry__heading${
                  isMatchTiebreak ? " score-entry__heading--mtb" : ""
                }`}
              >
                {isMatchTiebreak ? "MTB" : "S3"}
              </span>

              {teams.map((team) => {
                const suffix = team.id === match.team1_id ? "Team1" : "Team2";
                return (
                  <Fragment key={team.id ?? team.name}>
                    <label className="winner-ring">
                      <input
                        type="radio"
                        name="winnerId"
                        value={team.id ?? ""}
                        required
                        defaultChecked={state.values.winnerId === team.id}
                        aria-describedby={describedBy(
                          "winner-help",
                          state.fieldErrors.winnerId,
                        )}
                      />
                      <span
                        className="winner-ring__control"
                        aria-hidden="true"
                      />
                      <span className="winner-ring__name">
                        <TeamName name={team.name} />
                      </span>
                    </label>
                    {[1, 2, 3].map((setNumber) => {
                      const field = `set${setNumber}${suffix}` as ResultField;
                      const isDeciding = setNumber === 3;
                      return (
                        <ScoreInput
                          key={field}
                          field={field}
                          label={
                            isDeciding && isMatchTiebreak
                              ? `${team.name}, match tiebreak`
                              : `${team.name}, set ${setNumber}`
                          }
                          defaultValue={state.values[field]}
                          error={state.fieldErrors[field]}
                          required={selectedOutcome === "normal" && setNumber < 3}
                          isMatchTiebreak={isDeciding && isMatchTiebreak}
                        />
                      );
                    })}
                  </Fragment>
                );
              })}
            </div>
            {state.fieldErrors.winnerId ? (
              <p id="winner-help-error" className="form-error" role="alert">
                {state.fieldErrors.winnerId}
              </p>
            ) : null}
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

          <fieldset className="result-fieldset">
            <legend>Deciding set format (required)</legend>
            <p id="format-help" className="form-help">
              Record the format agreed for a third set, even if the match ended
              earlier. The match tiebreak counts as a set but not as games.
            </p>
            <div className="chip-group">
              {(
                [
                  ["full_set", "Full third set"],
                  ["match_tiebreak", "10-point match tiebreak"],
                ] as const
              ).map(([value, label]) => (
                <label className="chip" key={value}>
                  <input
                    type="radio"
                    name="decidingSetFormat"
                    value={value}
                    required
                    defaultChecked={state.values.decidingSetFormat === value}
                    aria-describedby={describedBy(
                      "format-help",
                      state.fieldErrors.decidingSetFormat,
                    )}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            {state.fieldErrors.decidingSetFormat ? (
              <p id="format-help-error" className="form-error" role="alert">
                {state.fieldErrors.decidingSetFormat}
              </p>
            ) : null}
          </fieldset>
        </>
      )}

      <div
        className={`result-derived${
          derived.tone === "pending" ? " result-derived--pending" : ""
        }`}
        aria-live="polite"
      >
        <p className="result-derived__label">Derived outcome</p>
        <p>{derived.text}</p>
      </div>

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
            <div
              className="result-clear__confirmation"
              role="group"
              aria-label="Confirm clear result"
            >
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
