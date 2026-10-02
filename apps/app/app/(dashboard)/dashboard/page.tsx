import { auth, currentUser } from "@clerk/nextjs/server";
import { NewListingDialog } from "../../../components/new-listing-dialog";

const stats = [
  { label: "Active listings", value: "0" },
  { label: "Sold this month", value: "0" },
  { label: "Revenue", value: "$0" },
];

export default async function DashboardPage() {
  await auth.protect();
  const user = await currentUser();

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Welcome{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="mt-1 text-base text-text-muted">
            Here&apos;s what&apos;s happening with your store.
          </p>
        </div>
        <NewListingDialog />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-surface p-6"
          >
            <p className="text-sm text-text-muted">{stat.label}</p>
            <p className="mt-1 font-display text-3xl font-extrabold tracking-tight">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
