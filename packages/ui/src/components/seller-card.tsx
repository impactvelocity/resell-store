import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/utils";
import { Avatar } from "./avatar";

export interface SellerCardProps extends Omit<ComponentProps<"div">, "title"> {
  name: ReactNode;
  handle?: ReactNode;
  bio?: ReactNode;
  avatarSrc?: string;
  /** Avatar fallback, usually the first initial. */
  initial: string;
  stats?: { label: string; value: ReactNode }[];
}

export function SellerCard({
  name,
  handle,
  bio,
  avatarSrc,
  initial,
  stats,
  className,
  ...props
}: SellerCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-xl border border-border bg-surface p-6",
        className,
      )}
      {...props}
    >
      <Avatar src={avatarSrc} fallback={initial} size="lg" />
      <div className="flex flex-col gap-1">
        <div className="font-display text-2xl font-extrabold tracking-tight text-text">
          {name}
        </div>
        {handle && (
          <div className="text-sm font-semibold text-secondary">{handle}</div>
        )}
      </div>
      {bio && <p className="text-base text-text-muted">{bio}</p>}
      {stats && stats.length > 0 && (
        <dl className="flex items-center gap-5 border-t border-border pt-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-1.5">
              <dd className="font-display text-xl font-extrabold text-text">
                {stat.value}
              </dd>
              <dt className="text-sm font-medium text-text-muted">
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
