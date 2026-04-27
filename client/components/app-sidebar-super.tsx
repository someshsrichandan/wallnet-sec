"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  KeyRound,
  Settings,
  ShieldAlert,
  Activity,
  ShieldCheck,
  Mail
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
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
  navMain: [
    {
      title: "Overview",
      url: "/admin/super/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Partner Accounts",
      url: "/admin/super/dashboard/partners",
      icon: Users,
    },
    {
      title: "API Keys",
      url: "/admin/super/dashboard/api-keys",
      icon: KeyRound,
    },
    {
      title: "Global Settings",
      url: "/admin/super/dashboard/settings",
      icon: Settings,
    },
    {
      title: "Email Configuration",
      url: "/admin/super/dashboard/email-settings",
      icon: Mail,
    },
  ],
};

type SuperAdminUser = {
  id?: string;
  name: string;
  email: string;
  role: string;
};

const SA_USER_STORAGE_KEY = "superAdminUser";
const DEFAULT_AVATAR = "/avatars/shadcn.jpg";

export function AppSidebarSuper({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = React.useState<SuperAdminUser>({
    id: "superadmin",
    name: "Super Admin",
    email: "admin@wallnet-sec.com",
    role: "superadmin"
  });

  React.useEffect(() => {
    const token = window.localStorage.getItem("superAdminToken");
    if (!token) {
      router.push("/admin/super/login");
      return;
    }

    const cachedUserRaw = window.localStorage.getItem(SA_USER_STORAGE_KEY);
    if (cachedUserRaw) {
      try {
        const cachedUser = JSON.parse(cachedUserRaw) as SuperAdminUser;
        if (cachedUser.name && cachedUser.email) {
          setCurrentUser(cachedUser);
        }
      } catch {
        // ignore
      }
    }
  }, [router]);

  const logout = React.useCallback(() => {
    window.localStorage.removeItem("superAdminToken");
    window.localStorage.removeItem(SA_USER_STORAGE_KEY);
    toast.success("Logged out successfully.");
    router.push("/admin/super/login");
  }, [router]);

  // Transform nav items to pass to NavMain to indicate active state
  const activeNavMain = data.navMain.map(item => ({
    ...item,
    isActive: pathname === item.url || pathname?.startsWith(item.url + '/')
  }));

  return (
    <Sidebar
      collapsible="offcanvas"
      {...props}
      className="bg-sidebar border-r border-red-500/20 text-sidebar-foreground"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/admin/super/dashboard" className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-red-600 text-white shadow-sm">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span className="text-base font-bold text-sidebar-foreground">
                  Super Admin
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={activeNavMain} />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-end px-2 pb-1">
          <ThemeToggle />
        </div>
        <NavUser
          user={{
            name: currentUser.name,
            email: currentUser.email,
            avatar: DEFAULT_AVATAR,
          }}
          onAccountClick={() => router.push("/admin/super/dashboard/settings")}
          onBillingClick={() => router.push("/admin/super/dashboard/partners")}
          onNotificationsClick={() => router.push("/admin/super/dashboard/api-keys")}
          onLogoutClick={logout}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
