import React, { useState } from "react";
import { useAuth, COMMAND_DEMO_ACCOUNTS } from "../../context/AuthContext";
import { ThemeToggle, LanguageSelector } from "../common";
import { useI18n } from "../../context/I18nContext";
import {
  IconShieldCheck,
  IconRadio,
  IconArrowRight,
  IconAlertTriangle,
  IconLock,
} from "../icons";

interface LoginViewProps {
  onCancel?: () => void;
  onSuccess?: () => void;
  onNavigateCitizen?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onCancel,
  onSuccess,
  onNavigateCitizen,
}) => {
  const { login, isLoading, loginError } = useAuth();
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedDemoUser, setSelectedDemoUser] = useState<string | null>(null);
  const [localDismissError, setLocalDismissError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLocalDismissError(false);
    const success = await login({ username: username.trim(), password });
    if (success && onSuccess) {
      onSuccess();
    }
  };

  const handleSelectDemo = async (demoUsername: string, pass: string) => {
    setUsername(demoUsername);
    setPassword(pass);
    setSelectedDemoUser(demoUsername);
    setLocalDismissError(false);

    const success = await login({ username: demoUsername, password: pass });
    if (success && onSuccess) {
      onSuccess();
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "OPERATOR":
        return "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "ASSESSMENT_OFFICER":
        return "bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800";
      case "FIELD_RESPONDER":
        return "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "AUTHORIZATION_OFFICER":
        return "bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "REVIEWER":
        return "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
      default:
        return "bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border-slate-200 dark:border-neutral-700";
    }
  };

  const displayedError = !localDismissError && loginError;

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col bg-slate-100 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 transition-colors overflow-y-auto lg:overflow-hidden font-sans">
      {/* Top Global Header Bar */}
      <header className="shrink-0 border-b border-slate-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md px-6 py-3 flex items-center justify-between">
        <div
          onClick={onCancel}
          className={`flex items-center gap-3 ${onCancel ? "cursor-pointer group" : ""}`}
          title={onCancel ? "Return to Portal" : undefined}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 p-1 shadow-sm overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
            <img src="/logo-shield.png" alt="TerraGuardian Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                {t("app_title") || "TerraGuardian AI"}
              </span>
              <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 font-mono border border-emerald-300 dark:border-emerald-700/50">
                {t("login_header_badge")}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono">
              {t("login_header_sub")}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <LanguageSelector variant="standard" />
          <ThemeToggle />
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white font-mono transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-800"
            >
              {t("login_exit_btn")}
            </button>
          )}
        </div>
      </header>

      {/* Main Single-Viewport Layout */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Official Authentication Form (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-bold uppercase tracking-wider mb-1">
                  <IconShieldCheck className="w-4 h-4" />
                  <span>{t("login_card_badge")}</span>
                </div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {t("login_card_title")}
                </h1>
                <p className="text-xs text-slate-600 dark:text-neutral-400 mt-1 leading-relaxed">
                  {t("login_card_desc")}
                </p>
              </div>

              {/* Error Alert Box */}
              {displayedError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start justify-between gap-2.5 text-xs text-rose-900 dark:text-rose-200">
                  <div className="flex items-start gap-2">
                    <IconAlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="leading-snug">
                      <div className="font-bold uppercase tracking-wide text-[10px] text-rose-700 dark:text-rose-400">
                        AUTHENTICATION FAILED
                      </div>
                      <div className="mt-0.5">{loginError}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocalDismissError(true)}
                    className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
                    title="Dismiss"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* Credentials Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                <div>
                  <label
                    htmlFor="username"
                    className="block text-[11px] font-mono font-bold text-slate-700 dark:text-neutral-300 mb-1 uppercase"
                  >
                    {t("login_user_label")}
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. operator or operator@terraguardian.gov.in"
                    required
                    disabled={isLoading}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-[11px] font-mono font-bold text-slate-700 dark:text-neutral-300 mb-1 uppercase"
                  >
                    {t("login_pass_label")}
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    disabled={isLoading}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !username.trim() || !password.trim()}
                  className="mt-1 w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="font-mono tracking-wider">{t("login_btn_authenticating")}</span>
                    </>
                  ) : (
                    <>
                      <span>{t("login_btn_submit")}</span>
                      <IconArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Form Footer */}
            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-neutral-400 font-mono">
              <span className="flex items-center gap-1">
                <IconLock className="w-3 h-3 text-slate-400" />
                Security: SHA256 PBKDF2 + JWT
              </span>
              <span>Session Timeout: 12 Hours</span>
            </div>
          </div>

          {/* Right Column: Demo Role Presets (7 cols) */}
          <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold text-xs">
                    <IconRadio className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t("login_demo_badge")}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                    {t("login_demo_sub")}
                  </p>
                </div>
                <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-700">
                  DEMO / LOCAL ONLY PRESETS
                </span>
              </div>

              {/* Accounts List */}
              <div className="space-y-2">
                {COMMAND_DEMO_ACCOUNTS.map((acc) => {
                  const isSelected = selectedDemoUser === acc.username && isLoading;
                  return (
                    <div
                      key={acc.username}
                      className="group border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 rounded-xl p-2.5 transition-all flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-neutral-950/40 hover:bg-slate-50 dark:hover:bg-neutral-950/80"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {acc.roleLabel}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${getRoleBadgeStyle(
                              acc.role
                            )}`}
                          >
                            {acc.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-neutral-400 mt-0.5 truncate">
                          {acc.fullName} • {acc.agency}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-neutral-500 font-mono mt-0.5">
                          {acc.description} ({acc.badgeNumber})
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectDemo(acc.username, acc.passwordHint)}
                        disabled={isLoading}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-neutral-800 hover:bg-emerald-600 dark:hover:bg-emerald-600 text-white font-mono text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {isSelected ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Signing In...</span>
                          </span>
                        ) : (
                          <span>Sign In →</span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Citizen Notice / Safe Link */}
            <div className="pt-3 mt-3 border-t border-slate-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <span className="text-slate-500 dark:text-neutral-400 text-[11px]">
                {t("login_citizen_prompt")}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onNavigateCitizen || onCancel}
                  className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <span>{t("login_citizen_link")}</span>
                  <IconArrowRight className="w-3 h-3" />
                </button>

                {onCancel && (
                  <>
                    <span className="text-slate-300 dark:text-neutral-700">•</span>
                    <button
                      type="button"
                      onClick={onCancel}
                      className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-neutral-200 hover:underline cursor-pointer"
                    >
                      {t("login_exit_btn")}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
