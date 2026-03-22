"use client";

import { Shield, Eye, MousePointer2, Shuffle, CheckCircle2, Globe2, AlertTriangle, Fingerprint, Lock, ArrowRight, Server, Smartphone, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const mechanicSteps = [
  {
    title: "The Selection Pool",
    step: "01",
    description: "You choose 4 favourite vegetables/fruits out of 54. These 4 become your permanent secret identity. The system also assigns you 2 secret alphabet letters — but these are only to help you REMEMBER your salt number, not part of the formula.",
    example: "Your 4 picks from 54: 🍎 Apple · 🍇 Grape · 🥝 Kiwi · 🥭 Mango  |  Memory letters: X · R",
    detail: "54 items, pick 4 = 316,251 unique combinations. Every user's set is different. Your letters X and R are just a personal memory anchor for your salt — the system never uses them in the calculation.",
    icon: Shuffle,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20"
  },
  {
    title: "The Session Challenge",
    step: "02",
    description: "At every login, one of your 4 fruits appears on screen — but WHICH one and its position rotates randomly on every refresh. Beside it is a fresh random number. This number changes every single session, it cannot be predicted or reused.",
    example: "Refresh 1: 🍇 Grape → 67   |   Refresh 2: 🍎 Apple → 31   |   Refresh 3: 🥝 Kiwi → 84",
    detail: "Even if a hacker watches five logins in a row, each shows a different fruit in a different position with a different number. There is no pattern to exploit.",
    icon: Eye,
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/20"
  },
  {
    title: "The Cognitive Formula",
    step: "03",
    description: "Simple. Screen Number + Your Secret Salt = Your Answer. That's it. The salt is a number only you know. It never appears on screen, never travels over the network, never sits in any database. It lives only in your head.",
    example: "52 (screen)  +  7 (your salt)  =  59  ← you enter this",
    detail: "A hacker sees 52 on screen and 99 being entered. They cannot reverse-engineer 47 from that alone — because they don't know which of infinite possible salts you used, and next login the screen number will be completely different anyway.",
    icon: BrainCircuit,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20"
  },
  {
    title: "The Execution",
    step: "04",
    description: "You type the result on a scrambled keypad. The keypad digits are in a random order every session — so even if someone films your finger movements, they cannot know which number you pressed. The answer is validated in milliseconds and the token is immediately destroyed.",
    example: "Scoreboard: D (4th letter) · G (7th letter)  →  first digit = 5, second digit = 9  →   59",
    detail: "The scrambled keypad defeats shoulder surfing and camera spying. The one-time token defeats replay. The cognitive salt defeats screen recording. Three independent defences active simultaneously.",
    icon: MousePointer2,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20"
  },
];

const threats = [
  {
    name: "Remote Access Trojans (RATs)",
    desc: "Malware that views your screen remotely to steal OTPs. Hackers can see your screen in real-time, but they cannot read your mind.",
    solution: "The cognitive airgap means the answer is never on screen. Even if they see the numbers, they lack your secret variable.",
    icon: <Eye className="h-5 w-5 text-red-500" />
  },
  {
    name: "Phishing Sites & Relay Attacks",
    desc: "Fake login pages that steal credentials to relay them. They try to trick you into entering your password on a clone site.",
    solution: "We bind the request to the origin. Replay fails. The visual challenge is generated specifically for the valid session ID.",
    icon: <Globe2 className="h-5 w-5 text-orange-500" />
  },
  {
    name: "Credential Stuffing",
    desc: "Using leaked passwords from other sites to break in. If you reuse passwords, hackers can try them everywhere.",
    solution: "The challenge changes every time. Old data is useless. A captured response from 5 minutes ago is mathematically invalid now.",
    icon: <Lock className="h-5 w-5 text-slate-500" />
  },
  {
    name: "Session Hijacking",
    desc: "Stealing an active login token to bypass auth. Attackers extract your session cookie to impersonate you.",
    solution: "Short-lived tokens signed by our secure backend. We use high-entropy signatures that expire in seconds.",
    icon: <Fingerprint className="h-5 w-5 text-blue-500" />
  },
  {
    name: "Brute Force Attacks",
    desc: "Automated bots trying millions of combinations to guess your password or pin.",
    solution: "Search space: 54⁴ × 26² = 5,746,904,064 combinations. The entropy is massive. Rate limiting locks them out instantly.",
    icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />
  },
  {
    name: "Shoulder Surfing",
    desc: "An attacker physically watches you type your PIN or password in public. They observe your keystrokes or the screen over your shoulder to steal your credentials.",
    solution: "The scrambled keypad layout changes every session, and the answer is computed mentally — never typed as a plain PIN. An observer sees only a number being entered on a randomized grid, which is meaningless without knowing your secret formula and salt value.",
    icon: <Eye className="h-5 w-5 text-pink-500" />
  }
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950 dark:bg-slate-950 dark:text-slate-50 relative overflow-x-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_50%_0%,rgba(120,119,198,0.1),transparent_50%)] dark:opacity-20" />

      {/* Hero */}
      <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32">
        <div className="container mx-auto px-6 text-center">
          <Badge variant="outline" className="mb-8 rounded-full border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400">
            Cognitive Airgap Technology
          </Badge>
          <h1 className="mx-auto max-w-5xl text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-7xl mb-8">
            How does the <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Cognitive Mechanic</span> work?
          </h1>
          <p className="mx-auto max-w-2xl text-xl leading-relaxed text-slate-600 dark:text-slate-400 mb-12">
            A deep dive into our "Cognitive Airgap" technology. Understanding how we defeat Phishing, RATs, and advanced automated attacks.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
             <Button asChild size="lg" className="h-14 rounded-full px-8 text-base shadow-xl shadow-indigo-500/20 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900">
               <Link href="/partner-live?mode=test">Try Live Demo</Link>
             </Button>
             <Button asChild size="lg" variant="outline" className="h-14 rounded-full px-8 text-base border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
               <Link href="/docs">Read Documentation</Link>
             </Button>
          </div>
        </div>
      </section>

      {/* The Mechanic: Sum & Select */}
      <section className="py-24 bg-white/50 backdrop-blur-sm dark:bg-slate-900/50">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-3xl text-center mb-20">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-6">The Core Mechanic</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              The "Sum & Select" logic creates a wall between your secret and the machine.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2">
             {mechanicSteps.map((step) => (
                <div key={step.title} className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
                   <div className="flex items-start gap-6 mb-5">
                      <div className={`flex-none rounded-2xl p-4 ${step.bg}`}>
                         <step.icon className={`h-8 w-8 ${step.color}`} />
                      </div>
                      <div>
                        <div className="mb-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          STEP {step.step}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{step.title}</h3>
                        <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400">
                           {step.description}
                        </p>
                      </div>
                   </div>
                   <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 px-5 py-4 mb-3">
                     <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-1">Example</div>
                     <div className="font-mono text-sm text-slate-700 dark:text-slate-300">{step.example}</div>
                   </div>
                   <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">{step.detail}</p>
                </div>
             ))}
          </div>
        </div>
      </section>

      {/* Two Logins Walkthrough */}
      <section className="py-24 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <Badge variant="outline" className="mb-4 rounded-full border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400">
              Live Walkthrough
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-6">
              Same Formula. Different Answer. Every Time.
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              Watch why a hacker who captures first login answer is completely helpless on Tuesday.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
            {/* Login 1 */}
            <div className="rounded-3xl border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/20 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-extrabold">1</div>
                <div className="font-extrabold text-slate-900 dark:text-white">First Login</div>
              </div>
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Screen shows</div>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🍇</span>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">Grape</div>
                      <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">52</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Your mental formula</div>
                  <div className="font-mono text-slate-700 dark:text-slate-300 space-y-1 text-sm">
                    <div>52 &nbsp;<span className="text-slate-400">(screen)</span></div>
                    <div>+ 7 <span className="text-slate-400">(your salt)</span></div>
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-1 font-extrabold text-emerald-600 dark:text-emerald-400">= 59 ✓ you enter this</div>
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl p-4 border border-red-100 dark:border-red-900">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-1">Hacker captures</div>
                  <div className="font-mono font-bold text-red-600 dark:text-red-400">answer = 59</div>
                  <div className="text-xs text-slate-500 mt-1">They save this, thinking they can reuse it.</div>
                </div>
              </div>
            </div>

            {/* Login 2 */}
            <div className="rounded-3xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-full bg-violet-600 text-white flex items-center justify-center text-sm font-extrabold">2</div>
                <div className="font-extrabold text-slate-900 dark:text-white">Every Login / Every Refresh</div>
              </div>
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-violet-100 dark:border-violet-900">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Screen shows (different fruit, different number)</div>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🥝</span>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">Kiwi</div>
                      <div className="text-2xl font-extrabold text-violet-600 dark:text-violet-400">31</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-violet-100 dark:border-violet-900">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Your mental formula (same salt, new number)</div>
                  <div className="font-mono text-slate-700 dark:text-slate-300 space-y-1 text-sm">
                    <div>31 &nbsp;<span className="text-slate-400">(screen)</span></div>
                    <div>+ 7 <span className="text-slate-400">(same salt)</span></div>
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-1 font-extrabold text-emerald-600 dark:text-emerald-400">= 38 ✓ you enter this</div>
                  </div>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Hacker tries 59</div>
                  <div className="font-mono font-bold text-slate-500 line-through">99</div>
                  <div className="text-xs text-slate-500 mt-1">❌ Wrong. Rejected. Session invalidated. Attack failed.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Key insight */}
          <div className="max-w-3xl mx-auto rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border border-indigo-200 dark:border-indigo-800 p-6 text-center">
            <div className="text-2xl mb-3">🧠</div>
            <p className="font-bold text-slate-900 dark:text-white text-lg mb-2">The Cognitive Airgap</p>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Your salt (47) <span className="font-semibold text-slate-800 dark:text-slate-200">never appears on any screen, never travels over any network, and is never stored in any database.</span> It exists only in your mind. You remember it from the scoreboard: D (4th letter = 4) · G (7th letter = 7) → 47. No system can leak what no system knows.
            </p>
          </div>
        </div>
      </section>

      {/* Entropy Stats */}
      <section className="py-16 bg-slate-900 dark:bg-black">
        <div className="container mx-auto px-6">
          <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest mb-10">Security by the Numbers</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-extrabold text-white mb-1">54</div>
              <div className="text-xs text-slate-400">Items in the fruit pool</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-extrabold text-indigo-400 mb-1">316K+</div>
              <div className="text-xs text-slate-400">Possible 4-fruit combinations</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-extrabold text-violet-400 mb-1">5.7B+</div>
              <div className="text-xs text-slate-400">Total attack search space</div>
            </div>
            {/* <div className="text-center">
              <div className="text-4xl font-extrabold text-emerald-400 mb-1">0 sec</div>
              <div className="text-xs text-slate-400">Token lifetime after use</div>
            </div> */}
          </div>
          <div className="mt-10 max-w-3xl mx-auto">
            <div className="rounded-2xl bg-slate-800 dark:bg-slate-900 p-6">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Entropy Breakdown</div>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Fruit combos (54 choose 4)</span>
                  <span className="text-indigo-400 font-bold">316,251</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Alphabet combos (26 × 26)</span>
                  <span className="text-violet-400 font-bold">676</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Session number range</span>
                  <span className="text-amber-400 font-bold">10 – 99 (90 values)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Scrambled keypad layouts</span>
                  <span className="text-pink-400 font-bold">3,628,800 (10!)</span>
                </div>
                <div className="border-t border-slate-700 pt-3 flex justify-between items-center">
                  <span className="text-white font-bold">Combined attack surface</span>
                  <span className="text-emerald-400 font-extrabold">&gt; 5,700,000,000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cricket Story: How to Remember */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <Badge variant="outline" className="mb-4 rounded-full border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
              🏏 The Cricket Match Story
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-6">
              How Will You Remember Your Login?
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              You don't memorize a password. You follow a match. A live cricket match you already know by heart.
            </p>
          </div>

          {/* The Match Story */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="rounded-3xl border border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-8 md:p-12">
              <p className="text-center text-slate-700 dark:text-slate-300 text-lg leading-relaxed mb-10">
                Imagine a tense cricket match. Your team is batting and only <span className="font-bold text-amber-700 dark:text-amber-400">4 batsmen are left</span>.
                The crowd is watching. The scoreboard is live. Here's how you login:
              </p>

              {/* 4 Batsmen Row */}
              <div className="mb-10">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 text-center mb-2">Layer 1 — Your 4 Selected Batsmen from 54 (rotate randomly each refresh)</p>
                <p className="text-center text-xs text-slate-400 mb-4">You chose these 4 at registration. Every login, ONE is randomly placed at the crease — the order changes every refresh.</p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { name: "Rohit",  score: "72", active: false },
                    { name: "Kohli",  score: "40", active: true  },
                    { name: "Bumrah", score: "18", active: false },
                    { name: "Dhoni",  score: "55", active: false },
                  ].map((b) => (
                    <div key={b.name} className={`rounded-2xl border-2 p-4 text-center transition-all ${
                      b.active
                        ? "border-amber-500 bg-amber-100 dark:bg-amber-900/30 shadow-lg scale-105"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 opacity-40"
                    }`}>
                      <div className="text-2xl mb-1">🏏</div>
                      <div className={`font-bold text-sm ${b.active ? "text-amber-700 dark:text-amber-400" : "text-slate-400"}`}>{b.name}</div>
                      {b.active ? (
                        <div className="text-xl font-extrabold mt-1 text-amber-800 dark:text-amber-300">{b.score}</div>
                      ) : (
                        <div className="text-xl font-extrabold mt-1 text-slate-300 dark:text-slate-600">—</div>
                      )}
                      {b.active && (
                        <div className="mt-2 text-[10px] font-bold bg-amber-500 text-white rounded-full px-2 py-0.5">⚡ AT CREASE</div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
                  Only the batsman at the crease is shown. Today it's Kohli with score <span className="font-bold text-amber-700 dark:text-amber-400">40</span>. Tomorrow it could be Rohit or Dhoni with a completely different score. The other 3 are hidden — you just recognise your own player instantly.
                </p>
              </div>

              {/* Salt Layer */}
              <div className="mb-10 rounded-2xl border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/20 p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-3 text-center">Layer 2 — Runs Required to Win (Your Secret Salt — just a number)</p>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <div className="text-center">
                    <div className="text-3xl font-extrabold text-slate-700 dark:text-slate-200">40</div>
                    <div className="text-xs text-slate-500 mt-1">Kohli's Score (on screen)</div>
                  </div>
                  <div className="text-3xl font-bold text-slate-400">+</div>
                  <div className="text-center">
                    <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">7</div>
                    <div className="text-xs text-slate-500 mt-1">Runs to Win (your salt — only in your head)</div>
                  </div>
                  <div className="text-3xl font-bold text-slate-400">=</div>
                  <div className="text-center">
                    <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">47</div>
                    <div className="text-xs text-slate-500 mt-1">You type this</div>
                  </div>
                </div>
                <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
                  Only you know how many runs are needed to win. That number is your <span className="font-semibold text-blue-600 dark:text-blue-400">secret salt</span> — a plain number that never appears anywhere. The formula is simply: <span className="font-mono font-bold">Screen + Salt = Answer</span>.
                </p>
              </div>

              {/* Scoreboard Layer */}
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-4 text-center">Layer 3 — The Scoreboard Letters (How You Remember Your Salt)</p>
                <div className="flex flex-col md:flex-row gap-8 items-start justify-center">
                  {/* Scoreboard visual */}
                  <div className="font-mono bg-slate-900 dark:bg-black text-emerald-400 rounded-xl px-8 py-5 text-center shadow-inner shrink-0">
                    <div className="text-xs text-slate-400 mb-3 tracking-widest">MATCH SCOREBOARD</div>
                    <div className="flex gap-8 text-4xl font-extrabold">
                      <div className="text-center">
                        <div>D</div>
                        <div className="text-xs text-emerald-500 mt-1 font-bold">4th letter</div>
                        <div className="text-xs text-slate-400 mt-0.5">→ digit 4</div>
                      </div>
                      <div className="text-slate-600 self-center text-2xl">·</div>
                      <div className="text-center">
                        <div>G</div>
                        <div className="text-xs text-emerald-500 mt-1 font-bold">7th letter</div>
                        <div className="text-xs text-slate-400 mt-0.5">→ digit 7</div>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-slate-700 pt-3">
                      <div className="text-lg font-extrabold text-white">Salt = 47</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">first digit · second digit</div>
                    </div>
                  </div>
                  {/* Explanation */}
                  <div className="max-w-xs text-sm text-slate-600 dark:text-slate-400 space-y-4">
                    <div className="rounded-xl bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900 p-4 space-y-2">
                      <div className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-widest">How it works</div>
                      <p>The scoreboard always shows <span className="font-bold text-emerald-600 dark:text-emerald-400">two letters</span> after the match ends.</p>
                      <p>• The <span className="font-semibold text-slate-800 dark:text-slate-200">first letter</span> that appears → its position in the alphabet = <span className="font-semibold">first digit</span> of your salt.</p>
                      <p>• The <span className="font-semibold text-slate-800 dark:text-slate-200">second letter</span> that appears → its position = <span className="font-semibold">second digit</span> of your salt.</p>
                      <p className="font-mono bg-slate-100 dark:bg-slate-900 rounded px-2 py-1 text-xs">D (4th) · G (7th)  →  4 · 7  →  salt = <span className="font-bold text-emerald-600 dark:text-emerald-400">47</span></p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">The letters are never added to the formula. They are purely your personal key to recall the salt number. The system never uses D or G in any calculation — only you know how to read them.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Layers Summary */}
          <div className="max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-8">Three Layers. One Formula. Everything in Your Head.</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 p-6 text-center shadow-md">
                <div className="h-14 w-14 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-2xl mb-4">🏏</div>
                <div className="font-bold text-amber-700 dark:text-amber-400 text-xs uppercase tracking-widest mb-2">Layer 1 — The Batsman</div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-lg mb-2">4 Secret Fruits</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Your 4 favourite players (fruits). One walks out at every login — you recognise your player instantly. The score beside them is shown on screen.</p>
              </div>
              <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 p-6 text-center shadow-md">
                <div className="h-14 w-14 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-2xl mb-4">🎯</div>
                <div className="font-bold text-blue-600 dark:text-blue-400 text-xs uppercase tracking-widest mb-2">Layer 2 — Runs to Win</div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-lg mb-2">Your Secret Salt</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">A plain number only you know. You add it mentally to the batsman's score shown on screen. Formula: Screen Number + Salt = Answer. That's it. Nothing else enters the formula.</p>
              </div>
              <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-900 p-6 text-center shadow-md">
                <div className="h-14 w-14 mx-auto rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-2xl mb-4">🏆</div>
                <div className="font-bold text-violet-600 dark:text-violet-400 text-xs uppercase tracking-widest mb-2">Layer 3 — The Scoreboard</div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-lg mb-2">Memory Letters X & R</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Two letters on the scoreboard after the match. They are your personal mnemonic to recall your salt number — they are never part of the formula itself. Only you know how they connect to your salt.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
           <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                 <Badge variant="secondary" className="mb-4 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">SYSTEM ARCHITECTURE</Badge>
                 <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Zero-Knowledge Verification</h2>
                 <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                    We never know who your users are. We only know if they passed the test.
                 </p>
                 <ul className="space-y-4">
                    <li className="flex gap-3">
                       <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                       <span className="text-slate-700 dark:text-slate-300">Your backend holds the user identity.</span>
                    </li>
                    <li className="flex gap-3">
                       <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                       <span className="text-slate-700 dark:text-slate-300">We generate a random visual challenge.</span>
                    </li>
                    <li className="flex gap-3">
                       <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                       <span className="text-slate-700 dark:text-slate-300">You validate the signed token.</span>
                    </li>
                 </ul>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-900">
                 {/* Simple ascii or block diagram placeholder */}
                 <div className="space-y-4 font-mono text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex justify-between items-center bg-white dark:bg-black/20 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                       <div className="flex items-center gap-2 font-semibold">
                          <Smartphone className="h-4 w-4 text-slate-500" />
                          <span>Client App</span>
                       </div>
                       <Badge variant="outline" className="text-[10px]">User Input</Badge>
                    </div>
                    <div className="flex justify-center py-2"><ArrowRight className="rotate-90 text-slate-300 dark:text-slate-600 h-6 w-6"/></div>
                    <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800 shadow-sm">
                       <div className="flex items-center gap-2 font-semibold text-indigo-700 dark:text-indigo-300">
                          <Server className="h-4 w-4" />
                          <span>WallNet-Sec API</span>
                       </div>
                       <Badge className="bg-indigo-600 text-white text-[10px]">Verification</Badge>
                    </div>
                    <div className="flex justify-center py-2"><ArrowRight className="rotate-90 text-slate-300 dark:text-slate-600 h-6 w-6"/></div>
                    <div className="flex justify-between items-center bg-white dark:bg-black/20 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                       <div className="flex items-center gap-2 font-semibold">
                          <Server className="h-4 w-4 text-slate-500" />
                          <span>Your Backend</span>
                       </div>
                       <Badge variant="outline" className="text-[10px]">Access Grant</Badge>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* How We Stop Each Attack */}
      <section className="py-24 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <Badge variant="outline" className="mb-4 rounded-full border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              Security Deep Dive
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-6">
              How Does it Stop Each Attack?
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              Three of the most dangerous real-world attacks — explained, and then dismantled.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Phishing */}
            <div className="rounded-3xl border border-orange-200 dark:border-orange-800/40 bg-orange-50 dark:bg-orange-950/10 p-8">
              <div className="h-12 w-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-6">
                <Globe2 className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white mb-2">Phishing Attack</h3>
              <div className="text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-4">How it works</div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                A hacker creates a fake login page that looks exactly like yours. You type your password — they capture it and instantly relay it to the real site to log in as you.
              </p>
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-orange-100 dark:border-orange-900 p-4">
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">🛡 Why it fails here</div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  The visual challenge (the batsman's score) is <span className="font-semibold text-slate-800 dark:text-slate-200">generated fresh and bound to a specific session ID</span> on our backend. A fake site cannot generate a valid challenge. And even if they relay the challenge in real-time, your answer is computed from your secret salt and alphabets — <span className="font-semibold text-slate-800 dark:text-slate-200">the hacker sees a meaningless number and cannot derive your formula</span>.
                </p>
              </div>
            </div>

            {/* RAT */}
            <div className="rounded-3xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/10 p-8">
              <div className="h-12 w-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
                <Eye className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white mb-2">Remote Access Trojan (RAT)</h3>
              <div className="text-xs font-bold uppercase tracking-widest text-red-600 dark:text-red-400 mb-4">How it works</div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                A RAT is malware that gives an attacker a live view of your screen. They watch you type in real-time — seeing your OTP as you receive it, and recording every keystroke.
              </p>
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900 p-4">
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">🛡 Why it fails here</div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  The RAT can see your screen — it sees Kohli's score of 40 and it sees you type 55. But <span className="font-semibold text-slate-800 dark:text-slate-200">it cannot see your mental math</span>. The 12 (your salt) and your alphabets X and R never appear anywhere. The answer 55 is useless next login because the batsman's score will be completely different. <span className="font-semibold text-slate-800 dark:text-slate-200">The secret is a formula, not a value — and formulas live in minds, not screens.</span>
                </p>
              </div>
            </div>

            {/* Shoulder Surfing */}
            <div className="rounded-3xl border border-pink-200 dark:border-pink-800/40 bg-pink-50 dark:bg-pink-950/10 p-8">
              <div className="h-12 w-12 rounded-2xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mb-6">
                <Eye className="h-6 w-6 text-pink-500" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white mb-2">Shoulder Surfing</h3>
              <div className="text-xs font-bold uppercase tracking-widest text-pink-600 dark:text-pink-400 mb-4">How it works</div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                A spy in a café, bus, or ATM queue watches over your shoulder. They observe which keys you press, memorise your PIN, and use it later from their own device.
              </p>
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-pink-100 dark:border-pink-900 p-4">
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">🛡 Why it fails here</div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Two defences activate at once. First, the keypad is <span className="font-semibold text-slate-800 dark:text-slate-200">scrambled randomly</span> — so the spy can't even map your finger position to a digit. Second, even if they somehow read the number you typed (55), <span className="font-semibold text-slate-800 dark:text-slate-200">it will be wrong on the next login</span> because the batsman's score changes. Watching you once is completely useless.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

    

      {/* Passkey vs Cognitive Auth */}
      <section className="py-24 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <Badge variant="outline" className="mb-4 rounded-full border-slate-300 bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              Comparison
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-6">
              How is This Different from Passkeys?
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
              Passkeys are better than passwords — but they still have critical hardware and device-level weaknesses. Here's why cognitive authentication goes further.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="grid grid-cols-3 gap-4 mb-4 px-2">
              <div />
              <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-4 py-3 text-center">
                <div className="text-lg mb-1">🔑</div>
                <div className="font-extrabold text-sm text-slate-700 dark:text-slate-200">Passkey</div>
                <div className="text-xs text-slate-400">(FIDO2 / WebAuthn)</div>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-3 text-center shadow-lg">
                <div className="text-lg mb-1">🧠</div>
                <div className="font-extrabold text-sm text-white">Cognitive Auth</div>
                <div className="text-xs text-indigo-200">Our System</div>
              </div>
            </div>

            {/* Rows */}
            {[
              {
                label: "Device Lost / Stolen",
                passkey: { bad: true,  text: "Access is gone. Passkey lives on the device. Lose the phone, lose your login." },
                ours:    { text: "Nothing to lose. Your salt lives in your head. Any device, anywhere." },
              },
              {
                label: "Who Can Provide It?",
                passkey: { bad: true,  text: "Practically only Google, Apple & Microsoft. Hard for independent apps to implement from scratch." },
                ours:    { text: "Any app, any backend, any platform. Drop in our API. Works everywhere in minutes." },
              },
              {
                label: "Full Device Compromise (RAT)",
                passkey: { bad: true,  text: "A RAT with full device access can trigger biometric prompts silently, intercept fingerprint data, or abuse the stored credential directly." },
                ours:    { text: "RAT sees the screen number. RAT sees what you type. But the salt is never on the device — it cannot be extracted by any malware." },
              },
              {
                label: "Browser Auto-fill / Auto-submit",
                passkey: { bad: true,  text: "Browser has full access to the passkey flow. Malicious extensions or a compromised browser can trigger authentication silently without any user awareness." },
                ours:    { text: "The formula computation happens in your brain, not the browser. No extension or script can compute your salt for you." },
              },
              {
                label: "Biometric Data Risk",
                passkey: { bad: true,  text: "Fingerprint and face data is used. If the OS or a rogue app captures raw biometric sensor data, that identity signal can be abused." },
                ours:    { text: "No biometrics involved. Nothing biological is captured. Your auth factor is a thought, not a fingerprint." },
              },
              {
                label: "Works on Any Device?",
                passkey: { bad: true,  text: "Tied to registered device. Cross-device login is limited and complex to set up." },
                ours:    { text: "Works on any browser, any device. Your formula travels with you — in your memory." },
              },
            ].map((row) => (
              <div key={row.label} className="grid grid-cols-3 gap-4 mb-3 items-start">
                <div className="flex items-center py-2">
                  <span className="font-semibold text-sm text-slate-700 dark:text-slate-300">{row.label}</span>
                </div>
                <div className={`rounded-2xl p-4 border ${
                  row.passkey.bad
                    ? "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900"
                    : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900"
                }`}>
                  <div className="flex items-start gap-2">
                    <span className="text-base shrink-0">{row.passkey.bad ? "❌" : "✅"}</span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{row.passkey.text}</p>
                  </div>
                </div>
                <div className="rounded-2xl p-4 border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-start gap-2">
                    <span className="text-base shrink-0">✅</span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{row.ours.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom callout */}
          <div className="max-w-3xl mx-auto mt-12 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border border-indigo-200 dark:border-indigo-800 p-8 text-center">
            <p className="font-extrabold text-slate-900 dark:text-white text-lg mb-3">The Fundamental Difference</p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Passkeys move your secret from a password to a device. <span className="font-semibold text-slate-800 dark:text-slate-200">We move it to your mind.</span> A device can be stolen, cloned, or fully compromised by malware. A thought cannot. The cognitive airgap is the only authentication factor that survives full device compromise.
            </p>
          </div>
        </div>
      </section>

      {/* Threat Models */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900">
         <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-16 text-slate-900 dark:text-white">Threat Mitigation</h2>
            <div className="grid md:grid-cols-2 gap-6">
               {threats.map((threat) => (
                  <Card key={threat.name} className="border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors bg-white dark:bg-slate-950">
                     <CardContent className="p-8">
                        <div className="flex items-center gap-4 mb-4">
                           <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">{threat.icon}</div>
                           <h3 className="font-bold text-lg text-slate-900 dark:text-white">{threat.name}</h3>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed border-b border-slate-100 dark:border-slate-800 pb-4">
                            {threat.desc}
                        </p>
                        <div className="flex gap-2 items-start text-sm font-medium text-emerald-600 dark:text-emerald-400">
                           <Shield className="h-5 w-5 shrink-0" />
                           <span><span className="font-bold">Our Solution:</span> {threat.solution}</span>
                        </div>
                     </CardContent>
                  </Card>
               ))}
            </div>
         </div>
      </section>
      
      {/* CTA */}
      <section className="py-32 text-center bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900">
         <div className="container mx-auto px-6 max-w-3xl">
            <h2 className="text-3xl font-extrabold mb-6 text-slate-900 dark:text-white">Start Building Secure Apps Today</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-10">
               Join the developers who are shutting down phishing and automated attacks for good.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
               <Button asChild size="lg" className="h-12 rounded-full px-8 font-semibold">
                  <Link href="/developers">Developer Docs</Link>
               </Button>
               <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-8 bg-transparent">
                  <Link href="/contact">Contact Sales</Link>
               </Button>
            </div>
         </div>
      </section>
    </div>
  );
}
