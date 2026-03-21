"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Shield, ArrowRight } from "lucide-react";

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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative selection:bg-indigo-100 selection:text-indigo-900">
      <div className="absolute inset-x-0 top-0 h-120 bg-[radial-gradient(circle_at_50%_0%,rgba(120,119,198,0.1),transparent_50%)] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-white text-lg font-bold shadow-xl shadow-slate-900/10">
            FS
          </div>
        </div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
          Partner Console
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Login to manage API keys, visual profiles, and dashboard analytics.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle>Secure Login</CardTitle>
            <CardDescription>
              Sign in with your admin account credentials.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-500" /> Email Address
                </label>
                <Input
                  type="email"
                  placeholder="admin@partner.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-slate-500" /> Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-50"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white mt-6 group"
                disabled={isLoading}
              >
                {isLoading ?
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </span>
                : <span className="flex items-center gap-2">
                    Sign in to Console{" "}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                }
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-slate-100 bg-slate-50/50 p-4">
            <p className="text-sm text-slate-600">
              New user?{" "}
              <Link
                href="/admin/signup"
                className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
              >
                Register here
              </Link>
            </p>
          </CardFooter>
        </Card>

        {/* Security Badges */}
        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <Shield className="h-4 w-4" /> SMS Verified
          </span>
          <span className="flex items-center gap-1">
            <Lock className="h-4 w-4" /> 256-bit Encrypted
          </span>
        </div>
      </div>
    </div>
  );
}
