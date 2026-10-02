/** Checkout and offers: white ground, each page brings its own slim header. */
export default function CheckoutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-dvh bg-public-background">{children}</div>;
}
