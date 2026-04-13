import type {
  Teacher,
  BreakSlot,
  UserConstraint,
  SlotAssignment,
  Timetable,
  TimetableInput,
} from "../types";

// ─── Hard Constraint Checks ───────────────────────────────────────────────────

export function isBreakSlot(
  breakSlots: BreakSlot[],
  day: string,
  slot: number
): boolean {
  return breakSlots.some((b) => b.day === day && b.slot === slot);
}

export function isBreakSlotGlobal(
  breakSlots: BreakSlot[],
  slot: number
): boolean {
  // A slot is a "global break" if it's a break on EVERY day
  return breakSlots.some((b) => b.slot === slot);
}

export function isTeacherAvailable(
  teacher: Teacher,
  day: string,
  slot: number
): boolean {
  if (!teacher.availability || teacher.availability.length === 0) return true;
  return teacher.availability.some(
    (avail) => avail.day === day && avail.slots.includes(slot)
  );
}

export function isTeacherBookedAtSlot(
  timetable: Timetable,
  teacherId: string,
  day: string,
  slot: number
): boolean {
  const cell = timetable[day]?.[slot];
  return !!(cell && cell.teacherId === teacherId);
}

// Checks if a teacher is double-booked in the same time slot across sections
// In a single-section schedule this is trivially false, but we check
// the entire timetable for robustness
export function isTeacherDoubleBooked(
  timetable: Timetable,
  teacherId: string,
  day: string,
  slot: number
): boolean {
  const cell = timetable[day]?.[slot];
  if (cell && cell.teacherId === teacherId) return true;
  return false;
}

// ─── User Constraint Checkers ─────────────────────────────────────────────────

export function satisfiesUserConstraints(
  constraints: UserConstraint[],
  subjectId: string,
  teacherId: string,
  day: string,
  slot: number
): boolean {
  for (const c of constraints) {
    if (!c.isHard) continue;

    if (c.type === "subject_avoid_day" && c.subjectId === subjectId) {
      if (c.days?.includes(day)) return false;
    }

    if (c.type === "teacher_only_day" && c.teacherId === teacherId) {
      if (c.days && !c.days.includes(day)) return false;
    }

    if (c.type === "subject_in_morning" && c.subjectId === subjectId) {
      if (c.slots && !c.slots.includes(slot)) return false;
    }
  }
  return true;
}

// ─── Soft Constraint Evaluation ───────────────────────────────────────────────

export function hasConsecutiveSameSubject(
  timetable: Timetable,
  day: string,
  slot: number,
  subjectId: string,
  slotCount: number
): boolean {
  // Check previous slot
  if (slot > 0) {
    const prev = timetable[day]?.[slot - 1];
    if (prev?.subjectId === subjectId) return true;
  }
  // Check next slot
  if (slot < slotCount - 1) {
    const next = timetable[day]?.[slot + 1];
    if (next?.subjectId === subjectId) return true;
  }
  return false;
}

// ─── Feasibility Pre-Check ────────────────────────────────────────────────────

export interface FeasibilityResult {
  feasible: boolean;
  errors: string[];
  warnings: string[];
}

export function checkFeasibility(input: TimetableInput): FeasibilityResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const slotLabels = Array.isArray(input.timeSlotsPerDay)
    ? input.timeSlotsPerDay
    : Array.from({ length: input.timeSlotsPerDay as number }, (_, i) => i);

  const totalSlots = input.days.length * slotLabels.length;
  const breakCount = input.breakSlots?.length ?? 0;
  const availableSlots = totalSlots - breakCount;
  const requiredSlots = input.subjects.reduce(
    (sum, s) => sum + s.frequencyPerWeek,
    0
  );

  if (requiredSlots > availableSlots) {
    errors.push(
      `Too many required periods (${requiredSlots}) for available slots (${availableSlots}). ` +
        `Remove ${requiredSlots - availableSlots} periods or add more days/slots.`
    );
  }

  // Check each subject has at least one teacher
  for (const subject of input.subjects) {
    const capable = input.teachers.filter((t) =>
      t.subjects.includes(subject.id)
    );
    if (capable.length === 0) {
      errors.push(
        `No teacher assigned to subject "${subject.name}". Add a teacher.`
      );
    }

    // Count available slots for this subject across all teachers
    let subjectAvailableSlots = 0;
    for (const day of input.days) {
      for (let s = 0; s < slotLabels.length; s++) {
        if (isBreakSlot(input.breakSlots ?? [], day, s)) continue;
        const teacherAvail = capable.some((t) => isTeacherAvailable(t, day, s));
        if (teacherAvail) subjectAvailableSlots++;
      }
    }

    if (subjectAvailableSlots < subject.frequencyPerWeek) {
      errors.push(
        `Subject "${subject.name}" needs ${subject.frequencyPerWeek} slots/week but ` +
          `teachers are only available for ${subjectAvailableSlots} slots.`
      );
    }
  }

  if (input.subjects.length === 0) errors.push("No subjects defined.");
  if (input.teachers.length === 0) errors.push("No teachers defined.");
  if (input.days.length === 0) errors.push("No days defined.");

  return { feasible: errors.length === 0, errors, warnings };
}

// ─── Validate Final Assignment ────────────────────────────────────────────────

export function validateAssignment(
  timetable: Timetable,
  input: TimetableInput,
  assignment: SlotAssignment,
  day: string,
  slot: number
): string[] {
  const errors: string[] = [];
  const teacher = input.teachers.find((t) => t.id === assignment.teacherId);

  if (!teacher) {
    errors.push(`Teacher ${assignment.teacherId} not found`);
    return errors;
  }

  if (!teacher.subjects.includes(assignment.subjectId)) {
    errors.push(
      `Teacher ${teacher.name} is not qualified to teach ${assignment.subjectId}`
    );
  }

  if (!isTeacherAvailable(teacher, day, slot)) {
    errors.push(
      `Teacher ${teacher.name} is not available on ${day} slot ${slot}`
    );
  }

  return errors;
}
