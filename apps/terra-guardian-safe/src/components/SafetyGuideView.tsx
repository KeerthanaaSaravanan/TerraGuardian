import React from "react";

export const SafetyGuideView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 pb-16">
      <header className="sticky top-0 z-30 bg-emerald-700 text-white px-4 py-3 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-xs bg-emerald-800/80 hover:bg-emerald-900 px-2.5 py-1 rounded font-medium">
            ← Back
          </button>
          <span className="font-bold text-sm">Landslide Safety Guidelines</span>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4">
        {/* Emergency Contacts */}
        <div className="bg-red-50 rounded-2xl border border-red-200 p-4 space-y-2">
          <h3 className="font-bold text-sm text-red-900">🚨 Emergency Contact Numbers</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-red-100">
              <div className="text-slate-500 text-[10px]">National Emergency</div>
              <div className="font-mono font-bold text-red-700 text-sm">112</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-red-100">
              <div className="text-slate-500 text-[10px]">Disaster Management (NDMA)</div>
              <div className="font-mono font-bold text-red-700 text-sm">1078</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-red-100">
              <div className="text-slate-500 text-[10px]">Border Roads Organisation</div>
              <div className="font-mono font-bold text-slate-800 text-sm">Vartak Control</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-red-100">
              <div className="text-slate-500 text-[10px]">SDRF Arunachal HQ</div>
              <div className="font-mono font-bold text-slate-800 text-sm">1070</div>
            </div>
          </div>
        </div>

        {/* Warning Signs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <h3 className="font-bold text-sm text-slate-900">⚠️ Critical Warning Signs</h3>
          <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
            <li>New cracks appearing in road pavement, retaining walls, or cut slopes.</li>
            <li>Sudden appearance of muddy water bubbling from hillsides.</li>
            <li>Fencing, utility poles, or trees tilting uphill or downhill.</li>
            <li>Faint rumbling sounds that increase in volume as debris flows.</li>
          </ul>
        </div>

        {/* What to do during a landslide */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <h3 className="font-bold text-sm text-slate-900">🛡️ Immediate Action in a Landslide</h3>
          <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
            <li><strong>Stay Alert:</strong> Do not drive across moving mud or washed-out road sections.</li>
            <li><strong>Evacuate Upward/Outward:</strong> Move away from the path of the flow to stable high ground.</li>
            <li><strong>Stay in Vehicle if Safe:</strong> If caught in your car with nowhere to run, curl into a tight ball and protect your head.</li>
            <li><strong>Listen to Radio/Signage:</strong> Strictly follow Border Roads Organisation and police diversions.</li>
          </ul>
        </div>
      </main>
    </div>
  );
};
