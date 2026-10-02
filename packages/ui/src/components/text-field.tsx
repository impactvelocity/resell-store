"use client";

import { Field } from "@base-ui/react/field";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/utils";

export interface TextFieldProps extends Omit<
  ComponentProps<typeof Field.Control>,
  "className"
> {
  label: ReactNode;
  /** Short hint shown inside the field, on the right (e.g. "Fair price"). */
  hint?: ReactNode;
  /** Validation message shown below the field when it is invalid. */
  error?: ReactNode;
  className?: string;
}

/** Labelled input built on Base UI Field. */
export function TextField({
  label,
  hint,
  error,
  className,
  ...props
}: TextFieldProps) {
  return (
    <Field.Root className={cn("flex w-full flex-col gap-2", className)}>
      <Field.Label className="text-sm font-semibold text-text">
        {label}
      </Field.Label>
      <div className="flex h-[54px] items-center gap-3 rounded-md border-[1.5px] border-border bg-surface px-[18px] transition-colors focus-within:border-secondary focus-within:shadow-[0_0_0_0.5px_var(--color-secondary)] has-data-invalid:border-danger">
        <Field.Control
          className="h-full min-w-0 flex-1 bg-transparent text-base font-semibold text-text outline-none placeholder:font-regular placeholder:text-text-muted"
          {...props}
        />
        {hint && (
          <Field.Description className="shrink-0 text-sm font-medium text-secondary">
            {hint}
          </Field.Description>
        )}
      </div>
      {error && (
        <Field.Error className="text-sm font-medium text-danger">
          {error}
        </Field.Error>
      )}
    </Field.Root>
  );
}
