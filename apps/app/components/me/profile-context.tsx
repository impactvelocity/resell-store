"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  myInterests,
  myReachBy,
  notifyRows,
  profile,
} from "../../lib/mock-inbox";

/* The saved profile, shared by /me and /me/edit. Local state only. */

export type ProfileData = {
  name: string;
  about: string;
  location: string;
  interests: string[];
  notify: Record<string, boolean>;
  reach: string[];
};

const initial: ProfileData = {
  name: profile.name,
  about: profile.about,
  location: profile.location,
  interests: myInterests,
  notify: Object.fromEntries(notifyRows.map((r) => [r.key, r.on])),
  reach: myReachBy,
};

const ProfileContext = createContext<{
  saved: ProfileData;
  save: (data: ProfileData) => void;
} | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [saved, save] = useState(initial);
  return (
    <ProfileContext.Provider value={{ saved, save }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile needs <ProfileProvider>");
  return ctx;
}

/** A working copy of the saved profile for a form. */
export function useProfileDraft() {
  const { saved, save } = useProfile();
  const [draft, setDraft] = useState(saved);
  return {
    draft,
    set: <K extends keyof ProfileData>(key: K, value: ProfileData[K]) =>
      setDraft((d) => ({ ...d, [key]: value })),
    save: () => save(draft),
  };
}
