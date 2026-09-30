import React, { useState, useEffect, useRef } from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { REPLAY_TIMELINE_STEPS, TimelineMilestone } from "../../data/deterministicScenario";
import {
  IconPlay,
  IconPause,
  IconCheckCircle2,
  IconClock,
  IconRotateCcw,
  IconFileText,
  IconShieldCheck,
  IconActivity,
  IconRadio,
  IconArrowLeft,
  IconArrowRight,
  IconSparkles,
  IconAlertTriangle,
} from "../icons";

export const IncidentReplayView: React.FC = () => {
  const { replayActiveStepIndex, setReplayStepIndex, resetDemo } = useDemoScenario();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2500);

  const currentMilestone: TimelineMilestone =
    REPLAY_TIMELINE_STEPS[replayActiveStepIndex] ?? (REPLAY_TIMELINE_STEPS[0] as TimelineMilestone);

  // Playback timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setReplayStepIndex((prev) => {
          if (prev >= REPLAY_TIMELINE_STEPS.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, playbackSpeed, setReplayStepIndex]);

  const handlePrev = () => {
    setIsPlaying(false);
    setReplayStepIndex(Math.max(0, replayActiveStepIndex - 1));
  };

  const handleNext = () => {
    setIsPlaying(false);
    setReplayStepIndex(Math.min(REPLAY_TIMELINE_STEPS.length - 1, replayActiveStepIndex + 1));
  };

  const togglePlay = () => {
    if (replayActiveStepIndex >= REPLAY_TIMELINE_STEPS.length - 1) {
      setReplayStepIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6 w-full max-w-[1600px] mx-auto font-mono">
      {/* ── Header ── */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-neutral-400">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">
              END-TO-END INCIDENT REPLAY & OPERATIONAL MEMORY
            </span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1 font-sans flex items-center gap-2">
            <span>Deterministic Post-Incident Audit: TG-2048</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold">
              CONTROLLED DEMONSTRATION REPLAY
            </span>
          </h1>
          <p className="text-xs text-slate-600 dark:text-neutral-400 mt-0.5">
            Append-oriented scenario timeline tracing closed-loop progression from initial sensor detection to verified human resolution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-500 text-emerald-800 dark:text-emerald-300 font-mono text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-xs">
            <IconCheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            STATUS: RESOLVED / READY FOR AUDIT
          </span>

          <button
            onClick={resetDemo}
            className="bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 text-xs border border-slate-300 dark:border-neutral-700 transition-all shadow-xs cursor-pointer"
          >
            <IconRotateCcw className="w-3.5 h-3.5" />
            <span>Reset State</span>
          </button>
        </div>
      </div>

      {/* ── Interactive Replay Transport Controls & Scrubber Strip ── */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-2">
              <IconClock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>INCIDENT REPLAY TRANSPORT</span>
            </span>

            {/* Transport Control Buttons */}
            <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-neutral-950 p-1 rounded-lg border border-slate-300 dark:border-neutral-800">
              <button
                onClick={handlePrev}
                disabled={replayActiveStepIndex === 0}
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-neutral-800 disabled:opacity-40 text-slate-700 dark:text-neutral-300 cursor-pointer"
                title="Previous Milestone"
              >
                <IconArrowLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={togglePlay}
                className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isPlaying ? <IconPause className="w-3.5 h-3.5" /> : <IconPlay className="w-3.5 h-3.5" />}
                <span>{isPlaying ? "Pause" : "Play Replay"}</span>
              </button>

              <button
                onClick={handleNext}
                disabled={replayActiveStepIndex === REPLAY_TIMELINE_STEPS.length - 1}
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-neutral-800 disabled:opacity-40 text-slate-700 dark:text-neutral-300 cursor-pointer"
                title="Next Milestone"
              >
                <IconArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500">
            <span>STEP {replayActiveStepIndex + 1} OF {REPLAY_TIMELINE_STEPS.length}</span>
            <span>•</span>
            <span>TIMELINE PROGRESS: {Math.round(((replayActiveStepIndex + 1) / REPLAY_TIMELINE_STEPS.length) * 100)}%</span>
          </div>
        </div>

        {/* Milestone Buttons Scrubber Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          {REPLAY_TIMELINE_STEPS.map((step, idx) => {
            const isSelected = replayActiveStepIndex === idx;
            const isPast = idx < replayActiveStepIndex;
            return (
              <button
                key={step.step}
                onClick={() => {
                  setIsPlaying(false);
                  setReplayStepIndex(idx);
                }}
                className={`flex flex-col items-start p-2.5 rounded-lg text-left transition-all border cursor-pointer ${
                  isSelected
                    ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-500 ring-2 ring-emerald-500/40 shadow-sm"
                    : isPast
                    ? "bg-slate-100 dark:bg-neutral-900 border-slate-300 dark:border-neutral-700 opacity-90"
                    : "bg-slate-50/80 dark:bg-neutral-950/80 border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-neutral-400 font-bold">
                    #{step.step}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 dark:text-neutral-500">{step.time}</span>
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate w-full mt-1">
                  {step.title}
                </div>
                <span
                  className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded mt-1 uppercase"
                  style={{
                    backgroundColor: `${step.badgeColor}20`,
                    color: step.badgeColor,
                    border: `1px solid ${step.badgeColor}40`,
                  }}
                >
                  {step.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Detailed Milestone Inspection Card ── */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-6 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <span
              className="p-3 rounded-xl font-bold font-mono text-base"
              style={{
                backgroundColor: `${currentMilestone.badgeColor}25`,
                color: currentMilestone.badgeColor,
                border: `1px solid ${currentMilestone.badgeColor}60`,
              }}
            >
              EVENT #{currentMilestone.step}
            </span>
            <div>
              <div className="text-xs font-mono text-slate-500 dark:text-neutral-400">
                TIMESTAMP: <strong className="text-slate-900 dark:text-white">{currentMilestone.time}</strong> | ACTOR:{" "}
                <strong className="text-emerald-600 dark:text-emerald-400">{currentMilestone.actor}</strong>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 font-sans">{currentMilestone.title}</h2>
            </div>
          </div>

          <span
            className="font-mono text-xs font-bold px-3 py-1 rounded-full border uppercase"
            style={{
              backgroundColor: `${currentMilestone.badgeColor}20`,
              color: currentMilestone.badgeColor,
              borderColor: currentMilestone.badgeColor,
            }}
          >
            PHASE: {currentMilestone.badge}
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-neutral-950 p-4 rounded-xl border border-slate-200 dark:border-neutral-800 text-sm text-slate-800 dark:text-neutral-200 leading-relaxed font-sans">
          {currentMilestone.description}
        </div>
      </div>

      {/* ── Signature Capability #4: Operational Memory Structured Comparative View ── */}
      <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <IconSparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                Operational Memory (Lifecycle Evolution & Decisional Trace)
              </h3>
              <p className="text-[11px] text-slate-400">
                Immutable 5-pillar operational trajectory: Initial baseline → telemetry shift → statutory order → scenario field evidence → living reassessment [CONTROLLED DEMO].
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
            AUDIT RECORD: TG-2048-V1
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          {/* Pillar 1: What was known then? */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="text-[10px] text-blue-400 uppercase font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>1. What was known then?</span>
            </div>
            <div className="text-[11px] text-slate-300 leading-relaxed space-y-1">
              <div><strong>Version 0 (Detection):</strong></div>
              <div>• Rainfall: 64.6mm / 184.6mm 7-day</div>
              <div>• Slope: 44.2° colluvial mica-schist</div>
              <div>• Remote Sensing only (54% Confidence)</div>
              <div>• Sentinel-2 88% cloud cover obscured</div>
              <div>• Piezometer offline at KM-41</div>
            </div>
          </div>

          {/* Pillar 2: What changed? */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-amber-800/40 space-y-2">
            <div className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>2. What changed?</span>
            </div>
            <div className="text-[11px] text-slate-300 leading-relaxed space-y-1">
              <div><strong>Version 1 (Reassessment):</strong></div>
              <div>• Rain Spike: +13.8mm (78.4mm current)</div>
              <div>• Hazard Risk: 86.0 → 91.4 (+5.4 breach)</div>
              <div>• Scenario Field Evidence: SDRF Alpha verified 45m tension crack with active mud slurry</div>
              <div>• Confidence: 54% → 82.5% (+28.5%)</div>
            </div>
          </div>

          {/* Pillar 3: What action was taken? */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-purple-800/40 space-y-2">
            <div className="text-[10px] text-purple-400 uppercase font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>3. What action was taken?</span>
            </div>
            <div className="text-[11px] text-slate-300 leading-relaxed space-y-1">
              <div><strong>Statutory Execution:</strong></div>
              <div>• DM West Kameng signed #DDMA-WK-884</div>
              <div>• Multi-Agency Dispatch: SDRF Alpha + BRO Project Vartak Task Force 14</div>
              <div>• CAP Alert broadcast to West Kameng</div>
              <div>• Physical Roadblock ordered at KM-38</div>
            </div>
          </div>

          {/* Pillar 4: What was observed? */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-emerald-800/40 space-y-2">
            <div className="text-[10px] text-emerald-400 uppercase font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>4. What was observed?</span>
            </div>
            <div className="text-[11px] text-slate-300 leading-relaxed space-y-1">
              <div><strong>Field Outcome:</strong></div>
              <div>• Cordon established at KM-38.2</div>
              <div>• Zero civilian traffic entered danger zone</div>
              <div>• Zero casualties recorded</div>
              <div>• Secondary slip arrested by catch-berm</div>
              <div>• Debris volume contained to 2,800 m³</div>
            </div>
          </div>

          {/* Pillar 5: What do we believe now? */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-cyan-800/40 space-y-2">
            <div className="text-[10px] text-cyan-400 uppercase font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>5. What do we believe now?</span>
            </div>
            <div className="text-[11px] text-slate-300 leading-relaxed space-y-1">
              <div><strong>Current Governance State:</strong></div>
              <div>• Closure Gate passed (All 7 gates green)</div>
              <div>• Next Best Information (NBI): Piezometer & crack gauge telemetry recommended</div>
              <div>• Traffic restored with single-lane escort</div>
              <div>• Transitioned to POST_INCIDENT_MONITORING</div>
              <div>• Geotechnical permanent anchor recommended</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
