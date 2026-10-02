import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Wordmark } from "@repo/ui/logo";
import { DashboardNav } from "../../components/dashboard-nav";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await auth.protect();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" aria-label="Dashboard">
            <Wordmark size="sm" />
          </Link>
          <UserButton />
        </div>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="border-b border-border p-3 md:w-56 md:border-r md:border-b-0">
          <DashboardNav />
        </aside>
        <div className="flex-1 px-4 py-8 md:px-8">{children}</div>
      </div>
    </div>
  );
}
