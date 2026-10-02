"use client";

import { useSyncExternalStore } from "react";
import {
  firstDraft,
  initialPhotos,
  initialPlatforms,
  writing,
  type Draft,
  type ListingVisibility,
  type Photo,
  type Platform,
  type Tone,
} from "../../lib/mock-listing-later";

/*
 * One tiny in-memory record for the dutch oven so Photos, Words and Publish
 * agree while you click between them. Lives for the browser session only.
 * Swap for the real listing record when the flows get wired up.
 */

export type ListingDraftState = {
  photos: Photo[];
  tone: Tone;
  versions: Draft[];
  versionIndex: number;
  visibility: ListingVisibility;
  published: boolean;
  platforms: Platform[];
  /** While a new draft is being written: which parts shimmer. */
  rewriting: null | "all" | "description";
  /** Usual style saved on the account. */
  styleSaved: boolean;
  /** The share kit pictures are being made (just after publishing). */
  kitGenerating: boolean;
};

const initial: ListingDraftState = {
  photos: initialPhotos,
  tone: "Friendly",
  versions: [firstDraft, writing.Friendly.takes[0]!],
  versionIndex: 1,
  visibility: "everyone",
  published: false,
  platforms: initialPlatforms,
  rewriting: null,
  styleSaved: false,
  kitGenerating: false,
};

let state = initial;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setListing(
  update: Partial<ListingDraftState> | ((s: ListingDraftState) => Partial<ListingDraftState>),
) {
  const patch = typeof update === "function" ? update(state) : update;
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useListing() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => initial,
  );
}

export function currentDraft(s: ListingDraftState) {
  return s.versions[s.versionIndex] ?? s.versions[0]!;
}
