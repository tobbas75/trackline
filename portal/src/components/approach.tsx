const STEPS = [
  {
    number: "01",
    title: "Understand the field",
    description:
      "We start by understanding the real workflow — riding along on burns, checking trap lines, sitting with data entry. The field shapes every decision.",
  },
  {
    number: "02",
    title: "Build for the constraint",
    description:
      "Patchy mobile signal, shared tablets, extreme heat. We design for the worst-case environment first, so everything works when conditions are good.",
  },
  {
    number: "03",
    title: "Deploy and iterate",
    description:
      "Platforms go live quickly and improve with real feedback from the people using them. No six-month roadmaps — just steady, practical progress.",
  },
  {
    number: "04",
    title: "Hand over ownership",
    description:
      "Data, access, and configuration stay with the team. We build tools that communities can own, not dependencies that lock them in.",
  },
];

export function Approach() {
  return (
    <section id="approach" className="py-24 sm:py-32 bg-stone-50">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl mb-16">
          <p className="text-xs font-semibold tracking-widest uppercase text-red-dust mb-3">
            How we work
          </p>
          <h2 className="font-[family-name:var(--font-dm-serif)] text-3xl sm:text-4xl text-stone-800 leading-tight">
            Engineered in the field,<br />not the boardroom
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((step) => (
            <div key={step.number} className="relative">
              <span className="font-[family-name:var(--font-dm-serif)] text-5xl text-stone-200 leading-none">
                {step.number}
              </span>
              <h3 className="mt-4 font-semibold text-stone-800 text-sm mb-2">
                {step.title}
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
