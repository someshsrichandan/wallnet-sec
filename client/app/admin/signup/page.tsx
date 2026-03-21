"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, User } from "lucide-react";

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
    <div className="min-h-dvh bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative selection:bg-indigo-100 selection:text-indigo-900">
      <div className="absolute inset-x-0 top-0 h-120 bg-[radial-gradient(ellipse_at_top,rgba(79,70,229,0.1)_0%,transparent_60%)] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 w-full max-w-110">
        <div className="flex justify-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-white text-lg font-bold shadow-xl shadow-slate-900/10">
            FS
          </div>
        </div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
          Create Your Account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Register and start using API keys and dashboard analytics.
        </p>
      </div>

      <div className="mt-8 mx-auto w-full max-w-110 relative z-10">
        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>
              Create a user account, then login to access the SaaS console.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-900 flex items-center gap-2">
                  <User className="h-3 w-3 text-slate-500" /> Full Name
                </label>
                <Input
                  name="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="bg-slate-50 text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-900 flex items-center gap-2">
                  <Mail className="h-3 w-3 text-slate-500" /> Work Email
                </label>
                <Input
                  name="email"
                  type="email"
                  placeholder="admin@partner.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="bg-slate-50 text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-900 flex items-center gap-2">
                  <Lock className="h-3 w-3 text-slate-500" /> Master Password
                </label>
                <Input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="bg-slate-50 text-sm"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white mt-6 group font-semibold"
                disabled={isLoading}
              >
                {isLoading ?
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Account...
                  </span>
                : <span className="flex items-center gap-2">
                    Register{" "}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                }
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-slate-100 bg-slate-50/50 p-4">
            <p className="text-sm text-slate-600">
              Already registered?{" "}
              <Link
                href="/admin/login"
                className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
