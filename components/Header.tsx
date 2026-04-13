"use client";

import { Calendar, Cpu, RotateCcw, Download, Undo2 } from "lucide-react";
import { useTimetableStore } from "@/store/timetable-store";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "input", label: "Setup" },
  { id: "timetable", label: "Timetable" },
  { id: "ai", label: "AI Assistant" },
  { id: "manage", label: "Data" },
  { id: "export", label: "Export" },
] as const;

export default function Header() {
  const {
    activeTab,
    setActiveTab,
    generate,
    isGenerating,
    timetable,
    canUndo,
    undo,
    regeneratePartial,
  } = useTimetableStore();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-sm">AI Timetable</span>
            <span className="text-xs text-slate-400 block leading-none">Builder</span>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md font-medium transition-all",
                activeTab === tab.id
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {timetable && (
            <>
              <button
                onClick={undo}
                disabled={!canUndo}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
                title="Undo last edit"
              >
                <Undo2 className="w-4 h-4" />
                Undo
              </button>
              <button
                onClick={regeneratePartial}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Regenerate unlocked slots"
              >
                <RotateCcw className="w-4 h-4" />
                Re-solve
              </button>
              <button
                onClick={() => setActiveTab("export")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </>
          )}
          <button
            onClick={generate}
            disabled={isGenerating}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              isGenerating
                ? "bg-blue-400 text-white cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            )}
          >
            <Cpu className={cn("w-4 h-4", isGenerating && "animate-spin")} />
            {isGenerating ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>
    </header>
  );
}
