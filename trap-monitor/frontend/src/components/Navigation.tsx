"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavigationProps {
  orgId?: string;
  orgName?: string;
  unitCount?: number;
  caughtCount?: number;
}

export default function Navigation({
  orgId,
  orgName,
  unitCount = 0,
  caughtCount = 0,
}: NavigationProps) {
  const pathname = usePathname();
  const [expandOrg, setExpandOrg] = useState(false);

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <>
      {/* Desktop Sidebar Navigation */}
      <nav className="hidden md:flex flex-col w-64 bg-(--tm-panel) border-r border-(--tm-border) h-screen">
        {/* Logo and Org */}
        <div className="p-4 border-b border-(--tm-border)">
          <div className="text-2xl font-bold text-(--tm-accent) mb-3">
            🪤 TrapNet
          </div>
          <div className="text-xs text-(--tm-muted) uppercase tracking-wider mb-2">
            Organization
          </div>
          <div className="text-sm font-medium text-(--tm-text) truncate">
            {orgName || "No organization"}
          </div>
          {unitCount > 0 && (
            <div className="text-xs text-(--tm-muted) mt-1">
              {unitCount} trap{unitCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <div className="flex-1 flex flex-col p-4 gap-2">
          <Link
            href="/dashboard"
            className={`px-4 py-3 rounded-lg transition-colors flex items-center gap-2 ${
              isActive("/dashboard") &&
              !isActive("/dashboard/settings") &&
              !isActive("/dashboard/units") &&
              !isActive("/dashboard/field-check")
                ? "bg-(--tm-accent) text-white"
                : "text-(--tm-muted) hover:bg-(--tm-panel-soft) hover:text-(--tm-text)"
            }`}
          >
            <span>📍</span> Monitor
          </Link>

          <Link
            href="/dashboard/field-check"
            className={`px-4 py-3 rounded-lg transition-colors flex items-center gap-2 ${
              isActive("/dashboard/field-check")
                ? "bg-(--tm-accent) text-white"
                : "text-(--tm-muted) hover:bg-(--tm-panel-soft) hover:text-(--tm-text)"
            }`}
          >
            <span>✅</span> Field Check
          </Link>

          <Link
            href={`/orgs/${orgId}/units`}
            className={`px-4 py-3 rounded-lg transition-colors flex items-center gap-2 ${
              isActive("/orgs") && isActive("/units")
                ? "bg-(--tm-accent) text-white"
                : "text-(--tm-muted) hover:bg-(--tm-panel-soft) hover:text-(--tm-text)"
            }`}
          >
            <span>⚙️</span> Manage Units
          </Link>

          <Link
            href="/dashboard/settings/notifications"
            className={`px-4 py-3 rounded-lg transition-colors flex items-center gap-2 ${
              isActive("/dashboard/settings")
                ? "bg-(--tm-accent) text-white"
                : "text-(--tm-muted) hover:bg-(--tm-panel-soft) hover:text-(--tm-text)"
            }`}
          >
            <span>🔔</span> Notifications
          </Link>

          <div className="border-t border-(--tm-border) my-2"></div>

          <Link
            href="/orgs"
            className={`px-4 py-3 rounded-lg transition-colors flex items-center gap-2 ${
              pathname === "/orgs"
                ? "bg-(--tm-accent) text-white"
                : "text-(--tm-muted) hover:bg-(--tm-panel-soft) hover:text-(--tm-text)"
            }`}
          >
            <span>🏢</span> Organizations
          </Link>
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-(--tm-border) p-4 space-y-2">
          <Link
            href="/orgs/new"
            className="block w-full px-4 py-2 bg-(--tm-panel-soft) hover:bg-(--tm-bg-subtle) text-(--tm-muted) text-sm rounded-lg transition-colors text-center"
          >
            + New Org
          </Link>
          <form action="/auth/signout" method="POST" className="w-full">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-(--tm-danger-soft) hover:opacity-80 text-(--tm-danger) text-sm rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-(--tm-panel) border-t border-(--tm-border) flex items-center justify-around h-16 z-50">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
            isActive("/dashboard") &&
            !isActive("/dashboard/settings") &&
            !isActive("/dashboard/units") &&
            !isActive("/dashboard/field-check")
              ? "bg-(--tm-accent-soft) text-(--tm-accent)"
              : "text-(--tm-muted) hover:text-(--tm-text)"
          }`}
        >
          <span className="text-xl">📍</span>
          <span className="text-xs">Monitor</span>
        </Link>
        <Link
          href={`/orgs/${orgId}/units`}
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
            isActive("/orgs") && isActive("/units")
              ? "bg-(--tm-accent-soft) text-(--tm-accent)"
              : "text-(--tm-muted) hover:text-(--tm-text)"
          }`}
        >
          <span className="text-xl">⚙️</span>
          <span className="text-xs">Units</span>
        </Link>
        <Link
          href="/dashboard/settings/notifications"
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
            isActive("/dashboard/settings")
              ? "bg-(--tm-accent-soft) text-(--tm-accent)"
              : "text-(--tm-muted) hover:text-(--tm-text)"
          }`}
        >
          <span className="text-xl">🔔</span>
          <span className="text-xs">Alerts</span>
        </Link>
        <button
          onClick={() => setExpandOrg(!expandOrg)}
          className="flex flex-col items-center justify-center w-full h-full gap-1 text-(--tm-muted) hover:text-(--tm-text) transition-colors"
        >
          <span className="text-xl">👤</span>
          <span className="text-xs">Menu</span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {expandOrg && (
        <div
          className="md:hidden fixed inset-0 bg-[var(--tm-overlay)] z-40"
          onClick={() => setExpandOrg(false)}
        />
      )}

      {/* Mobile Menu Popup */}
      {expandOrg && (
        <div className="md:hidden fixed bottom-20 right-4 bg-(--tm-panel) border border-(--tm-border) rounded-lg z-40 w-48" style={{ boxShadow: "var(--tm-shadow-lg)" }}>
          <div className="p-3 border-b border-(--tm-border)">
            <div className="text-xs text-(--tm-muted) uppercase tracking-wider">
              Organization
            </div>
            <div className="text-sm font-medium text-(--tm-text) mt-1">
              {orgName || "No org"}
            </div>
          </div>
          <div className="p-2 space-y-1">
            <Link
              href="/dashboard/field-check"
              className="block px-3 py-2 text-sm text-(--tm-text-secondary) hover:bg-(--tm-panel-soft) rounded transition-colors"
              onClick={() => setExpandOrg(false)}
            >
              ✅ Field Check
            </Link>
            <Link
              href="/orgs"
              className="block px-3 py-2 text-sm text-(--tm-text-secondary) hover:bg-(--tm-panel-soft) rounded transition-colors"
              onClick={() => setExpandOrg(false)}
            >
              🏢 Organizations
            </Link>
            <Link
              href="/orgs/new"
              className="block px-3 py-2 text-sm text-(--tm-text-secondary) hover:bg-(--tm-panel-soft) rounded transition-colors"
              onClick={() => setExpandOrg(false)}
            >
              + New Organization
            </Link>
            <form action="/auth/signout" method="POST" className="w-full">
              <button
                type="submit"
                className="w-full text-left px-3 py-2 text-sm text-(--tm-danger) hover:bg-(--tm-danger-soft) rounded transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
