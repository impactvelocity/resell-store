import "server-only";
import { after } from "next/server";

/**
 * Runs `fn` after the response is sent, so agents and emails never slow the
 * person down. Outside a request (scripts) it just runs in the background.
 */
export function runAfterResponse(fn: () => Promise<unknown>) {
  try {
    after(fn);
  } catch {
    void fn();
  }
}
