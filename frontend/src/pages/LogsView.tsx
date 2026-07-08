import React from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Shield, Terminal, Globe, Calendar, RefreshCw } from "lucide-react";
import { logService } from "../services/api";

export const LogsView: React.FC = () => {
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["activity-logs-full"],
    queryFn: () => logService.getActivityLogs({ limit: 100 }),
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            System Audit Trail
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Chronological audit logs tracking uploads, work assignments, employee verification decisions, and secure logins.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 rounded-xl text-sm font-semibold transition-all"
        >
          <RefreshCw size={15} />
          <span>Refresh Audit</span>
        </button>
      </div>

      {/* Main logs display */}
      <div className="glass-card p-6">
        {isLoading ? (
          <div className="py-24 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent mx-auto" />
            <p className="text-xs text-slate-400 mt-3 font-semibold">Parsing system audit records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-24 text-center text-slate-400">
            <History className="mx-auto mb-3" size={32} />
            <p className="text-sm font-semibold">Audit trail empty</p>
            <p className="text-xs mt-0.5">Activities will record automatically as events occur.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/85 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  <th className="pb-3 w-12 pl-2">Icon</th>
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Action Event</th>
                  <th className="pb-3">User Agent</th>
                  <th className="pb-3">IP Address</th>
                  <th className="pb-3 pr-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors text-xs font-semibold">
                    <td className="py-4 pl-2 text-slate-400">
                      {log.action.includes("Login") || log.action.includes("Logout") ? (
                        <Shield size={16} className="text-blue-500" />
                      ) : log.action.includes("Approve") ? (
                        <Shield size={16} className="text-emerald-500" />
                      ) : log.action.includes("Reject") ? (
                        <Shield size={16} className="text-rose-500" />
                      ) : (
                        <Terminal size={16} className="text-sky-500" />
                      )}
                    </td>
                    <td className="py-4 text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        <span>
                          {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 text-slate-800 dark:text-slate-200 font-bold whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-4 text-slate-700 dark:text-slate-350">{log.user_name}</td>
                    <td className="py-4 font-mono text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Globe size={12} className="text-slate-450" />
                        <span>{log.ip_address}</span>
                      </div>
                    </td>
                    <td className="py-4 text-slate-500 dark:text-slate-400 pr-2 max-w-sm font-normal">
                      {log.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
