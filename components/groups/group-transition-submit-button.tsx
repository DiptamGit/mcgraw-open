"use client";

import { useFormStatus } from "react-dom";

export function GroupTransitionSubmitButton({
  children,
  pendingLabel,
  variant,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant: "primary" | "destructive";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`group-transition-button group-transition-button--${variant}`}
      type="submit"
      disabled={pending}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
