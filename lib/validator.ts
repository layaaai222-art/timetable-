/**
 * Validation Layer — re-checks all constraints on a timetable and
 * returns detailed, human-readable violation reports.
 */

import type { Timetable, TimetableInput, Violation } from "./types";
import { isTeacherAvailable } from "./solver/constraints";

export interface ValidationResult {
  isValid: boolean;
  violations: Violation[];
  stats: {
    totalSlots: number;
    filledSlots: number;
    breakSlots: number;
    subjectFrequencies: Record<string, number>;
  };
}

export function validateTimetable(
  timetable: Timetable,
  input: TimetableInput
): ValidationResult {
  const violations: Violation[] = [];
  const slotCount = Array.isArray(input.timeSlotsPerDay)
    ? input.timeSlotsPerDay.length
    : (input.timeSlotsPerDay as number);

  let totalSlots = 0;
  let filledSlots = 0;
  let breakSlots = 0;
  const subjectFrequencies: Record<string, number> = {};
  const teacherSlotMap: Record<string, string[]> = {}; // teacherId → slotKeys where assigned

  // ── Pass 1: Collect stats and per-slot checks ──────────────────────────────
  for (const day of input.days) {
    for (let s = 0; s < slotCount; s++) {
      totalSlots++;
      const cell = timetable[day]?.[s];

      if (!cell) continue;

      if (cell.isBreak) {
        breakSlots++;
        continue;
      }

      filledSlots++;
      const slotKey = `${day}:${s}`;

      // Subject frequency count
      subjectFrequencies[cell.subjectId] =
        (subjectFrequencies[cell.subjectId] ?? 0) + 1;

      // Teacher booking tracking
      if (cell.teacherId) {
        if (!teacherSlotMap[cell.teacherId]) teacherSlotMap[cell.teacherId] = [];
        teacherSlotMap[cell.teacherId].push(slotKey);
      }

      // Teacher qualification check
      const teacher = input.teachers.find((t) => t.id === cell.teacherId);
      if (!teacher) {
        violations.push({
          type: "unknown_teacher",
          description: `Slot ${day} P${s + 1}: Teacher ID "${cell.teacherId}" not found.`,
          day,
          slot: s,
          teacherId: cell.teacherId,
          severity: "error",
        });
      } else {
        // Teacher teaches the right subject?
        if (!teacher.subjects.includes(cell.subjectId)) {
          const subject = input.subjects.find((s) => s.id === cell.subjectId);
          violations.push({
            type: "teacher_not_qualified",
            description: `${day} P${s + 1}: ${teacher.name} is not qualified to teach ${subject?.name ?? cell.subjectId}.`,
            day,
            slot: s,
            subjectId: cell.subjectId,
            teacherId: cell.teacherId,
            severity: "error",
          });
        }

        // Teacher availability check
        if (!isTeacherAvailable(teacher, day, s)) {
          violations.push({
            type: "teacher_unavailable",
            description: `${day} P${s + 1}: ${teacher.name} is not available on this day/slot.`,
            day,
            slot: s,
            subjectId: cell.subjectId,
            teacherId: cell.teacherId,
            severity: "error",
          });
        }
      }

      // Subject exists?
      const subject = input.subjects.find((sub) => sub.id === cell.subjectId);
      if (!subject) {
        violations.push({
          type: "unknown_subject",
          description: `${day} P${s + 1}: Subject ID "${cell.subjectId}" not found.`,
          day,
          slot: s,
          subjectId: cell.subjectId,
          severity: "error",
        });
      }
    }
  }

  // ── Pass 2: Subject frequency checks ──────────────────────────────────────
  for (const subject of input.subjects) {
    const actual = subjectFrequencies[subject.id] ?? 0;
    if (actual < subject.frequencyPerWeek) {
      violations.push({
        type: "frequency_under",
        description: `"${subject.name}" is scheduled ${actual}× but requires ${subject.frequencyPerWeek}× per week.`,
        subjectId: subject.id,
        severity: "error",
      });
    } else if (actual > subject.frequencyPerWeek) {
      violations.push({
        type: "frequency_over",
        description: `"${subject.name}" is scheduled ${actual}× but only requires ${subject.frequencyPerWeek}× per week.`,
        subjectId: subject.id,
        severity: "error",
      });
    }
  }

  // ── Pass 3: Teacher double-booking check ───────────────────────────────────
  // In single-section each slot is unique, but we verify for correctness
  for (const [teacherId, slots] of Object.entries(teacherSlotMap)) {
    const seen = new Set<string>();
    for (const slotKey of slots) {
      if (seen.has(slotKey)) {
        const teacher = input.teachers.find((t) => t.id === teacherId);
        violations.push({
          type: "teacher_double_booked",
          description: `${teacher?.name ?? teacherId} is double-booked at slot ${slotKey}.`,
          teacherId,
          severity: "error",
        });
      }
      seen.add(slotKey);
    }
  }

  // ── Pass 4: Soft constraint warnings ──────────────────────────────────────
  for (const day of input.days) {
    for (let s = 0; s < slotCount - 1; s++) {
      const current = timetable[day]?.[s];
      const next = timetable[day]?.[s + 1];
      if (!current || !next || current.isBreak || next.isBreak) continue;
      if (current.subjectId === next.subjectId) {
        const subject = input.subjects.find((sub) => sub.id === current.subjectId);
        violations.push({
          type: "consecutive_same_subject",
          description: `${day}: "${subject?.name ?? current.subjectId}" is scheduled back-to-back (P${s + 1} & P${s + 2}).`,
          day,
          slot: s,
          subjectId: current.subjectId,
          severity: "warning",
        });
      }
    }
  }

  return {
    isValid: violations.filter((v) => v.severity === "error").length === 0,
    violations,
    stats: { totalSlots, filledSlots, breakSlots, subjectFrequencies },
  };
}
