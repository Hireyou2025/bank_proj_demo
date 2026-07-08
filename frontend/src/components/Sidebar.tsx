import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  Users,
  History,
  User,
  LogOut,
  FolderOpen,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  if (!user) return null;
  
  const isAdmin = user.role === "admin";
  
  const menuItems = isAdmin
    ? [
        {
          name: "Dashboard",
          path: "/admin",
          icon: LayoutDashboard,
        },
        {
          name: "Documents",
          path: "/admin/documents",
          icon: FileText,
        },
        {
          name: "Upload Workspace",
          path: "/admin/upload",
          icon: UploadCloud,
        },
        {
          name: "Employees",
          path: "/admin/employees",
          icon: Users,
        },
        {
          name: "Activity Audit Logs",
          path: "/admin/logs",
          icon: History,
        },
      ]
    : [
        {
          name: "My Dashboard",
          path: "/employee",
          icon: LayoutDashboard,
        },
        {
          name: "My Assigned Work",
          path: "/employee/tasks",
          icon: FileText,
        },
      ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform glass-panel ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0 border-r border-slate-200 dark:border-slate-800`}
    >
      <div className="h-full px-4 py-6 flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Logo Brand */}
          <div className="flex items-center gap-3 px-2 mb-8">
            <div className="p-2 bg-sky-500 rounded-xl text-white">
              <FolderOpen size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
                DocVerify
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Enterprise Workspace
              </p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile card & Logout */}
        <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-6">
          <Link
            to="/profile"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              location.pathname === "/profile"
                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
          >
            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-600">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">
                {user.name}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                {user.role}
              </p>
            </div>
          </Link>

          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
