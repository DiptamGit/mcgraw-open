import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import NotFound from "@/app/not-found";

import { OrganizerFormLoading } from "./organizer-form-loading";
import {
  LoadingAnnouncement,
  SkeletonFormPanel,
  SkeletonMatchList,
} from "./skeletons";

describe("loading placeholders", () => {
  it("hides skeleton shapes from assistive technology", () => {
    const markup = renderToStaticMarkup(<SkeletonMatchList count={2} />);

    expect(markup).toContain('aria-hidden="true"');
    expect(markup.match(/class="skeleton-match"/g)).toHaveLength(2);
  });

  it("announces loading politely instead of silently", () => {
    const markup = renderToStaticMarkup(
      <LoadingAnnouncement label="Loading tournament matches." />,
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain("Loading tournament matches.");
  });

  it("reserves a control-sized block for every form field", () => {
    const markup = renderToStaticMarkup(<SkeletonFormPanel fields={3} />);

    expect(markup.match(/skeleton--control/g)).toHaveLength(3);
  });

  it("keeps the organizer form placeholder inside the page frame", () => {
    const markup = renderToStaticMarkup(
      <OrganizerFormLoading fields={3} label="Loading the schedule form." />,
    );

    expect(markup).toContain("page-content schedule-page");
    expect(markup).toContain("Loading the schedule form.");
  });
});

describe("not found page", () => {
  it("offers a route back to the tournament", () => {
    const markup = renderToStaticMarkup(<NotFound />);

    expect(markup).toContain("Page not found");
    expect(markup).toContain('href="/"');
    expect(markup).toContain('href="/matches"');
  });
});
