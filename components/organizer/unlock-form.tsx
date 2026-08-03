import { SessionSubmitButton } from "./session-submit-button";

type UnlockFormProps = {
  errorMessage?: string;
  returnTo: string;
};

export function UnlockForm({ errorMessage, returnTo }: UnlockFormProps) {
  const errorId = errorMessage ? "organizer-pin-error" : undefined;

  return (
    <form className="unlock-form" action="/organizer/session" method="post">
      <input type="hidden" name="intent" value="unlock" />
      <input type="hidden" name="returnTo" value={returnTo} />

      <div className="form-field">
        <label htmlFor="organizer-pin">Shared organizer PIN</label>
        <p id="organizer-pin-help" className="form-help">
          Enter the tournament organizer PIN. It is used only for this unlock
          request.
        </p>
        <input
          id="organizer-pin"
          name="pin"
          type="password"
          minLength={4}
          maxLength={128}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-describedby={
            errorId ? `organizer-pin-help ${errorId}` : "organizer-pin-help"
          }
          aria-invalid={errorMessage ? true : undefined}
        />
        {errorMessage ? (
          <p id={errorId} className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <SessionSubmitButton pendingLabel="Unlocking…">
        Unlock organizer mode
      </SessionSubmitButton>
    </form>
  );
}
