"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Key,
  Database,
  Users,
  Settings,
  Shield,
  Search,
  HelpCircle,
  FileText,
} from "lucide-react";

import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "Partner Admin",
    email: "admin@partner.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Overview",
      url: "/admin/dashboard",
      icon: Activity,
    },
    {
      title: "Developers & API",
      url: "/admin/dashboard/partners",
      icon: Key,
    },
    {
      title: "User Analytics",
      url: "/admin/dashboard/analytics",
      icon: BarChart3,
    },
    {
      title: "Authentication Logs",
      url: "/admin/dashboard/authentication-logs",
      icon: Users,
    },
  ],
  navClouds: [],
  navSecondary: [
    {
      title: "Settings",
      url: "/admin/dashboard/settings",
      icon: Settings,
    },
    {
      title: "Support",
      url: "/admin/dashboard/support",
      icon: HelpCircle,
    },
    {
      title: "Search Logs",
      url: "/admin/dashboard/search-logs",
      icon: Search,
    },
  ],
  documents: [
    {
      name: "API Documentation",
      url: "/admin/dashboard/docs",
      icon: Database,
    },
    {
      name: "Audit Reports",
      url: "/admin/dashboard/audit-reports",
      icon: FileText,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="offcanvas"
      {...props}
      className="bg-sidebar border-r border-sidebar-border text-sidebar-foreground"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/admin/dashboard" className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-900 text-white shadow-sm">
                  <Shield className="h-4 w-4" />
                </div>
                <span className="text-base font-bold text-sidebar-foreground">
                  Partner Console
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {data.documents.length > 0 && <NavDocuments items={data.documents} />}
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-end px-2 pb-1">
          <ThemeToggle />
        </div>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
