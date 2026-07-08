import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  FileText,
  Search,
  Filter,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  ArrowUpDown,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";
import { documentService, branchService, userService } from "../services/api";

export const DocumentsList: React.FC = () => {
  const queryClient = useQueryClient();

  // State parameters for table queries
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<number | "">("");
  const [employeeFilter, setEmployeeFilter] = useState<number | "">("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Selected documents state for bulk assignment
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkEmployeeId, setBulkEmployeeId] = useState<number | "">("");
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);

  // Fetch branches, users, and documents
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: branchService.getBranches,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => userService.getUsers({ role: "employee" }),
  });

  const offset = (page - 1) * limit;
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["documents", search, branchFilter, employeeFilter, statusFilter, priorityFilter, sortBy, sortOrder, page],
    queryFn: () =>
      documentService.getDocuments({
        search: search || undefined,
        branch_id: branchFilter || undefined,
        employee_id: employeeFilter || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        limit,
        offset,
      }),
  });

  // Action: Delete document
  const deleteMutation = useMutation({
    mutationFn: (id: number) => documentService.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setSelectedIds((prev) => prev.filter((pid) => pid !== pid));
    },
  });

  // Action: Bulk Assign
  const bulkAssignMutation = useMutation({
    mutationFn: (payload: { document_ids: number[]; employee_id: number }) =>
      documentService.assignBulk(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setIsBulkAssignModalOpen(false);
      setSelectedIds([]);
      setBulkEmployeeId("");
    },
  });

  const total = data?.total || 0;
  const items = data?.items || [];
  const totalPages = Math.ceil(total / limit) || 1;

  // Handle pagination limits
  useEffect(() => {
    setPage(1);
  }, [search, branchFilter, employeeFilter, statusFilter, priorityFilter]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(items.map((item: any) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((pid) => pid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete document ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleDownload = async (id: number, fileName: string) => {
    try {
      const response = await documentService.downloadFile(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to download document attachment.");
    }
  };

  const handleBulkAssign = () => {
    if (!bulkEmployeeId) return;
    bulkAssignMutation.mutate({
      document_ids: selectedIds,
      employee_id: Number(bulkEmployeeId),
    });
  };

  // Export to CSV/Excel Spreadsheet
  const exportToCSV = () => {
    if (items.length === 0) return;
    
    // Header columns
    const headers = ["Document ID", "Filename", "Upload Date", "Branch", "Assignee", "Status", "Priority", "Remarks"];
    const csvRows = [headers.join(",")];
    
    items.forEach((item: any) => {
      const row = [
        item.document_number,
        `"${item.file_name}"`,
        new Date(item.created_at).toLocaleDateString(),
        `"${item.branch_name}"`,
        `"${item.assignee_name}"`,
        item.status,
        item.priority,
        `"${item.remarks || ''}"`
      ];
      csvRows.push(row.join(","));
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Workspace_Documents_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
            Document Repository
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Search, filter, assign and review all document flows. Perform bulk actions on selected documents.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={exportToCSV}
            disabled={items.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            <FileSpreadsheet size={16} className="text-emerald-500" />
            <span>Export CSV</span>
          </button>
          
          <button
            onClick={() => refetch()}
            className="p-2.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold transition-all"
            title="Refresh Data"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Advanced Filters Block */}
      <div className="glass-card p-5 grid grid-cols-1 md:grid-cols-5 gap-3.5 items-end">
        {/* Search */}
        <div className="relative">
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
            Search Workspace
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ID, name, branch..."
              className="pl-9 pr-4 py-2.5 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-slate-800 dark:text-slate-100 font-medium"
            />
          </div>
        </div>

        {/* Branch Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
            Branch Location
          </label>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value ? Number(e.target.value) : "")}
            className="px-3 py-2.5 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 text-slate-700 dark:text-slate-250 transition-all font-semibold cursor-pointer"
          >
            <option value="">All Branches</option>
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Employee Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
            Assigned Agent
          </label>
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value ? Number(e.target.value) : "")}
            className="px-3 py-2.5 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 text-slate-700 dark:text-slate-250 transition-all font-semibold cursor-pointer"
          >
            <option value="">All Employees</option>
            {employees.map((emp: any) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
            Workflow Stage
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 text-slate-700 dark:text-slate-250 transition-all font-semibold cursor-pointer"
          >
            <option value="">All Stages</option>
            <option value="Uploaded">Uploaded</option>
            <option value="Processing">Processing</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
            Priority Level
          </label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2.5 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 text-slate-700 dark:text-slate-250 transition-all font-semibold cursor-pointer"
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-950/40 rounded-xl flex items-center justify-between"
        >
          <span className="text-xs font-semibold text-sky-800 dark:text-sky-400">
            Selected <strong className="font-extrabold">{selectedIds.length}</strong> document(s)
          </span>
          <button
            onClick={() => setIsBulkAssignModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold shadow-md shadow-sky-500/10 transition-all"
          >
            <UserPlus size={14} />
            <span>Assign Agent</span>
          </button>
        </motion.div>
      )}

      {/* Main documents table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-24 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent mx-auto" />
              <p className="text-xs text-slate-450 dark:text-slate-500 font-semibold mt-3">
                Fetching document records...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-24 text-center text-slate-400">
              <FileText className="mx-auto mb-3" size={32} />
              <p className="text-sm font-semibold">No documents found</p>
              <p className="text-xs mt-0.5">Try altering filters or uploading files.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  <th className="py-3.5 pl-4 w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={items.length > 0 && selectedIds.length === items.length}
                      className="rounded border-slate-300 text-sky-500 focus:ring-sky-500 h-3.5 w-3.5 accent-sky-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 cursor-pointer" onClick={() => handleSort("document_number")}>
                    <div className="flex items-center gap-1">
                      <span>Doc ID</span>
                      <ArrowUpDown size={11} className="text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5">Filename</th>
                  <th className="py-3.5 cursor-pointer" onClick={() => handleSort("created_at")}>
                    <div className="flex items-center gap-1">
                      <span>Upload Date</span>
                      <ArrowUpDown size={11} className="text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5">Branch</th>
                  <th className="py-3.5">Assigned Employee</th>
                  <th className="py-3.5">Status</th>
                  <th className="py-3.5">Priority</th>
                  <th className="py-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/10 transition-colors text-xs font-semibold">
                    <td className="py-3.5 pl-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleSelectOne(item.id)}
                        className="rounded border-slate-300 text-sky-500 focus:ring-sky-500 h-3.5 w-3.5 accent-sky-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 text-slate-900 dark:text-slate-150 font-bold">{item.document_number}</td>
                    <td className="py-3.5 text-slate-600 dark:text-slate-350 max-w-[150px] truncate">{item.file_name}</td>
                    <td className="py-3.5 text-slate-400">{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="py-3.5 text-slate-700 dark:text-slate-300">{item.branch_name}</td>
                    <td className="py-3.5">
                      {item.assignee_name !== "None" ? (
                        <span className="text-slate-700 dark:text-slate-300 font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          {item.assignee_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === "Processing"
                            ? "bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-450"
                            : item.status === "Uploaded"
                            ? "bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-450"
                            : item.status === "Approved"
                            ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.priority === "High"
                            ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600"
                            : item.priority === "Medium"
                            ? "bg-blue-50 dark:bg-blue-950/20 text-blue-650"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleDownload(item.id, item.file_name)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-sky-500 transition-colors"
                          title="Download File"
                        >
                          <Download size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.file_name)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500">
              Showing page <strong className="font-extrabold text-slate-700 dark:text-slate-300">{page}</strong> of{" "}
              <strong className="font-extrabold text-slate-700 dark:text-slate-300">{totalPages}</strong> (
              <strong className="font-semibold">{total}</strong> total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Assignment Modal popup */}
      {isBulkAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-150 dark:border-slate-800 shadow-2xl relative"
          >
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-2">
              Assign Agent to {selectedIds.length} Task(s)
            </h3>
            <p className="text-xs text-slate-400 leading-normal mb-5">
              Select an employee who will receive these document checks. Documents will immediately transition to the{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">Processing</span> stage.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Select Employee
                </label>
                <select
                  value={bulkEmployeeId}
                  onChange={(e) => setBulkEmployeeId(e.target.value ? Number(e.target.value) : "")}
                  className="px-3 py-2.5 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-700 dark:text-slate-200 transition-all font-semibold cursor-pointer"
                >
                  <option value="">Choose an employee...</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.branch?.name || "No branch"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2 justify-end">
                <button
                  onClick={() => setIsBulkAssignModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAssign}
                  disabled={!bulkEmployeeId || bulkAssignMutation.isPending}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-all"
                >
                  {bulkAssignMutation.isPending ? "Assigning..." : "Assign Tasks"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
