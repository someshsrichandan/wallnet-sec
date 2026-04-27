"use client";

import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

export function SiteHeader() {
  const pathname = usePathname();
  const isSuperAdmin = pathname?.startsWith("/admin/super");

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border/80 bg-background/80 backdrop-blur transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-semibold tracking-tight text-foreground">
          {isSuperAdmin ? "Super Admin Console" : "Admin Console"}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          {!isSuperAdmin && (
            <Button variant="outline" size="sm" className="hidden sm:flex">
              Help & Docs
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
