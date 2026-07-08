import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { NotificationDropdown } from "./NotificationDropdown";
import { Sun, Moon, MapPin, Menu } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { branchService } from "../services/api";

interface NavbarProps {
  toggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ toggleSidebar }) => {
  const { user } = useAuth();
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  // Fetch branches to resolve user's branch name
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: branchService.getBranches,
    enabled: !!user,
  });

  const userBranch = branches.find((b: any) => b.id === user?.branch_id);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      root.classList.remove("dark");
      document.body.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-6">
      <div className="flex items-center gap-4">
        {/* Sidebar Toggle for Mobile */}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden text-slate-500"
        >
          <Menu size={20} />
        </button>

        {/* Branch Context Indicator */}
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-sans">
          <MapPin size={18} className="text-sky-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {userBranch ? `${userBranch.name} Branch` : "Central Workspace"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-all duration-200"
          aria-label="Toggle Theme"
        >
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* Notifications Icon and dropdown */}
        <NotificationDropdown />

        {/* Vertical Separator */}
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Quick User Avatar */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 font-sans">
              {user.name}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold font-sans capitalize">
              {user.role}
            </p>
          </div>
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold border border-sky-200 dark:border-sky-800">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};
