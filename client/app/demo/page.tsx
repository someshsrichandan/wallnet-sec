"use strict";
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";

export default function DemoPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8fafc] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
      
      <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
        <div className="mb-8 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="mr-2 flex h-2 w-2 relative">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold tracking-wide uppercase text-slate-600 dark:text-slate-300">
            Live v1.0
          </span>
        </div>

        <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
          Experience the <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Cognitive Airgap.</span>
        </h1>
        
        <p className="mb-10 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
          We&apos;ve moved our demo to a full <strong>Banking-Grade Simulation</strong>. Test the "partner handshake" flow, signature verification, and the visual challenge in a realistic environment.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="h-14 rounded-full px-8 text-base shadow-xl shadow-indigo-500/20 transition-all hover:scale-105 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900">
            <Link href="/partner-live">
              Launch Live Demo
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-14 rounded-full px-8 text-base border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
            <Link href="/how-it-works">
               Learn the Mechanics
            </Link>
          </Button>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-8 text-center sm:grid-cols-3">
           <div className="flex flex-col items-center">
              <div className="mb-3 rounded-2xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                 <ShieldCheck className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold">Bank-Grade Security</p>
           </div>
           <div className="flex flex-col items-center">
              <div className="mb-3 rounded-2xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                 <Zap className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold">Zero-Knowledge Proof</p>
           </div>
           <div className="col-span-2 flex flex-col items-center sm:col-span-1">
              <div className="mb-3 rounded-2xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mouse-pointer-2"><path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"/></svg>
              </div>
              <p className="text-sm font-semibold">Anti-Phishing Relay</p>
           </div>
        </div>
      </div>
    </div>
  );
}
