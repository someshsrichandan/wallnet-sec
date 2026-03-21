"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type SyntheticEvent,
} from "react";
import { toast } from "sonner";
import {
  Shield,
  Lock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
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
import { Spinner } from "@/components/ui/spinner";
import { HttpError, requestJson } from "@/lib/http";

type BoardCard = {
  name: string;
  number: number;
  imageUrl: string;
};

type ChallengeStage = "FRUIT" | "COGNITIVE";

type ChallengeResponse = {
  sessionToken: string;
  csrfNonce: string;
  expiresAt: string;
  maxAttempts: number;
  attempts: number;
  vegetables: BoardCard[];
  alphabetGrid: string[];
  keypadLayout: string[];
  requiresFullGrid: boolean;
  requiresFruitSelection: boolean;
  fruitSelectionComplete: boolean;
  stage: ChallengeStage;
};

type VerifyResponse = {
  result: "PASS" | "FAIL" | "FRUIT_OK";
  status: "PENDING" | "PASS" | "FAIL" | "LOCKED";
  stage?: "FRUIT" | "COGNITIVE" | "COMPLETE";
  fruitSelectionComplete?: boolean;
  honeypotDetected?: boolean;
  attempts: number;
  maxAttempts: number;
  remainingAttempts: number;
  verificationSignature?: string;
  partnerRedirectUrl?: string;
  expiresAt: string;
};

type PageProps = {
  params: Promise<{ sessionToken: string }>;
};

const buildInitialInputs = (letters: string[]) =>
  letters.reduce<Record<string, string>>((acc, letter) => {
    acc[letter] = "";
    return acc;
  }, {});

const shuffleArray = <T,>(arr: T[]): T[] => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const getItemFallbackDataUri = (itemName: string) => {
  const safeLabel =
    (itemName || "Item").replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 24) || "Item";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#334155"/><stop offset="100%" stop-color="#1e293b"/></linearGradient></defs><rect width="320" height="220" fill="url(#g)"/><rect x="10" y="10" width="300" height="200" rx="16" fill="#0f172a" stroke="#475569"/><text x="160" y="112" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#94a3b8">${safeLabel}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const onItemImageError = (
  event: SyntheticEvent<HTMLImageElement>,
  itemName: string,
) => {
  const image = event.currentTarget;
  image.onerror = null;
  image.src = getItemFallbackDataUri(itemName);
};

const buildWatermarkStyle = (label: string): CSSProperties => {
  const safeText = (label || "SECURE")
    .replace(/[^a-zA-Z0-9|: ._-]/g, "")
    .slice(0, 90);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="170" viewBox="0 0 280 170"><g transform="rotate(-28 140 85)"><text x="30" y="95" fill="#ffffff" fill-opacity="0.03" font-size="18" font-family="Arial, sans-serif">${safeText}</text></g></svg>`;

  return {
    backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`,
    backgroundRepeat: "repeat",
    backgroundSize: "280px 170px",
  };
};

const getResultTone = (result: VerifyResponse | null) => {
  if (!result) {
    return "border-slate-800 bg-slate-900/50 text-slate-300";
  }
  if (result.result === "PASS" || result.result === "FRUIT_OK") {
    return "border-emerald-500/40 bg-emerald-950/30 text-emerald-400";
  }
  return "border-rose-500/40 bg-rose-950/30 text-rose-400";
};

const getResultTitle = (result: VerifyResponse | null) => {
  if (!result) {
    return "";
  }
  if (result.result === "FRUIT_OK") {
    return "Fruit selected";
  }
  return result.result;
};

export default function VerifySessionPage({ params }: PageProps) {
  const [sessionToken, setSessionToken] = useState("");
  const [challenge, setChallenge] = useState<ChallengeResponse | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [activeLetter, setActiveLetter] = useState("");
  const [isObscured, setIsObscured] = useState(false);
  const [isCaptureShielded, setIsCaptureShielded] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false); // Renamed from submitting for clarity
  const [result, setResult] = useState<VerifyResponse | null>(null);

  // Duplicate handlers removed. The authoritative handlers are defined below the useEffects.
  const [loadingChallenge, setLoadingChallenge] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Removed duplicate result state
  const [watermarkTick, setWatermarkTick] = useState(() => Date.now());
  const captureShieldTimerRef = useRef<number | null>(null);

  // Client-side shuffled display orders (re-randomised on every challenge load)
  const [displayVegetables, setDisplayVegetables] = useState<
    ChallengeResponse["vegetables"]
  >([]);
  const [displayAlphabetGrid, setDisplayAlphabetGrid] = useState<string[]>([]);
  const [displayKeypad, setDisplayKeypad] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const { sessionToken: token } = await params;
      if (!isMounted) {
        return;
      }

      setSessionToken(token);
      setLoadingChallenge(true);
      try {
        const data = await requestJson<ChallengeResponse>(
          `/api/visual-password/v1/challenge/${encodeURIComponent(token)}`,
          { method: "GET" },
        );
        if (!isMounted) {
          return;
        }

        const normalizedChallenge: ChallengeResponse = {
          ...data,
          stage: data.stage === "COGNITIVE" ? "COGNITIVE" : "FRUIT",
        };
        setChallenge(normalizedChallenge);
        setResult(null);
        setInputs(buildInitialInputs(normalizedChallenge.alphabetGrid));

        // Shuffle display order client-side on every load for security
        setDisplayVegetables(shuffleArray(normalizedChallenge.vegetables));
        setDisplayAlphabetGrid(shuffleArray(normalizedChallenge.alphabetGrid));
        setDisplayKeypad(shuffleArray(normalizedChallenge.keypadLayout));

        // Alphabet stage is always unlocked — board is reference-only
        setActiveLetter(normalizedChallenge.alphabetGrid[0] || "");
      } catch (error) {
        if (error instanceof HttpError) {
          toast.error(error.message);
        } else {
          toast.error("Unable to load challenge.");
        }
      } finally {
        if (isMounted) {
          setLoadingChallenge(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [params]);

  useEffect(() => {
    const triggerCaptureShield = (durationMs = 2000) => {
      if (captureShieldTimerRef.current) {
        window.clearTimeout(captureShieldTimerRef.current);
      }

      setIsCaptureShielded(true);
      captureShieldTimerRef.current = window.setTimeout(() => {
        setIsCaptureShielded(false);
      }, durationMs);
    };

    const updateObscured = () => {
      const hidden = document.visibilityState !== "visible";
      const focused =
        typeof document.hasFocus === "function" ? document.hasFocus() : true;
      setIsObscured(hidden || !focused);
    };

    const blockNativeEvent = (event: Event) => {
      event.preventDefault();
    };

    const isBlockedShortcut = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const screenshotShortcut =
        key === "printscreen" ||
        (event.altKey && key === "printscreen") ||
        (event.metaKey && event.shiftKey && ["3", "4", "5"].includes(key)) ||
        (event.ctrlKey && event.shiftKey && key === "s");
      const inspectionShortcut =
        key === "f12" ||
        (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key));
      const exportShortcut =
        (event.metaKey || event.ctrlKey) && ["p", "s"].includes(key);
      return screenshotShortcut || inspectionShortcut || exportShortcut;
    };

    const onCaptureShortcut = (event: KeyboardEvent) => {
      if (!isBlockedShortcut(event)) {
        return;
      }

      const key = event.key.toLowerCase();
      event.preventDefault();
      event.stopPropagation();
      if (key === "printscreen" && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText("").catch(() => {});
      }
      triggerCaptureShield();
      toast.warning(
        "Screen capture and export shortcuts are blocked on this screen.",
      );
    };

    const onBeforePrint = (event: Event) => {
      event.preventDefault();
      triggerCaptureShield();
      toast.warning("Printing is blocked on this verification screen.");
    };

    const mediaDevicesWithDisplayCapture =
      navigator.mediaDevices as MediaDevices & {
        getDisplayMedia?: (
          options?: DisplayMediaStreamOptions,
        ) => Promise<MediaStream>;
      };
    const originalGetDisplayMedia =
      mediaDevicesWithDisplayCapture?.getDisplayMedia ?
        mediaDevicesWithDisplayCapture.getDisplayMedia.bind(
          mediaDevicesWithDisplayCapture,
        )
      : undefined;
    if (originalGetDisplayMedia) {
      try {
        Object.defineProperty(
          mediaDevicesWithDisplayCapture,
          "getDisplayMedia",
          {
            configurable: true,
            value: () => {
              triggerCaptureShield();
              toast.warning(
                "Screen sharing is blocked on this verification screen.",
              );
              return Promise.reject(
                new Error(
                  "Screen sharing is disabled on this secure verification page.",
                ),
              );
            },
          },
        );
      } catch {
        // Browser may mark this API as non-configurable.
      }
    }

    const globalWindow = window as Window & {
      MediaRecorder?: typeof MediaRecorder;
    };
    const originalMediaRecorder = globalWindow.MediaRecorder;
    if (originalMediaRecorder) {
      try {
        Object.defineProperty(globalWindow, "MediaRecorder", {
          configurable: true,
          value: function BlockedMediaRecorder() {
            triggerCaptureShield();
            toast.warning(
              "Screen recording is blocked on this verification screen.",
            );
            throw new Error(
              "Screen recording is disabled on this secure verification page.",
            );
          } as unknown as typeof MediaRecorder,
        });
      } catch {
        // Browser may block override.
      }
    }

    updateObscured();
    const watermarkInterval = window.setInterval(() => {
      setWatermarkTick(Date.now());
    }, 12000);

    document.addEventListener("contextmenu", blockNativeEvent);
    document.addEventListener("copy", blockNativeEvent);
    document.addEventListener("cut", blockNativeEvent);
    document.addEventListener("dragstart", blockNativeEvent);
    document.addEventListener("selectstart", blockNativeEvent);
    document.addEventListener("keydown", onCaptureShortcut, true);
    document.addEventListener("keyup", onCaptureShortcut, true);
    document.addEventListener("visibilitychange", updateObscured);
    window.addEventListener("blur", updateObscured);
    window.addEventListener("focus", updateObscured);
    window.addEventListener("beforeprint", onBeforePrint);

    return () => {
      if (captureShieldTimerRef.current) {
        window.clearTimeout(captureShieldTimerRef.current);
      }

      if (originalGetDisplayMedia) {
        try {
          Object.defineProperty(
            mediaDevicesWithDisplayCapture,
            "getDisplayMedia",
            {
              configurable: true,
              value: originalGetDisplayMedia,
            },
          );
        } catch {
          // Ignore restore failures.
        }
      }

      if (originalMediaRecorder) {
        try {
          Object.defineProperty(globalWindow, "MediaRecorder", {
            configurable: true,
            value: originalMediaRecorder,
          });
        } catch {
          // Ignore restore failures.
        }
      }

      window.clearInterval(watermarkInterval);
      document.removeEventListener("contextmenu", blockNativeEvent);
      document.removeEventListener("copy", blockNativeEvent);
      document.removeEventListener("cut", blockNativeEvent);
      document.removeEventListener("dragstart", blockNativeEvent);
      document.removeEventListener("selectstart", blockNativeEvent);
      document.removeEventListener("keydown", onCaptureShortcut, true);
      document.removeEventListener("keyup", onCaptureShortcut, true);
      document.removeEventListener("visibilitychange", updateObscured);
      window.removeEventListener("blur", updateObscured);
      window.removeEventListener("focus", updateObscured);
      window.removeEventListener("beforeprint", onBeforePrint);
    };
  }, []);

  const allBoxesFilled = useMemo(() => {
    if (!challenge) return false;
    return challenge.alphabetGrid.every((letter) =>
      /^[0-9]$/.test(inputs[letter] || ""),
    );
  }, [challenge, inputs]);

  const watermarkStyle = useMemo(() => {
    const timePart = new Date(watermarkTick).toLocaleTimeString();
    return buildWatermarkStyle(`Protected ${timePart}`);
  }, [watermarkTick]);

  // Manual alphabet letter selection is disabled.
  // The active letter is auto-selected in random order by handleNumberClick.

  const handleNumberClick = (digit: number) => {
    if (!challenge || !activeLetter) return;

    const digitStr = digit.toString();
    setInputs((prev) => {
      const next = { ...prev, [activeLetter]: digitStr };
      return next;
    });

    // Random auto-advance to an UNFILLED letter
    const allLetters = challenge.alphabetGrid;
    const currentlyFilled = { ...inputs, [activeLetter]: digitStr };
    const remaining = allLetters.filter((l) => !currentlyFilled[l]);

    if (remaining.length > 0) {
      const randomNext =
        remaining[Math.floor(Math.random() * remaining.length)];
      setActiveLetter(randomNext);
    } else {
      setActiveLetter(""); // All done
    }
  };
  const inputClear = () => {
    if (!challenge) return;

    // Reset all letter inputs and restart filling from a random letter
    setInputs(buildInitialInputs(challenge.alphabetGrid));
    const randomStart =
      challenge.alphabetGrid[
        Math.floor(Math.random() * challenge.alphabetGrid.length)
      ] || "";
    setActiveLetter(randomStart);
  };

  const verify = async () => {
    if (!challenge || !sessionToken) return;

    // Check if all inputs are filled
    const allFilled = challenge.alphabetGrid.every(
      (letter) => !!inputs[letter],
    );
    if (!allFilled) {
      toast.warning("Please fill in values for all letters.");
      return;
    }

    setIsVerifying(true);
    try {
      const data = await requestJson<VerifyResponse>(
        "/api/visual-password/v1/verify",
        {
          method: "POST",
          body: JSON.stringify({
            sessionToken,
            csrfNonce: challenge.csrfNonce,
            inputs,
          }),
        },
      );
      setResult(data);

      if (data.result === "PASS") {
        toast.success("Verification successful.");
        if (data.partnerRedirectUrl) {
          setTimeout(
            () => window.location.assign(data.partnerRedirectUrl!),
            1000,
          );
        }
      } else if (data.status === "LOCKED") {
        toast.error("Session locked.");
        if (data.partnerRedirectUrl) {
          setTimeout(
            () => window.location.assign(data.partnerRedirectUrl!),
            600,
          );
        }
      } else {
        toast.error(
          `Verification failed. Remaining attempts: ${data.remainingAttempts}`,
        );
      }
    } catch (error) {
      if (error instanceof HttpError) {
        toast.error(error.message);
      } else {
        toast.error("Unable to submit verification.");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  if (loadingChallenge) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <Spinner className="h-8 w-8 border-indigo-600/30 border-t-indigo-600" />
        <span className="ml-3 font-mono text-sm tracking-wider font-medium text-indigo-900">
          SECURE_CHANNEL_INIT...
        </span>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-14 text-slate-900">
        <main className="mx-auto max-w-2xl space-y-4">
          <Alert className="border-rose-200 bg-rose-50 text-rose-800">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <AlertTitle>Session Invalid</AlertTitle>
            <AlertDescription>
              This secure session has expired or is invalid.
            </AlertDescription>
          </Alert>
          <Button
            asChild
            variant="secondary"
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-900"
          >
            <Link href="/partner-live">Return to Partner</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen select-none bg-[#f8fafc] text-slate-900 font-sans"
      style={{
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-10 opacity-[0.03]"
        style={{
          ...watermarkStyle,
          filter: "invert(1)", // Invert the watermark to be dark text since the original SVG was white
        }}
      />
      {isObscured || isCaptureShielded ?
        <div
          aria-hidden
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm"
        >
          <div className="text-center p-8 bg-white rounded-2xl shadow-2xl">
            <Lock className="mx-auto h-12 w-12 text-rose-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-900">
              Security Shield Active
            </h2>
            <p className="text-slate-500 mt-2">Screen capture is disabled.</p>
          </div>
        </div>
      : null}

      <main className="relative z-20 mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3 border border-slate-200 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-slate-700 mb-1">
                <Shield className="h-4 w-4 fill-slate-200" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                  Secure Verification
                </span>
                <div className="h-3 w-px bg-slate-200 mx-2" />
                <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Encrypted
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Visual Verification
              </h1>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1 text-[10px] font-mono text-slate-500">
              <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                ID: {sessionToken.slice(0, 8)}...
              </span>
              <span className="text-rose-600 font-medium bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Expires {new Date(challenge.expiresAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Reference Board - Light Theme */}
          <Card className="border-slate-200 bg-white shadow-sm relative overflow-hidden group/board box-border">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-3 relative z-10">
              <CardTitle className="flex items-center gap-2 text-slate-800 text-sm">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-900 text-white shadow-sm">
                  <span className="font-bold text-xs">1</span>
                </div>
                <div>
                  <span className="block text-sm">Reference Grid</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 relative z-10">
              <div className="grid grid-cols-3 gap-3">
                {displayVegetables.map((item) => (
                  <div
                    key={`${item.name}-${item.number}`}
                    className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-[3px] bg-slate-100 mb-1.5 border border-slate-200 relative group-hover/board:border-slate-300">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover object-center"
                        onError={(event) => onItemImageError(event, item.name)}
                        draggable={false}
                      />
                      <div className="absolute top-1.5 right-1.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] bg-slate-900 text-[10px] font-bold text-white shadow-sm">
                          {item.number}
                        </span>
                      </div>
                    </div>
                    <div className="text-center px-1 pb-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate w-full">
                        {item.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* Result Status */}
            {result && (
              <Alert
                className={`border shadow-sm transform transition-all animate-in fade-in slide-in-from-top-4 ${
                  result.result === "PASS" ?
                    "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-rose-200 bg-rose-50 text-rose-900"
                }`}
              >
                {result.result === "PASS" ?
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                : <AlertTriangle className="h-5 w-5 text-rose-600" />}
                <AlertTitle className="font-bold">
                  {result.result === "PASS" ? "Success" : "Verification Failed"}
                </AlertTitle>
                <AlertDescription className="text-sm font-medium opacity-90">
                  {result.result === "PASS" ?
                    "Redirecting securely..."
                  : `Remaining attempts: ${result.remainingAttempts}`}
                </AlertDescription>
              </Alert>
            )}

            {/* Input Panel - Premium Light Theme */}
            <Card className="border-slate-200 bg-white shadow-sm overflow-hidden relative">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-3 relative">
                <CardTitle className="flex items-center gap-2 text-slate-800 text-sm">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-900 text-white shadow-sm">
                    <span className="font-bold text-xs">2</span>
                  </div>
                  <span className="block text-sm">Input Challenge</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 relative">
                {/* Alphabet Strip */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      Step A: Calculate Values
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-1.5 justify-center bg-slate-50 p-2.5 rounded-lg border border-slate-200 relative">

                    {displayAlphabetGrid.map((letter) => {
                      const isFilled = !!inputs[letter];
                      const isActive = activeLetter === letter;
                      const inputValue = inputs[letter];

                      return (
                        <div key={letter} className="relative group">
                          <div
                            className={`min-w-[3rem] h-9 px-2 rounded-md border-b-2 text-sm font-bold transition-all flex items-center justify-center gap-1 cursor-default ${
                              isActive ?
                                "bg-slate-900 border-slate-900 text-white shadow-sm z-10"
                              : isFilled ?
                                "bg-slate-100 border-emerald-500 text-emerald-700"
                              : "bg-white border-slate-300 text-slate-500"
                            }`}
                          >
                            <span>{letter}</span>
                            {isFilled && (
                              <>
                                <span className="opacity-50">:</span>
                                <span
                                  className={`font-black ${isActive ? "text-white" : "text-emerald-600"}`}
                                >
                                  {inputValue}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Keypad */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      Step B: Enter Value{" "}
                      {activeLetter ? `for ${activeLetter}` : ""}
                    </label>
                    {activeLetter && (
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded inline-block">
                        Ready for {activeLetter}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 max-w-[220px] mx-auto p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                    {displayKeypad.map((digit) => (
                      <button
                        key={digit}
                        onClick={() => handleNumberClick(parseInt(digit, 10))}
                        className="h-10 w-full rounded-md bg-slate-50 text-base font-bold text-slate-800 border-b-2 border-slate-300 hover:bg-slate-100 hover:border-slate-400 active:border-b-0 active:translate-y-[1px] transition-all"
                      >
                        {digit}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={inputClear}
                    className="mx-auto flex items-center gap-1 mt-2 px-4 py-1.5 rounded-md bg-slate-100 text-[11px] font-bold text-slate-600 hover:bg-slate-200 transition-all border border-slate-200"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                    Clear
                  </button>
                </div>

                <Button
                  onClick={verify}
                  disabled={isVerifying}
                  className="w-full h-11 text-base font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all duration-200"
                >
                  {isVerifying ?
                    <span className="flex items-center gap-2">
                      <Spinner className="border-white/30 border-t-white h-4 w-4" />{" "}
                      Verifying...
                    </span>
                  : "Verify Identity"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
