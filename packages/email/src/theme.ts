/*
 * The brand tokens from packages/ui/src/styles.css, as plain values. Email
 * clients don't read CSS variables, so every style is inlined from these.
 */

export const color = {
  lemon100: "#fff6c2",
  lemon300: "#ffe873",
  lemon400: "#ffd934",
  lemon500: "#f5be0b",
  leaf100: "#ddf0e3",
  leaf300: "#8cc9a4",
  leaf600: "#256b4c",
  leaf900: "#14261d",
  pink100: "#ffdceb",
  pink400: "#ff5fa8",
  pink600: "#c9246f",
  berry500: "#d9391b",

  background: "#fffdf2",
  surface: "#ffffff",
  surfaceMuted: "#f7f3df",
  border: "#e8e3cc",
  text: "#14261d",
  textMuted: "#56675e",
} as const;

export const font = {
  sans: "Figtree, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  display:
    "'Bricolage Grotesque', Figtree, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
} as const;

/** Loaded where the client allows it (Apple Mail, iOS); the rest use the fallbacks. */
export const fontsHref =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Figtree:wght@400;500;700&display=swap";

export const radius = { sm: 8, md: 14, lg: 20, full: 999 } as const;
