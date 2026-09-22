import React, { useState } from "react";
import { useAuth, DEMO_ACCOUNTS } from "../../context/AuthContext";
import { ThemeToggle } from "../common";
import {
  IconShieldCheck,
  IconRadio,
  IconMapPin,
  IconArrowRight,
  IconAlertTriangle,
  IconActivity,
  IconLock,
} from "../icons";

interface LoginViewProps {
  onCancel?: () => void;
  onSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onCancel, onSuccess }) => {
  const { login, isLoading, loginError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedDemoUser, setSelectedDemoUser] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    const success = await login({ username: username.trim(), password });
    if (success && onSuccess) {
      onSuccess();
    }
  };

  const handleSelectDemo = async (demoUsername: string, pass: string) => {
    setUsername(demoUsername);
    setPassword(pass);
    setSelectedDemoUser(demoUsername);

    const success = await login({ username: demoUsername, password: pass });
    if (success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-100 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 transition-colors">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 font-black text-white shadow-md shadow-emerald-950/20 text-sm">
            TG
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                TerraGuardian AI
              </span>
              <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                AUTHORITY GATEWAY
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono">
              Govt. of India • North Eastern Region Disaster Operations
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white font-mono transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </header>

      {/* Main Login Workspace */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Sign-In Form (6 cols) */}
          <div className="lg:col-span-6 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
                <IconShieldCheck className="w-4 h-4" />
                <span>SERVER-VERIFIED RBAC AUTHENTICATION</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Operations Sign-In
              </h1>
              <p className="text-xs text-slate-600 dark:text-neutral-400 mt-1.5 leading-relaxed">
                Enter your authorized service credentials to access the North Eastern Region command network, authority queues, and incident digital twins.
              </p>
            </div>

            {/* Error Banner */}
            {loginError && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-start gap-2.5 text-xs text-red-900 dark:text-red-200">
                <IconAlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-bold">Authentication Failed:</span> {loginError}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 dark:text-neutral-300 mb-1.5 uppercase">
                  Service Username or Official Email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. operator or operator@terraguardian.gov.in"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 dark:text-neutral-300 mb-1.5 uppercase">
                  Access Key / Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Session...</span>
                  </>
                ) : (
                  <>
                    <span>Authenticate & Access Workspace</span>
                    <IconArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400 font-mono">
              <span>Security: SHA256 PBKDF2 + JWT</span>
              <span>Inactivity Timeout: 12 Hours</span>
            </div>
          </div>

          {/* Right Column: DEMO / LOCAL ONLY Credentials (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <IconRadio className="w-4 h-4 text-amber-600" />
                  DEMO / LOCAL ONLY CREDENTIALS
                </span>
                <span className="bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                  ONE-CLICK SIGN-IN
                </span>
              </div>
              <p className="text-xs text-amber-900 dark:text-amber-200/90 mt-1.5 leading-relaxed">
                Click any seeded official account below to immediately authenticate and inspect that role's authority boundaries. (Derived via <code>POST /api/v1/auth/login</code>).
              </p>

              <div className="mt-4 flex flex-col gap-2.5">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isSelected = selectedDemoUser === acc.username;
                  return (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() => handleSelectDemo(acc.username, acc.passwordHint)}
                      className={`text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500"
                          : "bg-white dark:bg-neutral-900 border-amber-200 dark:border-amber-800/60 hover:border-emerald-400 dark:hover:border-emerald-600 shadow-xs"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {acc.fullName}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                              acc.role === "AUTHORIZED_DECISION_MAKER"
                                ? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300"
                                : acc.role === "OPERATOR"
                                ? "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300"
                                : acc.role === "FIELD_VERIFIER"
                                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300"
                                : "bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {acc.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono mt-0.5">
                          {acc.agency} • Badge: {acc.badgeNumber}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-neutral-300 mt-1 leading-snug">
                          {acc.description}
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end">
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">
                          Sign In →
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 mt-1">
                          Pass: {acc.passwordHint}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Public bypass notice */}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-2.5 text-center text-xs font-mono text-slate-600 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 transition-colors"
              >
                ← Return to Public Citizen Portal (TerraGuardian Safe)
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
