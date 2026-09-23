import React, { useState } from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
import { PrincipleBanner } from "../common";
import {
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconArrowRight,
  IconShieldAlert,
  IconShieldCheck,
  IconUserCheck,
  IconFileText,
} from "../icons";

export const AuthorityDecisionView: React.FC = () => {
  const {
    setStep,
    authorityDecision,
    decisionSigner,
    approveDecision,
    modifyDecision,
    rejectDecision,
  } = useDemoScenario();

  const [officerName, setOfficerName] = useState("P. Tsering, IAS (District Magistrate / Chairman DDMA)");
  const [authCode, setAuthCode] = useState("DDMA-WK-2026/884-A");

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6 w-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-neutral-400">
            <span>STEP 6 OF 10</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">AUTHORITY DECISION & GOVERNANCE GATE</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Statutory Hazard Authorization for NH-13 KM-42
          </h1>
          <p className="text-xs text-slate-600 dark:text-neutral-400 mt-0.5">
            Bounded AI recommendations require mandatory human magistrate approval before legally enforceable interventions are executed.
          </p>
        </div>

        {authorityDecision === "APPROVED" && (
          <button
            onClick={() => setStep(7)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm shadow-md transition-all"
          >
            <span>Proceed to Action Tracking</span>
            <IconArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* CORE CONSTITUTIONAL PRINCIPLE: AI RECOMMENDS -> HUMAN AUTHORIZES */}
      <PrincipleBanner
        principle="AI RECOMMENDS → HUMAN AUTHORIZES"
        title="Statutory Safety Boundary: Zero Autonomous Executive Closure"
        explanation="AI can detect, estimate, explain, prioritize, and coordinate. AI must NEVER independently order safety-critical authoritative decisions such as highway closures or population evacuations. An authorized government official (District Magistrate / Executive Magistrate) sits directly between recommendation and execution."
        variant="emerald"
      />

      {/* Main Grid: AI Recommendation vs Human Decision Gate */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: AI Recommendation Card (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col justify-between gap-4 shadow-sm min-w-0">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <span className="text-xs font-mono font-bold text-slate-600 dark:text-neutral-400 flex items-center gap-2">
                <IconFileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                SYSTEM-GENERATED RECOMMENDATION
              </span>
              <span className="text-[10px] font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800 font-bold">
                PROVENANCE: TG-POLICY-CORE-v2
              </span>
            </div>

            <div className="mt-4 bg-slate-50 dark:bg-neutral-950 p-4 rounded-xl border border-slate-200 dark:border-neutral-800 flex flex-col gap-3">
              <div className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                "Temporary commercial traffic restriction recommended on NH-13 KM-38 to KM-48."
              </div>
              <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed">
                Based on verified mud slurry encroachment (1.2m depth) and continuing precipitation (184mm), the carriageway is unsafe for heavy container haulage and petroleum tankers.
              </p>

              <div className="pt-2 border-t border-slate-200 dark:border-neutral-800/80 flex flex-col gap-2 text-xs">
                <span className="font-mono text-slate-500 dark:text-neutral-400 text-[11px] font-semibold">
                  PROPOSED OPERATIONAL MEASURES:
                </span>
                <div className="bg-white dark:bg-neutral-900 p-2.5 rounded border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-200">
                  1. <strong>Halt Heavy Freight:</strong> Enforce stoppage at KM-38 Police Checkpost.
                </div>
                <div className="bg-white dark:bg-neutral-900 p-2.5 rounded border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-200">
                  2. <strong>Light Vehicle Diversion:</strong> Route ambulances and 4WD vehicles via Tenga bypass.
                </div>
                <div className="bg-white dark:bg-neutral-900 p-2.5 rounded border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-200">
                  3. <strong>Machinery Mobilization:</strong> Pre-position BRO JCB and front loader at KM-40.
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-500 dark:text-neutral-500">
            Confidence backing recommendation: <span className="text-emerald-600 dark:text-emerald-400 font-bold">HIGH (94%)</span> | Hazard Priority: <span className="text-red-600 dark:text-red-400 font-bold">CRITICAL (P1)</span>
          </div>
        </div>

        {/* Right: Human Authority Action Gate (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-neutral-900 border-2 border-slate-300 dark:border-neutral-700 rounded-xl p-5 flex flex-col justify-between gap-4 shadow-sm min-w-0">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <IconUserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                DISTRICT DISASTER MANAGEMENT AUTHORITY (DDMA) SIGN-OFF
              </span>
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-neutral-950 px-2 py-0.5 rounded border border-emerald-300 dark:border-neutral-800 font-bold">
                STATUTORY SIGNATORY
              </span>
            </div>

            {/* Officer credential inputs */}
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-mono text-slate-600 dark:text-neutral-400 block mb-1">
                  AUTHORIZING OFFICIAL:
                </label>
                <input
                  type="text"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-600 dark:text-neutral-400 block mb-1">
                  OFFICIAL TOKEN / DISASTER ORDER CODE:
                </label>
                <input
                  type="text"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-300 dark:border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Current Decision State Display */}
            <div className="mt-4">
              {authorityDecision === "APPROVED" ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-600 p-4 rounded-xl flex items-center gap-3">
                  <IconCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 font-mono">
                      OFFICIALLY AUTHORIZED & SIGNED
                    </div>
                    <div className="text-xs text-slate-700 dark:text-neutral-200 mt-0.5">
                      Order enacted by {officerName} [{authCode}]. Dispatching operational tasks across agencies.
                    </div>
                  </div>
                </div>
              ) : authorityDecision === "MODIFIED" ? (
                <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-600 p-4 rounded-xl flex items-center gap-3">
                  <IconAlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  <div className="text-xs text-amber-800 dark:text-amber-200 font-mono">
                    MODIFIED: Conditional single-lane escort authorized for essential military convoys only.
                  </div>
                </div>
              ) : authorityDecision === "REJECTED" ? (
                <div className="bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-600 p-4 rounded-xl flex items-center gap-3">
                  <IconX className="w-6 h-6 text-red-600 dark:text-red-400" />
                  <div className="text-xs text-red-800 dark:text-red-200 font-mono">
                    REJECTED: Recommendation stood down. Highway remains open under caution.
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 dark:text-neutral-400 font-mono bg-slate-50 dark:bg-neutral-950 p-3 rounded-lg border border-slate-200 dark:border-neutral-800">
                  Select an authoritative determination below to proceed.
                </div>
              )}
            </div>
          </div>

          {/* Interactive Decision Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-neutral-800 flex flex-wrap items-center gap-3">
            <button
              onClick={() => approveDecision(officerName, authCode)}
              className={`flex-1 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-xs shadow-md transition-all ${
                authorityDecision === "APPROVED"
                  ? "bg-emerald-600 text-white ring-2 ring-emerald-400"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              <IconCheck className="w-4 h-4" />
              <span>APPROVE RESTRICTION</span>
            </button>

            <button
              onClick={() => modifyDecision(officerName, "Conditional single-lane detour via Tenga")}
              className="bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 font-semibold py-3 px-4 rounded-lg text-xs border border-slate-300 dark:border-neutral-700 transition-all"
            >
              MODIFY
            </button>

            <button
              onClick={() => rejectDecision(officerName, "Precautionary stand-down ordered")}
              className="bg-slate-100 dark:bg-neutral-900 hover:bg-red-50 dark:hover:bg-red-950/60 text-red-600 dark:text-red-400 font-semibold py-3 px-4 rounded-lg text-xs border border-slate-300 dark:border-neutral-800 hover:border-red-300 dark:hover:border-red-800 transition-all"
            >
              REJECT
            </button>
          </div>
        </div>
      </div>

      {/* Decision Intelligence & Next-Best-Information (Prompt 05) */}
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm flex flex-col gap-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold">
              NBI
            </span>
            <span className="font-bold text-sm text-slate-900 dark:text-white">
              DECISION INTELLIGENCE: NEXT-BEST-INFORMATION MATRIX
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded font-bold border border-emerald-300 dark:border-emerald-700">
            UNCERTAINTY REDUCTION ENGINE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-50 dark:bg-neutral-950 p-3.5 rounded-lg border border-slate-200 dark:border-neutral-800 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center justify-between font-bold text-xs text-slate-900 dark:text-white mb-1">
                <span>1. Ground Truth Inspection</span>
                <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">+35% Conf. Gain</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-neutral-400 font-sans leading-relaxed">
                Dispatch SDRF ground patrol to inspect KM-42 toe sloughing and confirm carriageway encroachment.
              </p>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-neutral-500 font-mono pt-2 border-t border-slate-200 dark:border-neutral-800">
              Target: FIELD_PATROL • Authority: Operator Dispatch
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-neutral-950 p-3.5 rounded-lg border border-slate-200 dark:border-neutral-800 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center justify-between font-bold text-xs text-slate-900 dark:text-white mb-1">
                <span>2. SAR Radar Coherence</span>
                <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">+15% Conf. Gain</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-neutral-400 font-sans leading-relaxed">
                Acquire Sentinel-1 InSAR radar pass to penetrate 88% monsoon cloud cover and measure shear strain.
              </p>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-neutral-500 font-mono pt-2 border-t border-slate-200 dark:border-neutral-800">
              Target: SATELLITE_RADAR • Authority: Automated Ingestion
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-neutral-950 p-3.5 rounded-lg border border-slate-200 dark:border-neutral-800 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center justify-between font-bold text-xs text-slate-900 dark:text-white mb-1">
                <span>3. Precautionary Diversion</span>
                <span className="text-amber-600 dark:text-amber-400 text-[10px]">CORRIDOR SAFETY</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-neutral-400 font-sans leading-relaxed">
                Enforce traffic stoppage at KM-38 checkpost to prevent civilian vehicles from entering the active slope zone.
              </p>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-neutral-500 font-mono pt-2 border-t border-slate-200 dark:border-neutral-800">
              Target: TRAFFIC_POLICE • Authority: District Magistrate Sign-off
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400 font-mono">
          <span>Governance Principle: <strong>AI ASSISTS REASONING • RULES GOVERN STATE TRANSITIONS • HUMANS AUTHORIZE ACTIONS</strong></span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">SEC 34 DM ACT 2005 COMPLIANT</span>
        </div>
      </div>
    </div>
  );
};

