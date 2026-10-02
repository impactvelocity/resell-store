import type { HomeMode } from "../../lib/mock-home";

/*
 * Home's Selling/Buying mode (spec 04 / A. Mode switch).
 * The last choice is remembered on this device; the first one comes from A2.
 */

const STORAGE_KEY = "resell.home-mode";

export function parseMode(value: string | null | undefined): HomeMode | null {
  return value === "selling" || value === "buying" ? value : null;
}

export function readStoredMode(): HomeMode | null {
  try {
    return parseMode(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function storeMode(mode: HomeMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Private mode or blocked storage: the URL still carries the mode.
  }
}

export function homeHref(mode: HomeMode) {
  return `/home?mode=${mode}`;
}
