"use client";

import { useFormStatus } from "react-dom";

type ScheduleSubmitButtonProps = {
  children: React.ReactNode;
  intent: "save" | "clear";
  pendingLabel: string;
  variant: "primary" | "destructive";
};

export function ScheduleSubmitButton({
  children,
  intent,
  pendingLabel,
  variant,
}: ScheduleSubmitButtonProps) {
  const { data, pending } = useFormStatus();
  const isCurrentAction = pending && data?.get("intent") === intent;

  return (
    <button
      className={`schedule-button schedule-button--${variant}`}
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
