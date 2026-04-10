/**
 * Patient self-registration page.
 * Creates an account with conditions selected at signup.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Stethoscope, Check } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useAuthStore } from "../stores/auth.store";
import api from "../lib/api";
import { AuthTokens, ConditionType } from "../types";
import { CONDITION_LABELS } from "../lib/utils";

const signupSchema = z
  .object({
    firstName: z.string().min(1, "First name required"),
    lastName: z.string().min(1, "Last name required"),
    email: z.string().email("Valid email required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string(),
    phone: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupForm = z.infer<typeof signupSchema>;

const CONDITIONS: ConditionType[] = [
  "DIABETES_T1", "DIABETES_T2", "HYPERTENSION", "CKD",
  "HEART_DISEASE", "COPD", "ASTHMA",
];

export default function SignupPage() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [selectedConditions, setSelectedConditions] = useState<ConditionType[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({ resolver: zodResolver(signupSchema) });

  const toggleCondition = (c: ConditionType) => {
    setSelectedConditions((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const onSubmit = async (data: SignupForm) => {
    try {
      const res = await api.post<AuthTokens>("/auth/register", {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phone: data.phone,
        conditions: selectedConditions,
      });

      const { accessToken, refreshToken, user } = res.data;
      setAuth(accessToken, refreshToken, user);
      toast.success("Account created! Welcome to Arogya.");
      navigate("/patient/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Registration failed. Please try again.";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Arogya</h1>
            <p className="text-xs text-slate-500">Chronic Disease Management</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create your patient account</CardTitle>
            <CardDescription>
              Track your health conditions, medications, and consultations in one place
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" {...register("firstName")} aria-invalid={!!errors.firstName} />
                  {errors.firstName && <p className="text-xs text-red-600">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" {...register("lastName")} aria-invalid={!!errors.lastName} />
                  {errors.lastName && <p className="text-xs text-red-600">{errors.lastName.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" {...register("email")} aria-invalid={!!errors.email} />
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone number (optional)</Label>
                <Input id="phone" type="tel" placeholder="+91 98xxx xxxxx" {...register("phone")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...register("password")} aria-invalid={!!errors.password} />
                {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input id="confirmPassword" type="password" {...register("confirmPassword")} aria-invalid={!!errors.confirmPassword} />
                {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>}
              </div>

              {/* Conditions selection */}
              <div className="space-y-2">
                <Label>Your conditions (select all that apply)</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {CONDITIONS.map((c) => {
                    const selected = selectedConditions.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCondition(c)}
                        className={`
                          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                          ${selected
                            ? "bg-brand-500 text-white border-brand-500"
                            : "bg-white text-slate-700 border-slate-300 hover:border-brand-400"
                          }
                        `}
                        aria-pressed={selected}
                      >
                        {selected && <Check className="w-3 h-3" />}
                        {CONDITION_LABELS[c]}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500">You can add or change conditions later in your profile.</p>
              </div>

              <Button type="submit" className="w-full" loading={isSubmitting}>
                Create account
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link to="/login" className="text-brand-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
