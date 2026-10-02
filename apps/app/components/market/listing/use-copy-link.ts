"use client";

import { useToast } from "@repo/ui/toast";

/** Older trick for when the async clipboard API is blocked (embedded browsers, no focus). */
function copyWithSelection(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  return ok;
}

/** Copies the page URL and confirms with a toast. */
export function useCopyLink() {
  const toast = useToast();
  return async (title: string) => {
    const url = window.location.href;
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      ok = copyWithSelection(url);
    }
    toast.add({ title: ok ? title : "Couldn't copy. The link is in your address bar." });
  };
}
