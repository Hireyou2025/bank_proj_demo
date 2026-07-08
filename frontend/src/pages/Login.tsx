import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Lock, Mail, FolderOpen, AlertCircle } from "lucide-react";

export const Login: React.FC = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect straight to their respective dashboard
  if (isAuthenticated && user) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/employee"} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await login({ email, password });
      if (data.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/employee");
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-250 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.08),rgba(255,255,255,0))]" />
      
      <div className="w-full max-w-md z-10">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-sky-500 rounded-2xl text-white shadow-lg shadow-sky-500/20 mb-3">
            <FolderOpen size={32} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Document Verification System
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Centralized Branch Workspace Login
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8 border border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold leading-relaxed border border-red-100 dark:border-red-950/40">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2"
              >
                Work Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="block w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-sm placeholder-slate-400 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-sm placeholder-slate-400 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold tracking-wide shadow-lg shadow-sky-500/10 hover:shadow-sky-600/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Signing In...</span>
                </div>
              ) : (
                "Authenticate Account"
              )}
            </button>
          </form>
          
          {/* Default Credentials Tips */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
            <h4 className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
              Testing Workspace Credentials
            </h4>
            <div className="mt-2.5 space-y-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <p>
                Admin:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  admin@workspace.com
                </span>{" "}
                / <span className="font-mono bg-slate-100 dark:bg-slate-800/80 px-1 py-0.5 rounded text-[11px]">AdminPassword123!</span>
              </p>
              <p>
                Employee:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  hyd_emp@workspace.com
                </span>{" "}
                / <span className="font-mono bg-slate-100 dark:bg-slate-800/80 px-1 py-0.5 rounded text-[11px]">EmpPassword123!</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
