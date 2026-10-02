"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { OfferStatus } from "../../lib/mock-inbox";

/*
 * Prototype-only store for what the person decided on an offer, so accepting
 * on the listing page (C9) shows up on the offer page (C10) and back.
 * Lives for the browser session. Swap for real mutations later.
 */

export type OfferState = {
  status: OfferStatus;
  /** The person's own counter, after "Push back". */
  counter?: number;
  /** True when the person (not their agent) made the call. */
  byYou?: boolean;
};

let states: Record<string, OfferState> = {};
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setOfferState(id: string, next: OfferState) {
  states = { ...states, [id]: next };
  listeners.forEach((l) => l());
}

const empty: Record<string, OfferState> = {};

export function useOfferStates() {
  return useSyncExternalStore(
    subscribe,
    () => states,
    () => empty,
  );
}

const UNDO_MS = 5000;

/**
 * Accept / push back / decline for any number of offers. Decline happens at
 * once, with Undo for five seconds (spec D, Offer card).
 */
export function useOfferActions() {
  const all = useOfferStates();
  const [undo, setUndo] = useState<{ id: string; prev?: OfferState } | null>(
    null,
  );
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function get(id: string, fallback: OfferStatus): OfferState {
    return all[id] ?? { status: fallback };
  }

  return {
    get,
    accept(id: string) {
      setOfferState(id, { status: "accepted", byYou: true });
    },
    pushBack(id: string, counter: number) {
      setOfferState(id, { status: "waiting", counter, byYou: true });
    },
    decline(id: string) {
      setUndo({ id, prev: all[id] });
      setOfferState(id, { status: "declined", byYou: true });
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setUndo(null), UNDO_MS);
    },
    /** The offer id that can still be undone, if any. */
    undoId: undo?.id,
    undo() {
      if (!undo) return;
      window.clearTimeout(timer.current);
      if (undo.prev) {
        setOfferState(undo.id, undo.prev);
      } else {
        const { [undo.id]: _removed, ...rest } = states;
        void _removed;
        states = rest;
        listeners.forEach((l) => l());
      }
      setUndo(null);
    },
  };
}
