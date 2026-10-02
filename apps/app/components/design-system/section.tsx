import type { ReactNode } from "react";

export function DocHeader({
  label,
  children,
}: {
  label: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-16">
      <div className="flex items-center justify-between gap-4">
        {children}
        <div className="hidden text-sm font-semibold tracking-wide text-text-muted uppercase sm:block">
          {label}
        </div>
      </div>
    </div>
  );
}

export function Section({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-8 lg:grid-cols-[200px_1fr] lg:gap-12">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-text-muted">{index}</span>
        <h2 className="font-display text-3xl font-extrabold tracking-tight">
          {title}
        </h2>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function Subhead({ children }: { children: ReactNode }) {
  return <h3 className="text-base font-bold text-text">{children}</h3>;
}
