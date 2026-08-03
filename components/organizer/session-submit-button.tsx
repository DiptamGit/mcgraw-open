"use client";

import { useFormStatus } from "react-dom";

type SessionSubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "primary" | "quiet";
};

export function SessionSubmitButton({
  children,
  pendingLabel,
  variant = "primary",
}: SessionSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`session-button session-button--${variant}`}
      type="submit"
      disabled={pending}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
