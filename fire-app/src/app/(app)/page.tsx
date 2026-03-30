import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Map, ClipboardCheck, BarChart3 } from "lucide-react";
import Link from "next/link";

const quickLinks = [
  {
    title: "Live Map",
    description: "View hotspots, fire scars, and active operations",
    href: "/map",
    icon: Map,
    color: "text-blue-500",
  },
  {
    title: "Burn Plans",
    description: "Create and manage seasonal burn plans",
    href: "/burn-plans",
    icon: Flame,
    color: "text-orange-500",
  },
  {
    title: "Daily Operations",
    description: "Checklists, flight plans, and field recording",
    href: "/daily-plans",
    icon: ClipboardCheck,
    color: "text-green-500",
  },
  {
    title: "Fire Metrics",
    description: "Analytics dashboard and reporting",
    href: "/dashboard",
    icon: BarChart3,
    color: "text-purple-500",
  },
];

export default function HomePage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">FireManager</h1>
        <p className="text-muted-foreground">
          Fire program management for northern Australia
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="transition-colors hover:bg-accent">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <link.icon className={`h-5 w-5 ${link.color}`} />
                <CardTitle className="text-base">{link.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {link.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
