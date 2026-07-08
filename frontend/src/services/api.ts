import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:8000"
    : "https://bank-proj-demo.vercel.app");

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach JWT Token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle auth expired errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          // Attempt refresh
          const response = await axios.post(`${API_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token } = response.data;
          localStorage.setItem("access_token", access_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // If refresh fails, clear storage and redirect
          localStorage.clear();
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      } else {
        localStorage.clear();
        // Avoid redirect loop if already on login
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// --- API Service Functions ---

// Auth
export const authService = {
  login: async (payload: any) => {
    // Standard OAuth2 form request or JSON
    const response = await api.post("/api/auth/login", payload);
    return response.data;
  },
  logout: async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      localStorage.clear();
    }
  },
  getMe: async () => {
    const response = await api.get("/api/auth/me");
    return response.data;
  },
};

// Users
export const userService = {
  getUsers: async (params?: any) => {
    const response = await api.get("/api/users", { params });
    return response.data;
  },
  createUser: async (payload: any) => {
    const response = await api.post("/api/users", payload);
    return response.data;
  },
  updateUser: async (id: number, payload: any) => {
    const response = await api.put(`/api/users/${id}`, payload);
    return response.data;
  },
  deleteUser: async (id: number) => {
    const response = await api.delete(`/api/users/${id}`);
    return response.data;
  },
  resetPassword: async (id: number, payload: any) => {
    const response = await api.put(`/api/users/${id}/reset-password`, payload);
    return response.data;
  },
  getUserPerformance: async (id: number) => {
    const response = await api.get(`/api/users/${id}/performance`);
    return response.data;
  },
};

// Branches
export const branchService = {
  getBranches: async () => {
    const response = await api.get("/api/branches");
    return response.data;
  },
  createBranch: async (payload: any) => {
    const response = await api.post("/api/branches", payload);
    return response.data;
  },
};

// Documents
export const documentService = {
  getDocuments: async (params?: any) => {
    const response = await api.get("/api/documents", { params });
    return response.data;
  },
  getDocument: async (id: number) => {
    const response = await api.get(`/api/documents/${id}`);
    return response.data;
  },
  uploadDocuments: async (formData: FormData) => {
    const response = await api.post("/api/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
  deleteDocument: async (id: number) => {
    const response = await api.delete(`/api/documents/${id}`);
    return response.data;
  },
  assignBulk: async (payload: { document_ids: number[]; employee_id: number }) => {
    const response = await api.post("/api/documents/assign-bulk", payload);
    return response.data;
  },
  reassignBulk: async (payload: { document_ids: number[]; employee_id: number }) => {
    const response = await api.put("/api/reassign", payload);
    return response.data;
  },
  getEmployeeTasks: async (params?: any) => {
    const response = await api.get("/api/employee/tasks", { params });
    return response.data;
  },
  markDocProcessing: async (id: number, payload: { remarks: string }) => {
    const response = await api.put(`/api/documents/${id}/processing`, payload);
    return response.data;
  },
  approveDocById: async (id: number, payload: { remarks: string }) => {
    const response = await api.put(`/api/documents/${id}/approve`, payload);
    return response.data;
  },
  rejectDocById: async (id: number, payload: { remarks: string }) => {
    const response = await api.put(`/api/documents/${id}/reject`, payload);
    return response.data;
  },
  downloadFile: async (id: number) => {
    const response = await api.get(`/api/documents/${id}/download`, {
      responseType: "blob",
    });
    return response;
  },
};

// Analytics
export const analyticsService = {
  getAdminAnalytics: async (params?: any) => {
    const response = await api.get("/api/analytics/admin", { params });
    return response.data;
  },
  getEmployeeAnalytics: async () => {
    const response = await api.get("/api/analytics/employee");
    return response.data;
  },
};

// Logs
export const logService = {
  getActivityLogs: async (params?: any) => {
    const response = await api.get("/api/logs", { params });
    return response.data;
  },
};

// Notifications
export const notificationService = {
  getNotifications: async () => {
    const response = await api.get("/api/notifications");
    return response.data;
  },
  markRead: async (notificationId?: number) => {
    const response = await api.put("/api/notifications/read", {
      notification_id: notificationId || null,
    });
    return response.data;
  },
};
