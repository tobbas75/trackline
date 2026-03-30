import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, getAllProfiles, getAllAppAccess, getAllApps } from "@/lib/check-access";
import { ArrowLeft, LogOut, Shield } from "lucide-react";
import Link from "next/link";
import { AdminPanel } from "./admin-panel";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = await isAdmin(supabase);
  if (!admin) redirect("/dashboard");

  const [profiles, accessRows, apps] = await Promise.all([
    getAllProfiles(supabase),
    getAllAppAccess(supabase),
    getAllApps(supabase),
  ]);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200/60 bg-white">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-red-dust flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-stone-50"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-[family-name:var(--font-dm-serif)] text-xl text-stone-800 tracking-tight">
              Trackline
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-sm text-stone-500">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6 text-red-dust" />
          <h1 className="font-[family-name:var(--font-dm-serif)] text-3xl text-stone-800">
            User management
          </h1>
        </div>
        <p className="text-stone-500 mb-10">
          Search users and manage their access to Trackline applications.
        </p>

        <AdminPanel profiles={profiles} accessRows={accessRows} apps={apps} />
      </main>
    </div>
  );
}
