import { createClient } from "@/lib/supabase/server";
import { getUserApps, isAdmin } from "@/lib/check-access";
import { Card, CardHeader, CardBody, Badge, cn } from "@/components/ui";
import { Camera, Flame, Radio, ArrowUpRight, LogOut, Shield } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const ICON_MAP: Record<string, ReactNode> = {
  camera: <Camera className="w-6 h-6" />,
  flame: <Flame className="w-6 h-6" />,
  radio: <Radio className="w-6 h-6" />,
};

const COLOR_MAP: Record<string, { text: string; bg: string }> = {
  wildtrack: { text: "text-eucalypt", bg: "bg-eucalypt/10" },
  fire: { text: "text-ochre", bg: "bg-ochre/10" },
  trap_monitor: { text: "text-sky", bg: "bg-sky/10" },
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-eucalypt",
  maintenance: "bg-ochre",
  down: "bg-red-dust",
};

// Role badge: admin always primary, viewer always default, member follows app colour.
const ROLE_VARIANT_MAP: Record<string, Record<string, "primary" | "eucalypt" | "ochre" | "sky" | "default">> = {
  admin:  { wildtrack: "primary", fire: "primary", trap_monitor: "primary" },
  member: { wildtrack: "eucalypt", fire: "ochre", trap_monitor: "sky" },
  viewer: { wildtrack: "default", fire: "default", trap_monitor: "default" },
};

function roleBadgeVariant(role: string, appId: string): "primary" | "eucalypt" | "ochre" | "sky" | "default" {
  return ROLE_VARIANT_MAP[role]?.[appId] ?? "default";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [userApps, admin] = await Promise.all([
    getUserApps(supabase),
    isAdmin(supabase),
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
            {admin && (
              <Link
                href="/dashboard/admin"
                className="flex items-center gap-1.5 text-sm text-red-dust hover:text-red-dust-light transition-colors"
              >
                <Shield className="w-4 h-4" />
                Manage users
              </Link>
            )}
            <span className="text-sm text-stone-500">{user?.email}</span>
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
        <h1 className="font-[family-name:var(--font-dm-serif)] text-3xl text-stone-800 mb-2">
          Your tools
        </h1>
        <p className="text-stone-500 mb-10">
          Applications you have access to.
        </p>

        {userApps.length === 0 ? (
          <div className="bg-white border border-stone-200/60 rounded-sm p-12 text-center">
            <p className="text-stone-500 mb-4">
              You don&apos;t have access to any applications yet.
            </p>
            <p className="text-sm text-stone-400">
              Contact your team administrator or{" "}
              <Link href="/#contact" className="text-ochre hover:text-ochre-light transition-colors">
                get in touch
              </Link>{" "}
              to request access.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {userApps.map((access) => {
              const app = access.apps;
              const colors = COLOR_MAP[app.id] ?? { text: "text-stone-600", bg: "bg-stone-100" };

              return (
                <a key={app.id} href={app.url ?? "#"} className="group block">
                  <Card hover className="h-full relative">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className={`${colors.bg} ${colors.text} rounded-sm p-3`}>
                          {ICON_MAP[app.icon ?? ""] ?? <Camera className="w-6 h-6" />}
                        </div>
                        <Badge variant={roleBadgeVariant(access.role, app.id)}>
                          {access.role}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardBody>
                      <h3 className="font-[family-name:var(--font-dm-serif)] text-xl text-stone-800 mb-2">
                        {app.name}
                      </h3>
                      <p className="text-sm text-stone-500 leading-relaxed">
                        <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle", STATUS_DOT[app.status ?? "active"])} />
                        {app.description}
                      </p>
                      <ArrowUpRight className="absolute bottom-6 right-6 w-5 h-5 text-stone-300 group-hover:text-stone-500 transition-colors" />
                    </CardBody>
                  </Card>
                </a>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
