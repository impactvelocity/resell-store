"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@repo/ui/button";
import { CheckIcon, ChevronRightIcon, SparkleIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";
import { cn } from "@repo/ui/lib/utils";
import {
  connectionGroups,
  type Connection,
  type ConnectionGroup,
  type ConnectionStatus,
} from "../../lib/mock-tools";
import { MobileBackHeader, Page, PageHeader } from "../shell/page";
import {
  GroupCard,
  GroupRow,
  LetterTile,
  MiniSpinner,
  Sheet,
  StatusPill,
} from "./parts";

/*
 * D1 Connections. Rows follow spec E "Connection row":
 * not connected → connecting (a second, spinner) → connected → Manage sheet
 * with what it may do and Disconnect. "Needs a look" rows show Reconnect.
 */

type RowState = ConnectionStatus | "connecting" | "reconnecting";

export function ConnectionRow({
  connection,
  state,
  onConnect,
  onManage,
}: {
  connection: Connection;
  state: RowState;
  onConnect: () => void;
  onManage: () => void;
}) {
  const connected = state === "connected";
  const needsLook = state === "needs-look" || state === "reconnecting";
  const busy = state === "connecting" || state === "reconnecting";

  return (
    <GroupRow>
      <LetterTile tone={connected ? "leaf" : "muted"}>
        {connection.letter}
      </LetterTile>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-base font-bold">{connection.name}</span>
          {connected && <StatusPill tone="leaf">Connected</StatusPill>}
          {needsLook && <StatusPill tone="pink">Sign in again</StatusPill>}
        </div>
        <p className="text-sm text-text-muted">
          {connected
            ? connection.account
            : needsLook
              ? connection.problem
              : connection.pitch}
        </p>
      </div>
      {connected ? (
        <button
          type="button"
          onClick={onManage}
          className="flex h-10 shrink-0 cursor-pointer items-center rounded-full px-2 text-sm font-bold text-secondary outline-none hover:underline focus-visible:outline-2 focus-visible:outline-secondary"
        >
          Manage
        </button>
      ) : (
        <Button
          variant={needsLook ? "primary" : "soft"}
          size="md"
          onClick={onConnect}
          disabled={busy}
          aria-label={`${needsLook ? "Reconnect" : "Connect"} ${connection.name}`}
          className={cn(
            "h-10 px-[18px]",
            // Keep the button's own look while it spins
            busy &&
              (needsLook
                ? "data-disabled:cursor-progress data-disabled:bg-primary data-disabled:text-on-primary"
                : "data-disabled:cursor-progress data-disabled:border-border data-disabled:bg-surface data-disabled:text-text"),
          )}
        >
          {busy && <MiniSpinner />}
          {needsLook ? "Reconnect" : "Connect"}
        </Button>
      )}
    </GroupRow>
  );
}

function LinkRow({
  href,
  tile,
  title,
  description,
}: {
  href: string;
  tile: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <GroupRow className="p-0">
      <Link
        href={href}
        className="group flex w-full items-center gap-3.5 rounded-md py-4 outline-none focus-visible:outline-2 focus-visible:outline-secondary"
      >
        {tile}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-base font-bold group-hover:underline">
            {title}
          </span>
          <span className="text-sm text-text-muted">{description}</span>
        </span>
        <ChevronRightIcon
          size={20}
          strokeWidth={2.2}
          className="text-text-muted transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </GroupRow>
  );
}

function CodeGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />
    </svg>
  );
}

const allConnections = Object.values(connectionGroups).flatMap(
  (g) => g.connections,
);

export function ConnectionsScreen() {
  const toast = useToast();
  const [states, setStates] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(allConnections.map((c) => [c.id, c.status])),
  );
  const [managing, setManaging] = useState<Connection | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const connect = (connection: Connection) => {
    setStates((s) => ({
      ...s,
      [connection.id]:
        s[connection.id] === "needs-look" ? "reconnecting" : "connecting",
    }));
    timers.current.push(
      setTimeout(() => {
        setStates((s) => ({ ...s, [connection.id]: "connected" }));
        toast.add({ title: `${connection.name} is connected.` });
      }, 1200),
    );
  };

  const disconnect = (connection: Connection) => {
    setStates((s) => ({ ...s, [connection.id]: "not-connected" }));
    setSheetOpen(false);
    toast.add({ title: `${connection.name} is unlinked.` });
  };

  const renderGroup = (group: ConnectionGroup, extra?: ReactNode) => (
    <GroupCard title={group.title} description={group.description}>
      {group.connections.map((connection) => (
        <ConnectionRow
          key={connection.id}
          connection={connection}
          state={states[connection.id] ?? connection.status}
          onConnect={() => connect(connection)}
          onManage={() => {
            setManaging(connection);
            setSheetOpen(true);
          }}
        />
      ))}
      {extra}
    </GroupCard>
  );

  return (
    <>
      <MobileBackHeader title="Connections" backHref="/me" />
      <Page className="gap-4 pb-8 desk:gap-7 desk:pt-8">
        <PageHeader
          className="hidden desk:flex"
          title="Connections"
          description="Link the accounts you already use. Unlink any of them whenever you like."
        />
        <p className="text-base text-text-muted desk:hidden">
          Link the accounts you already use. Unlink any of them whenever you
          like.
        </p>
        <div className="flex flex-col gap-4 desk:flex-row desk:items-start desk:gap-6">
          <div className="flex flex-col gap-4 desk:flex-1 desk:gap-6">
            {renderGroup(connectionGroups.paid)}
            {renderGroup(connectionGroups.sell)}
          </div>
          <div className="flex flex-col gap-4 desk:flex-1 desk:gap-6">
            {renderGroup(connectionGroups.share)}
            {renderGroup(
              connectionGroups.automatic,
              <>
                <LinkRow
                  href="/tools/agent"
                  tile={
                    <LetterTile tone="pink">
                      <SparkleIcon size={20} />
                    </LetterTile>
                  }
                  title="Your own AI"
                  description="Let Claude, ChatGPT or another AI app run the shop."
                />
                <LinkRow
                  href="/tools/api"
                  tile={
                    <LetterTile>
                      <CodeGlyph />
                    </LetterTile>
                  }
                  title="API"
                  description="For developers building on your shop."
                />
              </>,
            )}
          </div>
        </div>
      </Page>

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={managing?.name ?? ""}
        description={managing?.account}
      >
        {managing && (
          <>
            <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface px-5 py-4">
              <div className="pb-1 text-sm font-semibold tracking-wide text-text-muted uppercase">
                What it may do
              </div>
              {managing.allowed.map((item) => (
                <div key={item} className="flex items-center gap-3 py-1.5">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary-soft text-secondary">
                    <CheckIcon size={14} strokeWidth={2.6} />
                  </span>
                  <span className="text-base">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-text-muted">
              Disconnecting stops anything new from going to{" "}
              {managing.name}. Nothing already there gets deleted.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="soft"
                size="lg"
                className="w-full border-danger text-danger hover:bg-accent-soft"
                onClick={() => disconnect(managing)}
              >
                Disconnect {managing.name}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full"
                onClick={() => setSheetOpen(false)}
              >
                Done
              </Button>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}
