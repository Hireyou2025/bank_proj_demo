import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Search,
  Download,
  Play,
  Check,
  X,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { documentService } from "../services/api";

export const EmployeeTasks: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Processing"); // Defaults to active processing tasks

  // Remarks state per document (to support typing remarks before clicking actions)
  const [remarksState, setRemarksState] = useState<Record<number, string>>({});

  // Fetch employee tasks
  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ["employee-tasks", statusFilter],
    queryFn: () =>
      documentService.getEmployeeTasks(statusFilter ? { status_filter: statusFilter } : {}),
  });

  const handleRemarkChange = (id: number, text: string) => {
    setRemarksState((prev) => ({ ...prev, [id]: text }));
  };

  // Action mutations
  const startProcessingMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks: string }) =>
      documentService.markDocProcessing(id, { remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["employee-analytics"] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks: string }) =>
      documentService.approveDocById(id, { remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["employee-analytics"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks: string }) =>
      documentService.rejectDocById(id, { remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["employee-analytics"] });
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
      alert("Failed to download file.");
    }
  };

  // Filter tasks based on client-side search
  const filteredTasks = tasks.filter(
    (t: any) =>
      t.document_number.toLowerCase().includes(search.toLowerCase()) ||
      t.file_name.toLowerCase().includes(search.toLowerCase()) ||
      (t.remarks && t.remarks.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            My Task Board
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Manage your personal verification queue. Download files, record audit remarks, and transition document verification states.
          </p>
        </div>
      </div>

      {/* Filter and search menu */}
      <div className="glass-card p-5 flex flex-col md:flex-row gap-4 items-end">
        {/* Search */}
        <div className="relative flex-1">
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
            Search my tasks
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID or filename..."
              className="pl-9 pr-4 py-2.5 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-slate-800 dark:text-slate-100 font-medium"
            />
          </div>
        </div>

        {/* Status filters */}
        <div className="w-full md:w-auto">
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
            Task Queue Status
          </label>
          <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            {[
              { label: "Pending (Assigned)", value: "Assigned" },
              { label: "Processing", value: "Processing" },
              { label: "Approved", value: "Approved" },
              { label: "Rejected", value: "Rejected" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === tab.value
                    ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-250"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tasks Queue Grid */}
      {isLoading ? (
        <div className="py-24 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent mx-auto" />
          <p className="text-xs text-slate-400 mt-3 font-semibold">Retrieving workflow items...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="glass-card py-24 text-center text-slate-400">
          <FileText className="mx-auto mb-3" size={32} />
          <p className="text-sm font-semibold">No active tasks in this queue</p>
          <p className="text-xs mt-0.5">Toggle filter tabs or reload workspace.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task: any) => {
            const currentRemark = remarksState[task.id] || "";
            return (
              <div
                key={task.id}
                className="glass-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all hover:shadow-md"
              >
                {/* Info block */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-sky-500">{task.document_number}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        task.priority === "High"
                          ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600"
                          : task.priority === "Medium"
                          ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      {task.priority} Priority
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate">
                    {task.file_name}
                  </h3>
                  <div className="flex items-center gap-4 text-[10px] text-slate-450 dark:text-slate-500 font-medium">
                    <span>Uploaded by: {task.uploaded_by_name}</span>
                    <span>•</span>
                    <span>Received: {new Date(task.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  {/* Previous remarks history */}
                  {task.remarks && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-850/50 rounded-lg border border-slate-150 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                      <MessageSquare size={14} className="mt-0.5 text-slate-400" />
                      <div>
                        <span className="font-bold text-[10px] text-slate-400 block uppercase">Audit remarks history</span>
                        <p className="mt-0.5">{task.remarks}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input action fields block */}
                {(task.status === "Assigned" || task.status === "Processing") && (
                  <div className="flex-1 max-w-sm space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Audit remarks
                    </label>
                    <input
                      type="text"
                      value={currentRemark}
                      onChange={(e) => handleRemarkChange(task.id, e.target.value)}
                      placeholder="Add validation remarks (e.g. Signature matched)..."
                      className="px-3 py-2 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs placeholder-slate-400 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-semibold"
                    />
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleDownload(task.id, task.file_name)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-sky-500 transition-all flex items-center justify-center"
                    title="Download document file"
                  >
                    <Download size={16} />
                  </button>

                  {task.status === "Assigned" && (
                    <button
                      onClick={() =>
                        startProcessingMutation.mutate({
                          id: task.id,
                          remarks: currentRemark || "Started verification analysis.",
                        })
                      }
                      className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold tracking-wide shadow-md shadow-sky-500/10 hover:shadow-sky-600/25 active:scale-[0.98] transition-all flex items-center gap-1.5"
                    >
                      <Play size={14} fill="white" />
                      <span>Start Process</span>
                    </button>
                  )}

                  {task.status === "Processing" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          approveMutation.mutate({
                            id: task.id,
                            remarks: currentRemark || "Approved: Meets compliance checks.",
                          })
                        }
                        className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold tracking-wide shadow-md shadow-emerald-500/10 hover:shadow-emerald-600/25 active:scale-[0.98] transition-all flex items-center gap-1.5"
                      >
                        <Check size={14} />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() =>
                          rejectMutation.mutate({
                            id: task.id,
                            remarks: currentRemark || "Rejected: Incomplete or details mismatched.",
                          })
                        }
                        className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold tracking-wide shadow-md shadow-rose-500/10 hover:shadow-rose-600/25 active:scale-[0.98] transition-all flex items-center gap-1.5"
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}

                  {task.status === "Approved" && (
                    <span className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-100 dark:border-emerald-950/40 flex items-center gap-1.5">
                      <CheckCircle size={15} />
                      <span>Verified Approved</span>
                    </span>
                  )}

                  {task.status === "Rejected" && (
                    <span className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-100 dark:border-rose-950/40 flex items-center gap-1.5">
                      <XCircle size={15} />
                      <span>Verified Rejected</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
