"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewOrgPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      alert("Failed to create organization");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-(--tm-bg) text-(--tm-text) flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-(--tm-panel) border border-(--tm-border) rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Create Organization</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-(--tm-muted) mb-1">
              Organization Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Tiwi Rangers"
              className="w-full px-3 py-2 bg-(--tm-input-bg) border border-(--tm-input-border) rounded text-(--tm-text) outline-none focus:border-(--tm-input-focus)"
            />
          </div>

          <div>
            <label className="block text-sm text-(--tm-muted) mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Trap monitoring for Tiwi Islands ranger group"
              rows={3}
              className="w-full px-3 py-2 bg-(--tm-input-bg) border border-(--tm-input-border) rounded text-(--tm-text) outline-none focus:border-(--tm-input-focus)"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="flex-1 px-4 py-2 border border-(--tm-border) rounded hover:bg-(--tm-panel-soft) transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-(--tm-accent) hover:bg-(--tm-accent-strong) rounded text-white font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
