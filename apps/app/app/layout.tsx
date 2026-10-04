import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@repo/ui/toast";
import { TooltipProvider } from "@repo/ui/tooltip";
import { rootMetadata } from "../lib/og";
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

// metadataBase (siteUrl) plus brand Open Graph / Twitter defaults; app/opengraph-image.tsx adds the image
export const metadata: Metadata = rootMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${figtree.variable} ${jetbrains.variable}`}>
      <body>
        {/* Base UI: isolate so portalled popups always stack above the app */}
        <div className="isolate min-h-dvh">
          <TooltipProvider>
            <ToastProvider>{children}</ToastProvider>
          </TooltipProvider>
        </div>
      </body>
    </html>
  );
}
