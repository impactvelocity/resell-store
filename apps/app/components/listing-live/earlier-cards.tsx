"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@repo/ui/lib/utils";
import { saveField } from "../../app/actions/listings";
import { CanvasCard, FieldsCard, type Field } from "../workspace/listing-panel";
import { stepHref } from "../workspace/listing-workspace";
import type { PhotoView, WorkspaceListing } from "../../lib/server/listings";
import { formatPrice, lowestCents } from "./format";
import { PhotoThumb } from "./photo-thumb";

/*
 * The cards filled in on earlier steps, under the current step's work, so the
 * whole listing stays in view. Lines can be edited in place; price lives in Details.
 */

export function LiveEarlierCards({
  listing,
  photos,
  className,
}: {
  listing: WorkspaceListing;
  /** Shows the photo strip (Words and Publish). */
  photos?: PhotoView[];
  className?: string;
}) {
  const router = useRouter();
  const fields: Field[] = listing.fields
    .filter((f) => f.value)
    .map((f) => ({ key: f.key, label: f.label, value: f.value, state: "editable" }));
  const price = formatPrice(listing.priceCents);
  const lowest = formatPrice(lowestCents(listing));
  const detailsHref = stepHref(listing.id, "details");

  return (
    <div className={cn("flex flex-col gap-4 pt-10", className)}>
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-text-muted uppercase">
          Already filled in
        </h3>
        <Link href={detailsHref} className="text-sm font-bold text-secondary hover:underline">
          Back to details
        </Link>
      </div>
      <div className="flex flex-col items-start gap-4 xl:flex-row">
        {fields.length > 0 ? (
          <FieldsCard
            className="w-full xl:flex-[1.3]"
            fields={fields}
            onEdit={async (key, value) => {
              const label = listing.fields.find((f) => f.key === key)?.label;
              await saveField(listing.id, { key, label, value });
              router.refresh();
            }}
          />
        ) : (
          <CanvasCard title="The item" className="w-full xl:flex-[1.3]">
            <p className="text-sm text-text-muted">
              No details yet.{" "}
              <Link href={detailsHref} className="font-bold text-secondary hover:underline">
                Add some
              </Link>{" "}
              so buyers know what they&apos;re getting.
            </p>
          </CanvasCard>
        )}
        <div className="flex w-full flex-col gap-4 xl:flex-1">
          <CanvasCard title="Your price" field="price">
            {price ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-4xl font-extrabold tracking-tight">{price}</span>
                  {listing.takeOffers && lowest && (
                    <span className="text-sm font-medium text-text-muted">Lowest {lowest}</span>
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="font-semibold">Take offers</span>
                  <span className="font-semibold text-secondary">{listing.takeOffers ? "On" : "Off"}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-text-muted">
                Not set yet.{" "}
                <Link href={detailsHref} className="font-bold text-secondary hover:underline">
                  Set a price
                </Link>
              </p>
            )}
          </CanvasCard>
          {photos && (
            <CanvasCard
              title="Photos"
              meta={
                <Link href={stepHref(listing.id, "photos")} className="font-bold text-secondary hover:underline">
                  {photos.length ? "Change" : "Add"}
                </Link>
              }
            >
              {photos.length ? (
                <div className="flex flex-wrap gap-2">
                  {photos.map((p, i) => (
                    <PhotoThumb
                      key={p.id}
                      photo={p}
                      className={cn("size-14 rounded-sm", i === 0 && "ring-2 ring-text ring-offset-2 ring-offset-surface")}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">No photos yet. Listings with photos sell much faster.</p>
              )}
            </CanvasCard>
          )}
        </div>
      </div>
    </div>
  );
}
