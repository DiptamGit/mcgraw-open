"use client";

import { useFormStatus } from "react-dom";

type ResultSubmitButtonProps = {
  children: React.ReactNode;
  intent: "save" | "clear";
  pendingLabel: string;
  variant: "primary" | "destructive";
};

export function ResultSubmitButton({
  children,
  intent,
  pendingLabel,
  variant,
}: ResultSubmitButtonProps) {
  const { data, pending } = useFormStatus();
  const isCurrentAction = pending && data?.get("intent") === intent;

  return (
    <button
      className={`result-button result-button--${variant}`}
      type="submit"
      name="intent"
      value={intent}
      disabled={pending}
      formNoValidate={intent === "clear"}
    >
      {isCurrentAction ? pendingLabel : children}
    </button>
  );
}
