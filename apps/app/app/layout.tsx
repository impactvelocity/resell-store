import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ToastProvider } from "@repo/ui/toast";
import { TooltipProvider } from "@repo/ui/tooltip";
import "./globals.css";

// Variable font with the optical-size axis: big display type tightens up like in the designs
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-bricolage",
});
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-figtree",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "resell.store",
  description: "Your closet, open for business.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${figtree.variable} ${jetbrains.variable}`}>
      <body>
        <ClerkProvider
          appearance={{
            // Map Clerk onto the resell.store tokens from @repo/ui
            variables: {
              colorBackground: "var(--color-surface)",
              colorForeground: "var(--color-text)",
              colorPrimary: "var(--color-secondary)",
              colorPrimaryForeground: "var(--color-on-secondary)",
              colorMuted: "var(--color-surface-muted)",
              colorMutedForeground: "var(--color-text-muted)",
              colorNeutral: "var(--color-text)",
              colorInput: "var(--color-surface)",
              colorInputForeground: "var(--color-text)",
              colorBorder: "var(--color-border)",
              colorRing: "var(--color-secondary)",
              colorDanger: "var(--color-danger)",
              colorSuccess: "var(--color-secondary)",
              fontFamily: "var(--font-figtree)",
              borderRadius: "14px",
            },
          }}
        >
          {/* Base UI: isolate so portalled popups always stack above the app */}
          <div className="isolate min-h-dvh">
            <TooltipProvider>
              <ToastProvider>{children}</ToastProvider>
            </TooltipProvider>
          </div>
        </ClerkProvider>
      </body>
    </html>
  );
}
