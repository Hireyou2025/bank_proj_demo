import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FileText,
  Upload,
  UserCheck,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  Layers,
  Clock,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { analyticsService, branchService, logService } from "../services/api";

const COLORS = ["#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899"];

export const AdminDashboard: React.FC = () => {
  const [selectedBranch, setSelectedBranch] = useState<number | "">("");

  // Fetch branches for dropdown filter
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: branchService.getBranches,
  });

  // Fetch dashboard stats (refetch when selectedBranch changes)
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-analytics", selectedBranch],
    queryFn: () => analyticsService.getAdminAnalytics(selectedBranch ? { branch_id: selectedBranch } : {}),
  });

  // Fetch recent activity logs
  const { data: logs = [] } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: () => logService.getActivityLogs({ limit: 8 }),
  });

  if (isLoading || !stats) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 font-sans">
            Recalculating workspace analytics...
          </p>
        </div>
      </div>
    );
  }

  const { cards, branch_statistics, charts } = stats;

  const cardItems = [
    {
      title: "Total Documents",
      value: cards.total_documents,
      icon: FileText,
      color: "from-sky-500/10 to-sky-500/20 text-sky-600 dark:text-sky-400",
    },
    {
      title: "Uploaded (Unassigned)",
      value: cards.uploaded,
      icon: Upload,
      color: "from-yellow-500/10 to-yellow-500/20 text-yellow-600 dark:text-yellow-400",
    },
    {
      title: "Processing",
      value: cards.processing,
      icon: Clock,
      color: "from-blue-500/10 to-blue-500/20 text-blue-600 dark:text-blue-400",
    },
    {
      title: "Approved",
      value: cards.approved,
      icon: CheckCircle,
      color: "from-emerald-500/10 to-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Rejected",
      value: cards.rejected,
      icon: XCircle,
      color: "from-rose-500/10 to-rose-500/20 text-rose-600 dark:text-rose-400",
    },
    {
      title: "Total Employees",
      value: cards.total_employees,
      icon: Users,
      color: "from-indigo-500/10 to-indigo-500/20 text-indigo-600 dark:text-indigo-400",
    },
    {
      title: "Today's Processed",
      value: cards.completed_today,
      icon: Calendar,
      color: "from-purple-500/10 to-purple-500/20 text-purple-600 dark:text-purple-400",
    },
    {
      title: "Avg Processing Time",
      value: `${charts.avg_processing_time_hours}h`,
      icon: TrendingUp,
      color: "from-teal-500/10 to-teal-500/20 text-teal-600 dark:text-teal-400",
    },
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* Header and Dropdown */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            Admin Management Workspace
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Monitor real-time document workflows, employee performance, and regional branch operations.
          </p>
        </div>

        {/* Branch Filter dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Filter Location:
          </label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value ? Number(e.target.value) : "")}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 dark:text-slate-250 transition-all cursor-pointer"
          >
            <option value="">All Branches (Central)</option>
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cardItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className="glass-card p-5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {item.title}
                </span>
                <div className={`p-2 rounded-xl bg-gradient-to-br ${item.color}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-50">
                  {item.value}
                </h3>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart (Span 2) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 lg:col-span-2 flex flex-col"
        >
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Verification Trend
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Approved vs Rejected volume (Last 7 days)</p>
          </div>
          <div className="h-72 w-full">
            {charts.daily_trend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No completion logs recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.daily_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorApp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRej" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(30, 41, 59, 0.9)",
                      border: "none",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                  <Area name="Approved" type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorApp)" />
                  <Area name="Rejected" type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRej)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Branch Pie Chart (Span 1) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 flex flex-col justify-between"
        >
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Documents per Branch
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Workload distribution across offices</p>
          </div>
          <div className="h-56 w-full relative flex items-center justify-center my-2">
            {charts.docs_per_branch.every((item: any) => item.documents === 0) ? (
              <div className="text-slate-400 text-xs">No documents available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.docs_per_branch}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="documents"
                  >
                    {charts.docs_per_branch.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(30, 41, 59, 0.9)",
                      border: "none",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Legend indicators */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
            {charts.docs_per_branch.map((item: any, index: number) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span>{item.name} ({item.documents})</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Grid: Employee productivity + Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Employees (Span 2) */}
        <div className="glass-card p-6 lg:col-span-2">
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Top Employee Productivity
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Most active agents by completed verifications</p>
          </div>
          
          {charts.employee_productivity.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No employee performance data available.
            </div>
          ) : (
            <div className="space-y-4">
              {charts.employee_productivity.map((emp: any, index: number) => {
                const total = emp.completed || 1; // avoid division by 0
                const appPct = Math.round((emp.approved / total) * 100);
                return (
                  <div key={emp.name} className="flex items-center gap-4">
                    <span className="w-6 text-xs text-slate-400 dark:text-slate-500 font-extrabold text-center">
                      #{index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {emp.name}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">
                          {emp.completed} completed ({appPct}% approved)
                        </span>
                      </div>
                      {/* Productivity bar */}
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-500 rounded-full"
                          style={{
                            width: `${Math.min(100, (emp.completed / Math.max(...charts.employee_productivity.map((e: any) => e.completed || 1))) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity feed (Span 1) */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Recent Activity Audit
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Latest workspace operations logs</p>
            </div>

            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No activity logged yet.
                </div>
              ) : (
                logs.map((log: any) => (
                  <div key={log.id} className="text-xs border-b border-slate-100 dark:border-slate-800/60 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 leading-normal">
                      {log.description}
                    </p>
                    <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1">
                      <span className="font-bold">{log.user_name}</span>
                      <span className="font-mono">{log.ip_address}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
