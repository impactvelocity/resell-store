"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useToast } from "@repo/ui/toast";
import { saveProfile } from "../../app/actions/profile";
import { me } from "../../lib/mock";
import { myInterests, myReachBy, notifyRows, profile } from "../../lib/mock-inbox";

/*
 * The saved profile, shared by /me and /me/edit. With `account.live` saves go
 * to the server; without it (the mock) they only live in this state.
 */

export type ProfileData = {
  name: string;
  about: string;
  location: string;
  interests: string[];
  notify: Record<string, boolean>;
  reach: string[];
};

/** What the profile screens show but don't edit as a form. */
export type ProfileAccount = {
  live: boolean;
  email: string;
  /** "Selling since 2025." */
  since: string;
  image: string | null;
  /** The public face: the first shop's store. Null with no shops yet. */
  publicHref: string | null;
};

const mockInitial: ProfileData = {
  name: profile.name,
  about: profile.about,
  location: profile.location,
  interests: myInterests,
  notify: Object.fromEntries(notifyRows.map((r) => [r.key, r.on])),
  reach: myReachBy,
};

const mockAccount: ProfileAccount = {
  live: false,
  email: me.email,
  since: profile.since,
  image: null,
  publicHref: "/shops/mayas-closet",
};

type ProfileContextValue = {
  saved: ProfileData;
  /** Resolves to an error to show, or null once saved. */
  save: (data: ProfileData) => Promise<string | null>;
  account: ProfileAccount;
  setImage: (url: string | null) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({
  initial = mockInitial,
  account: initialAccount = mockAccount,
  children,
}: {
  initial?: ProfileData;
  account?: ProfileAccount;
  children: ReactNode;
}) {
  const [saved, setSaved] = useState(initial);
  const [account, setAccount] = useState(initialAccount);

  async function save(data: ProfileData) {
    if (account.live) {
      const result = await saveProfile(data);
      if ("error" in result) return result.error;
    }
    setSaved(data);
    return null;
  }

  return (
    <ProfileContext.Provider
      value={{
        saved,
        save,
        account,
        setImage: (image) => setAccount((a) => ({ ...a, image })),
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile needs <ProfileProvider>");
  return ctx;
}

/**
 * A working copy of the saved profile for a form. `save` shows the toast and
 * resolves to whether it worked.
 */
export function useProfileDraft() {
  const { saved, save } = useProfile();
  const toast = useToast();
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);
  return {
    draft,
    saving,
    set: <K extends keyof ProfileData>(key: K, value: ProfileData[K]) =>
      setDraft((d) => ({ ...d, [key]: value })),
    save: async () => {
      setSaving(true);
      try {
        const error = await save(draft);
        toast.add({ title: error ?? "Profile saved" });
        return !error;
      } catch {
        toast.add({ title: "That didn't save. Try again in a moment." });
        return false;
      } finally {
        setSaving(false);
      }
    },
  };
}
