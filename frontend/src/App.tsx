import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { Login } from "./pages/Login";
import { AdminDashboard } from "./pages/AdminDashboard";
import { EmployeeDashboard } from "./pages/EmployeeDashboard";
import { DocumentsList } from "./pages/DocumentsList";
import { EmployeesCRUD } from "./pages/EmployeesCRUD";
import { UploadWorkspace } from "./pages/UploadWorkspace";
import { LogsView } from "./pages/LogsView";
import { EmployeeTasks } from "./pages/EmployeeTasks";
import { Profile } from "./pages/Profile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Guard Component: Ensure user matches expected roles
const RoleRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/employee"} replace />;
  }

  return <>{children}</>;
};

// Root redirect handler
const RootRedirect: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === "admin" ? "/admin" : "/employee"} replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Workspace Layout Routes */}
            <Route element={<DashboardLayout />}>
              {/* Common root redirect */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="/profile" element={<Profile />} />

              {/* Admin specific routes */}
              <Route
                path="/admin"
                element={
                  <RoleRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/documents"
                element={
                  <RoleRoute allowedRoles={["admin"]}>
                    <DocumentsList />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/upload"
                element={
                  <RoleRoute allowedRoles={["admin"]}>
                    <UploadWorkspace />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/employees"
                element={
                  <RoleRoute allowedRoles={["admin"]}>
                    <EmployeesCRUD />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/logs"
                element={
                  <RoleRoute allowedRoles={["admin"]}>
                    <LogsView />
                  </RoleRoute>
                }
              />

              {/* Employee specific routes */}
              <Route
                path="/employee"
                element={
                  <RoleRoute allowedRoles={["employee"]}>
                    <EmployeeDashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="/employee/tasks"
                element={
                  <RoleRoute allowedRoles={["employee"]}>
                    <EmployeeTasks />
                  </RoleRoute>
                }
              />
            </Route>

            {/* Fallback wildcard path redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
