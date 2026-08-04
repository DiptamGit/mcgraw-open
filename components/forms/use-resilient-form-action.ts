"use client";

import { useActionState } from "react";

export const NETWORK_FAILURE_MESSAGE =
  "This update could not be sent from this device. Check your connection and try again. Your entries are kept.";

const FETCH_FAILURE_MESSAGES = new Set([
  "failed to fetch",
  "load failed",
  "network request failed",
  "networkerror when attempting to fetch resource.",
  "the network connection was lost.",
]);

export function isNetworkFailure(error: unknown): boolean {
  if (!(error instanceof TypeError)) {
    return false;
  }

  return FETCH_FAILURE_MESSAGES.has(error.message.trim().toLowerCase());
}

/**
 * Runs a server action so a dropped mobile connection becomes a recoverable
 * form state with the organizer's entries preserved instead of an error
 * boundary that discards them.
 *
 * Wrapping the action means React cannot serialize a native POST target for
 * the form, so a submit sent before hydration is replayed by React once the
 * bundle loads rather than posted directly. Preserving entered values on a
 * failed request is the behaviour this product needs on court-side networks.
 */
export function useResilientFormAction<State>(
  action: (state: Awaited<State>, formData: FormData) => Promise<State>,
  onNetworkFailure: (state: Awaited<State>, formData: FormData) => State,
  initialState: Awaited<State>,
) {
  return useActionState<State, FormData>(async (state, formData) => {
    try {
      return await action(state, formData);
    } catch (error) {
      if (isNetworkFailure(error)) {
        return onNetworkFailure(state, formData);
      }

      throw error;
    }
  }, initialState);
}
