"use client";

import Link from "next/link";
import { useEffect, useState, type SyntheticEvent } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Key,
  Shield,
  Lock,
  ArrowRight,
  CheckCircle2,
  ClipboardCopy,
  RefreshCw,
  RotateCcw,
  Trash2,
  Rocket,
  LogOut,
} from "lucide-react";

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

type PartnerKeyInfo = {
  _id: string;
  partnerId: string;
  label: string;
  apiKey: string;
  apiKeyPreview: string;
  mode: string;
  active: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
};

type NewKeyResponse = {
  id: string;
  partnerId: string;
  label: string;
  apiKey: string;
  mode: string;
  createdAt: string;
  message: string;
};
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
  const [keysLoading, setKeysLoading] = useState(false);
  const [keys, setKeys] = useState<PartnerKeyInfo[]>([]);
  const [newKeyPartnerId, setNewKeyPartnerId] = useState("hdfc_bank");
  const [newKeyLabel, setNewKeyLabel] = useState("Primary Live Key");
  const [newKeyMode, setNewKeyMode] = useState<"test" | "live">("live");
  const [creatingKey, setCreatingKey] = useState(false);
  const [revealedKey, setRevealedKey] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("authToken");
    if (stored) setToken(stored);
  }, []);

  const loadPartnerKeys = async (authToken: string) => {
    if (!authToken) {
      return;
    }

    try {
      setKeysLoading(true);
      const data = await requestJson<{ keys: PartnerKeyInfo[] }>(
        "/api/partners/keys",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );
      setKeys(data.keys || []);
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) {
        localStorage.removeItem("authToken");
        setToken("");
        setLoggedInUserId("");
        toast.error("Session expired. Login again.");
      } else {
        toast.error("Unable to load API keys.");
      }
    } finally {
      setKeysLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      void loadPartnerKeys(token);
    }
  }, [token]);

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
      setName(data.user.name || name);
      setEmail(data.user.email || email);
      setPartnerUserId(
        (current) => current || `customer-${data.user.id.slice(0, 8)}`,
      );
      void loadPartnerKeys(data.token);
      toast.success("Login successful.");
    } catch {
      toast.error("Login failed.");
    }
  };

  const logoutUser = () => {
    localStorage.removeItem("authToken");
    setToken("");
    setLoggedInUserId("");
    setKeys([]);
    setRevealedKey("");
    toast.success("Logged out.");
  };

  const createApiKey = async () => {
    if (!token) {
      toast.error("Please login first.");
      return;
    }

    if (!newKeyPartnerId.trim() || !newKeyLabel.trim()) {
      toast.error("Partner ID and key label are required.");
      return;
    }

    try {
      setCreatingKey(true);
      const data = await requestJson<NewKeyResponse>("/api/partners/keys", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          partnerId: newKeyPartnerId.trim(),
          label: newKeyLabel.trim(),
          mode: newKeyMode,
        }),
      });
      setRevealedKey(data.apiKey);
      toast.success("API key generated. Copy it now.");
      await loadPartnerKeys(token);
    } catch (error) {
      toast.error(
        error instanceof HttpError ?
          error.message
        : "Failed to create API key.",
      );
    } finally {
      setCreatingKey(false);
    }
  };

  const rotateApiKey = async (keyId: string) => {
    if (!token) {
      return;
    }

    try {
      const data = await requestJson<{ apiKey: string }>(
        `/api/partners/keys/${keyId}/rotate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setRevealedKey(data.apiKey);
      toast.success("API key rotated. Copy the new key.");
      await loadPartnerKeys(token);
    } catch (error) {
      toast.error(
        error instanceof HttpError ?
          error.message
        : "Failed to rotate API key.",
      );
    }
  };

  const revokeApiKey = async (keyId: string) => {
    if (!token) {
      return;
    }

    try {
      await requestJson(`/api/partners/keys/${keyId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success("API key revoked.");
      await loadPartnerKeys(token);
    } catch (error) {
      toast.error(
        error instanceof HttpError ?
          error.message
        : "Failed to revoke API key.",
      );
    }
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Copy failed.");
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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-120 bg-[radial-gradient(circle_at_50%_0%,rgba(120,119,198,0.1),transparent_50%)] dark:opacity-20" />

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-12 sm:py-20">
        {/* Header Section */}
        <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="rounded-full border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400"
              >
                ADMIN CONSOLE
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
              >
                USER ENROLLMENT
              </Badge>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              Visual Profile Setup
            </h1>
            <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-400">
              Configure security parameters, enroll users, and manage visual
              secrets for the cognitive airgap system.
            </p>
          </div>

          {token ?
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-10 rounded-full border-slate-200 bg-white shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <Link href="/admin/dashboard" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Security Dashboard
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-10 rounded-full border-slate-200 bg-white shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <Link href="/admin/dashboard/partners" className="gap-2">
                  <Key className="h-4 w-4" />
                  API Keys
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={logoutUser}
                className="h-10 rounded-full border-rose-200 bg-white text-rose-700 shadow-sm hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          : <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-10 rounded-full border-slate-200 bg-white shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <Link href="/admin/signup">Create Admin Account</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="h-10 rounded-full bg-slate-900 px-5 text-white hover:bg-slate-800"
              >
                <Link href="/admin/login">Login to SaaS Console</Link>
              </Button>
            </div>
          }
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">SaaS Workflow</CardTitle>
              <CardDescription>
                Use this sequence like a real partner onboarding flow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <p>1. Signup/Login with admin account</p>
              <p>2. Create API keys (test/live)</p>
              <p>3. Enroll visual profiles</p>
              <p>4. Test integration with Demo Bank/Ecommerce apps</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Demo Launchers</CardTitle>
              <CardDescription>Test your integration quickly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                asChild
                variant="outline"
                className="w-full justify-start"
              >
                <Link href={`http://localhost:3002`}>
                  <Rocket className="mr-2 h-4 w-4" />
                  Open Demo Bank
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start"
              >
                <Link href={`http://localhost:3003`}>
                  <Rocket className="mr-2 h-4 w-4" />
                  Open Demo Ecommerce
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">API Keys (Quick)</CardTitle>
              <CardDescription>
                Create and rotate keys directly from this page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!token ?
                <Alert>
                  <AlertTitle>Login Required</AlertTitle>
                  <AlertDescription>
                    Sign in to create and manage API keys.
                  </AlertDescription>
                </Alert>
              : <>
                  <Input
                    value={newKeyPartnerId}
                    onChange={(event) => setNewKeyPartnerId(event.target.value)}
                    placeholder="Partner ID"
                  />
                  <Input
                    value={newKeyLabel}
                    onChange={(event) => setNewKeyLabel(event.target.value)}
                    placeholder="Key Label"
                  />
                  <select
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                    value={newKeyMode}
                    onChange={(event) =>
                      setNewKeyMode(event.target.value as "test" | "live")
                    }
                  >
                    <option value="test">Test Mode</option>
                    <option value="live">Live Mode</option>
                  </select>
                  <Button
                    className="w-full"
                    onClick={createApiKey}
                    disabled={creatingKey}
                  >
                    {creatingKey ?
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    : <>
                        <Key className="mr-2 h-4 w-4" />
                        Create API Key
                      </>
                    }
                  </Button>
                  {revealedKey ?
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                      <div className="mb-2 font-semibold">
                        Copy this key now (shown once)
                      </div>
                      <div className="break-all font-mono">{revealedKey}</div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => copyText(revealedKey)}
                      >
                        <ClipboardCopy className="mr-2 h-3.5 w-3.5" />
                        Copy Key
                      </Button>
                    </div>
                  : null}
                </>
              }
            </CardContent>
          </Card>
        </section>

        {token ?
          <section>
            <Card className="border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-lg">
                  <span>Recent API Keys</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadPartnerKeys(token)}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${keysLoading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </CardTitle>
                <CardDescription>
                  Real SaaS style key management overview.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {keys.length === 0 ?
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No keys yet. Create your first key above.
                  </p>
                : keys.slice(0, 4).map((item, index) => (
                    <div
                      key={item._id?.toString() || item.id || index}
                      className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.label}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {item.partnerId} • {item.mode.toUpperCase()} •{" "}
                          {item.apiKey}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => rotateApiKey(item._id)}
                        >
                          <RotateCcw className="mr-2 h-3.5 w-3.5" />
                          Rotate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokeApiKey(item._id)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Revoke
                        </Button>
                      </div>
                    </div>
                  ))
                }
                <Button asChild variant="outline" className="w-full">
                  <Link href="/admin/dashboard/partners">
                    Open Full API Key Manager
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        : null}

        <section>
          <Card className="border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="text-xl">
                Secret Configuration Moved
              </CardTitle>
              <CardDescription>
                Secret profile setup is handled through enrollment and
                verification routes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                asChild
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                <Link href="/admin/dashboard">
                  Open Security Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
