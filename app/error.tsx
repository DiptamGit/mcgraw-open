"use client";

import { useEffect } from "react";

import { PageIntro } from "@/components/page-intro";

export default function TournamentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Tournament page failed to render.", {
      digest: error.digest,
    });
  }, [error]);

  return (
    <>
      <PageIntro
        eyebrow="Tournament site"
        title="Page unavailable"
        description="The tournament data could not be loaded on this device."
      />

      <div className="page-content">
        <section
          className="form-feedback form-feedback--error"
          aria-labelledby="page-error-title"
        >
          <h2 id="page-error-title">This page did not load.</h2>
          <p>
            The connection may have dropped before the tournament data
            arrived. Try again, and check your signal if it keeps failing.
          </p>
          <button
            className="schedule-reload"
            type="button"
            onClick={() => reset()}
          >
            Try again
          </button>
        </section>
      </div>
    </>
  );
}
