import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkAppAccess } from "@/lib/check-access";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check portal-level app access
  const { hasAccess } = await checkAppAccess(supabase, "wildtrack");
  if (!hasAccess) {
    redirect("/no-access");
  }

  return <>{children}</>;
}
