"use client";

import { create } from "zustand";
import type {
  TimetableInput,
  TimetableOutput,
  Timetable,
  Violation,
  EditOperation,
  SlotRef,
  UserConstraint,
} from "@/lib/types";
import { SAMPLE_INPUT } from "@/lib/sample-data";

interface TimetableStore {
  // ── Input ──────────────────────────────────────────────────────────────────
  input: TimetableInput;
  setInput: (input: TimetableInput) => void;

  // ── Selected class (for save / classwise views) ────────────────────────────
  selectedClassId: string | null;
  selectedClassName: string | null;
  setSelectedClass: (id: string | null, name: string | null) => void;

  // ── Output ─────────────────────────────────────────────────────────────────
  output: TimetableOutput | null;
  setOutput: (output: TimetableOutput | null) => void;

  // ── Active timetable (may differ from output while editing) ────────────────
  timetable: Timetable | null;
  violations: Violation[];
  setTimetable: (t: Timetable, v?: Violation[]) => void;

  // ── Alternate timetables ───────────────────────────────────────────────────
  alternates: Timetable[];
  activeAlternateIndex: number;
  setAlternateIndex: (i: number) => void;

  // ── UI state ───────────────────────────────────────────────────────────────
  selectedSlot: SlotRef | null;
  setSelectedSlot: (ref: SlotRef | null) => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  activeTab: "timetable" | "input" | "ai" | "export" | "manage";
  setActiveTab: (tab: "timetable" | "input" | "ai" | "export" | "manage") => void;

  // ── History (undo) ─────────────────────────────────────────────────────────
  history: Array<{ timetable: Timetable; violations: Violation[] }>;
  pushHistory: () => void;
  undo: () => void;
  canUndo: boolean;

  // ── AI constraints ─────────────────────────────────────────────────────────
  aiConstraints: UserConstraint[];
  addAiConstraints: (constraints: UserConstraint[]) => void;
  removeAiConstraint: (id: string) => void;
  clearAiConstraints: () => void;

  // ── Error state ───────────────────────────────────────────────────────────
  generateError: { message: string; details?: string[] } | null;
  clearGenerateError: () => void;

  // ── Actions ────────────────────────────────────────────────────────────────
  generate: () => Promise<void>;
  applyEdit: (op: EditOperation) => Promise<void>;
  regeneratePartial: () => Promise<void>;
  saveTimetable: () => Promise<string | null>;
  loadSavedTimetable: (saved: { timetable: Timetable; input: TimetableInput; violations?: Violation[]; classId?: string | null; className?: string | null }) => void;
}

export const useTimetableStore = create<TimetableStore>((set, get) => ({
  input: SAMPLE_INPUT,
  output: null,
  timetable: null,
  violations: [],
  alternates: [],
  activeAlternateIndex: 0,
  selectedSlot: null,
  isGenerating: false,
  activeTab: "input",
  history: [],
  canUndo: false,
  aiConstraints: [],
  generateError: null,
  selectedClassId: null,
  selectedClassName: null,

  clearGenerateError: () => set({ generateError: null }),

  setSelectedClass: (id, name) => set({ selectedClassId: id, selectedClassName: name }),

  loadSavedTimetable: ({ timetable, input, violations, classId, className }) => {
    set({
      timetable,
      input,
      violations: violations ?? [],
      alternates: [],
      activeAlternateIndex: 0,
      output: null,
      selectedSlot: null,
      history: [],
      canUndo: false,
      ...(classId !== undefined ? { selectedClassId: classId } : {}),
      ...(className !== undefined ? { selectedClassName: className } : {}),
    });
  },

  setInput: (input) => {
    const prev = get().input;
    const daysChanged =
      JSON.stringify(input.days) !== JSON.stringify(prev.days);
    const slotsChanged =
      JSON.stringify(input.timeSlotsPerDay) !==
      JSON.stringify(prev.timeSlotsPerDay);

    // Clear timetable whenever the grid dimensions change — the old
    // timetable's day/slot keys no longer match and will crash the grid.
    if (daysChanged || slotsChanged) {
      set({ input, timetable: null, output: null, violations: [], alternates: [], selectedSlot: null });
    } else {
      set({ input });
    }
  },
  setOutput: (output) => set({ output }),
  setTimetable: (timetable, violations = []) =>
    set({ timetable, violations }),
  setSelectedSlot: (selectedSlot) => set({ selectedSlot }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setActiveTab: (activeTab) => set({ activeTab }),

  setAlternateIndex: (i) => {
    const { alternates } = get();
    if (alternates[i]) {
      set({ activeAlternateIndex: i, timetable: alternates[i] });
    }
  },

  pushHistory: () => {
    const { timetable, violations, history } = get();
    if (!timetable) return;
    const next = [...history.slice(-19), { timetable, violations }];
    set({ history: next, canUndo: true });
  },

  undo: () => {
    const { history } = get();
    if (history.length === 0) return;
    const last = history[history.length - 1];
    set({
      timetable: last.timetable,
      violations: last.violations,
      history: history.slice(0, -1),
      canUndo: history.length > 1,
    });
  },

  addAiConstraints: (constraints) => {
    const { input } = get();
    set({
      aiConstraints: [...(get().aiConstraints), ...constraints],
      input: {
        ...input,
        constraints: [...(input.constraints ?? []), ...constraints],
      },
    });
  },

  removeAiConstraint: (id) => {
    const { input, aiConstraints } = get();
    set({
      aiConstraints: aiConstraints.filter((c) => c.id !== id),
      input: {
        ...input,
        constraints: (input.constraints ?? []).filter((c) => c.id !== id),
      },
    });
  },

  clearAiConstraints: () => {
    const { input, aiConstraints } = get();
    const aiIds = new Set(aiConstraints.map((c) => c.id));
    set({
      aiConstraints: [],
      input: {
        ...input,
        constraints: (input.constraints ?? []).filter((c) => !aiIds.has(c.id)),
      },
    });
  },

  generate: async () => {
    const { input, setIsGenerating, setOutput, setTimetable, setActiveTab } = get();
    setIsGenerating(true);
    set({ generateError: null });
    try {
      const res = await fetch("/api/generate-timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();

      if (!res.ok) {
        // 422 infeasible or other server error — show to user, don't touch timetable
        set({
          generateError: {
            message: data.error ?? "Generation failed",
            details: data.details ?? [],
          },
        });
        return;
      }

      const output = data as TimetableOutput;
      setOutput(output);
      setTimetable(output.timetable, output.violations);
      set({ alternates: output.alternates ?? [], activeAlternateIndex: 0 });
      setActiveTab("timetable");
    } catch (err) {
      set({ generateError: { message: "Network error — could not reach server." } });
      console.error("Generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  },

  applyEdit: async (op) => {
    const { timetable, input, pushHistory } = get();
    if (!timetable) return;
    pushHistory();
    try {
      const res = await fetch("/api/edit-timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timetable, input, operation: op }),
      });
      const data = await res.json();
      if (data.success) {
        set({ timetable: data.timetable, violations: data.violations });
      } else {
        alert(data.message ?? "Edit failed");
        // Revert
        const { history } = get();
        if (history.length > 0) {
          const last = history[history.length - 1];
          set({ timetable: last.timetable, violations: last.violations, history: history.slice(0, -1) });
        }
      }
    } catch (err) {
      console.error("Edit failed:", err);
    }
  },

  regeneratePartial: async () => {
    const { timetable, input, pushHistory, setIsGenerating } = get();
    if (!timetable) return;
    pushHistory();
    setIsGenerating(true);
    try {
      const res = await fetch("/api/edit-timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timetable, input, operation: { type: "partial_regenerate" } }),
      });
      const data = await res.json();
      if (data.success) {
        set({ timetable: data.timetable, violations: data.violations });
      }
    } finally {
      setIsGenerating(false);
    }
  },

  saveTimetable: async () => {
    const { timetable, input, output, violations, selectedClassId, selectedClassName } = get();
    if (!timetable || !selectedClassId) return null;
    try {
      const res = await fetch("/api/timetables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: selectedClassId,
          data: { timetable, input, violations },
          metadata: {
            className: selectedClassName,
            savedAt: new Date().toISOString(),
            optimizationScore: output?.optimizationScore ?? null,
            ...(output?.metadata ?? {}),
          },
        }),
      });
      const result = await res.json();
      return result.id ?? null;
    } catch (err) {
      console.error("Save timetable failed:", err);
      return null;
    }
  },
}));
