import { LockKeyOpen } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";

import { UnlockForm } from "@/components/organizer/unlock-form";
import { PageIntro } from "@/components/page-intro";
import { hasOrganizerSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Organizer access",
  description: "Unlock McGraw Open organizer controls on this device.",
  robots: {
    index: false,
    follow: false,
  },
};

type UnlockPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    retry?: string | string[];
    returnTo?: string | string[];
  }>;
};

function safeReturnTo(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;

  return candidate?.startsWith("/") &&
    !candidate.startsWith("//") &&
    !candidate.includes("\\")
    ? candidate
    : "/matches";
}

function getErrorMessage(
  error: string | string[] | undefined,
  retry: string | string[] | undefined,
): string | undefined {
  const code = Array.isArray(error) ? error[0] : error;

  if (code === "limited") {
    const rawRetry = Array.isArray(retry) ? retry[0] : retry;
    const retrySeconds = Number.parseInt(rawRetry ?? "", 10);
    const retryMinutes = Number.isFinite(retrySeconds)
      ? Math.min(15, Math.max(1, Math.ceil(retrySeconds / 60)))
      : 15;

    return `Too many unlock attempts. Try again in about ${retryMinutes} ${
      retryMinutes === 1 ? "minute" : "minutes"
    }.`;
  }

  if (code === "unavailable") {
    return "Organizer unlock is temporarily unavailable. Try again.";
  }

  if (code === "invalid") {
    return "Unlock was not accepted. Check the PIN and try again.";
  }

  return undefined;
}

export default async function OrganizerUnlockPage({
  searchParams,
}: UnlockPageProps) {
  const [params, isUnlocked] = await Promise.all([
    searchParams,
    hasOrganizerSession(),
  ]);
  const returnTo = safeReturnTo(params.returnTo);

  return (
    <>
      <PageIntro
        eyebrow="Tournament administration"
        title="Organizer access"
        description="Unlock update controls on this device without changing the public tournament view."
      />

      <div className="page-content">
        <section className="organizer-panel" aria-labelledby="organizer-access">
          <p className="utility-label">Shared access</p>
          <h2 id="organizer-access">
            {isUnlocked ? "Organizer mode is unlocked" : "Unlock this device"}
          </h2>

          {isUnlocked ? (
            <div className="organizer-unlocked">
              <LockKeyOpen size={28} weight="bold" aria-hidden="true" />
              <p>
                This device can use organizer update controls for up to seven
                days.
              </p>
              <Link className="session-button session-button--primary" href={returnTo}>
                Return to tournament
              </Link>
            </div>
          ) : (
            <UnlockForm
              errorMessage={getErrorMessage(params.error, params.retry)}
              returnTo={returnTo}
            />
          )}
        </section>
      </div>
    </>
  );
}
