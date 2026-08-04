"use client";

import { useEffect, useRef, useState } from "react";

import { updateMatchSchedule } from "@/app/matches/[code]/schedule/actions";
import {
  NETWORK_FAILURE_MESSAGE,
  useResilientFormAction,
} from "@/components/forms/use-resilient-form-action";
import type { ScheduleFormState } from "@/lib/matches/schedule";
import { ScheduleSubmitButton } from "./schedule-submit-button";

type ScheduleFormProps = {
  initialState: ScheduleFormState;
  matchId: string;
};

function describedBy(helpId: string, error?: string): string {
  return error ? `${helpId} ${helpId}-error` : helpId;
}

function readValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function networkFailureState(
  previousState: ScheduleFormState,
  formData: FormData,
): ScheduleFormState {
  return {
    ...previousState,
    status: "error",
    message: NETWORK_FAILURE_MESSAGE,
    fieldErrors: {},
    values: {
      date: readValue(formData, "date"),
      time: readValue(formData, "time"),
      venue: readValue(formData, "venue"),
    },
  };
}

export function ScheduleForm({
  initialState,
  matchId,
}: ScheduleFormProps) {
  const [state, formAction] = useResilientFormAction(
    updateMatchSchedule,
    networkFailureState,
    initialState,
  );
  const [confirmingClear, setConfirmingClear] = useState(false);
  const clearButtonRef = useRef<HTMLButtonElement>(null);
  const keepScheduleButtonRef = useRef<HTMLButtonElement>(null);
  const canClear = Boolean(state.values.date && state.values.time);

  useEffect(() => {
    if (confirmingClear) {
      keepScheduleButtonRef.current?.focus();
    }
  }, [confirmingClear]);

  function cancelClear(): void {
    setConfirmingClear(false);
    requestAnimationFrame(() => clearButtonRef.current?.focus());
  }

  return (
    <form
      className="schedule-form"
      action={formAction}
      key={state.expectedUpdatedAt}
    >
      <input type="hidden" name="matchId" value={matchId} />
      <input
        type="hidden"
        name="expectedUpdatedAt"
        value={state.expectedUpdatedAt}
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
              Reload match
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="schedule-form__date-time">
        <div className="form-field">
          <label htmlFor="schedule-date">Date (required)</label>
          <p id="schedule-date-help" className="form-help">
            Tournament dates use Central Time.
          </p>
          <input
            id="schedule-date"
            name="date"
            type="date"
            defaultValue={state.values.date}
            required
            aria-describedby={describedBy(
              "schedule-date-help",
              state.fieldErrors.date,
            )}
            aria-invalid={state.fieldErrors.date ? true : undefined}
          />
          {state.fieldErrors.date ? (
            <p
              id="schedule-date-help-error"
              className="form-error"
              role="alert"
            >
              {state.fieldErrors.date}
            </p>
          ) : null}
        </div>

        <div className="form-field">
          <label htmlFor="schedule-time">Time (required)</label>
          <p id="schedule-time-help" className="form-help">
            Enter the local court time.
          </p>
          <input
            id="schedule-time"
            name="time"
            type="time"
            defaultValue={state.values.time}
            required
            aria-describedby={describedBy(
              "schedule-time-help",
              state.fieldErrors.time,
            )}
            aria-invalid={state.fieldErrors.time ? true : undefined}
          />
          {state.fieldErrors.time ? (
            <p
              id="schedule-time-help-error"
              className="form-error"
              role="alert"
            >
              {state.fieldErrors.time}
            </p>
          ) : null}
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="schedule-venue">Court or venue (required)</label>
        <p id="schedule-venue-help" className="form-help">
          Include a court number when it helps players find the match.
        </p>
        <input
          id="schedule-venue"
          name="venue"
          type="text"
          defaultValue={state.values.venue}
          maxLength={160}
          autoComplete="off"
          required
          aria-describedby={describedBy(
            "schedule-venue-help",
            state.fieldErrors.venue,
          )}
          aria-invalid={state.fieldErrors.venue ? true : undefined}
        />
        {state.fieldErrors.venue ? (
          <p
            id="schedule-venue-help-error"
            className="form-error"
            role="alert"
          >
            {state.fieldErrors.venue}
          </p>
        ) : null}
      </div>

      <div className="schedule-form__actions">
        <ScheduleSubmitButton
          intent="save"
          pendingLabel="Saving schedule…"
          variant="primary"
        >
          Save schedule
        </ScheduleSubmitButton>
      </div>

      {canClear ? (
        <div className="result-clear">
          <h3>Remove this schedule</h3>
          <p>
            This clears the date, time, and court, and returns the match to the
            unscheduled list.
          </p>
          {confirmingClear ? (
            <div
              className="result-clear__confirmation"
              role="group"
              aria-label="Confirm removing the schedule"
            >
              <button
                ref={keepScheduleButtonRef}
                className="result-button result-button--quiet"
                type="button"
                onClick={cancelClear}
              >
                Keep schedule
              </button>
              <ScheduleSubmitButton
                intent="clear"
                pendingLabel="Removing schedule…"
                variant="destructive"
              >
                Remove schedule
              </ScheduleSubmitButton>
            </div>
          ) : (
            <button
              ref={clearButtonRef}
              className="result-button result-button--destructive"
              type="button"
              onClick={() => setConfirmingClear(true)}
            >
              Remove schedule
            </button>
          )}
        </div>
      ) : null}
    </form>
  );
}
