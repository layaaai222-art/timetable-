"use client";

import type { ScoreBreakdown } from "@/lib/types";
import { getScoreLabel } from "@/lib/solver/scorer";
import { cn } from "@/lib/utils";

interface ScorePanelProps {
  score: number;
  breakdown?: ScoreBreakdown;
  metadata?: {
    generationTime: number;
    algorithm: string;
    filledSlots: number;
    totalSlots: number;
  };
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-700">{value}/100</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            value >= 90 ? "bg-emerald-500" : value >= 70 ? "bg-blue-500" : value >= 50 ? "bg-yellow-500" : "bg-red-500"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function ScorePanel({ score, breakdown, metadata }: ScorePanelProps) {
  const safeScore = score ?? 0;
  const { label, color } = getScoreLabel(safeScore);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      {/* Overall score */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Quality Score</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-3xl font-bold text-slate-900">{safeScore}</span>
            <span className="text-sm text-slate-400">/100</span>
            <span className={cn("text-sm font-semibold", color)}>{label}</span>
          </div>
        </div>

        {/* Donut-like ring */}
        <div className="relative w-14 h-14">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="4" />
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke={safeScore >= 75 ? "#3b82f6" : safeScore >= 50 ? "#f59e0b" : "#ef4444"}
              strokeWidth="4"
              strokeDasharray={`${(safeScore / 100) * 88} 88`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
            {safeScore}
          </span>
        </div>
      </div>

      {/* Breakdown bars */}
      {breakdown && (
        <div className="space-y-2.5 pt-1 border-t border-slate-100">
          <ScoreBar label="Subject Distribution" value={breakdown.distributionScore} />
          <ScoreBar label="Teacher Preferences" value={breakdown.teacherPreferenceScore} />
          <ScoreBar label="Morning Preferences" value={breakdown.morningPreferenceScore} />
          <ScoreBar label="No Consecutive Repeat" value={breakdown.consecutiveAvoidanceScore} />
        </div>
      )}

      {/* Metadata */}
      {metadata && (
        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-y-1.5 text-xs text-slate-500">
          <span>Algorithm</span>
          <span className="text-right text-slate-700 font-medium truncate" title={metadata.algorithm}>
            CSP + Local Search
          </span>
          <span>Gen. time</span>
          <span className="text-right text-slate-700 font-medium">
            {metadata.generationTime}ms
          </span>
          <span>Slots filled</span>
          <span className="text-right text-slate-700 font-medium">
            {metadata.filledSlots}/{metadata.totalSlots}
          </span>
        </div>
      )}
    </div>
  );
}
