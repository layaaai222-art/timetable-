/**
 * Constraint Satisfaction Problem Solver for Timetable Generation
 *
 * Algorithm: Backtracking with Forward Checking + MRV Heuristic
 * - Variables: Each (day, slot) pair (excluding breaks)
 * - Values: (subjectId, teacherId) assignments
 * - Hard constraints: teacher availability, subject frequency, break slots
 * - After valid solution found: local search optimization for soft constraints
 */

import type {
  TimetableInput,
  Timetable,
  SlotVariable,
  CandidateAssignment,
  Teacher,
} from "../types";
import {
  isBreakSlot,
  isTeacherAvailable,
  satisfiesUserConstraints,
  checkFeasibility,
} from "./constraints";
import { scoreTimetable } from "./scorer";

interface SolverState {
  timetable: Timetable;
  subjectCounts: Map<string, number>;    // subjectId → times placed
  teacherSlotUsage: Map<string, Set<string>>; // teacherId → Set of slotKeys occupied
}

export interface SolverResult {
  timetable: Timetable | null;
  iterations: number;
  feasibilityErrors: string[];
}

export class TimetableCSPSolver {
  private slots: SlotVariable[] = [];
  private slotLabels: (string | number)[] = [];
  private iterations = 0;
  private startTime = 0;
  private readonly TIMEOUT_MS = 8000;

  constructor(private input: TimetableInput) {}

  solve(): SolverResult {
    const feasibility = checkFeasibility(this.input);
    if (!feasibility.feasible) {
      return { timetable: null, iterations: 0, feasibilityErrors: feasibility.errors };
    }

    this.slotLabels = Array.isArray(this.input.timeSlotsPerDay)
      ? this.input.timeSlotsPerDay
      : Array.from({ length: this.input.timeSlotsPerDay as number }, (_, i) => i);

    this.slots = this.buildSlots();
    this.startTime = Date.now();
    this.iterations = 0;

    const state = this.initState();
    const placements = this.buildPlacementList();

    const success = this.backtrack(state, placements, 0);
    return {
      timetable: success ? state.timetable : null,
      iterations: this.iterations,
      feasibilityErrors: [],
    };
  }

  // Generate multiple diverse timetables (top-N)
  solveMultiple(count = 3): Timetable[] {
    const results: Timetable[] = [];
    const seenKeys = new Set<string>();

    for (let attempt = 0; attempt < count * 4 && results.length < count; attempt++) {
      const result = this.solve();
      if (result.timetable) {
        const key = JSON.stringify(result.timetable);
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const optimized = this.optimizeSoftConstraints(result.timetable);
          results.push(optimized);
        }
      }
      // Shuffle slots for diversity next attempt
      this.shuffleSlots();
    }
    return results;
  }

  // ─── Backtracking Core ──────────────────────────────────────────────────────

  private backtrack(
    state: SolverState,
    placements: string[],
    index: number
  ): boolean {
    if (Date.now() - this.startTime > this.TIMEOUT_MS) return false;
    if (index === placements.length) return true;

    this.iterations++;
    const subjectId = placements[index];

    // Get empty slots ordered by fewest options (MRV heuristic)
    const candidateSlots = this.getEmptySlots(state)
      .filter((slot) => this.hasViableTeacher(subjectId, slot, state))
      .sort((a, b) => this.slotPriority(a, subjectId) - this.slotPriority(b, subjectId));

    for (const slot of candidateSlots) {
      const teacher = this.selectTeacher(subjectId, slot, state);
      if (!teacher) continue;

      // Assign
      this.assign(state, slot, subjectId, teacher.id);

      if (this.backtrack(state, placements, index + 1)) return true;

      // Undo
      this.unassign(state, slot, subjectId, teacher.id);
    }

    return false;
  }

  // ─── Assignment Helpers ─────────────────────────────────────────────────────

  private assign(
    state: SolverState,
    slot: SlotVariable,
    subjectId: string,
    teacherId: string
  ): void {
    state.timetable[slot.day][slot.slot] = { subjectId, teacherId };
    state.subjectCounts.set(subjectId, (state.subjectCounts.get(subjectId) ?? 0) + 1);
    state.teacherSlotUsage.get(teacherId)?.add(slot.key);
  }

  private unassign(
    state: SolverState,
    slot: SlotVariable,
    subjectId: string,
    teacherId: string
  ): void {
    state.timetable[slot.day][slot.slot] = null;
    state.subjectCounts.set(subjectId, (state.subjectCounts.get(subjectId) ?? 1) - 1);
    state.teacherSlotUsage.get(teacherId)?.delete(slot.key);
  }

  private getEmptySlots(state: SolverState): SlotVariable[] {
    return this.slots.filter((s) => state.timetable[s.day][s.slot] === null);
  }

  private hasViableTeacher(
    subjectId: string,
    slot: SlotVariable,
    state: SolverState
  ): boolean {
    return this.input.teachers.some(
      (t) =>
        t.subjects.includes(subjectId) &&
        isTeacherAvailable(t, slot.day, slot.slot) &&
        !state.teacherSlotUsage.get(t.id)?.has(slot.key) &&
        this.passesHardUserConstraints(subjectId, t.id, slot.day, slot.slot)
    );
  }

  private selectTeacher(
    subjectId: string,
    slot: SlotVariable,
    state: SolverState
  ): Teacher | null {
    const candidates = this.input.teachers
      .filter(
        (t) =>
          t.subjects.includes(subjectId) &&
          isTeacherAvailable(t, slot.day, slot.slot) &&
          !state.teacherSlotUsage.get(t.id)?.has(slot.key) &&
          this.passesHardUserConstraints(subjectId, t.id, slot.day, slot.slot)
      )
      // Prefer teachers with fewer assigned slots (LCV heuristic)
      .sort(
        (a, b) =>
          (state.teacherSlotUsage.get(a.id)?.size ?? 0) -
          (state.teacherSlotUsage.get(b.id)?.size ?? 0)
      );

    return candidates[0] ?? null;
  }

  private passesHardUserConstraints(
    subjectId: string,
    teacherId: string,
    day: string,
    slot: number
  ): boolean {
    return satisfiesUserConstraints(
      this.input.constraints?.filter((c) => c.isHard) ?? [],
      subjectId,
      teacherId,
      day,
      slot
    );
  }

  // MRV-inspired priority: prefer slots earlier in day for spread
  private slotPriority(slot: SlotVariable, subjectId: string): number {
    const subject = this.input.subjects.find((s) => s.id === subjectId);
    // If subject prefers morning, put morning slots first (lower priority number = tried first)
    if (subject?.preferMorning && slot.slot <= 2) return -10;
    return slot.slot;
  }

  // ─── Soft Constraint Optimization (Local Search) ────────────────────────────

  optimizeSoftConstraints(timetable: Timetable, iterations = 800): Timetable {
    const optimized = this.cloneTimetable(timetable);
    let currentScore = scoreTimetable(optimized, this.input).total;

    for (let i = 0; i < iterations; i++) {
      const filledSlots = this.slots.filter(
        (s) => optimized[s.day][s.slot] !== null
      );
      if (filledSlots.length < 2) break;

      // Pick two random filled slots
      const idxA = Math.floor(Math.random() * filledSlots.length);
      let idxB = Math.floor(Math.random() * filledSlots.length);
      while (idxB === idxA) idxB = Math.floor(Math.random() * filledSlots.length);

      const slotA = filledSlots[idxA];
      const slotB = filledSlots[idxB];
      const cellA = optimized[slotA.day][slotA.slot]!;
      const cellB = optimized[slotB.day][slotB.slot]!;

      // Check if swap is valid (teacher availability)
      const teacherA = this.input.teachers.find((t) => t.id === cellA.teacherId)!;
      const teacherB = this.input.teachers.find((t) => t.id === cellB.teacherId)!;

      if (
        !isTeacherAvailable(teacherA, slotB.day, slotB.slot) ||
        !isTeacherAvailable(teacherB, slotA.day, slotA.slot)
      )
        continue;

      // Perform swap
      optimized[slotA.day][slotA.slot] = { ...cellB };
      optimized[slotB.day][slotB.slot] = { ...cellA };

      const newScore = scoreTimetable(optimized, this.input).total;
      if (newScore >= currentScore) {
        currentScore = newScore;
      } else {
        // Revert
        optimized[slotA.day][slotA.slot] = { ...cellA };
        optimized[slotB.day][slotB.slot] = { ...cellB };
      }
    }

    return optimized;
  }

  // ─── Init Helpers ───────────────────────────────────────────────────────────

  private buildSlots(): SlotVariable[] {
    const slots: SlotVariable[] = [];
    for (const day of this.input.days) {
      for (let s = 0; s < this.slotLabels.length; s++) {
        if (!isBreakSlot(this.input.breakSlots ?? [], day, s)) {
          slots.push({ day, slot: s, key: `${day}_${s}` });
        }
      }
    }
    return this.shuffleArray(slots);
  }

  private shuffleSlots(): void {
    this.slots = this.shuffleArray(this.slots);
  }

  private shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private buildPlacementList(): string[] {
    // Sort subjects: most constrained first (fewer available slots = more constrained)
    const sorted = [...this.input.subjects].sort(
      (a, b) => b.frequencyPerWeek - a.frequencyPerWeek
    );
    const placements: string[] = [];
    for (const s of sorted) {
      for (let i = 0; i < s.frequencyPerWeek; i++) {
        placements.push(s.id);
      }
    }
    return placements;
  }

  private initState(): SolverState {
    const timetable: Timetable = {};
    for (const day of this.input.days) {
      timetable[day] = {};
      for (let s = 0; s < this.slotLabels.length; s++) {
        timetable[day][s] = isBreakSlot(this.input.breakSlots ?? [], day, s)
          ? { subjectId: "", teacherId: "", isBreak: true, breakLabel: this.getBreakLabel(day, s) }
          : null;
      }
    }

    const subjectCounts = new Map<string, number>();
    for (const s of this.input.subjects) subjectCounts.set(s.id, 0);

    const teacherSlotUsage = new Map<string, Set<string>>();
    for (const t of this.input.teachers) teacherSlotUsage.set(t.id, new Set());

    return { timetable, subjectCounts, teacherSlotUsage };
  }

  private getBreakLabel(day: string, slot: number): string {
    const b = this.input.breakSlots?.find((b) => b.day === day && b.slot === slot);
    return b?.label ?? "Break";
  }

  private cloneTimetable(t: Timetable): Timetable {
    return JSON.parse(JSON.stringify(t));
  }
}
