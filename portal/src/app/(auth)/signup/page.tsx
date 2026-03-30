"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          organisation,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Create portal profile
    if (data.user) {
      await supabase.schema("portal").from("profiles").upsert({
        id: data.user.id,
        full_name: fullName,
        organisation,
      });
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div>
        <Link href="/" className="flex items-center gap-3 mb-10">
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
          <span className="font-[family-name:var(--font-dm-serif)] text-xl text-stone-100 tracking-tight">
            Trackline
          </span>
        </Link>

        <div className="bg-stone-800/60 border border-stone-700/50 rounded-sm p-8 backdrop-blur-sm text-center">
          <CheckCircle2 className="w-12 h-12 text-eucalypt mx-auto mb-4" />
          <h1 className="font-[family-name:var(--font-dm-serif)] text-2xl text-stone-50 mb-2">
            Check your email
          </h1>
          <p className="text-sm text-stone-400 mb-6">
            We&apos;ve sent a confirmation link to{" "}
            <span className="text-stone-200">{email}</span>. Click it to
            activate your account.
          </p>
          <Link
            href="/login"
            className="text-sm text-ochre hover:text-ochre-light transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 mb-10">
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
        <span className="font-[family-name:var(--font-dm-serif)] text-xl text-stone-100 tracking-tight">
          Trackline
        </span>
      </Link>

      {/* Card */}
      <div className="bg-stone-800/60 border border-stone-700/50 rounded-sm p-8 backdrop-blur-sm">
        <h1 className="font-[family-name:var(--font-dm-serif)] text-2xl text-stone-50 mb-1">
          Create an account
        </h1>
        <p className="text-sm text-stone-400 mb-8">
          Request access to Trackline conservation tools.
        </p>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-6 bg-red-dust/10 border border-red-dust/20 rounded-sm">
            <AlertCircle className="w-4 h-4 text-red-dust-light shrink-0" />
            <p className="text-sm text-red-dust-light">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="fullName"
              className="block text-xs font-medium text-stone-400 mb-1.5 tracking-wide"
            >
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-stone-900/60 border border-stone-700 rounded-sm text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-ochre/60 transition-colors"
              placeholder="Your name"
            />
          </div>

          <div>
            <label
              htmlFor="organisation"
              className="block text-xs font-medium text-stone-400 mb-1.5 tracking-wide"
            >
              Organisation
            </label>
            <input
              id="organisation"
              type="text"
              value={organisation}
              onChange={(e) => setOrganisation(e.target.value)}
              className="w-full px-4 py-3 bg-stone-900/60 border border-stone-700 rounded-sm text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-ochre/60 transition-colors"
              placeholder="Ranger group, research org, etc."
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-stone-400 mb-1.5 tracking-wide"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-stone-900/60 border border-stone-700 rounded-sm text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-ochre/60 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-stone-400 mb-1.5 tracking-wide"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 bg-stone-900/60 border border-stone-700 rounded-sm text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-ochre/60 transition-colors"
              placeholder="Minimum 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-sm font-semibold text-stone-50 bg-red-dust hover:bg-accent-light disabled:opacity-50 rounded-sm transition-colors tracking-wide flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          Already have an account?{" "}
          <Link href="/login" className="text-ochre hover:text-ochre-light transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
