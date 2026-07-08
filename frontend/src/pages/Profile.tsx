import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  User,
  Key,
  Shield,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  AlertCircle,
  Award,
} from "lucide-react";
import { userService, branchService } from "../services/api";

export const Profile: React.FC = () => {
  const { user } = useAuth();
  
  // Password change form states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch branches to resolve user's branch
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: branchService.getBranches,
    enabled: !!user,
  });

  // Fetch performance metrics (if employee role)
  const { data: perf, isLoading: isPerfLoading } = useQuery({
    queryKey: ["employee-profile-performance", user?.id],
    queryFn: () => userService.getUserPerformance(user!.id),
    enabled: !!user && user.role === "employee",
  });

  const resetPwdMutation = useMutation({
    mutationFn: (payload: any) => userService.resetPassword(user!.id, payload),
    onSuccess: () => {
      setMessage("Your password was updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "Failed to update password.");
    },
  });

  if (!user) return null;
  const userBranch = branches.find((b: any) => b.id === user.branch_id);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    resetPwdMutation.mutate({ new_password: newPassword });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
          Profile Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
          View your work details, review performance scores, and manage your account security credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workspace Account Details Card */}
        <div className="glass-card p-6 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-full bg-gradient-to-tr from-sky-400 to-blue-500 flex items-center justify-center text-white text-xl font-bold border border-sky-200 dark:border-sky-850">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  {user.name}
                </h3>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mt-0.5">
                  {user.role} workspace account
                </span>
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-400 font-semibold">
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-slate-400" />
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">Email address</span>
                  <span>{user.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-slate-400" />
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">Phone number</span>
                  <span>{user.phone || "No phone added"}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={16} className="text-slate-400" />
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">Branch Location</span>
                  <span>{userBranch ? userBranch.name : "Central Management"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Password update (Center column) */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Key size={16} />
            <span>Update Password</span>
          </h3>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {message && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-xl border border-emerald-100 dark:border-emerald-950/30 flex items-start gap-2">
                <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455 text-xs font-semibold rounded-xl border border-rose-100 dark:border-rose-950/40 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                New password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="px-3 py-2.5 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs placeholder-slate-400 text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Confirm new password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="px-3 py-2.5 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs placeholder-slate-400 text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={resetPwdMutation.isPending}
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold tracking-wide shadow-md shadow-sky-500/10 transition-all"
            >
              {resetPwdMutation.isPending ? "Updating Credentials..." : "Change Account Password"}
            </button>
          </form>
        </div>

        {/* Performance (Right column, only visible if Employee) */}
        {user.role === "employee" && (
          <div className="glass-card p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Award size={16} className="text-sky-500" />
                <span>My Workspace Stats</span>
              </h3>

              {isPerfLoading || !perf ? (
                <div className="py-12 text-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent mx-auto" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Score badge */}
                  <div className="p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-950/30 rounded-2xl flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-850 dark:text-sky-400 uppercase tracking-wider">Productivity Score</span>
                    <span className="text-2xl font-black text-sky-600 dark:text-sky-400">{perf.performance_score}%</span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-450 font-bold">
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span>Assigned tasks</span>
                      <span>{perf.total_assigned}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span>Completed verifications</span>
                      <span>{perf.completed}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-emerald-600">Approved approvals</span>
                      <span className="text-emerald-600">{perf.approved}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-rose-600">Rejected rejects</span>
                      <span className="text-rose-600">{perf.rejected}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between text-xs mb-1.5 font-bold">
                      <span className="text-slate-500">Approval Rate</span>
                      <span>{perf.approval_pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${perf.approval_pct}%` }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
