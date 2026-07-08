import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  FileText,
  AlertCircle,
  X,
  CheckCircle,
  Layers,
  MapPin,
} from "lucide-react";
import { documentService, branchService } from "../services/api";

interface FileQueueItem {
  file: File;
  id: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  errorMsg?: string;
}

export const UploadWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form selections
  const [priority, setPriority] = useState("Medium");
  const [selectedBranch, setSelectedBranch] = useState<number | "">("");

  // File queue list
  const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: branchService.getBranches,
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => documentService.uploadDocuments(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      // Mark all in queue as success
      setFileQueue((prev) =>
        prev.map((item) => ({ ...item, status: "success", progress: 100 }))
      );
      setTimeout(() => {
        navigate("/admin/documents");
      }, 1500);
    },
    onError: (err: any) => {
      setUploadError(err.response?.data?.detail || "Upload failed. Please try again.");
      setFileQueue((prev) =>
        prev.map((item) => (item.status === "uploading" ? { ...item, status: "error", errorMsg: "Failed" } : item))
      );
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(Array.from(e.target.files));
    }
  };

  const addFilesToQueue = (files: File[]) => {
    const allowedExtensions = ["pdf", "jpg", "jpeg", "png", "zip"];
    const maxBytes = 50 * 1024 * 1024; // 50MB

    const newItems: FileQueueItem[] = [];
    files.forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      let status: FileQueueItem["status"] = "pending";
      let errorMsg = undefined;

      if (!allowedExtensions.includes(ext)) {
        status = "error";
        errorMsg = "Unsupported format (Only PDF, JPG, PNG, ZIP)";
      } else if (file.size > maxBytes) {
        status = "error";
        errorMsg = "File size exceeds 50MB limit";
      }

      newItems.push({
        file,
        id: Math.random().toString(36).substring(2, 9),
        progress: 0,
        status,
        errorMsg,
      });
    });

    setFileQueue((prev) => [...prev, ...newItems]);
  };

  const removeFile = (id: string) => {
    setFileQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const triggerUpload = () => {
    const pendingFiles = fileQueue.filter((item) => item.status === "pending");
    if (pendingFiles.length === 0) return;

    setUploadError(null);
    setFileQueue((prev) =>
      prev.map((item) => (item.status === "pending" ? { ...item, status: "uploading", progress: 30 } : item))
    );

    const formData = new FormData();
    pendingFiles.forEach((item) => {
      formData.append("files", item.file);
    });
    formData.append("priority", priority);
    if (selectedBranch) {
      formData.append("branch_id", String(selectedBranch));
    }

    uploadMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
          Document Intake Portal
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Upload bank documents in bulk, assign workflow priority settings, and tag to branch destinations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Dropzone (Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`glass-card p-12 border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-200 min-h-[300px] ${
              isDragging
                ? "border-sky-500 bg-sky-50/20 dark:bg-sky-950/10"
                : "border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500/80"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.zip"
            />
            <UploadCloud size={48} className="text-slate-400 dark:text-slate-500 mb-4" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Drag & Drop Files Here
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium text-center">
              or <span className="text-sky-500 font-bold hover:underline">browse files</span> from your local drive.
            </p>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-5 block bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
              PDF, JPG, PNG, ZIP up to 50MB
            </span>
          </div>

          {/* Upload Queue list */}
          {fileQueue.length > 0 && (
            <div className="glass-card p-5 space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Upload Queue ({fileQueue.length} files)
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                {fileQueue.map((item) => (
                  <div key={item.id} className="flex items-center gap-4.5 pt-3.5 first:pt-0">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500">
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                          {item.file.name}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                      
                      {/* Status indicator / progress bar */}
                      {item.status === "uploading" && (
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-sky-500 animate-pulse rounded-full" style={{ width: `${item.progress}%` }} />
                        </div>
                      )}
                      
                      {item.status === "success" && (
                        <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                          <CheckCircle size={12} />
                          <span>Uploaded successfully</span>
                        </span>
                      )}

                      {item.status === "error" && (
                        <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                          <AlertCircle size={12} />
                          <span>{item.errorMsg}</span>
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(item.id);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Configurations panel (Span 1) */}
        <div className="space-y-4">
          <div className="glass-card p-5 space-y-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Document Configurations
            </h3>

            {uploadError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-xl border border-red-100 dark:border-red-950/40 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Priority selection */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Layers size={12} />
                <span>Priority Level</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["Low", "Medium", "High"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      priority === p
                        ? "bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-500/10"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Branch Destination tagging */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <MapPin size={12} />
                <span>Branch Tagging</span>
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value ? Number(e.target.value) : "")}
                className="px-3 py-2.5 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 text-slate-700 dark:text-slate-200 transition-all font-semibold cursor-pointer"
              >
                <option value="">Tag to admin home branch</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name} Office
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={triggerUpload}
              disabled={
                fileQueue.filter((item) => item.status === "pending").length === 0 ||
                uploadMutation.isPending
              }
              className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl text-xs font-bold tracking-wide shadow-lg shadow-sky-500/10 hover:shadow-sky-600/25 active:scale-[0.98] transition-all"
            >
              {uploadMutation.isPending ? "Uploading Queue..." : "Upload & Tag Documents"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
