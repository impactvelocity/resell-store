"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useState } from "react";
import { useToast } from "@repo/ui/toast";
import { setLike } from "../../app/actions/likes";
import { signInHref } from "../../lib/safe-next";
import { siteUrl } from "../../lib/urls";
import { useCurrentStore } from "./links";

/*
 * The viewer's liked listings, shared by every heart on the page, so liking a
 * card and the same listing's buy box stay in step. Without the provider (the
 * prototype) each heart keeps its own local state.
 */

/** A heart flipped here and not yet matched by the server's list. */
type Override = { liked: boolean; pending: boolean };

type LikesState = {
  isLiked: (listingId: string) => boolean;
  toggle: (listingId: string, next: boolean, title: string) => void;
};

const LikesContext = createContext<LikesState | null>(null);

export function LikesProvider({ liked, children }: { liked: string[]; children: React.ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const store = useCurrentStore();
  const key = [...liked].sort().join(",");
  const server = useMemo(() => new Set(key ? key.split(",") : []), [key]);
  const [overrides, setOverrides] = useState<Map<string, Override>>(() => new Map());

  // A fresh list from the server wins over everything but saves still in flight
  const [seen, setSeen] = useState(key);
  if (seen !== key) {
    setSeen(key);
    setOverrides((o) => new Map([...o].filter(([, v]) => v.pending)));
  }

  const value = useMemo<LikesState>(() => {
    const isLiked = (id: string) => overrides.get(id)?.liked ?? server.has(id);

    function put(id: string, v: Override | null) {
      setOverrides((o) => {
        const m = new Map(o);
        if (v) m.set(id, v);
        else m.delete(id);
        return m;
      });
    }

    async function toggle(id: string, next: boolean, title: string) {
      if (overrides.get(id)?.pending) return;
      put(id, { liked: next, pending: true });
      const res = await setLike({ listingId: id, liked: next }).catch(() => null);
      if (res?.ok) return put(id, { liked: next, pending: false });
      put(id, null);
      if (res?.signin) {
        // Stores live on their own subdomain; /store/{slug}/… on the marketplace leads back there
        const here = store
          ? `/store/${store}${window.location.pathname}`
          : `${window.location.pathname}${window.location.search}`;
        const href = signInHref(here);
        if (store) window.location.assign(siteUrl(href));
        else router.push(href);
        return;
      }
      toast.add({ title: res?.error ?? `Couldn't save ${title}. Try again?` });
    }

    return { isLiked, toggle };
  }, [overrides, server, store, router, toast]);

  return <LikesContext value={value}>{children}</LikesContext>;
}

/**
 * One listing's heart. With the provider and a listing id it saves: it flips
 * straight away, flips back with a toast if saving fails, and signed-out
 * people go to sign in. Otherwise it's local state from `defaultLiked`.
 */
export function useLike(listingId: string | null | undefined, title: string, defaultLiked = false) {
  const likes = useContext(LikesContext);
  const [local, setLocal] = useState(defaultLiked);

  if (!likes || !listingId) {
    return { liked: local, toggle: () => setLocal((v) => !v), setLiked: setLocal };
  }
  const liked = likes.isLiked(listingId);
  return {
    liked,
    toggle: () => likes.toggle(listingId, !liked, title),
    setLiked: (next: boolean) => {
      if (next !== liked) likes.toggle(listingId, next, title);
    },
  };
}
