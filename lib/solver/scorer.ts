/**
 * Soft Constraint Scorer
 * Evaluates timetable quality across 4 dimensions (0-100 each):
 * 1. Distribution: subjects spread evenly across week days
 * 2. Teacher preference: teachers get their preferred slots
 * 3. Morning preference: flagged subjects in early periods
 * 4. Consecutive avoidance: no back-to-back same subject
 */

import type { Timetable, TimetableInput, ScoreBreakdown } from "../types";

const WEIGHTS = {
  distribution: 25,
  teacherPreference: 25,
  morningPreference: 25,
  consecutiveAvoidance: 25,
};

export function scoreTimetable(
  timetable: Timetable,
  input: TimetableInput
): ScoreBreakdown {
  const distScore = scoreDistribution(timetable, input);
  const teacherScore = scoreTeacherPreference(timetable, input);
  const morningScore = scoreMorningPreference(timetable, input);
  const consecScore = scoreConsecutiveAvoidance(timetable, input);

  const total =
    (distScore * WEIGHTS.distribution +
      teacherScore * WEIGHTS.teacherPreference +
      morningScore * WEIGHTS.morningPreference +
      consecScore * WEIGHTS.consecutiveAvoidance) /
    100;

  return {
    distributionScore: Math.round(distScore),
    teacherPreferenceScore: Math.round(teacherScore),
    morningPreferenceScore: Math.round(morningScore),
    consecutiveAvoidanceScore: Math.round(consecScore),
    total: Math.round(total),
  };
}

// Distribution: each subject should appear roughly evenly across days
function scoreDistribution(timetable: Timetable, input: TimetableInput): number {
  if (input.subjects.length === 0) return 100;

  let totalPenalty = 0;
  let maxPossiblePenalty = 0;

  for (const subject of input.subjects) {
    const dayCounts: Record<string, number> = {};
    for (const day of input.days) {
      dayCounts[day] = 0;
    }

    for (const day of input.days) {
      for (const slot of Object.values(timetable[day] ?? {})) {
        if (slot?.subjectId === subject.id) dayCounts[day]++;
      }
    }

    const counts = Object.values(dayCounts);
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    const spread = max - min;

    // Penalty proportional to imbalance
    totalPenalty += spread * subject.frequencyPerWeek;
    maxPossiblePenalty += subject.frequencyPerWeek * subject.frequencyPerWeek;
  }

  if (maxPossiblePenalty === 0) return 100;
  return Math.max(0, 100 - (totalPenalty / maxPossiblePenalty) * 100);
}

// Teacher preference: count how many assignments match preferred slots
function scoreTeacherPreference(
  timetable: Timetable,
  input: TimetableInput
): number {
  const teachersWithPrefs = input.teachers.filter(
    (t) => t.preferredSlots && t.preferredSlots.length > 0
  );

  if (teachersWithPrefs.length === 0) return 100;

  let matched = 0;
  let total = 0;

  for (const teacher of teachersWithPrefs) {
    for (const day of input.days) {
      for (const [slotStr, cell] of Object.entries(timetable[day] ?? {})) {
        if (!cell || cell.isBreak || cell.teacherId !== teacher.id) continue;

        total++;
        const slot = parseInt(slotStr, 10);
        const preferred = teacher.preferredSlots!.some(
          (p) => p.day === day && p.slots.includes(slot)
        );
        if (preferred) matched++;
      }
    }
  }

  return total === 0 ? 100 : (matched / total) * 100;
}

// Morning preference: subjects flagged preferMorning should be in slots 0-2
function scoreMorningPreference(
  timetable: Timetable,
  input: TimetableInput
): number {
  const morningSubjects = input.subjects.filter((s) => s.preferMorning);
  if (morningSubjects.length === 0) return 100;

  const morningSlots = [0, 1, 2];
  let matched = 0;
  let total = 0;

  for (const subject of morningSubjects) {
    for (const day of input.days) {
      for (const [slotStr, cell] of Object.entries(timetable[day] ?? {})) {
        if (!cell || cell.isBreak || cell.subjectId !== subject.id) continue;
        total++;
        if (morningSlots.includes(parseInt(slotStr, 10))) matched++;
      }
    }
  }

  return total === 0 ? 100 : (matched / total) * 100;
}

// Consecutive avoidance: penalize same subject back-to-back in a day
function scoreConsecutiveAvoidance(
  timetable: Timetable,
  input: TimetableInput
): number {
  const slotCount = Array.isArray(input.timeSlotsPerDay)
    ? input.timeSlotsPerDay.length
    : (input.timeSlotsPerDay as number);

  let violations = 0;
  let comparisons = 0;

  for (const day of input.days) {
    for (let s = 0; s < slotCount - 1; s++) {
      const current = timetable[day]?.[s];
      const next = timetable[day]?.[s + 1];
      if (!current || !next || current.isBreak || next.isBreak) continue;
      comparisons++;
      if (current.subjectId === next.subjectId) violations++;
    }
  }

  return comparisons === 0 ? 100 : Math.max(0, 100 - (violations / comparisons) * 100);
}

// ─── Export Summary ───────────────────────────────────────────────────────────

export function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: "Excellent", color: "text-green-600" };
  if (score >= 75) return { label: "Good", color: "text-blue-600" };
  if (score >= 60) return { label: "Fair", color: "text-yellow-600" };
  return { label: "Needs Work", color: "text-red-600" };
}
