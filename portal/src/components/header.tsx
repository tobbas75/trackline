"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Projects", href: "#projects" },
  { label: "About", href: "#about" },
  { label: "Approach", href: "#approach" },
  { label: "Contact", href: "#contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-stone-50/80 backdrop-blur-md border-b border-stone-200/60">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
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
          <span
            className="font-[family-name:var(--font-dm-serif)] text-xl text-stone-800 tracking-tight"
          >
            Trackline
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors tracking-wide"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/login"
            className="ml-2 text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors"
          >
            Sign in
          </Link>
          <a
            href="#contact"
            className="px-5 py-2 text-sm font-medium text-stone-50 bg-red-dust hover:bg-accent-light rounded-sm transition-colors"
          >
            Get in touch
          </a>
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-stone-600"
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav className="md:hidden border-t border-stone-200/60 bg-stone-50/95 backdrop-blur-md px-6 py-6 flex flex-col gap-4">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-base font-medium text-stone-600 hover:text-stone-800 transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="text-base font-medium text-stone-600 hover:text-stone-800 transition-colors"
          >
            Sign in
          </Link>
          <a
            href="#contact"
            onClick={() => setOpen(false)}
            className="mt-2 px-5 py-2.5 text-sm font-medium text-stone-50 bg-red-dust rounded-sm text-center transition-colors"
          >
            Get in touch
          </a>
        </nav>
      )}
    </header>
  );
}
