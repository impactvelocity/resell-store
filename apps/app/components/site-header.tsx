import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { Button } from "@repo/ui/button";
import { Wordmark } from "@repo/ui/logo";

export function SiteHeader() {
  return (
    <header>
      <div className="mx-auto flex h-20 max-w-page items-center justify-between px-4 md:px-6">
        <Link href="/" aria-label="resell.store home" className="rounded-full">
          <Wordmark size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <Show when="signed-out">
            <Button
              variant="ghost"
              size="md"
              render={<Link href="/sign-in" />}
              nativeButton={false}
            >
              Sign in
            </Button>
            <Button
              size="md"
              render={<Link href="/sign-up" />}
              nativeButton={false}
            >
              Open your shop
            </Button>
          </Show>
          <Show when="signed-in">
            <Button
              variant="soft"
              size="md"
              render={<Link href="/dashboard" />}
              nativeButton={false}
            >
              Your shop
            </Button>
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
