"use client";

import { useState } from "react";
import Header from "@/components/Header";
import TimetableGrid from "@/components/TimetableGrid";
import InputPanel from "@/components/InputPanel";
import ConflictPanel from "@/components/ConflictPanel";
import ScorePanel from "@/components/ScorePanel";
import AIPanel from "@/components/AIPanel";
import ExportPanel from "@/components/ExportPanel";
import { ManagementPanel } from "@/components/ManagementPanel";
import SavedTimetablesPanel from "@/components/SavedTimetablesPanel";
import { useTimetableStore } from "@/store/timetable-store";
import { AlertCircle, Save, X } from "lucide-react";

export default function Home() {
  const {
    activeTab,
    violations,
    output,
    timetable,
    generateError,
    clearGenerateError,
    saveTimetable,
    selectedClassId,
    selectedClassName,
  } = useTimetableStore();

  const [isSaving, setIsSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    setSavedOk(false);
    const id = await saveTimetable();
    setIsSaving(false);
    if (id) {
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* ── Generation error banner ───────────────────────────────────────── */}
      {generateError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="max-w-screen-2xl mx-auto flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-red-700">{generateError.message}</p>
              {generateError.details && generateError.details.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {generateError.details.map((d, i) => (
                    <li key={i} className="text-red-600">• {d}</li>
                  ))}
                </ul>
              )}
            </div>
            <button onClick={clearGenerateError} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-5">
        {/* ── Input Setup Tab ──────────────────────────────────────────── */}
        {activeTab === "input" && (
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-5">
            <div className="space-y-4">
              <InputPanel />
            </div>
            <div className="hidden lg:flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 min-h-[400px]">
              <div className="text-center text-slate-400">
                <div className="text-5xl mb-3">📅</div>
                <p className="font-medium text-slate-600">Configure your school on the left</p>
                <p className="text-sm mt-1">Then click Generate to build the timetable</p>
                <div className="mt-6 grid grid-cols-2 gap-3 text-left max-w-xs mx-auto">
                  {[
                    ["CSP Solver", "Backtracking + forward checking"],
                    ["Local Search", "800-iteration soft-constraint optimizer"],
                    ["3 Options", "Diverse alternate timetables generated"],
                    ["Drag & Drop", "Edit by dragging cells"],
                  ].map(([title, desc]) => (
                    <div key={title} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-700">{title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Timetable Tab ─────────────────────────────────────────────── */}
        {activeTab === "timetable" && (
          <div className="space-y-4">
            {/* Save bar */}
            {timetable && (
              <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3">
                <div className="text-sm">
                  {selectedClassName ? (
                    <span className="font-semibold text-slate-800">{selectedClassName}</span>
                  ) : (
                    <span className="text-slate-500">Generated timetable</span>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !selectedClassId}
                  title={!selectedClassId ? "Select a class first to save" : "Save timetable to database"}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Save size={13} />
                  {isSaving ? "Saving…" : savedOk ? "Saved!" : "Save Timetable"}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5">
              <div className="space-y-4">
                <TimetableGrid />
                {timetable && (
                  <ConflictPanel violations={violations} />
                )}
                {/* Saved timetables browser */}
                <SavedTimetablesPanel />
              </div>

              {output && (
                <div className="space-y-4">
                  <ScorePanel
                    score={output.optimizationScore}
                    breakdown={output.scoreBreakdown}
                    metadata={output.metadata}
                  />

                  {/* Quick instructions */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 text-xs text-slate-600 space-y-2">
                    <p className="font-semibold text-slate-700">Editing Guide</p>
                    <ul className="space-y-1.5">
                      <li className="flex items-start gap-1.5">
                        <span className="text-blue-500 mt-0.5">→</span>
                        <span><strong>Drag</strong> a cell to an empty slot to move it</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-blue-500 mt-0.5">→</span>
                        <span><strong>Drag</strong> onto a filled cell to swap both</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-blue-500 mt-0.5">→</span>
                        <span>Hover a cell and click the <strong>lock icon</strong> to prevent changes</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-blue-500 mt-0.5">→</span>
                        <span>Hover a cell and click <strong>×</strong> to clear it</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-blue-500 mt-0.5">→</span>
                        <span>Use <strong>Re-solve</strong> to regenerate unlocked slots</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── AI Assistant Tab ──────────────────────────────────────────── */}
        {activeTab === "ai" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 min-h-[600px] flex flex-col">
              <div>
                <h2 className="text-base font-semibold text-slate-900">AI Scheduling Assistant</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Describe rules in plain English — the system interprets them as constraints.
                </p>
              </div>
              <div className="flex-1 min-h-0">
                <AIPanel />
              </div>
            </div>

            <div className="space-y-4">
              {/* How it works */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Supported Patterns</h3>
                <div className="space-y-2.5 text-xs text-slate-600">
                  {[
                    { pattern: "Put [subject] in morning", result: "subject_in_morning constraint" },
                    { pattern: "Avoid [subject] on [day]", result: "subject_avoid_day constraint" },
                    { pattern: "[teacher] only on [day]", result: "teacher_only_day constraint" },
                    { pattern: "No consecutive [subject]", result: "subject_consecutive_avoid" },
                    { pattern: "[subject] in afternoon", result: "prefer afternoon slots" },
                  ].map(({ pattern, result }) => (
                    <div key={pattern} className="flex flex-col gap-0.5">
                      <code className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">{pattern}</code>
                      <span className="text-slate-400 text-[10px] pl-1">→ {result}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700">
                <p className="font-semibold mb-1">After adding constraints:</p>
                <p>Click <strong>Generate</strong> in the header to create a new timetable that respects these rules.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Export Tab ───────────────────────────────────────────────── */}
        {activeTab === "export" && (
          <div className="max-w-3xl">
            <ExportPanel />
          </div>
        )}

        {/* ── Management Tab ───────────────────────────────────────────── */}
        {activeTab === "manage" && (
          <div className="max-w-4xl">
            <ManagementPanel />
          </div>
        )}
      </main>
    </div>
  );
}
