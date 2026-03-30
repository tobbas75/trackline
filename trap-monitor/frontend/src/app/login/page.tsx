"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--tm-bg) px-4">
      <div className="w-full max-w-md rounded-lg border border-(--tm-border) bg-(--tm-panel) p-8" style={{ boxShadow: "var(--tm-shadow-lg)" }}>
        <h1 className="mb-2 text-2xl font-bold text-(--tm-text)">Trap Monitor Login</h1>
        <p className="mb-6 text-sm text-(--tm-muted)">Sign in with your shared Trackline account.</p>

        {error ? (
          <div className="mb-4 rounded border border-(--tm-danger-border) bg-(--tm-danger-soft) px-3 py-2 text-sm text-(--tm-danger)">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-(--tm-text-secondary)">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded border border-(--tm-input-border) bg-(--tm-input-bg) px-3 py-2 text-(--tm-text) outline-none focus:border-(--tm-input-focus)"
              placeholder="demo@det.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-(--tm-text-secondary)">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded border border-(--tm-input-border) bg-(--tm-input-bg) px-3 py-2 text-(--tm-text) outline-none focus:border-(--tm-input-focus)"
              placeholder="Password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-(--tm-accent) px-4 py-2 font-medium text-white transition hover:bg-(--tm-accent-strong) disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
