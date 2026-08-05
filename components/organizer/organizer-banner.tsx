import { hasOrganizerSession } from "@/lib/auth/session";
import { SessionSubmitButton } from "./session-submit-button";

type OrganizerBannerProps = {
  returnTo?: string;
};

/**
 * Marks organizer mode across the whole site. It renders only for a request
 * that carries a valid organizer cookie; the cookie itself is still validated
 * on the server by every mutation.
 */
export async function OrganizerBanner({
  returnTo = "/",
}: OrganizerBannerProps) {
  const isUnlocked = await hasOrganizerSession();

  if (!isUnlocked) {
    return null;
  }

  return (
    <aside className="organizer-banner" aria-label="Organizer access">
      <div className="page-frame organizer-banner__inner">
        <p>
          <span className="pulse-dot" aria-hidden="true" />
          <span className="organizer-banner__title">Organizer mode</span>
          <span className="organizer-banner__detail">
            Editing controls are visible on tournament pages.
          </span>
        </p>

        <form action="/organizer/session" method="post">
          <input type="hidden" name="intent" value="lock" />
          <input type="hidden" name="returnTo" value={returnTo} />
          <SessionSubmitButton pendingLabel="Locking…" variant="quiet">
            Lock again
          </SessionSubmitButton>
        </form>
      </div>
    </aside>
  );
}
