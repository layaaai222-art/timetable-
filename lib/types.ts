// ─── Database Types ─────────────────────────────────────────────────────────

export interface Class {
  id: string;
  name: string;
  section?: string;
  students?: number;
  created_at: string;
}

// ─── Input Types ────────────────────────────────────────────────────────────

export interface Subject {
  id: string;
  name: string;
  frequencyPerWeek: number;
  color?: string;
  preferMorning?: boolean;
}

export interface TeacherAvailability {
  day: string;
  slots: number[];
}

export interface Teacher {
  id: string;
  name: string;
  subjects: string[]; // subjectIds
  availability?: TeacherAvailability[]; // undefined = always available
  preferredSlots?: TeacherAvailability[];
}

export interface Room {
  id: string;
  name: string;
  capacity?: number;
}

export interface BreakSlot {
  day: string;
  slot: number;
  label?: string;
}

export type ConstraintType =
  | "subject_in_morning"
  | "subject_avoid_day"
  | "teacher_only_day"
  | "subject_consecutive_avoid"
  | "custom";

export interface UserConstraint {
  id: string;
  type: ConstraintType;
  subjectId?: string;
  teacherId?: string;
  days?: string[];
  slots?: number[];
  description?: string;
  isHard?: boolean;
}

export interface TimetableInput {
  days: string[];
  timeSlotsPerDay: number | string[];
  subjects: Subject[];
  teachers: Teacher[];
  rooms?: Room[];
  breakSlots?: BreakSlot[];
  constraints?: UserConstraint[];
  classId?: string; // for class-specific timetables
}

export interface MultiClassTimetableInput extends TimetableInput {
  classId: string;
  className: string;
}

export interface ClubbedClassesTimetableInput extends TimetableInput {
  classIds: string[]; // IDs of classes to club together
  classNames: string[];
}

// ─── Output Types ────────────────────────────────────────────────────────────

export interface SlotAssignment {
  subjectId: string;
  teacherId: string;
  roomId?: string;
  locked?: boolean;
  isBreak?: boolean;
  breakLabel?: string;
}

export type DayTimetable = Record<string, SlotAssignment | null>;
export type Timetable = Record<string, DayTimetable>;

export interface Violation {
  type: string;
  description: string;
  day?: string;
  slot?: number;
  subjectId?: string;
  teacherId?: string;
  severity: "error" | "warning";
}

export interface ScoreBreakdown {
  distributionScore: number;
  teacherPreferenceScore: number;
  morningPreferenceScore: number;
  consecutiveAvoidanceScore: number;
  total: number;
}

export interface TimetableOutput {
  timetable: Timetable;
  violations: Violation[];
  optimizationScore: number;
  scoreBreakdown: ScoreBreakdown;
  alternates?: Timetable[];
  metadata: {
    generationTime: number;
    iterations: number;
    algorithm: string;
    totalSlots: number;
    filledSlots: number;
    solvable: boolean;
  };
}

// ─── Edit Types ───────────────────────────────────────────────────────────────

export interface SlotRef {
  day: string;
  slot: number;
}

export type EditOperation =
  | { type: "move"; from: SlotRef; to: SlotRef }
  | { type: "swap"; slot1: SlotRef; slot2: SlotRef }
  | { type: "lock"; slot: SlotRef }
  | { type: "unlock"; slot: SlotRef }
  | { type: "clear"; slot: SlotRef }
  | { type: "assign"; slot: SlotRef; assignment: Omit<SlotAssignment, "locked"> };

export interface EditResult {
  success: boolean;
  timetable: Timetable;
  violations: Violation[];
  message?: string;
}

// ─── AI Interpreter Types ─────────────────────────────────────────────────────

export interface AIConstraint {
  naturalLanguage: string;
  interpreted: UserConstraint;
  confidence: number;
}

export interface AIResponse {
  constraints: AIConstraint[];
  explanation: string;
  unrecognized?: string[];
}

// ─── Solver Internal Types ────────────────────────────────────────────────────

export interface SlotVariable {
  day: string;
  slot: number;
  key: string;
}

export interface CandidateAssignment {
  subjectId: string;
  teacherId: string;
  roomId?: string;
}
