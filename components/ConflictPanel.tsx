"use client";

import { AlertTriangle, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { Violation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ConflictPanelProps {
  violations: Violation[];
}

export default function ConflictPanel({ violations }: ConflictPanelProps) {
  const [expanded, setExpanded] = useState(true);

  const errors = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");

  if (violations.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span className="font-medium">All constraints satisfied — no violations</span>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3 text-sm">
          {errors.length > 0 && (
            <span className="flex items-center gap-1.5 text-red-600 font-medium">
              <AlertCircle className="w-4 h-4" />
              {errors.length} Error{errors.length > 1 ? "s" : ""}
            </span>
          )}
          {warnings.length > 0 && (
            <span className="flex items-center gap-1.5 text-yellow-600 font-medium">
              <AlertTriangle className="w-4 h-4" />
              {warnings.length} Warning{warnings.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <ul className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
          {violations.map((v, i) => (
            <li key={i} className="flex items-start gap-3 px-4 py-2.5 text-sm">
              {v.severity === "error" ? (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
              )}
              <div>
                <p className={cn("font-medium", v.severity === "error" ? "text-red-700" : "text-yellow-700")}>
                  {v.type.replace(/_/g, " ")}
                </p>
                <p className="text-slate-600 text-xs mt-0.5">{v.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
