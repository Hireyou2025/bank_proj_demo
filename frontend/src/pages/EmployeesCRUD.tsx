import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Lock,
  Power,
  PowerOff,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  Award,
  Calendar,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { userService, branchService } from "../services/api";

export const EmployeesCRUD: React.FC = () => {
  const queryClient = useQueryClient();

  // Dialog control states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPwdOpen, setIsPwdOpen] = useState(false);
  const [isPerformanceOpen, setIsPerformanceOpen] = useState(false);

  // Selected employee for update operations
  const [selectedEmp, setSelectedEmp] = useState<any>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [branchId, setBranchId] = useState<number | "">("");
  const [newPassword, setNewPassword] = useState("");

  // Fetch branches and users
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: branchService.getBranches,
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => userService.getUsers({ role: "employee" }),
  });

  // Query performance data for selected employee
  const { data: perfData, isLoading: isPerfLoading } = useQuery({
    queryKey: ["performance", selectedEmp?.id],
    queryFn: () => userService.getUserPerformance(selectedEmp.id),
    enabled: !!selectedEmp && isPerformanceOpen,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => userService.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setIsAddOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Error creating user.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      userService.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setIsEditOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const resetPwdMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      userService.resetPassword(id, payload),
    onSuccess: () => {
      alert("Password reset completed successfully.");
      setIsPwdOpen(false);
      setNewPassword("");
    },
  });

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setBranchId("");
    setSelectedEmp(null);
  };

  const handleOpenEdit = (emp: any) => {
    setSelectedEmp(emp);
    setName(emp.name);
    setEmail(emp.email);
    setPhone(emp.phone || "");
    setBranchId(emp.branch_id || "");
    setIsEditOpen(true);
  };

  const handleOpenResetPwd = (emp: any) => {
    setSelectedEmp(emp);
    setIsPwdOpen(true);
  };

  const handleOpenPerformance = (emp: any) => {
    setSelectedEmp(emp);
    setIsPerformanceOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name,
      email,
      password,
      role: "employee",
      branch_id: branchId ? Number(branchId) : null,
      phone: phone || null,
      is_active: true,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    updateMutation.mutate({
      id: selectedEmp.id,
      payload: {
        name,
        email,
        branch_id: branchId ? Number(branchId) : null,
        phone: phone || null,
      },
    });
  };

  const handleToggleActive = (emp: any) => {
    updateMutation.mutate({
      id: emp.id,
      payload: { is_active: !emp.is_active },
    });
  };

  const handleDelete = (id: number, empName: string) => {
    if (window.confirm(`Are you sure you want to delete employee ${empName}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleResetPwd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !newPassword) return;
    resetPwdMutation.mutate({
      id: selectedEmp.id,
      payload: { new_password: newPassword },
    });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            Employee Directory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Create employee profiles, edit contact information, toggle active states, and view productivity metrics.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsAddOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold tracking-wide shadow-lg shadow-sky-500/15 transition-all"
        >
          <UserPlus size={16} />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Main Grid list */}
      {isLoading ? (
        <div className="py-24 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent mx-auto" />
          <p className="text-xs text-slate-400 mt-3 font-semibold">Retrieving employee roster...</p>
        </div>
      ) : employees.length === 0 ? (
        <div className="glass-card py-24 text-center text-slate-400">
          <Users className="mx-auto mb-3" size={32} />
          <p className="text-sm font-semibold">No employees registered</p>
          <p className="text-xs mt-0.5">Click Add Employee to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((emp: any) => (
            <div
              key={emp.id}
              className={`glass-card p-5 flex flex-col justify-between border-t-4 transition-all hover:-translate-y-0.5 duration-250 ${
                emp.is_active ? "border-t-sky-400" : "border-t-slate-300"
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{emp.name}</h3>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {emp.branch?.name || "No branch"} Office
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                      emp.is_active
                        ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    }`}
                  >
                    {emp.is_active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>

                {/* Details list */}
                <div className="space-y-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium mb-5">
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-slate-400" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-slate-400" />
                    <span>{emp.phone || "No phone added"}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  onClick={() => handleOpenPerformance(emp)}
                  className="text-xs text-sky-500 hover:text-sky-600 font-semibold flex items-center gap-0.5 hover:underline"
                >
                  <span>Stats & Perf</span>
                  <ChevronRight size={14} />
                </button>

                <div className="flex gap-1">
                  <button
                    onClick={() => handleToggleActive(emp)}
                    className={`p-1.5 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                      emp.is_active ? "text-red-500 border-red-100 dark:border-red-950/40" : "text-emerald-500 border-emerald-100 dark:border-emerald-950/40"
                    }`}
                    title={emp.is_active ? "Deactivate" : "Activate"}
                  >
                    {emp.is_active ? <PowerOff size={13} /> : <Power size={13} />}
                  </button>
                  <button
                    onClick={() => handleOpenResetPwd(emp)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Reset Password"
                  >
                    <Lock size={13} />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(emp)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Edit Profile"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(emp.id, emp.name)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-650 transition-colors"
                    title="Delete User"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-out / Modal: Performance Review */}
      {isPerformanceOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto font-sans">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
              Performance Review
            </h3>
            <p className="text-xs text-slate-450 mb-5 font-semibold">
              Evaluation metrics for <strong className="font-extrabold text-slate-700 dark:text-slate-200">{selectedEmp.name}</strong>
            </p>

            {isPerfLoading || !perfData ? (
              <div className="py-12 text-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent mx-auto" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Score badge */}
                <div className="p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-950/30 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="text-sky-500" size={24} />
                    <div>
                      <h4 className="text-xs font-bold text-sky-800 dark:text-sky-400 uppercase tracking-wider">Productivity Score</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Weighted activity index</p>
                    </div>
                  </div>
                  <span className="text-2xl font-black text-sky-600 dark:text-sky-400">
                    {perfData.performance_score}%
                  </span>
                </div>

                {/* Statistics grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Assigned Tasks</span>
                    <strong className="text-lg text-slate-700 dark:text-slate-200">{perfData.total_assigned}</strong>
                  </div>
                  <div className="p-3.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Completed Tasks</span>
                    <strong className="text-lg text-slate-700 dark:text-slate-200">{perfData.completed}</strong>
                  </div>
                  <div className="p-3.5 border border-slate-200 dark:border-slate-800 bg-emerald-50/20 dark:bg-emerald-950/10 rounded-xl">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500 block mb-1">Approved Docs</span>
                    <strong className="text-lg text-emerald-600 dark:text-emerald-400">{perfData.approved}</strong>
                  </div>
                  <div className="p-3.5 border border-slate-200 dark:border-slate-800 bg-rose-50/20 dark:bg-rose-950/10 rounded-xl">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-rose-500 block mb-1">Rejected Docs</span>
                    <strong className="text-lg text-rose-600 dark:text-rose-400">{perfData.rejected}</strong>
                  </div>
                </div>

                {/* Progress indicators */}
                <div className="space-y-4 pt-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5 font-semibold">
                      <span className="text-slate-500">Approval Rate</span>
                      <span className="text-slate-700 dark:text-slate-350">{perfData.approval_pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${perfData.approval_pct}%` }} />
                    </div>
                  </div>
                </div>

                <div className="flex pt-4 justify-end">
                  <button
                    onClick={() => setIsPerformanceOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Close Review
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add Employee */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm px-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-2">
              Add New Employee
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Employee name"
                  className="px-3 py-2.5 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs placeholder-slate-400 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="px-3 py-2.5 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs placeholder-slate-400 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Default Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="px-3 py-2.5 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs placeholder-slate-400 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="px-3 py-2.5 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs placeholder-slate-400 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Branch Office
                </label>
                <select
                  required
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : "")}
                  className="px-3 py-2.5 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 text-slate-700 dark:text-slate-250 transition-all font-semibold cursor-pointer"
                >
                  <option value="">Select branch...</option>
                  {branches.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-4 justify-end">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-all"
              >
                {createMutation.isPending ? "Adding..." : "Add Employee"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Edit Employee */}
      {isEditOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm px-4">
          <form
            onSubmit={handleUpdate}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-2">
              Edit Employee Details
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Employee name"
                  className="px-3 py-2.5 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs placeholder-slate-400 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="px-3 py-2.5 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs placeholder-slate-400 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="px-3 py-2.5 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs placeholder-slate-400 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Branch Office
                </label>
                <select
                  required
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : "")}
                  className="px-3 py-2.5 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 text-slate-700 dark:text-slate-250 transition-all font-semibold cursor-pointer"
                >
                  <option value="">Select branch...</option>
                  {branches.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-4 justify-end">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-all"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Reset Password */}
      {isPwdOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm px-4">
          <form
            onSubmit={handleResetPwd}
            className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-1">
              Reset Employee Password
            </h3>
            <p className="text-xs text-slate-400 leading-normal">
              Enter a new secure password for <strong className="font-extrabold text-slate-700 dark:text-slate-250">{selectedEmp.name}</strong>.
            </p>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="px-3 py-2.5 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs placeholder-slate-400 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-medium"
              />
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={() => setIsPwdOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resetPwdMutation.isPending}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-all"
              >
                {resetPwdMutation.isPending ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
