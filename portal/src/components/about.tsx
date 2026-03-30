import { MapPin, Wrench, Shield, Users } from "lucide-react";

const VALUES = [
  {
    icon: <MapPin className="w-5 h-5" />,
    title: "Remote first",
    description:
      "Every tool is designed for areas with limited connectivity, extreme heat, and the unpredictable logistics of working hours from the nearest town.",
  },
  {
    icon: <Wrench className="w-5 h-5" />,
    title: "Field-grade engineering",
    description:
      "We don't build prototypes. Our platforms handle real data from real deployments — thousands of camera trap records, satellite imagery pipelines, and hardware that survives the wet season.",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Data sovereignty",
    description:
      "Your data stays yours. Role-based access, row-level security, and workspace isolation mean ranger groups and research teams control exactly who sees what.",
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Built with communities",
    description:
      "We work alongside Indigenous ranger groups, national parks, and conservation researchers. The tools reflect their workflows, not the other way around.",
  },
];

export function About() {
  return (
    <section id="about" className="py-24 sm:py-32 bg-stone-100">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left — narrative */}
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-red-dust mb-3">
              About Trackline
            </p>
            <h2 className="font-[family-name:var(--font-dm-serif)] text-3xl sm:text-4xl text-stone-800 leading-tight mb-6">
              Conservation deserves<br />better software
            </h2>
            <div className="space-y-4 text-stone-600 leading-relaxed">
              <p>
                Too much conservation technology is built for well-funded labs in
                capital cities. Out on country — on the red dirt roads of the Top
                End, in the spinifex of Central Australia, across the vast
                savannas of Cape York — teams make do with spreadsheets, paper
                forms, and tools that weren&apos;t designed for their reality.
              </p>
              <p>
                Trackline exists to close that gap. We build the platforms that
                ranger teams, Indigenous land managers, and field researchers
                actually need — tools that handle unreliable connectivity, work
                on any device, and respect the complexity of managing country.
              </p>
              <p>
                Based in Australia. Built for the places most software
                forgets.
              </p>
            </div>
          </div>

          {/* Right — values grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            {VALUES.map((value) => (
              <div
                key={value.title}
                className="bg-white rounded-sm p-6 border border-stone-200/60"
              >
                <div className="text-red-dust mb-3">{value.icon}</div>
                <h3 className="font-semibold text-stone-800 text-sm mb-2">
                  {value.title}
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
