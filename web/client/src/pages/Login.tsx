/**
 * Login page — email + password auth.
 * On success, redirects to the user's role-specific dashboard.
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useAuthStore } from "../stores/auth.store";
import api from "../lib/api";
import { AuthTokens, Role } from "../types";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password required"),
});

type LoginForm = z.infer<typeof loginSchema>;

const ROLE_HOME: Record<Role, string> = {
  PATIENT: "/patient/dashboard",
  DOCTOR: "/doctor/dashboard",
  ADMIN: "/admin/dashboard",
};

export default function LoginPage() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await api.post<AuthTokens>("/auth/login", data);
      const { accessToken, refreshToken, user } = res.data;
      setAuth(accessToken, refreshToken, user);

      toast.success(`Welcome back, ${user.firstName}!`);
      navigate(from ?? ROLE_HOME[user.role], { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Login failed. Please check your credentials.";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="/arogya-icon.svg" alt="Arogya" className="w-10 h-10" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Arogya</h1>
            <p className="text-xs text-slate-500">Chronic Disease Management</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>
              Enter your email and password to access your portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...register("email")}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-xs text-red-600" role="alert">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register("password")}
                  aria-invalid={!!errors.password}
                />
                {errors.password && (
                  <p className="text-xs text-red-600" role="alert">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" loading={isSubmitting}>
                Sign in
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-slate-600">
              New patient?{" "}
              <Link to="/signup" className="text-brand-600 hover:underline font-medium">
                Create an account
              </Link>
            </p>

            {/* Demo credentials hint */}
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500 font-medium mb-1">Demo credentials:</p>
              <p className="text-xs text-slate-500">Patient: ravi.kumar@example.com / Patient@123</p>
              <p className="text-xs text-slate-500">Doctor: dr.sharma@arogya.health / Doctor@123</p>
              <p className="text-xs text-slate-500">Admin: admin@arogya.health / Admin@123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
