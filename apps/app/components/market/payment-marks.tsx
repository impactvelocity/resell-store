import { Fragment } from "react";
import { cn } from "@repo/ui/lib/utils";

/**
 * Card-sized brand marks for the ways to pay: PayPal, Venmo and the cards
 * PayPal takes. Drawn inline so they stay crisp; text uses `textLength` so the
 * wordmarks fit the badge whatever font the browser falls back to.
 */
const W = 38;
const H = 24;
const word = { fontFamily: "Arial, Helvetica, sans-serif", fontWeight: 800 } as const;

function Badge({
  label,
  fill = "#fff",
  children,
}: {
  label: string;
  fill?: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label}>
        <title>{label}</title>
        <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="4" fill={fill} stroke="#d9dcd6" />
        {children}
      </svg>
    </li>
  );
}

const marks = [
  {
    key: "paypal",
    node: (
      <Badge label="PayPal">
        <text x="5" y="15.5" textLength="28" lengthAdjust="spacingAndGlyphs" fontSize="9.5" fontStyle="italic" style={word}>
          <tspan fill="#003087">Pay</tspan>
          <tspan fill="#009cde">Pal</tspan>
        </text>
      </Badge>
    ),
  },
  {
    key: "venmo",
    node: (
      <Badge label="Venmo" fill="#008cff">
        <text x="5" y="15.5" textLength="28" lengthAdjust="spacingAndGlyphs" fontSize="10" fontStyle="italic" fill="#fff" style={word}>
          venmo
        </text>
      </Badge>
    ),
  },
  {
    key: "visa",
    node: (
      <Badge label="Visa">
        <text x="6" y="16" textLength="26" lengthAdjust="spacingAndGlyphs" fontSize="11" fontStyle="italic" fill="#1a1f71" style={word}>
          VISA
        </text>
      </Badge>
    ),
  },
  {
    key: "mastercard",
    node: (
      <Badge label="Mastercard">
        <circle cx="15" cy="12" r="7" fill="#eb001b" />
        <circle cx="23" cy="12" r="7" fill="#f79e1b" />
        <path d="M19 6.27a7 7 0 0 1 0 11.46a7 7 0 0 1 0-11.46Z" fill="#ff5f00" />
      </Badge>
    ),
  },
  {
    key: "amex",
    node: (
      <Badge label="American Express" fill="#006fcf">
        <text x="5" y="15.5" textLength="28" lengthAdjust="spacingAndGlyphs" fontSize="9.5" fill="#fff" style={word}>
          AMEX
        </text>
      </Badge>
    ),
  },
  {
    key: "discover",
    node: (
      <Badge label="Discover">
        <path d="M18 23.5h15.5a4 4 0 0 0 4-4V14C30 19.5 24 22.5 18 23.5Z" fill="#f48120" />
        <text x="4" y="13" textLength="30" lengthAdjust="spacingAndGlyphs" fontSize="6.5" fill="#231f20" style={word}>
          DISCOVER
        </text>
      </Badge>
    ),
  },
];

export function PaymentMarks({ className }: { className?: string }) {
  return (
    <ul aria-label="Ways to pay" className={cn("flex flex-wrap items-center justify-center gap-1.5", className)}>
      {marks.map((m) => (
        <Fragment key={m.key}>{m.node}</Fragment>
      ))}
    </ul>
  );
}
