"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import * as THREE from "three";
import {
  ArrowRight,
  Code2,
  Globe2,
  Lock,
  ShieldCheck,
  Zap,
  Server,
  Eye,
  ChevronRight,
  Sparkles,
  Cpu,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Theme-aware Particle Shield ──────────────────────────────────────────────
const ParticleShield = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const isDark = document.documentElement.classList.contains("dark");
    const W = mount.clientWidth, H = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 1000);
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // ── Particles ──
    const COUNT = 32000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    
    const palette = isDark
      ? [
          new THREE.Color("#818cf8"),
          new THREE.Color("#6366f1"),
          new THREE.Color("#a78bfa"),
          new THREE.Color("#2dd4bf"),
        ]
      : [
          new THREE.Color("#312e81"),
          new THREE.Color("#1e1b4b"),
          new THREE.Color("#581c87"),
          new THREE.Color("#134e4a"),
        ];

    let n = 0;
    while (n < COUNT) {
      const x = (Math.random() * 2 - 1) * 5;
      const y = (Math.random() * 2.2 - 1.1) * 5;
      const z = (Math.random() * 2 - 1) * 1.6;
      const nx = x / 5, ny = y / 5;

      if (ny > 0.8) continue;
      const hw = ny < 0 ? 1 - Math.pow(-ny, 1.45) : 1;
      if (Math.abs(nx) > hw) continue;
      
      const cd = Math.sqrt(nx * nx + (ny > 0 ? 0 : ny * ny));
      if (Math.abs(z / 5) > 0.42 * (1 - cd)) continue;

      const dky = ny - 0.14;
      if (Math.sqrt(nx * nx + dky * dky) < 0.23) continue;
      if (ny < 0.14 && ny > -0.38 && Math.abs(nx) < 0.085 + (0.14 - ny) * 0.22) continue;

      pos[n * 3] = x; pos[n * 3 + 1] = y; pos[n * 3 + 2] = z;

      const c = palette[Math.floor(Math.random() * palette.length)];
      col[n * 3] = c.r; col[n * 3 + 1] = c.g; col[n * 3 + 2] = c.b;
      n++;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

    const mat = new THREE.PointsMaterial({
      size: isDark ? 0.035 : 0.042,
      vertexColors: true,
      transparent: true,
      opacity: isDark ? 0.85 : 1.0,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });

    const shield = new THREE.Points(geo, mat);
    scene.add(shield);

    const glowGeo = new THREE.IcosahedronGeometry(5.2, 1);
    const glowMat = new THREE.MeshBasicMaterial({
      color: isDark ? "#4f46e5" : "#6366f1",
      transparent: true,
      opacity: 0.02,
      wireframe: true,
    });
    const atom = new THREE.Mesh(glowGeo, glowMat);
    scene.add(atom);

    const createRing = (radius: number, rx: number, ry: number, op: number, speed: number) => {
        const rGeo = new THREE.TorusGeometry(radius, 0.008, 16, 120);
        const rMat = new THREE.MeshBasicMaterial({
            color: isDark ? "#c7d2fe" : "#312e81",
            transparent: true,
            opacity: op,
        });
        const r = new THREE.Mesh(rGeo, rMat);
        r.rotation.x = rx; r.rotation.y = ry;
        (r as any).rotSpeed = speed;
        return r;
    };

    const rings = [
      createRing(5.4, Math.PI / 2.1, 0, 0.25, 0.002),
      createRing(5.6, Math.PI / 3, Math.PI / 4, 0.15, -0.0015),
      createRing(5.2, -Math.PI / 4, -Math.PI / 6, 0.2, 0.001),
    ];
    rings.forEach(r => scene.add(r));

    let mx = 0, my = 0;
    const onMove = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove);

    let frame: number;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      shield.rotation.y += 0.0008;
      shield.rotation.y += (mx * 0.22 - shield.rotation.y) * 0.06;
      shield.rotation.x += (my * 0.22 - shield.rotation.x) * 0.06;
      atom.rotation.y -= 0.001;
      rings.forEach(r => r.rotation.z += (r as any).rotSpeed);
      renderer.render(scene, camera);
    };
    tick();

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      geo.dispose(); mat.dispose(); glowGeo.dispose(); glowMat.dispose(); renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
};

// ─── Component Data ──────────────────────────────────────────────────────────
const features = [
  { icon: ShieldCheck, tag: "01", title: "Phishing-Proof", description: "Visual secrets remain in-mind, never reaching the device screen or RAM." },
  { icon: Lock,        tag: "02", title: "Replay-Locked",    description: "Session-bound entropy ensures one-time validity for every mental handshake." },
  { icon: Code2,       tag: "03", title: "Universal REST",   description: "Zero SDK installation. Connect any backend in under thirty minutes flat." },
  { icon: Globe2,      tag: "04", title: "Edge Isolation",   description: "Isolated tenant environments with dedicated keys and granular audit trails." },
  { icon: Eye,         tag: "05", title: "Cognitive Gap",    description: "Verification bypasses hardware. Malware cannot scan a user's visualization." },
  { icon: Server,      tag: "06", title: "State-Free",       description: "We sign the proof, you keep the session. Your DB remains the single truth." },
];

const useCases = [
  { icon: Lock,        title: "Financial",   sub: "Institutions", desc: "Wire transfers & beneficiary setup protection.", grad: "from-blue-600/80 to-indigo-700/80" },
  { icon: ShieldCheck, title: "Healthcare",  sub: "Portals",      desc: "Patient record access & HIPAA-safe downloads.", grad: "from-emerald-600/80 to-teal-700/80" },
  { icon: Globe2,      title: "Enterprise",  sub: "Infra",        desc: "Visual 2FA for privileged SSH & VPN access.", grad: "from-violet-600/80 to-purple-700/80" },
  { icon: Zap,         title: "Exchanges",   sub: "Crypto",       desc: "Stop wallet drainers & unauthorized withdrawals.", grad: "from-amber-500/80 to-orange-600/80" },
];

const stats = [
  { v: "0",     l: "Stored Secrets",  n: "Zero-knowledge core" },
  { v: "1.2M+", l: "Entropy Variants", n: "Mental hash depth" },
  { v: "API",   l: "First Engine",     n: "Developer centric" },
  { v: "99.9%", l: "Network Health",   n: "SLA guaranteed" },
];

// ─── View ───────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:opsz,wght@14..32,300;400;500;600;700;800&display=swap');
        
        body { font-family:'Inter', sans-serif; -webkit-font-smoothing:antialiased; }
        .serif { font-family:'Instrument Serif', serif; font-style:italic; }

        .type-glass {
          display: inline-block;
          font-family: 'Instrument Serif', serif;
          font-style: italic;
          background: linear-gradient(160deg, #4f46e5, #818cf8);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(2px 2px 0px #c7d2fe) 
                  drop-shadow(4px 4px 12px rgba(99,102,241,0.15));
          transform: perspective(400px) rotateX(2deg);
        }
        .dark .type-glass {
          background: linear-gradient(160deg, #c7d2fe, #ffffff);
          -webkit-background-clip: text;
          filter: drop-shadow(0px 0px 15px rgba(255,255,255,0.2));
        }

        .grain-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: url("https://grainy-gradients.vercel.app/noise.svg");
          opacity: 0.03; pointer-events: none; z-index: 9999;
        }

        .grid-boutique {
          background-image: 
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .dark .grid-boutique {
          background-image: 
            linear-gradient(rgba(255,255,255,0.01) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.01) 1px, transparent 1px);
        }

        .boutique-card {
           transition: all 0.5s cubic-bezier(0.165, 0.84, 0.44, 1);
           border: 1px solid rgba(0,0,0,0.02);
           background: rgba(255,255,255,0.4);
           backdrop-filter: blur(12px);
        }
        .dark .boutique-card {
           border: 1px solid rgba(255,255,255,0.03);
           background: rgba(10,10,15,0.3);
        }
        .boutique-card:hover {
           transform: translateY(-5px) scale(1.01);
           border-color: rgba(99,102,241,0.15);
           box-shadow: 0 15px 35px -10px rgba(0,0,0,0.04);
        }
        .dark .boutique-card:hover {
           box-shadow: 0 15px 45px -15px rgba(0,0,0,0.5);
        }

        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .float { animation: float 5s ease-in-out infinite; }
      `}</style>

      <div className="grain-overlay" />
      
      <div className="min-h-screen bg-[#fafbfc] dark:bg-[#06060a] text-slate-800 dark:text-zinc-100 transition-colors duration-700 overflow-x-hidden">

        {/* ════════════════════════════════════════════
            HERO
        ════════════════════════════════════════════ */}
        <section className="grid-boutique relative min-h-screen flex items-center overflow-hidden">
          
          <div className="absolute right-[-2%] top-1/2 -translate-y-1/2 w-[52%] h-[80%] z-0 hidden lg:block opacity-95 float">
             <div className="absolute inset-0 bg-indigo-500/5 dark:bg-indigo-500/15 blur-[120px] rounded-full" />
             <ParticleShield />
          </div>

          <div className="container mx-auto px-10 lg:px-20 relative z-10">
            <div className="w-full lg:w-[54%] xl:w-[48%] lg:ml-24 xl:ml-32">
              
              <Badge variant="outline" className="mb-10 border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md px-5 py-2 rounded-full text-[11px] uppercase font-black tracking-[0.25em] text-slate-500 dark:text-zinc-400">
                 <Cpu className="h-3.5 w-3.5 mr-2 text-indigo-500" /> Cognitive Engine V2.5
              </Badge>

              <h1 className="text-[3rem] sm:text-[3.8rem] font-[900] tracking-[-0.045em] text-slate-900 dark:text-white leading-[0.98] mb-8">
                Redefining auth <br />
                with <span className="type-glass text-[3.4rem] sm:text-[4.5rem]">Visual Intelligence.</span>
              </h1>

              <p className="text-[1.125rem] text-slate-500 dark:text-zinc-400 leading-[1.8] max-w-[480px] mb-12 font-medium">
                The only security layer that happens inside your user's mind. Secure against RATs, botnets, and session relay attacks with 
                <span className="text-indigo-600 dark:text-indigo-300 font-bold"> zero device footprint</span>.
              </p>

              <div className="flex flex-wrap items-center gap-5 mb-16">
                <Button asChild size="lg" className="h-16 px-12 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black font-black text-[16px] hover:scale-105 transition-all shadow-2xl shadow-slate-900/10 dark:shadow-white/5 active:scale-95 border-0">
                   <Link href="/developers" className="flex items-center gap-3">
                      Deploy Now <ArrowRight className="h-5 w-5" />
                   </Link>
                </Button>
                <Button asChild variant="ghost" className="h-16 px-10 rounded-full border border-slate-200/50 dark:border-white/10 text-slate-600 dark:text-zinc-300 font-bold text-[15px] hover:bg-white dark:hover:bg-white/5 backdrop-blur-sm transition-all whitespace-nowrap">
                   <Link href="/partner-live?mode=test">Try Live Demo</Link>
                </Button>
              </div>

              <div className="flex items-center gap-14 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
                 <div className="flex items-center gap-3 text-[11px] font-black tracking-[0.3em]">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-900 dark:bg-white" /> SOC2 TYPE II
                 </div>
                 <div className="flex items-center gap-3 text-[11px] font-black tracking-[0.3em]">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-900 dark:bg-white" /> AES-256 E2E
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════
            STATS
        ════════════════════════════════════════════ */}
        <section className="bg-white/40 dark:bg-[#0b0b10]/40 border-y border-slate-100 dark:border-white/5 backdrop-blur-3xl">
           <div className="container mx-auto px-10">
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-100 dark:divide-white/5">
                 {stats.map((s) => (
                    <div key={s.l} className="px-10 py-16 text-left group cursor-default">
                       <p className="text-[2.6rem] font-[900] text-slate-900 dark:text-white tracking-tighter mb-1 transition-transform group-hover:translate-y-[-2px]">{s.v}</p>
                       <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 mb-0.5">{s.l}</p>
                       <p className="text-[11px] text-slate-400 dark:text-zinc-600 font-bold">{s.n}</p>
                    </div>
                 ))}
              </div>
           </div>
        </section>

        {/* ════════════════════════════════════════════
            FEATURES - System Internals
        ════════════════════════════════════════════ */}
        <section className="py-40 bg-white dark:bg-[#06060a]">
           <div className="container mx-auto px-10 lg:px-20">
              <div className="max-w-xl mb-24 lg:ml-24 xl:ml-32">
                 <Badge className="mb-6 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-100 dark:border-indigo-500/20 px-5 py-2 rounded-full uppercase text-[10px] font-black tracking-[0.3em]">System Internals</Badge>
                 <h2 className="text-[2.6rem] font-[900] tracking-[-0.04em] text-slate-900 dark:text-white leading-[1.05] mb-8">
                    Defense that Malware <br/> <span className="serif text-indigo-500/80">cannot read.</span>
                 </h2>
                 <p className="text-[1.05rem] text-slate-500 dark:text-zinc-400 leading-relaxed font-semibold">
                    WallNet-Sec moves the authentication secret from the device storage to the user's mind. 
                    Calculations happen in biological neural networks — the only hardware you can't scan.
                 </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {features.map((f) => (
                    <div key={f.tag} className="boutique-card p-12 rounded-[3rem] relative group border-slate-100/50">
                       <div className="mb-10 h-14 w-14 flex items-center justify-center rounded-[1.5rem] bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-zinc-300 group-hover:bg-slate-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-all duration-500">
                          <f.icon className="h-7 w-7" strokeWidth={2.5} />
                       </div>
                       <div className="flex items-center gap-4 mb-5">
                          <span className="text-[12px] font-[900] text-indigo-500/50">C_{f.tag}</span>
                          <h3 className="text-[1.2rem] font-[900] text-slate-900 dark:text-white tracking-tight">{f.title}</h3>
                       </div>
                       <p className="text-[0.95rem] text-slate-500 dark:text-zinc-400 leading-relaxed font-bold opacity-80">{f.description}</p>
                    </div>
                 ))}
              </div>
           </div>
        </section>

        {/* ════════════════════════════════════════════
            USE CASES - High-Value Flows
        ════════════════════════════════════════════ */}
        <section className="py-40 bg-[#fafbfc] dark:bg-[#0b0b10] border-t border-slate-100 dark:border-white/5 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-[40%] h-[100%] bg-gradient-to-l from-indigo-500/5 dark:from-indigo-500/10 to-transparent pointer-events-none" />
           
           <div className="container mx-auto px-10 lg:px-20 relative">
              <div className="max-w-2xl mb-24 lg:ml-24 xl:ml-32">
                 <p className="text-[11px] font-black uppercase tracking-[0.4em] text-emerald-600 dark:text-emerald-400 mb-6">High-Value Flows</p>
                 <h2 className="text-[2.6rem] font-[900] tracking-[-0.04em] text-slate-900 dark:text-white leading-[1.05] mb-8">
                    Enforce Trust on <br/> <span className="serif text-emerald-500">Critical Actions.</span>
                 </h2>
                 <p className="text-[1.1rem] text-slate-500 dark:text-zinc-400 font-bold max-w-md">
                    Strategic friction where password compromise would be irreversible. Stop wallet drainers and unauthorized access gateways.
                 </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {useCases.map((uc) => (
                    <div key={uc.title} className="boutique-card group p-10 rounded-[3.2rem] bg-white dark:bg-[#0f0f15]/80">
                       <div className={`mb-10 inline-flex p-5 rounded-[1.8rem] bg-gradient-to-br ${uc.grad} shadow-2xl shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-500`}>
                          <uc.icon className="h-7 w-7 text-white" strokeWidth={3} />
                       </div>
                       <div className="mb-6">
                          <p className="text-[12px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-zinc-600 mb-2">{uc.sub}</p>
                          <h3 className="text-[1.4rem] font-[900] text-slate-900 dark:text-white tracking-tighter leading-none">{uc.title}</h3>
                       </div>
                       <p className="text-[0.95rem] text-slate-500 dark:text-zinc-400 leading-snug mb-10 font-bold opacity-90">{uc.desc}</p>
                       <Link href="#" className="inline-flex items-center gap-3 text-[12px] font-black text-indigo-600 dark:text-indigo-400 hover:gap-5 transition-all uppercase tracking-[0.2em]">
                          Secure Link <ArrowRight className="h-4 w-4" />
                       </Link>
                    </div>
                 ))}
              </div>
           </div>
        </section>

        {/* ════════════════════════════════════════════
            FINAL CTA
        ════════════════════════════════════════════ */}
        <section className="py-48 bg-slate-950 relative overflow-hidden border-t border-white/5">
           <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(99,102,241,0.2),transparent_70%)] pointer-events-none" />
           
           <div className="container mx-auto px-10 lg:px-20 relative z-10 text-left lg:text-center flex flex-col items-start lg:items-center">
              <Badge className="mb-10 bg-indigo-500/10 text-indigo-300 border-indigo-500/20 px-6 py-2.5 rounded-full uppercase text-[11px] font-black tracking-[0.4em]">Scalable Defense</Badge>
              <h2 className="text-[2.8rem] sm:text-[4rem] font-[900] text-white tracking-[-0.05em] leading-[0.9] mb-12 max-w-3xl">
                 Zero shared secrets. <br className="hidden md:block"/> 
                 Total <span className="type-glass">visual security.</span>
              </h2>
              <div className="flex flex-wrap gap-6 items-center lg:justify-center">
                 <Button asChild size="lg" className="h-18 px-14 rounded-full bg-white text-black font-[900] text-[16px] hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_25px_50px_-12px_rgba(255,255,255,0.2)]">
                    <Link href="/admin">Request API Access</Link>
                 </Button>
                 <Button asChild variant="outline" size="lg" className="h-18 px-14 rounded-full border-white/20 text-white font-bold text-[16px] hover:bg-white/10 transition-all active:scale-95 bg-transparent backdrop-blur-xl">
                    <Link href="/contact">Book Architecture Review</Link>
                 </Button>
              </div>
           </div>
        </section>

      </div>
    </>
  );
}
