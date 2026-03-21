"use client";

import Link from "next/link";
import { useEffect, useState, type SyntheticEvent } from "react";
import { toast } from "sonner";
import { LayoutDashboard, Key, Shield, User, Lock, Grid3X3, ArrowRight, CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { HttpError, requestJson } from "@/lib/http";

type LoginResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

type EnrollResponse = {
  id: string;
  partnerId: string;
  userId: string;
  catalogType: CatalogType;
  secretVegetables: string[];
  secretLetters: string[];
  saltValue: number;
  formulaMode: FormulaMode;
  alphabetMode: AlphabetMode;
  positionPair?: number[];
  updatedAt: string;
};

type CatalogItem = {
  name: string;
  imageUrl: string;
};

type CatalogResponse = {
  catalogType: CatalogType;
  items: CatalogItem[];
  vegetables: string[];
};

type CatalogType = "VEGETABLE" | "CRICKETER" | "BOLLYWOOD";
type FormulaMode = "SALT_ADD" | "POSITION_SUM" | "PAIR_SUM";
type AlphabetMode = "SEQUENTIAL" | "RANDOM";
type PositionCell =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18;

const POSITION_GRID_COLUMNS = 6;
const POSITION_GRID_TOTAL = 18;

const FORMULA_MODE_EXAMPLES: Record<
  FormulaMode,
  { title: string; example: string; note: string }
> = {
  SALT_ADD: {
    title: "Salt Add",
    example: "Example: Secret number 42 + salt 7 = 49",
    note: "Salt is used only in this mode.",
  },
  POSITION_SUM: {
    title: "Position Sum",
    example: "Example: Secret vegetable number + number at R2C4",
    note: "Pick 1 fixed grid cell. Any vegetable there is fine; only the number matters.",
  },
  PAIR_SUM: {
    title: "Pair Sum",
    example:
      "Example: From your 4 secret vegetables, any 2 are picked randomly",
    note: "No manual pair setup. Pair is randomized each challenge.",
  },
};

const ALPHABET_MODE_EXAMPLES: Record<
  AlphabetMode,
  { title: string; example: string; note: string }
> = {
  SEQUENTIAL: {
    title: "Sequential",
    example: "A -> B -> C order",
    note: "Cannot skip letters. Must fill one by one.",
  },
  RANDOM: {
    title: "Random",
    example: "Q -> M -> A order",
    note: "Random order, but still one by one.",
  },
};

const LAST_VISUAL_PROFILE_KEY = "lastVisualProfile";
const getItemRemoteFallbackImageUrl = (itemName: string) =>
  `https://source.unsplash.com/featured/640x420/?${encodeURIComponent(
    `${itemName} portrait person food`,
  )}`;

const getItemFallbackDataUri = (itemName: string) => {
  const safeLabel =
    (itemName || "Item").replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 24) || "Item";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fde68a"/><stop offset="100%" stop-color="#fb923c"/></linearGradient></defs><rect width="320" height="220" fill="url(#g)"/><rect x="10" y="10" width="300" height="200" rx="16" fill="#fff7ed" stroke="#ea580c"/><text x="160" y="112" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#7c2d12">${safeLabel}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const onItemImageError = (
  event: SyntheticEvent<HTMLImageElement>,
  itemName: string,
) => {
  const image = event.currentTarget;
  if (image.dataset.remoteFallbackApplied !== "1") {
    image.dataset.remoteFallbackApplied = "1";
    image.src = getItemRemoteFallbackImageUrl(itemName);
    return;
  }

  image.onerror = null;
  image.src = getItemFallbackDataUri(itemName);
};

const getPositionCellLabel = (cell: number) => {
  const row = Math.floor((cell - 1) / POSITION_GRID_COLUMNS) + 1;
  const col = ((cell - 1) % POSITION_GRID_COLUMNS) + 1;
  return `R${row}C${col}`;
};

const readLastVisualProfile = (): { partnerId?: string; userId?: string } => {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(LAST_VISUAL_PROFILE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as { partnerId?: string; userId?: string };
  } catch {
    window.localStorage.removeItem(LAST_VISUAL_PROFILE_KEY);
    return {};
  }
};

export default function AdminPage() {
  const lastVisualProfile = readLastVisualProfile();
  const [name, setName] = useState("Bank User");
  const [email, setEmail] = useState("user@example.com");
  const [password, setPassword] = useState("StrongPass123!");
  const [token, setToken] = useState("");
  const [loggedInUserId, setLoggedInUserId] = useState("");
  const [partnerUserId, setPartnerUserId] = useState(
    lastVisualProfile.userId || "customer-bank-001",
  );
  const [partnerId, setPartnerId] = useState(
    lastVisualProfile.partnerId || "hdfc_bank",
  );
  const [catalogType, setCatalogType] = useState<CatalogType>("VEGETABLE");
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [selectedVegetables, setSelectedVegetables] = useState<string[]>([]);
  const [letterOne, setLetterOne] = useState("X");
  const [letterTwo, setLetterTwo] = useState("R");
  const [saltValue, setSaltValue] = useState<3 | 4 | 5 | 6 | 7>(7);
  const [formulaMode, setFormulaMode] = useState<FormulaMode>("PAIR_SUM");
  const [alphabetMode, setAlphabetMode] = useState<AlphabetMode>("SEQUENTIAL");
  const [positionPair, setPositionPair] = useState<PositionCell[]>([1]);

  useEffect(() => {
    const stored = localStorage.getItem("authToken");
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const data = await requestJson<CatalogResponse>(
          `/api/visual-password/catalog?catalogType=${encodeURIComponent(catalogType)}`,
          {
            method: "GET",
          },
        );
        setCatalogItems(data.items || []);
      } catch {
        setCatalogItems([]);
        toast.error("Unable to load catalog. Check backend connectivity.");
      }
    };

    loadCatalog();
  }, [catalogType]);

  const registerUser = async () => {
    try {
      await requestJson("/api/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      toast.success("User registered.");
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) {
        toast.warning("User already exists. You can log in directly.");
      } else {
        toast.error("Registration failed.");
      }
    }
  };

  const loginUser = async () => {
    try {
      const data = await requestJson<LoginResponse>("/api/users/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      localStorage.setItem("authToken", data.token);
      setLoggedInUserId(data.user.id);
      setPartnerUserId(
        (current) => current || `customer-${data.user.id.slice(0, 8)}`,
      );
      toast.success("Login successful.");
    } catch {
      toast.error("Login failed.");
    }
  };

  const toggleVegetable = (vegetable: string) => {
    setSelectedVegetables((prev) => {
      if (prev.includes(vegetable)) {
        return prev.filter((item) => item !== vegetable);
      }

      if (prev.length >= 4) {
        toast.warning("Select exactly 4 items.");
        return prev;
      }

      return [...prev, vegetable];
    });
  };

  const togglePositionCell = (cell: PositionCell) => {
    setPositionPair((prev) => {
      if (prev[0] === cell) {
        return [];
      }
      return [cell];
    });
  };

  const enrollVisualProfile = async () => {
    if (!token || !loggedInUserId) {
      toast.warning("Login first.");
      return;
    }

    if (!partnerUserId.trim()) {
      toast.error("Partner user ID is required.");
      return;
    }

    if (selectedVegetables.length !== 4) {
      toast.error("Choose exactly 4 items.");
      return;
    }

    const normalizedLetterOne = letterOne.trim().toUpperCase();
    const normalizedLetterTwo = letterTwo.trim().toUpperCase();

    if (
      !/^[A-Z]$/.test(normalizedLetterOne) ||
      !/^[A-Z]$/.test(normalizedLetterTwo)
    ) {
      toast.error("Each secret letter must be exactly one alphabet character.");
      return;
    }

    if (normalizedLetterOne === normalizedLetterTwo) {
      toast.error("Secret letters must be different.");
      return;
    }

    if (formulaMode === "POSITION_SUM" && positionPair.length !== 1) {
      toast.error("Select exactly 1 grid position for Position Sum mode.");
      return;
    }

    try {
      const data = await requestJson<EnrollResponse>(
        "/api/visual-password/enroll",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            partnerId,
            userId: partnerUserId.trim(),
            catalogType,
            secretVegetables: selectedVegetables,
            secretLetters: [normalizedLetterOne, normalizedLetterTwo],
            formulaMode,
            alphabetMode,
            ...(formulaMode === "SALT_ADD" ? { saltValue } : {}),
            ...(formulaMode === "POSITION_SUM" ? { positionPair } : {}),
          } satisfies {
            partnerId: string;
            userId: string;
            catalogType: CatalogType;
            secretVegetables: string[];
            secretLetters: string[];
            formulaMode: FormulaMode;
            alphabetMode: AlphabetMode;
            saltValue?: number;
            positionPair?: number[];
          }),
        },
      );

      window.localStorage.setItem(
        LAST_VISUAL_PROFILE_KEY,
        JSON.stringify({
          partnerId: data.partnerId,
          userId: data.userId,
        }),
      );
      toast.success(`Visual profile enrolled for partner user ${data.userId}.`);
    } catch (error) {
      toast.error(
        error instanceof HttpError ? error.message : "Enroll failed.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950 dark:bg-slate-950 dark:text-slate-50 relative overflow-x-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_50%_0%,rgba(120,119,198,0.1),transparent_50%)] dark:opacity-20" />
      
      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-12 sm:py-20">
        
        {/* Header Section */}
        <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="rounded-full border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400">
                ADMIN CONSOLE
              </Badge>
              <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
                USER ENROLLMENT
              </Badge>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              Visual Profile Setup
            </h1>
            <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-400">
              Configure security parameters, enroll users, and manage visual secrets for the cognitive airgap system.
            </p>
          </div>

          {token && (
            <div className="flex flex-wrap gap-3">
              <Button asChild size="sm" variant="outline" className="h-10 rounded-full border-slate-200 bg-white shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
                <Link href="/admin/dashboard" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Security Dashboard
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-10 rounded-full border-slate-200 bg-white shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
                <Link href="/admin/dashboard/partners" className="gap-2">
                  <Key className="h-4 w-4" />
                  API Keys
                </Link>
              </Button>
            </div>
          )}
        </section>

        <div className="grid gap-8 items-start lg:grid-cols-[1fr_2fr]">

          {/* Left Column: Auth (Sticky) */}
          <section className="space-y-6 lg:sticky lg:top-6">
            <Card className="border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                   <User className="h-5 w-5 text-indigo-500" />
                   Admin Access
                </CardTitle>
                <CardDescription>
                  Authenticate to modify visual profiles.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-slate-500">Name</label>
                  <Input
                    className="bg-slate-50 dark:bg-slate-950"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Admin Name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-slate-500">Email</label>
                  <Input
                    className="bg-slate-50 dark:bg-slate-950"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-slate-500">Password</label>
                  <Input
                    className="bg-slate-50 dark:bg-slate-950"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" onClick={registerUser} className="w-full">
                    Register
                  </Button>
                  <Button onClick={loginUser} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                    Login
                  </Button>
                </div>

                {loggedInUserId && (
                  <div className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div className="text-xs font-medium break-all">
                      Logged in as {loggedInUserId}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Right Column: Configuration */}
          <section className="space-y-6">
            <Card className="border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                   <Lock className="h-5 w-5 text-rose-500" />
                   Secret Configuration
                </CardTitle>
                <CardDescription>
                  Define the cognitive secrets for the user. Select exactly 4 items and 2 letters.
                </CardDescription>
              </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Catalog Type</label>
              <select
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                value={catalogType}
                onChange={(event) => {
                  setCatalogType(event.target.value as CatalogType);
                  setSelectedVegetables([]);
                  setPositionPair([1]);
                }}
              >
                <option value="VEGETABLE">Vegetables</option>
                <option value="CRICKETER">Cricketers</option>
                <option value="BOLLYWOOD">Bollywood Actors/Actresses</option>
              </select>
            </div>

            <div className="grid gap-3">
              <label className="text-sm font-medium">Partner ID</label>
              <Input
                value={partnerId}
                onChange={(event) => setPartnerId(event.target.value)}
              />
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium">Partner User ID</label>
              <Input
                value={partnerUserId}
                onChange={(event) => setPartnerUserId(event.target.value)}
                placeholder="customer-bank-001"
              />
            </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                     <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                       Select 4 Secret Items
                     </p>
                     <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        selectedVegetables.length === 4 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                     }`}>
                       {selectedVegetables.length} / 4 Selected
                     </span>
                  </div>
                  
                  {catalogItems.length === 0 && (
                    <div className="rounded-lg bg-rose-50 p-4 text-center text-sm text-rose-600 dark:bg-rose-900/20">
                      Catalog is empty. Ensure backend is running.
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                    {catalogItems.map((item) => {
                      const selected = selectedVegetables.includes(item.name);
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => toggleVegetable(item.name)}
                          className={`group relative overflow-hidden rounded-xl border text-left transition-all ${
                            selected 
                              ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500 ring-offset-2 dark:bg-emerald-900/20 dark:ring-offset-slate-900" 
                              : "border-slate-200 bg-white hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600"
                          }`}
                        >
                          <div className="aspect-[4/5] w-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                             <img
                               src={item.imageUrl}
                               alt={item.name}
                               className={`h-full w-full object-cover transition-transform duration-500 ${selected ? "scale-110" : "group-hover:scale-110"}`}
                               onError={(event) => onItemImageError(event, item.name)}
                               draggable={false}
                             />
                          </div>
                          
                          <div className={`absolute bottom-0 inset-x-0 p-2 text-xs font-semibold backdrop-blur-md ${
                             selected ? "bg-emerald-500/90 text-white" : "bg-white/90 text-slate-700 dark:bg-slate-900/90 dark:text-slate-200"
                          }`}>
                             {item.name}
                          </div>
                          
                          {selected && (
                             <div className="absolute top-2 right-2 rounded-full bg-emerald-500 p-0.5 text-white shadow-sm">
                                <CheckCircle2 className="h-4 w-4" />
                             </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                value={letterOne}
                onChange={(event) =>
                  setLetterOne(event.target.value.toUpperCase())
                }
                placeholder="First letter"
                maxLength={1}
              />
              <Input
                value={letterTwo}
                onChange={(event) =>
                  setLetterTwo(event.target.value.toUpperCase())
                }
                placeholder="Second letter"
                maxLength={1}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium">
                Formula Mode
                <select
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                  value={formulaMode}
                  onChange={(event) =>
                    setFormulaMode(event.target.value as FormulaMode)
                  }
                >
                  <option value="SALT_ADD">Salt Add</option>
                  <option value="POSITION_SUM">Position Sum</option>
                  <option value="PAIR_SUM">Pair Sum</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium">
                Alphabet Mode
                <select
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                  value={alphabetMode}
                  onChange={(event) =>
                    setAlphabetMode(event.target.value as AlphabetMode)
                  }
                >
                  <option value="SEQUENTIAL">Sequential</option>
                  <option value="RANDOM">Random</option>
                </select>
              </label>

              {formulaMode === "SALT_ADD" ?
                <label className="grid gap-2 text-sm font-medium">
                  Salt Value
                  <select
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                    value={String(saltValue)}
                    onChange={(event) =>
                      setSaltValue(
                        Number(event.target.value) as 3 | 4 | 5 | 6 | 7,
                      )
                    }
                  >
                    {[3, 4, 5, 6, 7].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              : <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-700/60 dark:border-slate-600 dark:text-slate-400">
                  Salt value is hidden for this formula mode.
                </div>
              }
            </div>

            {formulaMode === "POSITION_SUM" ?
              <div className="space-y-3 rounded-lg border border-indigo-300/50 bg-indigo-50 p-4 dark:bg-indigo-900/20 dark:border-indigo-700/50">
                <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">
                  Position Grid Setup (3 rows x 6 columns)
                </p>
                <p className="text-xs text-indigo-800 dark:text-indigo-400">
                  Select exactly 1 fixed board cell. Login key = your secret
                  vegetable number + this cell number.
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {Array.from({ length: POSITION_GRID_TOTAL }, (_, index) => {
                    const cell = (index + 1) as PositionCell;
                    const selected = positionPair.includes(cell);
                    return (
                      <button
                        key={cell}
                        type="button"
                        onClick={() => togglePositionCell(cell)}
                        className={`rounded-md border px-2 py-2 text-xs font-semibold ${
                          selected ?
                            "border-indigo-600 bg-indigo-600 text-white"
                          : "border-indigo-300 bg-white text-indigo-900 hover:border-indigo-500 dark:bg-slate-700 dark:border-indigo-700 dark:text-indigo-100"
                        }`}
                      >
                        {getPositionCellLabel(cell)}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-900 dark:text-indigo-300">
                  <p>
                    Selected:{" "}
                    {positionPair.length ?
                      getPositionCellLabel(positionPair[0])
                    : "None"}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPositionPair([])}
                  >
                    Clear Positions
                  </Button>
                </div>
              </div>
            : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-emerald-300/50 bg-emerald-50 p-3 dark:bg-emerald-900/20 dark:border-emerald-700/50">
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                  Formula: {FORMULA_MODE_EXAMPLES[formulaMode].title}
                </p>
                <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-400">
                  {FORMULA_MODE_EXAMPLES[formulaMode].example}
                </p>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-500">
                  {FORMULA_MODE_EXAMPLES[formulaMode].note}
                </p>
              </div>
              <div className="rounded-lg border border-blue-300/50 bg-blue-50 p-3 dark:bg-blue-900/20 dark:border-blue-700/50">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                  Alphabet: {ALPHABET_MODE_EXAMPLES[alphabetMode].title}
                </p>
                <p className="mt-1 text-sm text-blue-800 dark:text-blue-400">
                  {ALPHABET_MODE_EXAMPLES[alphabetMode].example}
                </p>
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-500">
                  {ALPHABET_MODE_EXAMPLES[alphabetMode].note}
                </p>
              </div>
            </div>

                <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button size="lg" onClick={enrollVisualProfile} className="bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-indigo-500/10 dark:bg-white dark:text-slate-900">
                    <Shield className="mr-2 h-4 w-4" />
                    Save Visual Profile
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                    <Link
                      href={`/partner-live?partnerId=${encodeURIComponent(
                        partnerId.trim(),
                      )}&userId=${encodeURIComponent(partnerUserId.trim())}`}
                    >
                      Open Partner Flow
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}
