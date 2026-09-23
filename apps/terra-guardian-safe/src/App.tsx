import type { FC } from "react";

/**
 * TerraGuardian Safe — Citizen application shell.
 *
 * Mobile-first, minimal, clean, rich in colour,
 * highly legible and extremely easy to understand.
 *
 * Must NOT expose Operations Centre complexity.
 */
export const App: FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="bg-emerald-600 px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 p-1 shadow-sm overflow-hidden shrink-0">
            <img src="/logo-shield.png" alt="TerraGuardian Safe Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">TerraGuardian Safe</h1>
            <p className="text-xs text-emerald-100">Your landslide safety companion</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <span className="text-3xl" role="img" aria-label="shield">🛡️</span>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-neutral-800">
            Stay Safe
          </h2>
          <p className="mb-8 text-neutral-500">
            Report observations · Get alerts · Stay informed
          </p>
          <button
            className="rounded-full bg-emerald-600 px-8 py-3 text-base font-semibold text-white shadow-lg transition-colors hover:bg-emerald-700 active:bg-emerald-800"
            type="button"
          >
            Report Observation
          </button>
        </div>
      </main>

      {/* Bottom navigation placeholder */}
      <nav
        className="flex h-16 items-center justify-around border-t border-neutral-200 bg-white px-4"
        aria-label="Main navigation"
      >
        <span className="text-xs text-emerald-600 font-medium">Home</span>
        <span className="text-xs text-neutral-400">Alerts</span>
        <span className="text-xs text-neutral-400">Report</span>
        <span className="text-xs text-neutral-400">Status</span>
      </nav>
    </div>
  );
};
