"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Shop } from "../lib/mock";

/*
 * Who is looking, and their shops, for the client components in the app shell.
 * The (app) layout provides the signed-in person.
 */

export type Viewer = {
  id: string;
  name: string;
  firstName: string;
  initial: string;
  handle: string;
  email: string;
  image?: string | null;
  shops: Shop[];
  inboxCount: number;
};

const ViewerContext = createContext<Viewer | null>(null);

export function ViewerProvider({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}

export function useViewer() {
  const viewer = useContext(ViewerContext);
  if (!viewer) throw new Error("useViewer needs a ViewerProvider");
  return viewer;
}

/** Where "Shops" in the nav goes: the first shop, or making one. */
export function shopsHref(viewer: Viewer) {
  return viewer.shops[0] ? `/shops/${viewer.shops[0].slug}` : "/shops/new";
}

/** The viewer's initial, for avatars rendered by server components. */
export function ViewerInitial() {
  return <>{useViewer().initial}</>;
}
