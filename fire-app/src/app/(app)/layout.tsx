import { AccessGate } from "./access-gate";
import { AppShell } from "./app-shell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AccessGate>
      <AppShell>{children}</AppShell>
    </AccessGate>
  );
}
