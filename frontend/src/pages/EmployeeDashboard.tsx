import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Inbox,
  ArrowRight,
  Download,
  Play,
  Check,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { analyticsService, documentService } from "../services/api";

export const EmployeeDashboard: React.FC = () => {
  const queryClient = useQueryClient();

  // Fetch employee stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ["employee-analytics"],
    queryFn: analyticsService.getEmployeeAnalytics,
  });

  // Action mutation: Start processing a document
  const startProcessingMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks: string }) =>
      documentService.markDocProcessing(id, { remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["employee-tasks"] });
    },
  });

  // Action mutation: Approve document
  const approveMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks: string }) =>
      documentService.approveDocById(id, { remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["employee-tasks"] });
    },
  });

  // Action mutation: Reject document
  const rejectMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks: string }) =>
      documentService.rejectDocById(id, { remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["employee-tasks"] });
    },
  });

  const handleDownload = async (docId: number, fileName: string) => {
    try {
      const response = await documentService.downloadFile(docId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to download document.");
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 font-sans">
            Loading your employee dashboard...
          </p>
        </div>
      </div>
    );
  }

  const { cards, recent_documents } = stats;

  const cardItems = [
    {
      title: "Assigned Today",
      value: cards.assigned_today,
      icon: Inbox,
      color: "from-blue-500/10 to-blue-500/20 text-blue-600 dark:text-blue-400",
    },
    {
      title: "Pending Queue",
      value: cards.pending,
      icon: Clock,
      color: "from-yellow-500/10 to-yellow-500/20 text-yellow-600 dark:text-yellow-400",
    },
    {
      title: "Active Processing",
      value: cards.processing,
      icon: Play,
      color: "from-sky-500/10 to-sky-500/20 text-sky-600 dark:text-sky-400",
    },
    {
      title: "Today's Verified",
      value: cards.today_performance,
      icon: TrendingUp,
      color: "from-purple-500/10 to-purple-500/20 text-purple-600 dark:text-purple-400",
    },
    {
      title: "Total Completed",
      value: cards.completed,
      icon: FileSpreadsheet,
      color: "from-indigo-500/10 to-indigo-500/20 text-indigo-600 dark:text-indigo-400",
    },
    {
      title: "Approved Docs",
      value: cards.approved,
      icon: CheckCircle,
      color: "from-emerald-500/10 to-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Rejected Docs",
      value: cards.rejected,
      icon: XCircle,
      color: "from-rose-500/10 to-rose-500/20 text-rose-600 dark:text-rose-400",
    },
    {
      title: "Monthly Completed",
      value: cards.monthly_performance,
      icon: FileText,
      color: "from-teal-500/10 to-teal-500/20 text-teal-600 dark:text-teal-400",
    },
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
          Agent Workspace Dashboard
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Manage your assigned bank documents, verify criteria, download file attachments, and update workflow statuses.
        </p>
      </div>

      {/* Cards stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cardItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.3 }}
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

      {/* Main panel: tasks list */}
      <div className="grid grid-cols-1 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                My Recent Assigned Tasks
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Quick access to document verifications assigned to you</p>
            </div>
            <Link
              to="/employee/tasks"
              className="text-xs text-sky-500 hover:text-sky-600 font-semibold flex items-center gap-1 hover:underline"
            >
              View Full Worklist
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {recent_documents.length === 0 ? (
              <div className="py-12 text-center text-slate-450 dark:text-slate-500 text-sm font-medium">
                No active document tasks assigned. Excellent work!
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    <th className="pb-3.5 pl-2">Doc Number</th>
                    <th className="pb-3.5">Filename</th>
                    <th className="pb-3.5">Priority</th>
                    <th className="pb-3.5">Current Status</th>
                    <th className="pb-3.5">Assigned On</th>
                    <th className="pb-3.5 pr-2 text-right">Workflow Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {recent_documents.map((doc: any) => (
                    <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all text-xs">
                      <td className="py-3.5 pl-2 text-slate-900 dark:text-slate-100 font-bold">{doc.document_number}</td>
                      <td className="py-3.5 text-slate-600 dark:text-slate-350">{doc.file_name}</td>
                      <td className="py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            doc.priority === "High"
                              ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450"
                              : doc.priority === "Medium"
                              ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-450"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {doc.priority}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            doc.status === "Processing"
                              ? "bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-450"
                              : doc.status === "Assigned"
                              ? "bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-450"
                              : doc.status === "Approved"
                              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-50 dark:bg-rose-950/20 text-rose-600"
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-400">{new Date(doc.updated_at).toLocaleDateString()}</td>
                      <td className="py-3.5 pr-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleDownload(doc.id, doc.file_name)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-sky-500 transition-colors"
                            title="Download Attachment"
                          >
                            <Download size={14} />
                          </button>

                          {doc.status === "Assigned" && (
                            <button
                              onClick={() => startProcessingMutation.mutate({ id: doc.id, remarks: "Started verification check." })}
                              className="px-2.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-semibold flex items-center gap-1 transition-all"
                            >
                              <Play size={12} fill="white" />
                              <span>Process</span>
                            </button>
                          )}

                          {doc.status === "Processing" && (
                            <>
                              <button
                                onClick={() => approveMutation.mutate({ id: doc.id, remarks: "Verified successfully: meets bank requirements." })}
                                className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold flex items-center gap-1 transition-all"
                              >
                                <Check size={12} />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => rejectMutation.mutate({ id: doc.id, remarks: "Verification failed: signature mismatched or page missing." })}
                                className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-semibold flex items-center gap-1 transition-all"
                              >
                                <X size={12} />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
