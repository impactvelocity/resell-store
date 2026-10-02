"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import { Toggle } from "@base-ui/react/toggle";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";
import { HeartIcon } from "./icons";

const focusRing =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

const buttonVariants = {
  /** Lemon. The one thing you want people to do. */
  primary: "bg-primary text-on-primary hover:bg-lemon-300",
  /** Leaf. Committing actions — buy, offer. */
  secondary: "bg-secondary text-on-secondary hover:bg-leaf-900",
  /** Outlined surface. Everyday actions. */
  soft: "border-[1.5px] border-border bg-surface text-text hover:bg-surface-muted",
  /** Text only. Ways out. */
  ghost: "text-secondary hover:bg-secondary-soft",
} as const;

const buttonSizes = {
  lg: "h-14 px-7 text-base",
  md: "h-11 px-5 text-sm",
} as const;

export interface ButtonProps extends ComponentProps<typeof BaseButton> {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
}

export function Button({
  className,
  variant = "primary",
  size = "lg",
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap transition-[background-color,scale] select-none active:scale-[0.98] [&_svg]:shrink-0",
        focusRing,
        buttonVariants[variant],
        buttonSizes[size],
        variant === "ghost" && (size === "lg" ? "px-5" : "px-4"),
        // Disabled reads as "sold out": muted fill, no border, no motion
        "data-disabled:cursor-not-allowed data-disabled:border-transparent data-disabled:bg-surface-muted data-disabled:text-text-muted data-disabled:active:scale-100",
        className,
      )}
      {...props}
    />
  );
}

const iconButtonVariants = {
  primary: "bg-primary text-on-primary hover:bg-lemon-300",
  soft: "border-[1.5px] border-border bg-surface text-text hover:bg-surface-muted",
} as const;

const iconButtonSizes = {
  md: "size-11",
  sm: "size-9",
} as const;

export interface IconButtonProps extends ComponentProps<typeof BaseButton> {
  variant?: keyof typeof iconButtonVariants;
  size?: keyof typeof iconButtonSizes;
  /** Icon buttons have no visible text, so a label is required. */
  "aria-label": string;
}

export function IconButton({
  className,
  variant = "soft",
  size = "md",
  ...props
}: IconButtonProps) {
  return (
    <BaseButton
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full transition-[background-color,scale] select-none active:scale-95",
        focusRing,
        iconButtonVariants[variant],
        iconButtonSizes[size],
        "data-disabled:cursor-not-allowed data-disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

const likeVariants = {
  /** Outlined, sits with other buttons. Turns pink when liked. */
  soft: "size-11 border-[1.5px] border-border bg-surface hover:bg-surface-muted data-pressed:border-transparent data-pressed:bg-accent-soft",
  /** Small white disc that floats over item photos. */
  overlay: "size-9 bg-surface",
} as const;

export interface LikeButtonProps extends Omit<
  ComponentProps<typeof Toggle>,
  "children"
> {
  variant?: keyof typeof likeVariants;
}

/** A heart toggle built on Base UI Toggle. */
export function LikeButton({
  className,
  variant = "soft",
  "aria-label": ariaLabel = "Like",
  ...props
}: LikeButtonProps) {
  return (
    <Toggle
      aria-label={ariaLabel}
      className={cn(
        "group inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full text-text transition-[background-color,scale] select-none active:scale-90 data-pressed:text-accent",
        focusRing,
        likeVariants[variant],
        className,
      )}
      {...props}
    >
      <HeartIcon
        size={variant === "overlay" ? 18 : 20}
        strokeWidth={variant === "overlay" ? 2.2 : 2}
        className="group-data-pressed:*:fill-current"
      />
    </Toggle>
  );
}
