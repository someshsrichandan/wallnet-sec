"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  PhoneCall,
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
import { requestJson } from "@/lib/http";

const data = {
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
      name: "AI Calling Agent",
      url: "/admin/dashboard/ai-calling-agent",
      icon: PhoneCall,
    },
    {
      name: "Audit Reports",
      url: "/admin/dashboard/audit-reports",
      icon: FileText,
    },
  ],
};

type AdminUser = {
  id?: string;
  _id?: string;
  name: string;
  email: string;
};

const ADMIN_USER_STORAGE_KEY = "adminUser";
const DEFAULT_AVATAR = "/avatars/shadcn.jpg";

const fallbackUser: AdminUser = {
  id: "",
  name: "Admin",
  email: "",
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = React.useState<AdminUser>(fallbackUser);

  React.useEffect(() => {
    const token = window.localStorage.getItem("authToken");
    if (!token) {
      setCurrentUser(fallbackUser);
      return;
    }

    const cachedUserRaw = window.localStorage.getItem(ADMIN_USER_STORAGE_KEY);
    if (cachedUserRaw) {
      try {
        const cachedUser = JSON.parse(cachedUserRaw) as Partial<AdminUser>;
        if (cachedUser.name && cachedUser.email) {
          setCurrentUser({
            id: cachedUser.id || "",
            name: cachedUser.name,
            email: cachedUser.email,
          });
        }
      } catch {
        window.localStorage.removeItem(ADMIN_USER_STORAGE_KEY);
      }
    }

    const loadCurrentUser = async () => {
      try {
        const user = await requestJson<AdminUser>("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const normalizedUser: AdminUser = {
          id: user.id || user._id || "",
          name: user.name,
          email: user.email,
        };

        setCurrentUser(normalizedUser);
        window.localStorage.setItem(
          ADMIN_USER_STORAGE_KEY,
          JSON.stringify(normalizedUser),
        );
      } catch {
        // Keep cached/fallback identity for display and avoid hard logout on transient failures.
      }
    };

    loadCurrentUser();
  }, []);

  const openAccount = React.useCallback(() => {
    router.push("/admin/dashboard/settings");
  }, [router]);

  const openBilling = React.useCallback(() => {
    router.push("/admin/dashboard/partners");
  }, [router]);

  const openNotifications = React.useCallback(() => {
    router.push("/admin/dashboard/authentication-logs");
  }, [router]);

  const logout = React.useCallback(() => {
    window.localStorage.removeItem("authToken");
    window.localStorage.removeItem(ADMIN_USER_STORAGE_KEY);
    toast.success("Logged out successfully.");
    router.push("/admin/login");
  }, [router]);

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
        <NavUser
          user={{
            name: currentUser.name || fallbackUser.name,
            email: currentUser.email || "No email",
            avatar: DEFAULT_AVATAR,
          }}
          onAccountClick={openAccount}
          onBillingClick={openBilling}
          onNotificationsClick={openNotifications}
          onLogoutClick={logout}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
