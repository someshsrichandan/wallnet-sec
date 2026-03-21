"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { HttpError, requestJson } from "@/lib/http";

type CatalogType = "VEGETABLE" | "CRICKETER" | "BOLLYWOOD";
type FormulaMode = "SALT_ADD" | "POSITION_SUM" | "PAIR_SUM";
type AlphabetMode = "SEQUENTIAL" | "RANDOM";
type PositionCell = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;

type EnrollSession = {
  enrollToken: string;
  partnerId: string;
  userId: string;
  status: string;
  expiresAt: string;
};

type CatalogItem = {
  name: string;
  imageUrl: string;
};

type CatalogResponse = {
  catalogType: CatalogType;
  items: CatalogItem[];
};

type SubmitResponse = {
  ok: boolean;
  redirectUrl: string | null;
};

const POSITION_GRID_COLUMNS = 6;
const POSITION_GRID_TOTAL = 18;

const FORMULA_LABELS: Record<FormulaMode, string> = {
  SALT_ADD: "Salt Add – secret vegetable number + a fixed salt",
  POSITION_SUM: "Position Sum – secret vegetable number + chosen grid cell number",
  PAIR_SUM: "Pair Sum – any 2 of your 4 secrets are randomly summed",
};

const getItemFallbackDataUri = (itemName: string) => {
  const safeLabel = (itemName || "Item").replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 24) || "Item";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fde68a"/><stop offset="100%" stop-color="#fb923c"/></linearGradient></defs><rect width="320" height="220" fill="url(#g)"/><rect x="10" y="10" width="300" height="200" rx="16" fill="#fff7ed" stroke="#ea580c"/><text x="160" y="112" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#7c2d12">${safeLabel}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const onItemImageError = (event: SyntheticEvent<HTMLImageElement>, itemName: string) => {
  const image = event.currentTarget;
  image.onerror = null;
  image.src = getItemFallbackDataUri(itemName);
};

const getPositionCellLabel = (cell: number) => {
  const row = Math.floor((cell - 1) / POSITION_GRID_COLUMNS) + 1;
  const col = ((cell - 1) % POSITION_GRID_COLUMNS) + 1;
  return `R${row}C${col}`;
};

type PageProps = {
  params: Promise<{ enrollToken: string }>;
};

export default function EnrollPage({ params }: PageProps) {
  const [enrollToken, setEnrollToken] = useState<string | null>(null);
  const [session, setSession] = useState<EnrollSession | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const [catalogType, setCatalogType] = useState<CatalogType>("VEGETABLE");
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [letterOne, setLetterOne] = useState("X");
  const [letterTwo, setLetterTwo] = useState("R");
  const [formulaMode, setFormulaMode] = useState<FormulaMode>("SALT_ADD");
  const [alphabetMode, setAlphabetMode] = useState<AlphabetMode>("SEQUENTIAL");
  const [saltValue, setSaltValue] = useState<number>(5);
  const [positionPair, setPositionPair] = useState<PositionCell[]>([1]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // resolve the async params
  useEffect(() => {
    let mounted = true;
    params.then(({ enrollToken: tok }) => {
      if (mounted) setEnrollToken(tok);
    });
    return () => { mounted = false; };
  }, [params]);

  // load session
  useEffect(() => {
    if (!enrollToken) return;
    const load = async () => {
      setIsLoadingSession(true);
      try {
        const data = await requestJson<EnrollSession>(
          `/api/visual-password/enroll-session/${encodeURIComponent(enrollToken)}`
        );
        setSession(data);
      } catch (error) {
        setSessionError(
          error instanceof HttpError ? error.message : "Unable to load enrollment session."
        );
      } finally {
        setIsLoadingSession(false);
      }
    };
    load();
  }, [enrollToken]);

  // load catalog
  useEffect(() => {
    const load = async () => {
      setIsLoadingCatalog(true);
      setSelectedItems([]);
      try {
        const data = await requestJson<CatalogResponse>(
          `/api/visual-password/catalog?catalogType=${encodeURIComponent(catalogType)}`
        );
        setCatalogItems(data.items || []);
      } catch {
        setCatalogItems([]);
        toast.error("Unable to load catalog. Check your connection and try again.");
      } finally {
        setIsLoadingCatalog(false);
      }
    };
    load();
  }, [catalogType]);

  const toggleItem = (name: string) => {
    setSelectedItems((prev) => {
      if (prev.includes(name)) return prev.filter((i) => i !== name);
      if (prev.length >= 4) {
        toast.warning("Select exactly 4 items.");
        return prev;
      }
      return [...prev, name];
    });
  };

  const togglePositionCell = (cell: PositionCell) => {
    setPositionPair((prev) => (prev[0] === cell ? [] : [cell]));
  };

  const submit = async () => {
    if (!enrollToken || !session) return;

    if (selectedItems.length !== 4) {
      toast.error("Please select exactly 4 secret items.");
      return;
    }
    const l1 = letterOne.trim().toUpperCase();
    const l2 = letterTwo.trim().toUpperCase();
    if (!/^[A-Z]$/.test(l1) || !/^[A-Z]$/.test(l2)) {
      toast.error("Each secret letter must be a single A–Z character.");
      return;
    }
    if (l1 === l2) {
      toast.error("Secret letters must be different.");
      return;
    }
    if (formulaMode === "POSITION_SUM" && positionPair.length !== 1) {
      toast.error("Select exactly 1 position cell for Position Sum mode.");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await requestJson<SubmitResponse>(
        `/api/visual-password/enroll-session/${encodeURIComponent(enrollToken)}/submit`,
        {
          method: "POST",
          body: JSON.stringify({
            catalogType,
            secretVegetables: selectedItems,
            secretLetters: [l1, l2],
            formulaMode,
            alphabetMode,
            saltValue,
            positionPair,
          }),
        }
      );

      setDone(true);
      toast.success("Visual password set up successfully!");

      if (data.redirectUrl) {
        setTimeout(() => {
          window.location.assign(data.redirectUrl!);
        }, 1500);
      }
    } catch (error) {
      toast.error(error instanceof HttpError ? error.message : "Enrollment failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6efe7]">
        <Spinner />
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6efe7] px-6">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Session Unavailable</h1>
          <p className="text-slate-600">{sessionError}</p>
          <p className="text-sm text-slate-500">
            This link may have expired or already been used. Please return to the partner app and
            try again.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6efe7] px-6">
        <div className="max-w-md space-y-4 text-center">
          <div className="text-5xl">✅</div>
          <h1 className="text-2xl font-semibold text-slate-900">Visual Password Activated</h1>
          <p className="text-slate-600">
            Your visual profile has been saved. Redirecting you back to the partner app…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans relative selection:bg-indigo-100 selection:text-indigo-900">
      {/* Minimal background */}
      <div className="fixed inset-0 z-0 bg-white pointer-events-none" />

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-white text-xs font-bold shadow-sm">
               FS
             </div>
             <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Secure Enrollment
              </p>
              <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-sm font-semibold text-slate-700">
                    Live Session
                  </p>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
             <div className="flex flex-col items-end">
                 <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Partner ID</span>
                 <span className="text-slate-900">{session?.partnerId || "Unknown"}</span>
             </div>
             <div className="h-8 w-px bg-slate-200" />
             <div className="flex flex-col items-end">
                 <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">User ID</span>
                 <span className="text-slate-900">{session?.userId || "Unknown"}</span>
             </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        <section className="text-center max-w-2xl mx-auto space-y-2 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Configure Verification Key
          </h1>
          <p className="text-sm text-slate-600 mx-auto font-light">
            Select 4 distinct anchors and 2 letters. This unique combination creates a resilient visual password that exists only in your mind.
          </p>
        </section>

        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 items-start w-full">
            {/* Left Column */}
            <div className="flex flex-col gap-6">


        {/* Step 1 – Catalog type */}
        <section className="space-y-6">
            <div className="flex items-center justify-between px-1">
                 <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-900 text-white text-[10px]">1</span>
                    Theme Selection
                 </h2>
                 <p className="text-sm text-slate-500 font-medium">Select a category</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {(["VEGETABLE", "CRICKETER", "BOLLYWOOD"] as CatalogType[]).map((ct) => (
                <button
                  key={ct}
                  type="button"
                  onClick={() => setCatalogType(ct)}
                  className={`flex items-center gap-2 rounded border px-3 py-1.5 transition-all duration-200 ${
                    catalogType === ct
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-sm">
                      {ct === "VEGETABLE" ? "🥦" : ct === "CRICKETER" ? "🏏" : "🎬"}
                  </span>
                  <span className="text-xs font-bold">
                    {ct === "VEGETABLE" ? "Vegetables" : ct === "CRICKETER" ? "Cricketers" : "Bollywood"}
                  </span>
                </button>
              ))}
            </div>
        </section>

        {/* Step 2 – Pick 4 images */}
        <section className="space-y-6">
            <div className="flex items-center justify-between px-1 bg-white p-2 rounded border border-slate-200 sticky top-16 z-30 shadow-sm">
                 <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-900 text-white text-[10px]">2</span>
                    Select 4 Anchors
                 </h2>
                 <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                        {[1, 2, 3, 4].map(idx => (
                            <div key={idx} className={`h-2 w-8 rounded-full transition-all duration-500 ${selectedItems.length >= idx ? "bg-emerald-500" : "bg-slate-200"}`} />
                        ))}
                    </div>
                    <span className={`text-sm font-bold ${selectedItems.length === 4 ? "text-emerald-600" : "text-slate-400"}`}>
                        {selectedItems.length}/4
                    </span>
                 </div>
            </div>
            
            <Card className="border-0 bg-white/50 shadow-none">
            <CardContent className="p-0">
            {isLoadingCatalog ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-500 bg-white rounded-3xl border border-slate-100">
                <Spinner className="h-8 w-8 border-indigo-600/30 border-t-indigo-600" /> 
                <p className="animate-pulse font-medium">Loading catalog items...</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {catalogItems.map((item) => {
                    const selected = selectedItems.includes(item.name);
                    const index = selectedItems.indexOf(item.name) + 1;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => toggleItem(item.name)}
                        className={`group relative flex flex-col rounded-lg border p-1.5 transition-all duration-200 ${
                          selected
                            ? "border-slate-900 bg-slate-50 shadow-sm z-10 ring-1 ring-slate-900/20"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded bg-slate-100 mb-2">
                            <img
                            src={item.imageUrl}
                            alt={item.name}
                            className={`h-full w-full object-cover object-center ${
                                selected ? "opacity-100" : "opacity-90 group-hover:opacity-100"
                            }`}
                            onError={(e) => onItemImageError(e, item.name)}
                            draggable={false}
                            />
                            
                            <div className="absolute top-1.5 right-1.5">
                                {selected && (
                                    <span className="flex h-5 w-5 bg-slate-900 text-white rounded-[3px] text-[10px] items-center justify-center font-bold">
                                        {index}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="px-1 text-center w-full truncate pb-1">
                           <span className={`block font-bold text-[10px] uppercase tracking-wide truncate ${selected ? "text-slate-900" : "text-slate-500"}`}>
                             {item.name}
                           </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
            )}
            </CardContent>
            </Card>
        </section>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4 sticky top-20">
            <Card className="shadow-sm border-slate-200 bg-white rounded-xl overflow-hidden flex flex-col">
                <CardHeader className="border-b border-slate-100 bg-slate-50 p-4">
                    <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-900 text-white text-xs font-bold shadow-sm">3</span>
                        Input Secrets
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-500 ml-8">
                        Choose two distinct letters. These will be your variable keys.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-6 px-4 bg-white flex-grow relative overflow-hidden">

                    <div className="flex gap-4 relative z-10">
                        <div className="text-center group perspective-1000">
                            <div className="relative transform transition-transform duration-500 group-hover:rotate-y-12">
                                <Input
                                    className="h-10 w-10 sm:h-12 sm:w-12 text-center text-xl font-black uppercase border border-slate-300 bg-white shadow-sm ring-0 focus:ring-2 focus:ring-slate-900 text-slate-800 rounded transition-all placeholder:text-slate-200"
                                    maxLength={1}
                                    value={letterOne}
                                    placeholder="A"
                                    onChange={(e) => setLetterOne(e.target.value.toUpperCase())}
                                />
                                <div className="absolute inset-0 rounded ring-1 ring-inset ring-black/5 pointer-events-none" />
                            </div>
                            <label className="text-[10px] font-bold text-slate-400 mt-2 block uppercase tracking-[0.2em] group-hover:text-indigo-500 transition-colors">Letter 1</label>
                        </div>
                        <div className="text-xl text-slate-200 font-light flex items-center select-none">&</div>
                        <div className="text-center group perspective-1000">
                             <div className="relative transform transition-transform duration-500 group-hover:-rotate-y-12">
                                <Input
                                    className="h-10 w-10 sm:h-12 sm:w-12 text-center text-xl font-black uppercase border border-slate-300 bg-white shadow-sm ring-0 focus:ring-2 focus:ring-slate-900 text-slate-800 rounded transition-all placeholder:text-slate-200"
                                    maxLength={1}
                                    value={letterTwo}
                                    placeholder="B"
                                    onChange={(e) => setLetterTwo(e.target.value.toUpperCase())}
                                />
                                 <div className="absolute inset-0 rounded ring-1 ring-inset ring-black/5 pointer-events-none" />
                            </div>
                            <label className="text-[10px] font-bold text-slate-400 mt-2 block uppercase tracking-[0.2em] group-hover:text-indigo-500 transition-colors">Letter 2</label>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 bg-white rounded-xl overflow-hidden flex flex-col">
                <CardHeader className="border-b border-slate-100 bg-slate-50 p-4">
                    <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-900 text-white text-xs font-bold shadow-sm">4</span>
                        Cognitive Formula
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-500 ml-8">
                        Define how you will calculate the answer in your head.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 bg-slate-50/50 p-4 flex-grow">
                    
                    <div className="grid gap-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Select Logic Mode</label>
                        <div className="grid sm:grid-cols-3 gap-2">
                        {(["SALT_ADD", "POSITION_SUM", "PAIR_SUM"] as FormulaMode[]).map((fm) => (
                            <button
                                key={fm}
                                onClick={() => setFormulaMode(fm)}
                                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition-all duration-200 ${
                                    formulaMode === fm 
                                    ? "bg-slate-50 border-slate-900 ring-1 ring-slate-900 shadow-sm z-10" 
                                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                }`}
                            >
                                <div className={`h-6 w-6 rounded flex items-center justify-center text-sm ${formulaMode === fm ? "bg-slate-200 text-slate-800" : "bg-slate-100"}`}>
                                    {fm === "SALT_ADD" ? "+" : fm === "POSITION_SUM" ? "⊞" : "∑"}
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-tight ${formulaMode === fm ? "text-slate-900" : "text-slate-500"}`}>
                                    {fm.replace("_", " ")}
                                </span>
                            </button>
                        ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 h-full flex flex-col justify-center min-h-[100px]">
                        {formulaMode === "SALT_ADD" && (
                        <div className="flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-300">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Choose your Salt Constant</span>
                            <div className="flex justify-center gap-2">
                                {[3, 4, 5, 6, 7].map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => setSaltValue(v)}
                                        className={`h-10 w-10 rounded-lg text-lg font-bold transition-all duration-200 ${
                                            saltValue === v 
                                            ? "bg-slate-900 text-white shadow-sm scale-105" 
                                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        }`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                            <p className="text-center text-xs text-slate-400 mt-1">
                                Formula: <span className="font-mono text-slate-900 font-bold bg-slate-100 px-1 rounded">Item # + {saltValue}</span>
                            </p>
                        </div>
                        )}
                        
                        {formulaMode === "POSITION_SUM" && (
                            <div className="text-center animate-in fade-in zoom-in-95 duration-300">
                                <p className="text-[10px] text-slate-400 mb-3 font-bold uppercase tracking-widest">Select Grid Cell Modifier</p>
                                <div className="grid grid-cols-6 gap-1.5 max-w-[280px] mx-auto">
                                    {Array.from({ length: POSITION_GRID_TOTAL }, (_, i) => {
                                        const cell = (i + 1) as PositionCell;
                                        const selected = positionPair.includes(cell);
                                        return (
                                        <button
                                            key={cell}
                                            type="button"
                                            onClick={() => togglePositionCell(cell)}
                                            className={`h-8 rounded-md border text-[10px] font-bold transition-all ${
                                            selected 
                                              ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                                              : "bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700"
                                            }`}
                                        >
                                            {getPositionCellLabel(cell)}
                                        </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                         {formulaMode === "PAIR_SUM" && (
                            <div className="text-center animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center justify-center h-full">
                                <p className="text-sm font-semibold text-slate-700">
                                    Sum of <span className="text-slate-900 underline">two</span> random anchor values.
                                </p>
                                <p className="text-xs text-slate-400 mt-2 max-w-[200px]">
                                    No configuration needed. System will prompt which two images to add.
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Final Confirmation Banner */}
        <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col gap-4">
            <div className={`transition-all duration-300 ${selectedItems.length === 4 ? "opacity-100" : "opacity-90"}`}>
               <div className="mb-3">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                   <div className="flex items-center gap-2">
                       {selectedItems.length === 4 ? (
                           <>
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-bold text-slate-900 text-sm">Ready to Activate</span>
                           </>
                       ) : (
                           <>
                            <div className="h-2 w-2 rounded-full bg-amber-500" />
                            <span className="font-bold text-slate-700 text-sm">{4 - selectedItems.length} more needed</span>
                           </>
                       )}
                   </div>
               </div>
               
               <Button
                onClick={submit}
                disabled={isSubmitting || selectedItems.length !== 4}
                className={`rounded-lg w-full font-bold h-11 text-sm transition-all duration-200 ${
                    selectedItems.length === 4 ? "bg-slate-900 hover:bg-slate-800 text-white" : "bg-slate-100 text-slate-400 border border-slate-200"
                }`}
                >
                {isSubmitting ? (
                    <span className="flex items-center gap-2">
                    <Spinner className="border-white/30 border-t-white h-4 w-4" /> Encrypting...
                    </span>
                ) : (
                    "Activate & Finish"
                )}
                </Button>
            </div>
        </div>
        </div>
      </main>
    </div>
  );
}
