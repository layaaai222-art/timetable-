"use client";

import { Lock, LockOpen, X, ArrowRightLeft } from "lucide-react";
import type { SlotAssignment, TimetableInput, Violation } from "@/lib/types";
import { getSubjectColor } from "@/lib/sample-data";
import { hexToRgba, cn } from "@/lib/utils";

interface SlotCellProps {
  day: string;
  slot: number;
  assignment: SlotAssignment | null;
  input: TimetableInput;
  violations: Violation[];
  isSelected: boolean;
  isDragOver: boolean;
  isDragging: boolean;
  onSelect: () => void;
  onLock: () => void;
  onClear: () => void;
}

export default function SlotCell({
  day,
  slot,
  assignment,
  input,
  violations,
  isSelected,
  isDragOver,
  isDragging,
  onSelect,
  onLock,
  onClear,
}: SlotCellProps) {
  const hasError = violations.some(
    (v) => v.day === day && v.slot === slot && v.severity === "error"
  );
  const hasWarning = violations.some(
    (v) => v.day === day && v.slot === slot && v.severity === "warning"
  );

  if (!assignment) {
    return (
      <div
        onClick={onSelect}
        className={cn(
          "slot-cell h-16 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
          isDragOver
            ? "border-blue-400 bg-blue-50"
            : "border-slate-200 hover:border-blue-300 hover:bg-slate-50",
          isSelected && "border-blue-400 bg-blue-50"
        )}
      />
    );
  }

  if (assignment.isBreak) {
    return (
      <div className="h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
        <span className="text-xs text-slate-400 font-medium">
          {assignment.breakLabel ?? "Break"}
        </span>
      </div>
    );
  }

  const subject = input.subjects.find((s) => s.id === assignment.subjectId);
  const teacher = input.teachers.find((t) => t.id === assignment.teacherId);
  const color = subject?.color ?? getSubjectColor(assignment.subjectId);

  return (
    <div
      onClick={onSelect}
      className={cn(
        "slot-cell h-16 rounded-lg border-2 cursor-pointer relative group overflow-hidden",
        isDragging && "slot-dragging",
        isDragOver && "slot-dropzone-active",
        isSelected && "ring-2 ring-blue-400 ring-offset-1",
        hasError && "border-red-400",
        hasWarning && !hasError && "border-yellow-400",
        !hasError && !hasWarning && "border-transparent"
      )}
      style={{
        backgroundColor: hexToRgba(color, 0.12),
        borderColor: hasError
          ? undefined
          : hasWarning
          ? undefined
          : hexToRgba(color, 0.4),
      }}
      title={`${subject?.name} — ${teacher?.name}`}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: color }}
      />

      <div className="pl-3 pr-8 py-1.5 h-full flex flex-col justify-center">
        <p
          className="text-xs font-semibold leading-tight truncate"
          style={{ color }}
        >
          {subject?.name ?? assignment.subjectId}
        </p>
        <p className="text-[10px] text-slate-500 truncate mt-0.5">
          {teacher?.name ?? assignment.teacherId}
        </p>
        {hasError && (
          <span className="text-[9px] text-red-500 font-medium">Conflict</span>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLock();
          }}
          className="w-5 h-5 rounded bg-white/80 hover:bg-white flex items-center justify-center shadow-sm"
          title={assignment.locked ? "Unlock slot" : "Lock slot"}
        >
          {assignment.locked ? (
            <Lock className="w-2.5 h-2.5 text-amber-500" />
          ) : (
            <LockOpen className="w-2.5 h-2.5 text-slate-400" />
          )}
        </button>
        {!assignment.locked && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="w-5 h-5 rounded bg-white/80 hover:bg-red-50 flex items-center justify-center shadow-sm"
            title="Clear slot"
          >
            <X className="w-2.5 h-2.5 text-slate-400 hover:text-red-500" />
          </button>
        )}
      </div>

      {/* Lock indicator */}
      {assignment.locked && (
        <div className="absolute bottom-1 right-1">
          <Lock className="w-2.5 h-2.5 text-amber-500" />
        </div>
      )}

      {/* Drag handle indicator */}
      {!assignment.locked && (
        <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-40">
          <ArrowRightLeft className="w-2.5 h-2.5 text-slate-400" />
        </div>
      )}
    </div>
  );
}
