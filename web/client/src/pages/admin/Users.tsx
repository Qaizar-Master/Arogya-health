/**
 * Admin — Users page
 * Paginated user list with search, role filter, role change, and activate/deactivate.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import api from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "PATIENT" | "DOCTOR" | "ADMIN";

interface UserRow {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  profile: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    speciality: string | null;
  } | null;
}

interface UsersResponse {
  users: UserRow[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

const ROLE_BADGE: Record<Role, string> = {
  PATIENT: "bg-blue-100 text-blue-800",
  DOCTOR: "bg-purple-100 text-purple-800",
  ADMIN: "bg-slate-100 text-slate-800",
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const LIMIT = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search, roleFilter, page],
    queryFn: () =>
      api
        .get<UsersResponse>("/admin/users", {
          params: { search: search || undefined, role: roleFilter || undefined, page, limit: LIMIT },
        })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: body }: { id: string; data: { role?: Role; isActive?: boolean } }) =>
      api.put(`/admin/users/${id}`, body),
    onSuccess: () => {
      toast.success("User updated");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => toast.error("Failed to update user"),
  });

  const { users = [], pagination } = data ?? { users: [], pagination: null };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleRoleFilter = (val: Role | "") => {
    setRoleFilter(val);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-slate-500 text-sm mt-1">
          {pagination ? `${pagination.total} total users` : "Loading…"}
        </p>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name or email…"
            className="pl-9"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(["", "PATIENT", "DOCTOR", "ADMIN"] as const).map((r) => (
            <button
              key={r}
              onClick={() => handleRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                roleFilter === r
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              {r === "" ? "All roles" : r}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                      Last Login
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                      Joined
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">
                            {user.profile?.firstName || user.profile?.lastName
                              ? `${user.profile.firstName ?? ""} ${user.profile.lastName ?? ""}`.trim()
                              : "—"}
                          </p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                          {user.profile?.speciality && (
                            <p className="text-xs text-slate-400">{user.profile.speciality}</p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={(e) =>
                            updateMutation.mutate({
                              id: user.id,
                              data: { role: e.target.value as Role },
                            })
                          }
                          className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${ROLE_BADGE[user.role]}`}
                        >
                          <option value="PATIENT">PATIENT</option>
                          <option value="DOCTOR">DOCTOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>

                      <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">
                        {user.lastLoginAt
                          ? format(new Date(user.lastLoginAt), "dd MMM yyyy")
                          : "Never"}
                      </td>

                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">
                        {format(new Date(user.createdAt), "dd MMM yyyy")}
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant={user.isActive ? "success" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() =>
                            updateMutation.mutate({
                              id: user.id,
                              data: { isActive: !user.isActive },
                            })
                          }
                          className={`text-xs hover:underline ${
                            user.isActive ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Page {pagination.page} of {pagination.pages} · {pagination.total} users
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
