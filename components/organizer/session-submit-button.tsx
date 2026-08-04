"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/** Long enough for a slow court-side request, short enough to recover. */
const RECOVERY_MILLISECONDS = 20_000;

type SessionSubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "primary" | "quiet";
};

/**
 * The unlock and lock forms post to a route handler, so React form status
 * alone never reports pending. Watching the owning form keeps the pending
 * label honest and blocks a second submission on a slow mobile connection.
 */
export function SessionSubmitButton({
  children,
  pendingLabel,
  variant = "primary",
}: SessionSubmitButtonProps) {
  const { pending } = useFormStatus();
  const [submitting, setSubmitting] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    const form = buttonRef.current?.form;
    if (!form) {
      return;
    }

    let recoveryTimer: ReturnType<typeof setTimeout> | undefined;

    function release() {
      submittingRef.current = false;
      setSubmitting(false);
    }

    function handleSubmit(event: SubmitEvent) {
      if (submittingRef.current) {
        event.preventDefault();
        return;
      }

      submittingRef.current = true;
      setSubmitting(true);
      // A failed native post leaves this document in place, so the control is
      // released again instead of staying stuck on the pending label.
      recoveryTimer = setTimeout(release, RECOVERY_MILLISECONDS);
    }

    function handlePageShow() {
      clearTimeout(recoveryTimer);
      release();
    }

    form.addEventListener("submit", handleSubmit);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      clearTimeout(recoveryTimer);
      form.removeEventListener("submit", handleSubmit);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  const isPending = pending || submitting;

  return (
    <button
      ref={buttonRef}
      className={`session-button session-button--${variant}`}
      type="submit"
      disabled={isPending}
      aria-disabled={isPending || undefined}
    >
      {isPending ? pendingLabel : children}
    </button>
  );
}
