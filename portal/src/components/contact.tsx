"use client";

import { Mail, MapPin } from "lucide-react";

export function Contact() {
  return (
    <section id="contact" className="py-24 sm:py-32 bg-stone-900 text-stone-100">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Left */}
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-ochre mb-3">
              Get in touch
            </p>
            <h2 className="font-[family-name:var(--font-dm-serif)] text-3xl sm:text-4xl text-stone-50 leading-tight mb-6">
              Let&apos;s talk about<br />what you need
            </h2>
            <p className="text-stone-400 leading-relaxed mb-8 max-w-md">
              Whether you&apos;re a ranger group looking for better tools, a
              researcher who needs camera trap analytics, or an organisation
              managing fire and carbon — we&apos;d like to hear from you.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-stone-400">
                <Mail className="w-4 h-4 text-ochre" />
                <a
                  href="mailto:hello@trackline.au"
                  className="hover:text-stone-200 transition-colors"
                >
                  hello@trackline.au
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm text-stone-400">
                <MapPin className="w-4 h-4 text-ochre" />
                <span>Australia — working remotely across the Top End</span>
              </div>
            </div>
          </div>

          {/* Right — contact form */}
          <form
            className="space-y-5"
            onSubmit={(e) => e.preventDefault()}
          >
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-medium text-stone-400 mb-1.5 tracking-wide"
              >
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-sm text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-ochre/60 transition-colors"
                placeholder="Your name"
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
                type="email"
                id="email"
                name="email"
                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-sm text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-ochre/60 transition-colors"
                placeholder="you@example.com"
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
                type="text"
                id="organisation"
                name="organisation"
                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-sm text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-ochre/60 transition-colors"
                placeholder="Ranger group, research org, etc."
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-xs font-medium text-stone-400 mb-1.5 tracking-wide"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-sm text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-ochre/60 transition-colors resize-none"
                placeholder="Tell us about your project or what you need..."
              />
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 text-sm font-semibold text-stone-900 bg-ochre hover:bg-ochre-light rounded-sm transition-colors tracking-wide"
            >
              Send message
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
