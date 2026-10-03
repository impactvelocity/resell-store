"use client";

import type { UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ListingField, PriceRange } from "@repo/db/schema";
import { AgentMessage, SystemLine, Thread } from "../agent-chat/agent-chat";
import { FieldsCard, type Field } from "../workspace/listing-panel";
import { ListingWorkspace, stepHref } from "../workspace/listing-workspace";
import { saveField, savePricing } from "../../app/actions/listings";
import { CanvasColumns, ListingCanvasHeader } from "./canvas-parts";
import { AgentMessages, useListingAgent } from "./listing-agent";
import { PriceCard } from "./price-card";

/*
 * C4 Details, live. Every row is editable and saves as you go; the price card
 * saves price, floor and offers. Or tell the agent, which changes the same
 * things through its tools, and the canvas refreshes when it's done.
 */

export function LiveDetails({
  listingId,
  title,
  shopName,
  closeHref,
  fields: serverFields,
  price: serverPrice,
  lowest: serverLowest,
  takeOffers: serverTakeOffers,
  range,
  initialMessages,
}: {
  listingId: string;
  title: string;
  shopName: string;
  closeHref: string;
  fields: ListingField[];
  price: number | null;
  lowest: number | null;
  takeOffers: boolean;
  /** From research; null when it didn't run or found nothing. */
  range: PriceRange | null;
  initialMessages: UIMessage[];
}) {
  const router = useRouter();
  const [fields, setFields] = useState(serverFields);
  const [price, setPrice] = useState(serverPrice ?? range?.suggested ?? 0);
  const [lowest, setLowest] = useState(serverLowest ?? range?.bandLow ?? 0);
  const [takeOffers, setTakeOffers] = useState(serverTakeOffers);
  const [notes, setNotes] = useState<{ id: number; text: string }[]>([]);
  const noteId = useRef(0);

  // The agent changed something on the server: take the fresh values
  const serverKey = JSON.stringify([serverFields, serverPrice, serverLowest, serverTakeOffers]);
  useEffect(() => {
    setFields(serverFields);
    if (serverPrice != null) setPrice(serverPrice);
    if (serverLowest != null) setLowest(serverLowest);
    setTakeOffers(serverTakeOffers);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- serverKey stands in for the four values
  }, [serverKey]);

  const agent = useListingAgent({
    listingId,
    step: "details",
    initialMessages,
    onChanged: () => router.refresh(),
  });

  /* Price card: save shortly after the last change, and straight away when leaving */
  type Pricing = { price?: number; lowest?: number; takeOffers?: boolean };
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; next: Pricing } | null>(null);
  function flushPricing() {
    if (!pending.current) return;
    clearTimeout(pending.current.timer);
    void savePricing(listingId, pending.current.next);
    pending.current = null;
  }
  function queuePricing(next: Pricing) {
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = { timer: setTimeout(flushPricing, 500), next };
  }
  useEffect(() => {
    window.addEventListener("pagehide", flushPricing);
    return () => {
      window.removeEventListener("pagehide", flushPricing);
      flushPricing();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flushPricing only reads refs
  }, []);

  function changePrice(next: number) {
    setPrice(next);
    // The floor can't go above the price
    const floor = Math.min(lowest, next);
    setLowest(floor);
    queuePricing({ price: next, lowest: floor, takeOffers });
  }

  /** A row edited by hand: a quiet line in the chat so it's on the record. */
  function onEdit(key: string, value: string) {
    const label = fields.find((f) => f.key === key)?.label ?? key;
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, value, source: "you" } : f)));
    setNotes((prev) => [...prev, { id: ++noteId.current, text: `You changed ${label} to ${value}` }]);
    void saveField(listingId, { key, label, value });
  }

  const effectiveRange: PriceRange = range ?? roughRange(price || 50);

  const chat = (
    <Thread>
      <AgentMessage>
        {range
          ? `Here's everything I have. Check it reads right, then set your price. I'd go with $${range.suggested}: it's in the middle of what these go for.`
          : "Here's everything I have. Check it reads right, then set a price. Tell me what you paid and I'll suggest one."}
      </AgentMessage>
      {notes.map((n) => (
        <SystemLine key={n.id}>{n.text}</SystemLine>
      ))}
      <AgentMessages messages={agent.messages} busy={agent.busy} error={agent.error} />
    </Thread>
  );

  const canvasFields: Field[] = fields.map((f) => ({
    key: f.key,
    label: f.label,
    value: f.value ?? "Not set",
    state: "editable",
  }));
  const filled = fields.filter((f) => f.value).length + (price ? 1 : 0);
  const total = fields.length + 1;

  const canvas = (
    <>
      <ListingCanvasHeader
        title="Check the details"
        description="Click a line to change it, or just tell me."
        phoneDescription="Tap a line to change it, or just tell me."
        filled={filled}
        total={total}
      />
      <CanvasColumns
        left={
          <FieldsCard
            fields={canvasFields.length ? canvasFields : [{ key: "item", label: "Item", value: title, state: "editable" }]}
            onEdit={onEdit}
          />
        }
        right={
          <PriceCard
            range={effectiveRange}
            price={price || effectiveRange.suggested}
            onPriceChange={changePrice}
            lowest={lowest}
            onLowestChange={(next) => {
              setLowest(next);
              queuePricing({ price, lowest: next, takeOffers });
            }}
            takeOffers={takeOffers}
            onTakeOffersChange={(on) => {
              setTakeOffers(on);
              queuePricing({ price, lowest, takeOffers: on });
            }}
            nextHref={stepHref(listingId, "photos")}
          />
        }
      />
    </>
  );

  return (
    <ListingWorkspace
      listingId={listingId}
      step="details"
      title={title}
      shopName={shopName}
      closeHref={closeHref}
      chat={chat}
      canvas={canvas}
      filled={filled}
      total={total}
      busy={agent.busy}
      onSend={(text) => void agent.send(text)}
      onStop={agent.busy ? agent.stop : undefined}
      composerHint="Tell me what to change"
      saveKey={`${price}-${lowest}-${takeOffers}-${JSON.stringify(fields)}`}
    />
  );
}

/** Without research: a band around the price so the bar still makes sense. */
function roughRange(price: number): PriceRange {
  const r = (n: number) => Math.max(1, Math.round(n));
  return {
    min: r(price * 0.5),
    max: r(price * 1.5),
    bandLow: r(price * 0.8),
    bandHigh: r(price * 1.2),
    suggested: r(price),
  };
}
