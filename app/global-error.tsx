"use client";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main id="main-content" className="page-content">
          <section
            className="form-feedback form-feedback--error"
            aria-labelledby="global-error-title"
          >
            <h1 id="global-error-title">McGraw Open is unavailable.</h1>
            <p>
              The site could not start on this device. Try again, and check
              your signal if it keeps failing.
            </p>
            {error.digest ? <p>Reference: {error.digest}</p> : null}
            <button
              className="schedule-reload"
              type="button"
              onClick={() => reset()}
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
