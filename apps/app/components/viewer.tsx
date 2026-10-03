"use client";

import { createContext, useContext, type ReactNode } from "react";
import { inboxCount, me, shops, type Shop } from "../lib/mock";

/*
 * Who is looking, and their shops, for the client components in the app shell.
 * Live layouts provide the signed-in person; without a provider (the mock
 * screens under app/mock) it falls back to Maya from the prototype.
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

export const mockViewer: Viewer = { id: "maya", ...me, shops, inboxCount };

const ViewerContext = createContext<Viewer>(mockViewer);

export function ViewerProvider({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}

export function useViewer() {
  return useContext(ViewerContext);
}

/** Where "Shops" in the nav goes: the first shop, or making one. */
export function shopsHref(viewer: Viewer) {
  return viewer.shops[0] ? `/shops/${viewer.shops[0].slug}` : "/shops/new";
}

/** The viewer's initial, for avatars rendered by server components. */
export function ViewerInitial() {
  return <>{useViewer().initial}</>;
}
