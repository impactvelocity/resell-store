import { AppShell } from "../../components/shell/app-shell";
import { ViewerProvider } from "../../components/viewer";
import { requireUser } from "../../lib/server/session";
import { loadViewer } from "../../lib/server/viewer";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const viewer = await loadViewer(user);
  return (
    <ViewerProvider viewer={viewer}>
      <AppShell>{children}</AppShell>
    </ViewerProvider>
  );
}
