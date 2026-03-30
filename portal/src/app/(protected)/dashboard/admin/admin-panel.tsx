"use client";

import { useState, useTransition } from "react";
import { Search, UserPlus, X, ChevronDown } from "lucide-react";
import { grantAccess, revokeAccess, updateRole } from "./actions";

interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
  organisation: string | null;
  created_at: string;
}

interface AccessRow {
  id: string;
  user_id: string;
  app_id: string;
  role: string;
  granted_at: string;
  apps: { id: string; name: string };
}

interface App {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

const ROLE_OPTIONS = ["viewer", "member", "admin"] as const;

const APP_COLORS: Record<string, string> = {
  wildtrack: "bg-eucalypt/10 text-eucalypt border-eucalypt/20",
  fire: "bg-ochre/10 text-ochre border-ochre/20",
  trap_monitor: "bg-sky/10 text-sky border-sky/20",
};

export function AdminPanel({
  profiles,
  accessRows,
  apps,
}: {
  profiles: Profile[];
  accessRows: AccessRow[];
  apps: App[];
}) {
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  // Build a lookup: userId -> array of access rows
  const accessByUser = new Map<string, AccessRow[]>();
  for (const row of accessRows) {
    const existing = accessByUser.get(row.user_id) ?? [];
    existing.push(row);
    accessByUser.set(row.user_id, existing);
  }

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (p.display_name ?? "").toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q) ||
      (p.organisation ?? "").toLowerCase().includes(q)
    );
  });

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  }

  function handleGrant(userId: string, appId: string, role: string) {
    const fd = new FormData();
    fd.set("user_id", userId);
    fd.set("app_id", appId);
    fd.set("role", role);
    startTransition(async () => {
      const result = await grantAccess(fd);
      if (result.error) showFeedback(`Error: ${result.error}`);
      else showFeedback("Access granted");
    });
  }

  function handleRevoke(accessId: string) {
    const fd = new FormData();
    fd.set("access_id", accessId);
    startTransition(async () => {
      const result = await revokeAccess(fd);
      if (result.error) showFeedback(`Error: ${result.error}`);
      else showFeedback("Access revoked");
    });
  }

  function handleRoleChange(accessId: string, newRole: string) {
    const fd = new FormData();
    fd.set("access_id", accessId);
    fd.set("role", newRole);
    startTransition(async () => {
      const result = await updateRole(fd);
      if (result.error) showFeedback(`Error: ${result.error}`);
      else showFeedback("Role updated");
    });
  }

  return (
    <div>
      {/* Feedback toast */}
      {feedback && (
        <div className="fixed top-4 right-4 z-50 bg-stone-800 text-stone-50 px-4 py-2 rounded-sm text-sm shadow-lg">
          {feedback}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="text"
          placeholder="Search by name, email, or organisation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200/60 rounded-sm text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-red-dust/20 focus:border-red-dust/40"
        />
      </div>

      {/* User count */}
      <p className="text-sm text-stone-400 mb-4">
        {filtered.length} user{filtered.length !== 1 ? "s" : ""}
        {search && ` matching "${search}"`}
      </p>

      {/* User list */}
      <div className="space-y-2">
        {filtered.map((profile) => {
          const userAccess = accessByUser.get(profile.id) ?? [];
          const isExpanded = expandedUser === profile.id;

          return (
            <div
              key={profile.id}
              className="bg-white border border-stone-200/60 rounded-sm overflow-hidden"
            >
              {/* User row */}
              <button
                onClick={() =>
                  setExpandedUser(isExpanded ? null : profile.id)
                }
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-stone-50/50 transition-colors"
              >
                {/* Avatar placeholder */}
                <div className="w-9 h-9 rounded-full bg-stone-200 flex items-center justify-center text-sm font-medium text-stone-500 shrink-0">
                  {(profile.display_name ?? profile.email ?? "?")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">
                    {profile.display_name ?? "—"}
                  </p>
                  <p className="text-xs text-stone-400 truncate">
                    {profile.email}
                    {profile.organisation && ` · ${profile.organisation}`}
                  </p>
                </div>

                {/* Access badges */}
                <div className="hidden sm:flex items-center gap-1.5">
                  {userAccess.map((a) => (
                    <span
                      key={a.id}
                      className={`text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                        APP_COLORS[a.app_id] ?? "bg-stone-100 text-stone-500 border-stone-200"
                      }`}
                    >
                      {a.apps.name}
                    </span>
                  ))}
                  {userAccess.length === 0 && (
                    <span className="text-[10px] text-stone-300 italic">
                      No access
                    </span>
                  )}
                </div>

                <ChevronDown
                  className={`w-4 h-4 text-stone-400 transition-transform shrink-0 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Expanded panel */}
              {isExpanded && (
                <div className="border-t border-stone-100 px-5 py-4 bg-stone-50/30">
                  <p className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-3">
                    App access
                  </p>

                  {/* Current access */}
                  {userAccess.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {userAccess.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-3 bg-white border border-stone-200/60 rounded-sm px-4 py-2.5"
                        >
                          <span
                            className={`text-xs font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                              APP_COLORS[a.app_id] ?? "bg-stone-100 text-stone-500 border-stone-200"
                            }`}
                          >
                            {a.apps.name}
                          </span>

                          <select
                            value={a.role}
                            onChange={(e) =>
                              handleRoleChange(a.id, e.target.value)
                            }
                            disabled={isPending}
                            className="ml-auto text-xs bg-stone-50 border border-stone-200 rounded-sm px-2 py-1 text-stone-600 focus:outline-none focus:ring-1 focus:ring-red-dust/20"
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => handleRevoke(a.id)}
                            disabled={isPending}
                            className="text-stone-400 hover:text-red-dust transition-colors disabled:opacity-50"
                            title="Revoke access"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Grant new access */}
                  {(() => {
                    const grantedAppIds = new Set(
                      userAccess.map((a) => a.app_id)
                    );
                    const ungrantedApps = apps.filter(
                      (app) => !grantedAppIds.has(app.id)
                    );

                    if (ungrantedApps.length === 0) return null;

                    return (
                      <div>
                        <p className="text-xs text-stone-400 mb-2">
                          Grant access to:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {ungrantedApps.map((app) => (
                            <button
                              key={app.id}
                              onClick={() =>
                                handleGrant(profile.id, app.id, "viewer")
                              }
                              disabled={isPending}
                              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-sm border transition-colors disabled:opacity-50 hover:shadow-sm ${
                                APP_COLORS[app.id] ?? "bg-stone-100 text-stone-500 border-stone-200"
                              }`}
                            >
                              <UserPlus className="w-3 h-3" />
                              {app.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-stone-400 text-sm">
            No users found.
          </div>
        )}
      </div>
    </div>
  );
}
