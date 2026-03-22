"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Shield, ArrowRight, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { HttpError, requestJson } from "@/lib/http";

type LoginResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in email and password.");
      return;
    }

    try {
      setIsLoading(true);
      const data = await requestJson<LoginResponse>("/api/users/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      localStorage.setItem("authToken", data.token);
      localStorage.setItem(
        "adminUser",
        JSON.stringify({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
        }),
      );
      toast.success(`Welcome back, ${data.user.name}`);
      router.push("/admin/dashboard");
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) {
        toast.error("Invalid email or password.");
      } else {
        toast.error(error instanceof Error ? error.message : "Login failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-primary/10 selection:text-primary">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_20%,var(--background)_100%)]" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-black shadow-2xl shadow-primary/20 transition-transform hover:scale-105">
              FS
            </div>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Partner Console
          </h2>
          <p className="text-muted-foreground text-sm font-medium">
            Login to your visual security command center
          </p>
        </div>

        <Card className="border-border/40 bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
          <CardHeader className="space-y-1 pt-8">
            <CardTitle className="text-2xl font-bold">Secure Sign In</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your credentials to access the partner dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2 px-1">
                  <Mail className="h-4 w-4 text-primary" /> Email Address
                </label>
                <div className="relative group">
                  <Input
                    type="email"
                    placeholder="admin@partner.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="h-12 bg-background/50 border-muted focus:border-primary focus:ring-primary/20 transition-all pl-3"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" /> Password
                  </label>
                  <Link 
                    href="/forgot-password" 
                    className="text-xs font-medium text-primary hover:underline underline-offset-4"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-12 bg-background/50 border-muted focus:border-primary focus:ring-primary/20 transition-all pr-12 pl-3"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground mt-4 group relative overflow-hidden transition-all active:scale-[0.98]"
                disabled={isLoading}
              >
                <span className="relative z-10 flex items-center justify-center gap-2 font-bold text-base">
                  {isLoading ? (
                    <>
                      <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Sign in to Console
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 border-t border-border/40 bg-muted/30 p-6">
            <p className="text-sm text-muted-foreground text-center">
              New to WallNet-Sec?{" "}
              <Link
                href="/admin/signup"
                className="font-bold text-primary hover:text-primary/80 transition-colors"
              >
                Create an account
              </Link>
            </p>
          </CardFooter>
        </Card>

        {/* Security Trust Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 pt-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <span>Enterprise Visual MFA</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center">
              <Lock className="h-4 w-4 text-primary" />
            </div>
            <span>TLS 1.3 Encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}
