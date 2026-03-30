import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkAppAccess } from "@/lib/check-access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { hasAccess } = await checkAppAccess(supabase, "trap_monitor");
  if (!hasAccess) {
    redirect("/no-access");
  }

  return <>{children}</>;
}
