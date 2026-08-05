import { LockKey } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { hasOrganizerSession } from "@/lib/auth/session";

type OrganizerHeaderControlProps = {
  returnTo?: string;
};

/**
 * The unlock entry point lives in the header at every width so the phone
 * bottom tab bar can stay reserved for the four public routes. When organizer
 * mode is already unlocked the banner below the header owns the lock control,
 * so this renders nothing rather than offering a second, duplicate affordance.
 */
export async function OrganizerHeaderControl({
  returnTo = "/",
}: OrganizerHeaderControlProps) {
  const isUnlocked = await hasOrganizerSession();

  if (isUnlocked) {
    return null;
  }

  return (
    <Link
      className="organizer-control"
      href={`/organizer/unlock?returnTo=${encodeURIComponent(returnTo)}`}
    >
      <LockKey size={18} weight="regular" aria-hidden="true" />
      <span className="organizer-control__label">Organizer</span>
      <span className="organizer-control__name">Unlock organizer mode</span>
    </Link>
  );
}
