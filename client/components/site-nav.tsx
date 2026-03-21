"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Shield } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/developers", label: "Developers" },
  { href: "/docs", label: "API Docs" },
  { href: "/partner-live", label: "Live Demo" },
  { href: "/contact", label: "Contact" },
  { href: "/admin", label: "Admin" },
];

export function SiteNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Don't show nav on the verify/enroll challenge pages or inside the secure admin dashboard
  if (
    pathname.startsWith("/verify/") ||
    pathname.startsWith("/enroll/") ||
    pathname.startsWith("/admin/dashboard") ||
    pathname.startsWith("/admin/partners")
  ) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-white/85 backdrop-blur-xl dark:border-white/5 dark:bg-[#020205]/60 transition-all duration-300">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 h-[4.5rem]">
        {/* ── Brand ── */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group hover:scale-105 transition-transform">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 dark:bg-white transition-colors">
            <div className="h-2 w-2 rounded-full bg-white dark:bg-[#020205]" />
          </div>
          <span className="block text-[14px] font-semibold tracking-tight text-slate-900 dark:text-white">
            FraudShield.
          </span>
        </Link>

        {/* ── Desktop links ── */}
        <div className="hidden items-center gap-8 sm:flex">
          {navLinks.map(({ href, label }) => {
            const isActive =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`text-[13px] font-medium transition-colors ${
                  isActive
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* ── Right side ── */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/partner-live" className="hidden sm:inline-flex bg-slate-900 dark:bg-white text-white dark:text-black px-5 py-2 rounded-full text-[13px] font-medium hover:bg-slate-800 dark:hover:bg-white/90 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95">
            Get Started
          </Link>
          {/* Mobile menu toggle */}
          <button
            className="inline-flex items-center justify-center rounded-full bg-slate-100 p-2 text-slate-900 transition hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:hidden"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {/* ── Mobile menu ── */}
      {menuOpen && (
        <div className="border-t border-slate-200/80 bg-white px-4 pb-4 pt-2 dark:border-white/5 dark:bg-[#020205] sm:hidden">
          {navLinks.map(({ href, label }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`block rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white"
                    : "text-slate-600 hover:bg-slate-50 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
