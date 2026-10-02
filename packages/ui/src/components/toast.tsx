"use client";

import { Toast } from "@base-ui/react/toast";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/utils";
import { CheckIcon } from "./icons";

/**
 * Wrap the app once. Toasts appear as dark pills at the bottom of the screen.
 * Trigger them with `useToast().add({ title: "Link copied. Go show it off." })`.
 */
export function ToastProvider({
  children,
  ...props
}: ComponentProps<typeof Toast.Provider>) {
  return (
    <Toast.Provider {...props}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed inset-x-4 bottom-6 z-50 flex flex-col items-center gap-2 outline-none">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

export const useToast = Toast.useToastManager;

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className="transition-[opacity,translate] duration-300 ease-out data-ending-style:translate-y-4 data-ending-style:opacity-0 data-starting-style:translate-y-4 data-starting-style:opacity-0"
    >
      <ToastPill>
        <Toast.Title />
      </ToastPill>
    </Toast.Root>
  ));
}

/** The toast's look on its own, for static use. */
export function ToastPill({
  icon = <CheckIcon size={16} />,
  className,
  children,
  ...props
}: ComponentProps<"div"> & { icon?: ReactNode }) {
  return (
    <div
      className={cn(
        "inline-flex h-14 w-fit items-center gap-3 rounded-full bg-text pr-5 pl-4 text-base font-semibold text-background",
        className,
      )}
      {...props}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
        {icon}
      </span>
      {children}
    </div>
  );
}
