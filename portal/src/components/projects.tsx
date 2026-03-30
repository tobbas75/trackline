import { Camera, Flame, Radio, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

interface Project {
  icon: ReactNode;
  name: string;
  tagline: string;
  description: string;
  features: string[];
  color: string;
  borderColor: string;
  iconBg: string;
  status: string;
}

const PROJECTS: Project[] = [
  {
    icon: <Camera className="w-6 h-6" />,
    name: "WildTrack",
    tagline: "Camera Trap Management",
    description:
      "Organise deployments, import data from any format, and run analytics — species detection rates, activity patterns, diversity indices, and occupancy modelling exports. Backed by the Atlas of Living Australia.",
    features: [
      "Smart CSV import (TimeLapse, AddaxAI, generic)",
      "Interactive deployment mapping",
      "Species registry with ALA taxonomy",
      "Detection history matrices for occupancy modelling",
      "Team workspaces with role-based access",
    ],
    color: "text-eucalypt",
    borderColor: "border-eucalypt/20",
    iconBg: "bg-eucalypt/10",
    status: "Live",
  },
  {
    icon: <Flame className="w-6 h-6" />,
    name: "Fire System",
    tagline: "Savanna Burn Planning & Carbon",
    description:
      "Sentinel-2 satellite imagery analysis for burn scar detection, carbon abatement calculations, and compliance tracking. Built for savanna fire carbon methodology (ACCU) on the Tiwi Islands.",
    features: [
      "Sentinel-2 fire scar mapping (dMIBR algorithm)",
      "Burn planning with approval workflows",
      "Carbon abatement & ACCU revenue tracking",
      "EDS/LDS compliance monitoring",
      "Vegetation & fuel type analysis",
    ],
    color: "text-ochre",
    borderColor: "border-ochre/20",
    iconBg: "bg-ochre/10",
    status: "Live",
  },
  {
    icon: <Radio className="w-6 h-6" />,
    name: "Trap Monitor",
    tagline: "Remote Hardware Monitoring",
    description:
      "SMS-based animal trap monitoring with custom ESP32 hardware. Real-time alerts when traps trigger, GPS tracking, battery and solar health monitoring — built for areas with no internet.",
    features: [
      "SMS alerts over Telstra LTE network",
      "GPS location tracking & movement detection",
      "Battery & solar health monitoring",
      "Two-way command system (ARM, DISARM, STATUS)",
      "Custom PCB with deep-sleep power management",
    ],
    color: "text-sky",
    borderColor: "border-sky/20",
    iconBg: "bg-sky/10",
    status: "Hardware + Software",
  },
];

export function Projects() {
  return (
    <section id="projects" className="py-24 sm:py-32 bg-stone-50">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section heading */}
        <div className="max-w-2xl mb-16">
          <p className="text-xs font-semibold tracking-widest uppercase text-red-dust mb-3">
            What we build
          </p>
          <h2 className="font-[family-name:var(--font-dm-serif)] text-3xl sm:text-4xl text-stone-800 leading-tight">
            Tools that work where<br />the work happens
          </h2>
          <p className="mt-4 text-stone-500 leading-relaxed">
            Each platform is purpose-built for a specific conservation challenge
            — from camera trap analytics to satellite fire mapping to hardware
            that survives the wet season.
          </p>
        </div>

        {/* Project cards */}
        <div className="grid gap-8 lg:grid-cols-3">
          {PROJECTS.map((project) => (
            <article
              key={project.name}
              className={`group relative rounded-sm border ${project.borderColor} bg-white p-8 transition-all hover:shadow-lg hover:shadow-stone-200/50`}
            >
              {/* Icon + status */}
              <div className="flex items-start justify-between mb-6">
                <div className={`${project.iconBg} ${project.color} rounded-sm p-3`}>
                  {project.icon}
                </div>
                <span className="text-[10px] font-semibold tracking-widest uppercase text-stone-400 border border-stone-200 rounded-full px-3 py-1">
                  {project.status}
                </span>
              </div>

              {/* Content */}
              <h3 className="font-[family-name:var(--font-dm-serif)] text-2xl text-stone-800 mb-1">
                {project.name}
              </h3>
              <p className={`text-sm font-medium ${project.color} mb-4`}>
                {project.tagline}
              </p>
              <p className="text-sm text-stone-500 leading-relaxed mb-6">
                {project.description}
              </p>

              {/* Feature list */}
              <ul className="space-y-2 mb-8">
                {project.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-stone-600"
                  >
                    <span className={`mt-1.5 w-1 h-1 rounded-full ${project.iconBg} shrink-0`} />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="absolute bottom-8 right-8">
                <ArrowUpRight
                  className="w-5 h-5 text-stone-300 group-hover:text-stone-500 transition-colors"
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
