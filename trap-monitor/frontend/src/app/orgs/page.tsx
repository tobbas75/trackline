"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Org = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  role: string;
};

export default function OrgsPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrgs();
  }, []);

  async function fetchOrgs() {
    const res = await fetch("/api/orgs");
    if (res.ok) {
      const data = await res.json();
      setOrgs(data);
    }
    setLoading(false);
  }

  async function handleDelete(orgId: string, orgName: string) {
    if (
      !confirm(
        `Are you sure you want to delete "${orgName}"? This will permanently delete all units, events, and data associated with this organization. This cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingId(orgId);

    const res = await fetch(`/api/orgs/${orgId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setOrgs((prev) => prev.filter((o) => o.id !== orgId));
      setDeletingId(null);
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete organization");
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-(--tm-bg) text-(--tm-text)">
      {/* Header */}
      <div className="border-b border-(--tm-border) bg-(--tm-panel)">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Organizations</h1>
            <p className="text-sm text-(--tm-muted) mt-1">
              Manage your trap monitoring organizations
            </p>
          </div>
          <Link
            href="/orgs/new"
            className="px-4 py-2 bg-(--tm-accent) hover:bg-(--tm-accent-strong) rounded-lg text-white font-medium transition-colors"
          >
            + Create Organization
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12 text-(--tm-muted)">
            Loading organizations...
          </div>
        ) : orgs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏢</div>
            <h2 className="text-xl font-semibold mb-2">No Organizations Yet</h2>
            <p className="text-(--tm-muted) mb-6">
              Create your first organization to start monitoring traps
            </p>
            <Link
              href="/orgs/new"
              className="inline-block px-6 py-3 bg-(--tm-accent) hover:bg-(--tm-accent-strong) rounded-lg text-white font-medium transition-colors"
            >
              Create Your First Organization
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {orgs.map((org) => (
              <div
                key={org.id}
                className="bg-(--tm-panel) border border-(--tm-border) rounded-lg p-6 hover:border-(--tm-accent) transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-semibold">{org.name}</h2>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          org.role === "owner"
                            ? "bg-(--tm-ok-soft) text-(--tm-ok-text)"
                            : org.role === "admin"
                              ? "bg-(--tm-info-soft) text-(--tm-info-text)"
                              : "bg-(--tm-panel-soft) text-(--tm-muted)"
                        }`}
                      >
                        {org.role}
                      </span>
                    </div>
                    {org.description && (
                      <p className="text-(--tm-muted) text-sm mb-3">
                        {org.description}
                      </p>
                    )}
                    <p className="text-xs text-(--tm-muted)">
                      Created{" "}
                      {new Date(org.created_at).toLocaleDateString("en-AU", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/orgs/${org.id}/units`}
                      className="px-4 py-2 bg-(--tm-panel-soft) hover:bg-(--tm-bg-subtle) rounded-lg text-sm font-medium transition-colors"
                    >
                      Manage Units
                    </Link>
                    <button
                      onClick={() => {
                        localStorage.setItem("selectedOrgId", org.id);
                        router.push("/dashboard");
                      }}
                      className="px-4 py-2 bg-(--tm-accent) hover:bg-(--tm-accent-strong) rounded-lg text-white text-sm font-medium transition-colors"
                    >
                      Open Dashboard
                    </button>
                    {org.role === "owner" && (
                      <button
                        onClick={() => handleDelete(org.id, org.name)}
                        disabled={deletingId === org.id}
                        className="px-4 py-2 bg-(--tm-danger-soft) hover:opacity-80 text-(--tm-danger) rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {deletingId === org.id ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="text-sm text-(--tm-muted) hover:text-(--tm-text) transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
