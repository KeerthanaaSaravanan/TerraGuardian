import React, { useState } from "react";
import { useDemoScenario } from "../../context/DemoScenarioContext";
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
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-neutral-400">
            <span>STEP 6 OF 10</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">AUTHORITY DECISION & GOVERNANCE GATE</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight mt-1">
            Statutory Hazard Authorization for NH-13 KM-42
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
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
      <div className="bg-gradient-to-r from-emerald-950/70 via-neutral-900 to-blue-950/70 border-2 border-emerald-500/80 rounded-xl p-5 shadow-xl flex items-start gap-4">
        <span className="p-3 rounded-xl bg-emerald-900/60 text-emerald-300 border border-emerald-600/60 shadow">
          <IconShieldCheck className="w-6 h-6" />
        </span>
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono text-xs uppercase font-bold text-emerald-400">
            <span>TERRAGUARDIAN CONSTITUTIONAL MANDATE:</span>
            <span className="bg-emerald-500 text-neutral-950 px-2 py-0.2 rounded font-black text-xs">
              AI RECOMMENDS. AUTHORIZED HUMAN DECIDES.
            </span>
          </div>
          <div className="text-base font-bold text-white">
            Statutory Safety Boundary: Zero Autonomous Executive Closure
          </div>
          <p className="text-xs text-neutral-300 max-w-4xl leading-relaxed">
            AI can detect, estimate, explain, prioritize, and coordinate. <strong>AI must NEVER independently order safety-critical authoritative decisions</strong> such as highway closures or population evacuations.
            An authorized government official (District Magistrate / Executive Magistrate) sits directly between recommendation and execution.
          </p>
        </div>
      </div>

      {/* Main Grid: AI Recommendation vs Human Decision Gate */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: AI Recommendation Card (6 cols) */}
        <div className="lg:col-span-6 bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between gap-4 shadow-lg">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <span className="text-xs font-mono font-bold text-neutral-400 flex items-center gap-2">
                <IconFileText className="w-4 h-4 text-purple-400" />
                SYSTEM-GENERATED RECOMMENDATION
              </span>
              <span className="text-[10px] font-mono text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                PROVENANCE: TG-POLICY-CORE-v2
              </span>
            </div>

            <div className="mt-4 bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col gap-3">
              <div className="text-sm font-bold text-white leading-snug">
                "Temporary commercial traffic restriction recommended on NH-13 KM-38 to KM-48."
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Based on verified mud slurry encroachment (1.2m depth) and continuing precipitation (184mm), the carriageway is unsafe for heavy container haulage and petroleum tankers.
              </p>

              <div className="pt-2 border-t border-neutral-800/80 flex flex-col gap-2 text-xs">
                <span className="font-mono text-neutral-400 text-[11px] font-semibold">
                  PROPOSED OPERATIONAL MEASURES:
                </span>
                <div className="bg-neutral-900 p-2 rounded text-neutral-200">
                  1. <strong>Halt Heavy Freight:</strong> Enforce stoppage at KM-38 Police Checkpost.
                </div>
                <div className="bg-neutral-900 p-2 rounded text-neutral-200">
                  2. <strong>Light Vehicle Diversion:</strong> Route ambulances and 4WD vehicles via Tenga bypass.
                </div>
                <div className="bg-neutral-900 p-2 rounded text-neutral-200">
                  3. <strong>Machinery Mobilization:</strong> Pre-position BRO JCB and front loader at KM-40.
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-neutral-500">
            Confidence backing recommendation: <span className="text-emerald-400 font-bold">HIGH (94%)</span> | Hazard Priority: <span className="text-red-400 font-bold">CRITICAL (P1)</span>
          </div>
        </div>

        {/* Right: Human Authority Action Gate (6 cols) */}
        <div className="lg:col-span-6 bg-neutral-900 border-2 border-neutral-700 rounded-xl p-5 flex flex-col justify-between gap-4 shadow-lg">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-2">
                <IconUserCheck className="w-4 h-4 text-emerald-400" />
                DISTRICT DISASTER MANAGEMENT AUTHORITY (DDMA) SIGN-OFF
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                STATUTORY SIGNATORY
              </span>
            </div>

            {/* Officer credential inputs */}
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-mono text-neutral-400 block mb-1">
                  AUTHORIZING OFFICIAL:
                </label>
                <input
                  type="text"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-neutral-400 block mb-1">
                  OFFICIAL TOKEN / DISASTER ORDER CODE:
                </label>
                <input
                  type="text"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Current Decision State Display */}
            <div className="mt-4">
              {authorityDecision === "APPROVED" ? (
                <div className="bg-emerald-950/60 border border-emerald-600 p-4 rounded-xl flex items-center gap-3">
                  <IconCheck className="w-6 h-6 text-emerald-400" />
                  <div>
                    <div className="text-xs font-bold text-emerald-300 font-mono">
                      OFFICIALLY AUTHORIZED & SIGNED
                    </div>
                    <div className="text-xs text-neutral-200 mt-0.5">
                      Order enacted by {officerName} [{authCode}]. Dispatching operational tasks across agencies.
                    </div>
                  </div>
                </div>
              ) : authorityDecision === "MODIFIED" ? (
                <div className="bg-amber-950/60 border border-amber-600 p-4 rounded-xl flex items-center gap-3">
                  <IconAlertTriangle className="w-6 h-6 text-amber-400" />
                  <div className="text-xs text-amber-200 font-mono">
                    MODIFIED: Conditional single-lane escort authorized for essential military convoys only.
                  </div>
                </div>
              ) : authorityDecision === "REJECTED" ? (
                <div className="bg-red-950/60 border border-red-600 p-4 rounded-xl flex items-center gap-3">
                  <IconX className="w-6 h-6 text-red-400" />
                  <div className="text-xs text-red-200 font-mono">
                    REJECTED: Recommendation stood down. Highway remains open under caution.
                  </div>
                </div>
              ) : (
                <div className="text-xs text-neutral-400 font-mono bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                  Select an authoritative determination below to proceed.
                </div>
              )}
            </div>
          </div>

          {/* Interactive Decision Buttons */}
          <div className="pt-4 border-t border-neutral-800 flex flex-wrap items-center gap-3">
            <button
              onClick={approveDecision}
              className={`flex-1 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-xs shadow-lg transition-all ${
                authorityDecision === "APPROVED"
                  ? "bg-emerald-600 text-white ring-2 ring-emerald-400"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              <IconCheck className="w-4 h-4" />
              <span>APPROVE RESTRICTION</span>
            </button>

            <button
              onClick={modifyDecision}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold py-3 px-4 rounded-lg text-xs border border-neutral-700 transition-all"
            >
              MODIFY
            </button>

            <button
              onClick={rejectDecision}
              className="bg-neutral-900 hover:bg-red-950/60 text-red-400 hover:text-red-300 font-semibold py-3 px-4 rounded-lg text-xs border border-neutral-800 hover:border-red-800 transition-all"
            >
              REJECT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
