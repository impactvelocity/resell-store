import Link from "next/link";
import { Wordmark } from "@repo/ui/logo";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/" aria-label="resell.store home">
        <Wordmark />
      </Link>
      {children}
    </main>
  );
}
