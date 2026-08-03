"use client";

import { useActionState } from "react";

import { updateMatchSchedule } from "@/app/matches/[code]/schedule/actions";
import type { ScheduleFormState } from "@/lib/matches/schedule";
import { ScheduleSubmitButton } from "./schedule-submit-button";

type ScheduleFormProps = {
  initialState: ScheduleFormState;
  matchId: string;
};

function describedBy(helpId: string, error?: string): string {
  return error ? `${helpId} ${helpId}-error` : helpId;
}

export function ScheduleForm({
  initialState,
  matchId,
}: ScheduleFormProps) {
  const [state, formAction] = useActionState(
    updateMatchSchedule,
    initialState,
  );
  const canClear = Boolean(state.values.date && state.values.time);

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
        {canClear ? (
          <ScheduleSubmitButton
            intent="clear"
            pendingLabel="Removing schedule…"
            variant="destructive"
          >
            Remove schedule
          </ScheduleSubmitButton>
        ) : null}
      </div>
    </form>
  );
}
