export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-stone-900">
      {/* Background — abstract red-earth gradient */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-[#3a2518]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(181,69,42,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,rgba(201,145,58,0.1),transparent_50%)]" />
        {/* Dust particle dots */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(1px 1px at 20px 30px, #f5f0eb 50%, transparent 0),
              radial-gradient(1px 1px at 40px 70px, #f5f0eb 50%, transparent 0),
              radial-gradient(1px 1px at 80px 20px, #f5f0eb 50%, transparent 0),
              radial-gradient(1px 1px at 100px 90px, #f5f0eb 50%, transparent 0)`,
            backgroundSize: "120px 120px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        {/* Tagline chip */}
        <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-stone-600/40 bg-stone-800/50 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-ochre" />
          <span className="text-xs font-medium tracking-widest uppercase text-stone-300">
            Conservation Technology
          </span>
        </div>

        <h1 className="animate-fade-up animation-delay-100 font-[family-name:var(--font-dm-serif)] text-5xl sm:text-6xl lg:text-7xl text-stone-50 leading-[1.1] tracking-tight">
          Built for the dust,{" "}
          <span className="text-red-dust-light">not the desk</span>
        </h1>

        <p className="animate-fade-up animation-delay-200 mt-8 text-lg sm:text-xl text-stone-400 leading-relaxed max-w-2xl mx-auto">
          Purpose-built tools for ranger teams, researchers, and land managers
          working in Australia&apos;s toughest landscapes. Camera traps, fire
          management, and remote monitoring&nbsp;&mdash; engineered for the field.
        </p>

        <div className="animate-fade-up animation-delay-300 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#projects"
            className="px-8 py-3 text-sm font-semibold text-stone-50 bg-red-dust hover:bg-accent-light rounded-sm transition-colors tracking-wide"
          >
            See our tools
          </a>
          <a
            href="#about"
            className="px-8 py-3 text-sm font-medium text-stone-300 border border-stone-600/50 hover:border-stone-400 hover:text-stone-100 rounded-sm transition-colors tracking-wide"
          >
            Our story
          </a>
        </div>

        {/* Scroll indicator */}
        <div className="animate-fade-up animation-delay-500 mt-20">
          <div className="w-px h-12 mx-auto bg-gradient-to-b from-stone-600 to-transparent" />
        </div>
      </div>
    </section>
  );
}
