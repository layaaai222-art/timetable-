/**
 * Editor — handles all post-generation timetable modifications:
 * move, swap, lock, unlock, clear, assign.
 * After every edit, re-validates and returns the result.
 */

import type {
  Timetable,
  TimetableInput,
  EditOperation,
  EditResult,
  SlotAssignment,
} from "./types";
import { validateTimetable } from "./validator";
import { isTeacherAvailable } from "./solver/constraints";
import { TimetableCSPSolver } from "./solver/csp-solver";

export function applyEdit(
  timetable: Timetable,
  input: TimetableInput,
  operation: EditOperation
): EditResult {
  const next = deepClone(timetable);

  try {
    switch (operation.type) {
      case "move":
        return applyMove(next, input, operation.from, operation.to);
      case "swap":
        return applySwap(next, input, operation.slot1, operation.slot2);
      case "lock":
        return applyLock(next, input, operation.slot, true);
      case "unlock":
        return applyLock(next, input, operation.slot, false);
      case "clear":
        return applyClear(next, input, operation.slot);
      case "assign":
        return applyAssign(next, input, operation.slot, operation.assignment);
    }
  } catch (err) {
    return {
      success: false,
      timetable,
      violations: [],
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Individual Operations ────────────────────────────────────────────────────

function applyMove(
  timetable: Timetable,
  input: TimetableInput,
  from: { day: string; slot: number },
  to: { day: string; slot: number }
): EditResult {
  const source = timetable[from.day]?.[from.slot];
  const dest = timetable[to.day]?.[to.slot];

  if (!source || source.isBreak) {
    return fail(timetable, "Cannot move an empty or break slot.");
  }
  if (source.locked) {
    return fail(timetable, "Source slot is locked. Unlock it first.");
  }
  if (dest?.locked) {
    return fail(timetable, "Destination slot is locked.");
  }
  if (dest?.isBreak) {
    return fail(timetable, "Cannot move a class into a break slot.");
  }

  // Validate teacher availability at new slot
  const teacher = input.teachers.find((t) => t.id === source.teacherId);
  if (teacher && !isTeacherAvailable(teacher, to.day, to.slot)) {
    return fail(
      timetable,
      `${teacher.name} is not available on ${to.day} at slot ${to.slot + 1}.`
    );
  }

  timetable[to.day][to.slot] = { ...source };
  timetable[from.day][from.slot] = null;

  return finalize(timetable, input, "Move applied successfully.");
}

function applySwap(
  timetable: Timetable,
  input: TimetableInput,
  slot1: { day: string; slot: number },
  slot2: { day: string; slot: number }
): EditResult {
  const cell1 = timetable[slot1.day]?.[slot1.slot];
  const cell2 = timetable[slot2.day]?.[slot2.slot];

  if (cell1?.isBreak || cell2?.isBreak) {
    return fail(timetable, "Cannot swap break slots.");
  }
  if (cell1?.locked || cell2?.locked) {
    return fail(timetable, "One or both slots are locked. Unlock first.");
  }

  // Validate teacher cross-availability for swap
  if (cell1 && cell2) {
    const t1 = input.teachers.find((t) => t.id === cell1.teacherId);
    const t2 = input.teachers.find((t) => t.id === cell2.teacherId);
    if (t1 && !isTeacherAvailable(t1, slot2.day, slot2.slot)) {
      return fail(timetable, `${t1.name} is not available at the target slot.`);
    }
    if (t2 && !isTeacherAvailable(t2, slot1.day, slot1.slot)) {
      return fail(timetable, `${t2.name} is not available at the target slot.`);
    }
  }

  timetable[slot1.day][slot1.slot] = cell2 ?? null;
  timetable[slot2.day][slot2.slot] = cell1 ?? null;

  return finalize(timetable, input, "Swap applied successfully.");
}

function applyLock(
  timetable: Timetable,
  input: TimetableInput,
  slot: { day: string; slot: number },
  locked: boolean
): EditResult {
  const cell = timetable[slot.day]?.[slot.slot];
  if (!cell || cell.isBreak) {
    return fail(timetable, "Cannot lock/unlock an empty or break slot.");
  }
  timetable[slot.day][slot.slot] = { ...cell, locked };
  return finalize(timetable, input, locked ? "Slot locked." : "Slot unlocked.");
}

function applyClear(
  timetable: Timetable,
  input: TimetableInput,
  slot: { day: string; slot: number }
): EditResult {
  const cell = timetable[slot.day]?.[slot.slot];
  if (cell?.locked) {
    return fail(timetable, "Slot is locked. Unlock it first.");
  }
  if (cell?.isBreak) {
    return fail(timetable, "Cannot clear a break slot.");
  }
  timetable[slot.day][slot.slot] = null;
  return finalize(timetable, input, "Slot cleared.");
}

function applyAssign(
  timetable: Timetable,
  input: TimetableInput,
  slot: { day: string; slot: number },
  assignment: Omit<SlotAssignment, "locked">
): EditResult {
  const cell = timetable[slot.day]?.[slot.slot];
  if (cell?.locked) {
    return fail(timetable, "Slot is locked. Unlock it first.");
  }

  const teacher = input.teachers.find((t) => t.id === assignment.teacherId);
  if (!teacher) return fail(timetable, "Teacher not found.");

  if (!teacher.subjects.includes(assignment.subjectId)) {
    return fail(timetable, `${teacher.name} is not qualified to teach this subject.`);
  }

  if (!isTeacherAvailable(teacher, slot.day, slot.slot)) {
    return fail(
      timetable,
      `${teacher.name} is not available on ${slot.day} at slot ${slot.slot + 1}.`
    );
  }

  timetable[slot.day][slot.slot] = { ...assignment };
  return finalize(timetable, input, "Slot assigned.");
}

// ─── Partial Regeneration ─────────────────────────────────────────────────────

export function partialRegenerate(
  timetable: Timetable,
  input: TimetableInput
): EditResult {
  // Build a new input that excludes locked slots
  const lockedAssignments: Array<{
    day: string;
    slot: number;
    assignment: SlotAssignment;
  }> = [];

  for (const day of input.days) {
    for (const [slotStr, cell] of Object.entries(timetable[day] ?? {})) {
      if (cell?.locked) {
        lockedAssignments.push({ day, slot: parseInt(slotStr, 10), assignment: cell });
      }
    }
  }

  // Count how many of each subject are locked
  const lockedCounts: Record<string, number> = {};
  for (const { assignment } of lockedAssignments) {
    if (!assignment.isBreak) {
      lockedCounts[assignment.subjectId] =
        (lockedCounts[assignment.subjectId] ?? 0) + 1;
    }
  }

  // Adjust frequencies for unlocked subjects
  const adjustedInput: TimetableInput = {
    ...input,
    subjects: input.subjects.map((s) => ({
      ...s,
      frequencyPerWeek: Math.max(0, s.frequencyPerWeek - (lockedCounts[s.id] ?? 0)),
    })),
    breakSlots: [
      ...(input.breakSlots ?? []),
      // Treat locked slots as "breaks" so the solver won't overwrite them
      ...lockedAssignments.map(({ day, slot }) => ({ day, slot })),
    ],
  };

  const solver = new TimetableCSPSolver(adjustedInput);
  const result = solver.solve();

  if (!result.timetable) {
    return fail(
      timetable,
      "Cannot regenerate with current locked slots. " +
        (result.feasibilityErrors[0] ?? "Constraints are too tight.")
    );
  }

  // Merge locked slots back
  const merged = deepClone(result.timetable);
  for (const { day, slot, assignment } of lockedAssignments) {
    merged[day][slot] = assignment;
  }

  return finalize(merged, input, "Timetable regenerated (locked slots preserved).");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function finalize(
  timetable: Timetable,
  input: TimetableInput,
  message: string
): EditResult {
  const { violations } = validateTimetable(timetable, input);
  return { success: true, timetable, violations, message };
}

function fail(timetable: Timetable, message: string): EditResult {
  return { success: false, timetable, violations: [], message };
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
