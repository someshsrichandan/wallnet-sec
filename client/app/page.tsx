"use client";

import Link from "next/link";
import {
  ArrowRight,
  Code2,
  Globe2,
  LayoutDashboard,
  Lock,
  MessagesSquare,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Server,
  Smartphone,
  Fingerprint,
  Eye,
  ShieldAlert,
  Users
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// --- Data ---

const features = [
  {
    icon: ShieldCheck,
    title: "Phishing-Proof Surface",
    description:
      "Visual secrets are never exposed to partner apps, making them impossible to relay through fake portals.",
  },
  {
    icon: Lock,
    title: "Replay Resistant",
    description:
      "Short-lived sessions and request fingerprint binding ensure every transaction is unique and secure.",
  },
  {
    icon: Code2,
    title: "No SDK Lock-in",
    description:
      "Universal REST endpoints. Works seamlessly with Node.js, Python, Go, Java, and any HTTP backend.",
  },
  {
    icon: Globe2,
    title: "Tenant Isolation",
    description:
      "Complete data segregation. Each partner gets isolated API keys, callback allowlists, and user records.",
  },
  {
    icon: Eye,
    title: "Cognitive Airgap",
    description:
      "The computation happens in the user's brain, not on the device. Malware cannot read what doesn't exist in memory.",
  },
  {
    icon: Server,
    title: "Zero Knowledge Auth",
    description:
      "We verify the proof, not the password. Your backend remains the single source of truth for user identity.",
  },
];

const useCases = [
  {
    title: "Financial Institutions",
    description: "Protect high-value transfers and beneficiary additions.",
    icon: <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400"/>,
    color: "bg-blue-100 dark:bg-blue-900/30"
  },
  {
    title: "Healthcare Portals",
    description: "Secure patient data access and medical record downloads.",
    icon: <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400"/>,
    color: "bg-emerald-100 dark:bg-emerald-900/30"
  },
  {
    title: "Enterprise VPNs",
    description: "Add a visual second factor to remote access gateways.",
    icon: <Globe2 className="h-6 w-6 text-purple-600 dark:text-purple-400"/>,
    color: "bg-purple-100 dark:bg-purple-900/30"
  },
  {
    title: "Crypto Exchanges",
    description: "Stop wallet drainers and unauthorized withdrawals.",
    icon: <Zap className="h-6 w-6 text-amber-600 dark:text-amber-400"/>,
    color: "bg-amber-100 dark:bg-amber-900/30"
  }
];

const stats = [
  { label: "Secrets Stored", value: "0", sub: "Zero-knowledge architecture" },
  { label: "Visual Entropy", value: "1.2M+", sub: "Combination possibilities" },
  { label: "Deployment Time", value: "< 30m", sub: "Standard REST API" },
  { label: "Uptime SLA", value: "99.9%", sub: "Enterprise grade reliability" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950 dark:bg-slate-950 dark:text-slate-50 relative overflow-x-hidden">
      
      {/* Background Gradients */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-200/40 via-sky-100/20 to-transparent dark:from-indigo-900/20 dark:via-slate-900/40" />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32">
        <div className="container mx-auto px-6 text-center">
          <div className="mx-auto max-w-5xl space-y-8">
            <div className="flex justify-center">
              <Badge
                variant="outline"
                className="rounded-full border-slate-200 bg-white/50 px-4 py-1.5 text-sm font-medium text-slate-600 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300"
              >
                <span className="mr-2 inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Banking-Grade Cognitive Security
              </Badge>
            </div>

            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-7xl lg:text-8xl">
              Stop Phishing with <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600">
                Visual Intelligence
              </span>
            </h1>

            <p className="mx-auto max-w-2xl text-xl leading-relaxed text-slate-600 dark:text-slate-400">
              The first authentication layer that happens in the user's mind. 
              <span className="font-semibold text-slate-900 dark:text-white"> Zero shared secrets. Zero logic leak.</span> Protection against RATs, bots, and modern phishing.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row pt-4">
              <Button
                asChild
                size="lg"
                className="h-14 rounded-full bg-slate-900 px-8 text-base font-semibold text-white shadow-xl shadow-indigo-500/20 hover:bg-slate-800 hover:scale-105 transition-all dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                <Link href="/developers">
                  Start Integration <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 rounded-full border-slate-300 bg-white/50 px-8 text-base font-semibold text-slate-700 backdrop-blur-sm hover:bg-white hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Link href="/partner-live?mode=test">Try Live Demo</Link>
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="pt-12 flex flex-wrap justify-center gap-8 opacity-60 grayscale transition-all hover:grayscale-0">
               <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="h-5 w-5" /> SOC2 Compliant
               </div>
               <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  <Lock className="h-5 w-5" /> 256-bit Encryption
               </div>
               <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  <Globe2 className="h-5 w-5" /> Global Edge Network
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800">
         <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
               {stats.map((stat) => (
                  <div key={stat.label} className="space-y-1">
                     <p className="text-4xl font-extrabold text-slate-900 dark:text-white">{stat.value}</p>
                     <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">{stat.label}</p>
                     <p className="text-[10px] text-slate-500 dark:text-slate-400">{stat.sub}</p>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* Value Proposition */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-6">
           <div className="mx-auto max-w-3xl text-center mb-16">
             <Badge variant="secondary" className="mb-4 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">WHY FRAUDSHIELD</Badge>
             <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
               Defend against threats that <br/> bypass 2FA.
             </h2>
             <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
               Traditional OTPs and Push notifications are vulnerable to relay attacks and fatigue. 
               We introduce a cognitive gap that automated scripts cannot cross.
             </p>
           </div>

           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                 <Card key={feature.title} className="border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800">
                    <CardContent className="p-6">
                       <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                          <feature.icon className="h-6 w-6" />
                       </div>
                       <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                       <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          {feature.description}
                       </p>
                    </CardContent>
                 </Card>
              ))}
           </div>
        </div>
      </section>

      {/* Integration Preview */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900 relative">
         <div className="container mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
               <div>
                  <Badge variant="outline" className="mb-6 bg-white dark:bg-slate-800">INTEGRATION FLOW</Badge>
                  <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-6">
                     Add a Cognitive Airgap in 4 steps.
                  </h2>
                  <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
                     Our REST API inserts cleanly into your existing login pipeline. 
                     No need to rip and replace your current identity provider. 
                     Just add the challenge step.
                  </p>
                  
                  <div className="space-y-8">
                     {[
                        { num: "1", title: "Login", desc: "User enters username & password on your site." },
                        { num: "2", title: "Challenge", desc: "FraudShield presents a visual cognitive puzzle." },
                        { num: "3", title: "Verify", desc: "User solves it mentally and submits the answer." },
                        { num: "4", title: "Secure", desc: "We sign the result. You grant access." }
                     ].map((step) => (
                        <div key={step.num} className="flex gap-4">
                           <div className="flex-none">
                              <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-base font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                                 {step.num}
                              </span>
                           </div>
                           <div>
                              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{step.title}</h3>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{step.desc}</p>
                           </div>
                        </div>
                     ))}
                  </div>

                  <div className="mt-10">
                     <Button asChild variant="outline" className="rounded-full h-12 px-6">
                        <Link href="/how-it-works">View Architecture Diagram</Link>
                     </Button>
                  </div>
               </div>
               
               <div className="relative">
                  <div className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
                     <div className="rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                           <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                           <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                           <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                        </div>
                        <div className="p-8 space-y-6 flex flex-col items-center justify-center min-h-[300px]">
                           <ShieldCheck className="h-20 w-20 text-indigo-200 dark:text-indigo-900/50 mb-4" />
                           <div className="text-center space-y-2">
                             <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-800 mx-auto" />
                             <div className="h-3 w-32 rounded bg-slate-100 dark:bg-slate-800 mx-auto" />
                           </div>
                           <div className="w-full max-w-sm h-12 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800/50" />
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Use Cases */}
      <section className="py-24">
         <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
               <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Secure Critical Actions</h2>
               <p className="text-lg text-slate-600 dark:text-slate-400">
                  Ideal for high-stakes flows where password compromise would be catastrophic.
               </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
               {useCases.map((useCase) => (
                  <div key={useCase.title} className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all dark:bg-slate-900 dark:border-slate-800">
                     <div className={`mb-4 inline-flex p-3 rounded-xl ${useCase.color}`}>{useCase.icon}</div>
                     <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{useCase.title}</h3>
                     <p className="text-sm text-slate-600 dark:text-slate-400">{useCase.description}</p>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 bg-[#0f172a] overflow-hidden">
         <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e5,#8b5cf6)] opacity-10"></div>
         <div className="container mx-auto px-6 text-center relative z-10">
            <h2 className="text-4xl font-extrabold text-white sm:text-5xl mb-6">
               Ready to secure your users?
            </h2>
            <p className="text-xl text-indigo-100 max-w-2xl mx-auto mb-10">
               Get your API keys today and start integrating the Cognitive Airgap.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
               <Button asChild size="lg" className="h-12 rounded-full bg-white text-slate-900 font-bold hover:bg-slate-100">
                  <Link href="/admin">Get API Keys</Link>
               </Button>
               <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-slate-700 text-white hover:bg-slate-800 hover:text-white bg-transparent">
                  <Link href="/contact">Contact Sales</Link>
               </Button>
            </div>
         </div>
      </section>
      
    </div>
  );
}
