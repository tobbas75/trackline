"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Flame,
  Map,
  CalendarDays,
  ClipboardCheck,
  BarChart3,
  Leaf,
  Settings,
  Plane,
  MapPin,
  Eye,
  Layers,
  Package,
  FileArchive,
  FileBarChart,
  BookOpen,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrgSwitcher } from "@/components/org-switcher";
import { NotificationBell } from "@/components/notification-bell";

const planningItems = [
  { title: "Fire Seasons", href: "/seasons", icon: CalendarDays },
  { title: "Burn Plans", href: "/burn-plans", icon: Flame },
  { title: "Cultural Zones", href: "/cultural-zones", icon: MapPin },
  { title: "Reference Layers", href: "/reference-layers", icon: FileArchive },
];

const operationsItems = [
  { title: "Daily Plans", href: "/daily-plans", icon: ClipboardCheck },
  { title: "Flight Plans", href: "/flights", icon: Plane },
  { title: "Checklists", href: "/checklists", icon: ClipboardCheck },
  { title: "Inventory", href: "/inventory", icon: Package },
];

const monitoringItems = [
  { title: "Live Map", href: "/map", icon: Map },
  { title: "Hotspots", href: "/hotspots", icon: Eye },
  { title: "Fire History", href: "/fire-history", icon: Flame },
  { title: "Vegetation", href: "/vegetation", icon: Leaf },
];

const reportingItems = [
  { title: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { title: "Analysis Zones", href: "/zones", icon: Layers },
  { title: "Carbon", href: "/carbon", icon: Leaf },
  { title: "Reports", href: "/reports", icon: FileBarChart },
  { title: "Methodology", href: "/methodology", icon: BookOpen },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" />
            <span className="text-lg font-semibold">FireManager</span>
          </Link>
          <NotificationBell />
        </div>
        <OrgSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <NavGroup label="Monitoring" items={monitoringItems} pathname={pathname} />
        <NavGroup label="Planning" items={planningItems} pathname={pathname} />
        <NavGroup label="Operations" items={operationsItems} pathname={pathname} />
        <NavGroup label="Reporting" items={reportingItems} pathname={pathname} />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/audit-log"}>
              <Link href="/audit-log">
                <ScrollText className="h-4 w-4" />
                <span>Audit Log</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/settings"}>
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: { title: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
  pathname: string;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={pathname === item.href}>
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
