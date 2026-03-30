export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-stone-900 border-t border-stone-800">
      <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-sm bg-stone-700 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 text-stone-400"
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
          <span className="text-sm text-stone-500">
            Trackline &copy; {year}
          </span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6 text-xs text-stone-500">
          <a href="#projects" className="hover:text-stone-300 transition-colors">
            Projects
          </a>
          <a href="#about" className="hover:text-stone-300 transition-colors">
            About
          </a>
          <a href="#contact" className="hover:text-stone-300 transition-colors">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
