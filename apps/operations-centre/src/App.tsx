import type { FC } from "react";

/**
 * Operations Centre application shell.
 *
 * Layout: Sidebar | Map + Panels
 * This is a structural placeholder — full implementation in later phases.
 */
export const App: FC = () => {
  return (
    <div className="flex h-screen w-screen bg-neutral-950 text-neutral-100">
      {/* Sidebar */}
      <aside className="flex w-16 flex-col items-center border-r border-neutral-800 bg-neutral-900 py-4">
        <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
          TG
        </div>
        <nav className="flex flex-1 flex-col gap-3" aria-label="Primary navigation">
          {/* Navigation icons will be added in later phases */}
        </nav>
      </aside>

      {/* Main content area */}
      <main className="flex flex-1 flex-col">
        {/* Header bar */}
        <header className="flex h-14 items-center border-b border-neutral-800 bg-neutral-900 px-6">
          <h1 className="text-lg font-semibold tracking-tight">
            TerraGuardian <span className="font-normal text-neutral-400">Operations Centre</span>
          </h1>
        </header>

        {/* Map area placeholder */}
        <div className="flex flex-1 items-center justify-center bg-neutral-950">
          <p className="text-neutral-500">
            Map view — MapLibre GL JS integration in next phase
          </p>
        </div>
      </main>
    </div>
  );
};
