import { LockKey, LockKeyOpen } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { hasOrganizerSession } from "@/lib/auth/session";
import { SessionSubmitButton } from "./session-submit-button";

type OrganizerAccessStatusProps = {
  returnTo?: string;
};

export async function OrganizerAccessStatus({
  returnTo = "/",
}: OrganizerAccessStatusProps) {
  const isUnlocked = await hasOrganizerSession();

  return (
    <aside
      className={`organizer-status${
        isUnlocked ? " organizer-status--unlocked" : ""
      }`}
      aria-label="Organizer access"
    >
      <div className="page-frame organizer-status__inner">
        <p>
          {isUnlocked ? (
            <LockKeyOpen size={18} weight="bold" aria-hidden="true" />
          ) : (
            <LockKey size={18} weight="bold" aria-hidden="true" />
          )}
          <span>
            <strong>
              {isUnlocked ? "Organizer mode" : "Organizer updates locked"}
            </strong>
            <span className="organizer-status__detail">
              {isUnlocked
                ? " Update controls are available."
                : " Public tournament views remain open."}
            </span>
          </span>
        </p>

        {isUnlocked ? (
          <form action="/organizer/session" method="post">
            <input type="hidden" name="intent" value="lock" />
            <input type="hidden" name="returnTo" value={returnTo} />
            <SessionSubmitButton pendingLabel="Locking…" variant="quiet">
              Lock again
            </SessionSubmitButton>
          </form>
        ) : (
          <Link
            className="organizer-status__link"
            href={`/organizer/unlock?returnTo=${encodeURIComponent(returnTo)}`}
          >
            Unlock
          </Link>
        )}
      </div>
    </aside>
  );
}
