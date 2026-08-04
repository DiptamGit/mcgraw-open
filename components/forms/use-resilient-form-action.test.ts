import { describe, expect, it } from "vitest";

import { isNetworkFailure } from "./use-resilient-form-action";

describe("network failure detection", () => {
  it.each([
    "Failed to fetch",
    "Load failed",
    "Network request failed",
    "NetworkError when attempting to fetch resource.",
    "The network connection was lost.",
  ])("recognizes the browser fetch failure %s", (message) => {
    expect(isNetworkFailure(new TypeError(message))).toBe(true);
  });

  it("does not hide unrelated TypeErrors", () => {
    expect(
      isNetworkFailure(
        new TypeError("Cannot read properties of undefined (reading 'id')"),
      ),
    ).toBe(false);
  });

  it("does not classify application errors by a broad keyword", () => {
    expect(
      isNetworkFailure(new Error("The network configuration is invalid.")),
    ).toBe(false);
  });
});
