/**
 * Patient — Profile page
 * Edit personal info, manage chronic conditions, view account details.
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, X, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import api from "../../lib/api";
import { ConditionType } from "../../types";
import { CONDITION_LABELS, CONDITION_COLORS } from "../../lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    abhaId: string | null;
    conditions: Array<{ id: string; conditionType: string }>;
  } | null;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say", ""]).optional(),
  abhaId: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const ALL_CONDITIONS: ConditionType[] = [
  "DIABETES_T1", "DIABETES_T2", "HYPERTENSION", "CKD",
  "HEART_DISEASE", "COPD", "ASTHMA", "OTHER",
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [addingCondition, setAddingCondition] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<ConditionType>("DIABETES_T2");

  const { data: userData, isLoading } = useQuery({
    queryKey: ["profile-me"],
    queryFn: () => api.get<UserProfile>("/profile/me").then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  // Populate form when data loads
  useEffect(() => {
    if (userData?.profile) {
      const p = userData.profile;
      reset({
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone ?? "",
        dateOfBirth: p.dateOfBirth
          ? p.dateOfBirth.split("T")[0]
          : "",
        gender: (p.gender as ProfileForm["gender"]) ?? "",
        abhaId: p.abhaId ?? "",
      });
    }
  }, [userData, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: ProfileForm) =>
      api.put("/profile/me", {
        ...data,
        gender: data.gender || undefined,
        abhaId: data.abhaId || undefined,
        phone: data.phone || undefined,
        dateOfBirth: data.dateOfBirth || undefined,
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["profile-me"] });
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const addConditionMutation = useMutation({
    mutationFn: (conditionType: ConditionType) =>
      api.post("/profile/me/conditions", { conditionType }),
    onSuccess: () => {
      toast.success("Condition added");
      setAddingCondition(false);
      queryClient.invalidateQueries({ queryKey: ["profile-me"] });
    },
    onError: () => toast.error("Failed to add condition — it may already be active"),
  });

  const removeConditionMutation = useMutation({
    mutationFn: (conditionId: string) =>
      api.delete(`/profile/me/conditions/${conditionId}`),
    onSuccess: () => {
      toast.success("Condition removed");
      queryClient.invalidateQueries({ queryKey: ["profile-me"] });
    },
    onError: () => toast.error("Failed to remove condition"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  const profile = userData?.profile;
  const activeConditions = profile?.conditions ?? [];
  const existingTypes = new Set(activeConditions.map((c) => c.conditionType));
  const availableConditions = ALL_CONDITIONS.filter((c) => !existingTypes.has(c));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your personal information and health conditions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Personal info form ── */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-4 h-4 text-brand-600" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4" noValidate>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="firstName">First name</Label>
                    <Input id="firstName" {...register("firstName")} />
                    {errors.firstName && (
                      <p className="text-xs text-red-600">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input id="lastName" {...register("lastName")} />
                    {errors.lastName && (
                      <p className="text-xs text-red-600">{errors.lastName.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input id="phone" type="tel" placeholder="+91 98xxx xxxxx" {...register("phone")} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dateOfBirth">Date of birth</Label>
                    <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      {...register("gender")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="abhaId">ABHA ID</Label>
                    <Input id="abhaId" placeholder="ABHA-XXXX-XXXX-XXXX" {...register("abhaId")} />
                  </div>
                </div>

                <Button
                  type="submit"
                  loading={isSubmitting || updateMutation.isPending}
                  disabled={!isDirty}
                >
                  Save changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Conditions + Account ── */}
        <div className="space-y-4">
          {/* Conditions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Health Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeConditions.length === 0 ? (
                <p className="text-xs text-slate-400">No conditions on record</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeConditions.map((c) => (
                    <span
                      key={c.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        CONDITION_COLORS[c.conditionType as ConditionType] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {CONDITION_LABELS[c.conditionType as ConditionType] ?? c.conditionType}
                      <button
                        onClick={() => removeConditionMutation.mutate(c.id)}
                        className="ml-1 hover:opacity-70"
                        aria-label="Remove condition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add condition */}
              {!addingCondition && availableConditions.length > 0 && (
                <button
                  onClick={() => setAddingCondition(true)}
                  className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800"
                >
                  <Plus className="w-3 h-3" /> Add condition
                </button>
              )}

              {addingCondition && (
                <div className="space-y-2">
                  <select
                    value={selectedCondition}
                    onChange={(e) => setSelectedCondition(e.target.value as ConditionType)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {availableConditions.map((c) => (
                      <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      loading={addConditionMutation.isPending}
                      onClick={() => addConditionMutation.mutate(selectedCondition)}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setAddingCondition(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-900 font-medium truncate ml-2">{userData?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Role</span>
                <Badge variant="outline">{userData?.role}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Member since</span>
                <span className="text-slate-700">
                  {userData?.createdAt
                    ? format(new Date(userData.createdAt), "MMM yyyy")
                    : "—"}
                </span>
              </div>
              {userData?.lastLoginAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Last login</span>
                  <span className="text-slate-700">
                    {format(new Date(userData.lastLoginAt), "dd MMM yyyy")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
