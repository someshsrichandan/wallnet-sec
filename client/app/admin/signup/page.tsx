"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, User, Shield, CheckCircle2, Eye, EyeOff } from "lucide-react";

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

export default function AdminSignup() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(formData).some((v) => !v)) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      setIsLoading(true);
      await requestJson("/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      toast.success("Account created successfully. Please sign in.");
      router.push("/admin/login");
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) {
        toast.error("Email is already registered. Please sign in.");
      } else {
        toast.error(error instanceof Error ? error.message : "Signup failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-primary/10 selection:text-primary">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_20%,var(--background)_100%)]" />
      </div>

      <div className="w-full max-w-lg relative z-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center">
            <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-black shadow-2xl shadow-primary/20 transition-transform hover:scale-105">
              WN
            </div>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Join WallNet-Sec
          </h2>
          <p className="text-muted-foreground text-sm font-medium max-w-sm mx-auto">
            Secure your banking platform with our visual password infrastructure.
          </p>
        </div>

        <Card className="border-border/40 bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
          <CardHeader className="space-y-1 pt-8">
            <CardTitle className="text-2xl font-bold">Create Partner Account</CardTitle>
            <CardDescription className="text-muted-foreground">
              Register to access the developer console and API keys.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2 px-1">
                    <User className="h-4 w-4 text-primary" /> Full Name
                  </label>
                  <Input
                    name="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="h-12 bg-background/50 border-muted focus:border-primary focus:ring-primary/20 transition-all pl-3"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2 px-1">
                    <Mail className="h-4 w-4 text-primary" /> Work Email
                  </label>
                  <Input
                    name="email"
                    type="email"
                    placeholder="admin@partner.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="h-12 bg-background/50 border-muted focus:border-primary focus:ring-primary/20 transition-all pl-3"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2 px-1">
                    <Lock className="h-4 w-4 text-primary" /> Master Password
                  </label>
                  <div className="relative">
                    <Input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={isLoading}
                      className="h-12 bg-background/50 border-muted focus:border-primary focus:ring-primary/20 transition-all pl-3 pr-12"
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
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-2 text-xs text-muted-foreground px-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>I agree to the <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.</span>
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
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 border-t border-border/40 bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have a partner account?{" "}
              <Link
                href="/admin/login"
                className="font-bold text-primary hover:text-primary/80 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm space-y-2">
            <Shield className="h-5 w-5 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Security Built-in</h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed">Multi-layer encryption for all partner data and API communications.</p>
          </div>
          <div className="p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm space-y-2">
            <div className="h-5 w-5 flex items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">API</div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Instant Access</h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed">Get your production API keys immediately after account verification.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
