"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@repo/ui/lib/utils";
import { CanvasCard, FieldsCard, type Field } from "../workspace/listing-panel";
import { stepHref } from "../workspace/listing-workspace";
import { earlierFields, earlierPrice } from "../../lib/mock-listing-later";
import { draftListing } from "../../lib/mock";
import { PhotoArtwork } from "./art";
import { useListing } from "./store";

/*
 * The cards filled in on earlier steps, kept under the current step's work so
 * the whole listing stays in view. Same rows as Details (C4), still editable.
 */

export function EarlierCards({
  showPhotos = false,
  className,
}: {
  showPhotos?: boolean;
  className?: string;
}) {
  const listing = useListing();
  const [fields, setFields] = useState<Field[]>(() =>
    earlierFields.map((f) => ({ ...f, state: "editable" as const })),
  );

  return (
    <div className={cn("flex flex-col gap-4 pt-10", className)}>
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-text-muted uppercase">
          Already filled in
        </h3>
        <Link
          href={stepHref(draftListing.id, "details")}
          className="text-sm font-bold text-secondary hover:underline"
        >
          Back to details
        </Link>
      </div>
      <div className="flex flex-col items-start gap-4 xl:flex-row">
        <FieldsCard
          className="w-full xl:flex-[1.3]"
          fields={fields}
          onEdit={(key, value) =>
            setFields((list) =>
              list.map((f) => (f.key === key ? { ...f, value } : f)),
            )
          }
        />
        <div className="flex w-full flex-col gap-4 xl:flex-1">
          <CanvasCard title="Your price" field="price">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-4xl font-extrabold tracking-tight">
                ${earlierPrice.price}
              </span>
              <span className="text-sm font-medium text-text-muted">
                Lowest ${earlierPrice.lowest}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
              <span className="font-semibold">Take offers</span>
              <span className="font-semibold text-secondary">
                {earlierPrice.takeOffers ? "On" : "Off"}
              </span>
            </div>
          </CanvasCard>
          {showPhotos && (
            <CanvasCard
              title="Photos"
              meta={
                <Link
                  href={stepHref(draftListing.id, "photos")}
                  className="font-bold text-secondary hover:underline"
                >
                  Change
                </Link>
              }
            >
              <div className="flex flex-wrap gap-2">
                {listing.photos.map((p, i) => (
                  <span
                    key={p.id}
                    className={cn(
                      "flex size-14 items-center justify-center rounded-sm",
                      p.source ? "border border-border bg-surface" : "bg-leaf-100",
                      i === 0 && "ring-2 ring-text ring-offset-2 ring-offset-surface",
                    )}
                  >
                    <PhotoArtwork art={p.art} size={40} />
                  </span>
                ))}
              </div>
            </CanvasCard>
          )}
        </div>
      </div>
    </div>
  );
}
