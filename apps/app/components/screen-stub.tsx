import Link from "next/link";

/** Placeholder for a screen that hasn't been built yet. */
export function ScreenStub({ code, name }: { code: string; name: string }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-2 px-4 text-center">
      <span className="font-mono text-sm text-text-muted">{code}</span>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        {name}
      </h1>
      <Link href="/screens" className="text-sm font-bold text-secondary">
        All screens
      </Link>
    </div>
  );
}
