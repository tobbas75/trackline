import { ShieldX } from "lucide-react";
import Link from "next/link";

export default function NoAccessPage() {
  return (
    <div className="text-center">
      {/* Logo */}
      <Link href="/" className="inline-flex items-center gap-3 mb-10">
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

      <div className="bg-stone-800/60 border border-stone-700/50 rounded-sm p-8 backdrop-blur-sm">
        <ShieldX className="w-12 h-12 text-stone-500 mx-auto mb-4" />
        <h1 className="font-[family-name:var(--font-dm-serif)] text-2xl text-stone-50 mb-2">
          Access not granted
        </h1>
        <p className="text-sm text-stone-400 mb-6 max-w-sm mx-auto">
          Your account doesn&apos;t have access to this application yet. Contact
          your team administrator or reach out to us to request access.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-6 py-2.5 text-sm font-medium text-stone-50 bg-red-dust hover:bg-accent-light rounded-sm transition-colors"
          >
            Go to dashboard
          </Link>
          <Link
            href="/#contact"
            className="px-6 py-2.5 text-sm font-medium text-stone-300 border border-stone-600/50 hover:border-stone-400 rounded-sm transition-colors"
          >
            Contact us
          </Link>
        </div>
      </div>
    </div>
  );
}
