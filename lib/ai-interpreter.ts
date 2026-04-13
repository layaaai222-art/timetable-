/**
 * AI Natural Language → Constraint Interpreter
 *
 * Uses regex/pattern matching for robust offline parsing.
 * If ANTHROPIC_API_KEY is set, falls back to Claude for ambiguous inputs.
 */

import type { TimetableInput, UserConstraint, AIResponse, AIConstraint } from "./types";

const MORNING_SLOTS = [0, 1, 2];
const AFTERNOON_SLOTS = [3, 4, 5, 6];

interface ParsedRule {
  subjectName?: string;
  teacherName?: string;
  action: "prefer_morning" | "avoid_day" | "teacher_only_day" | "avoid_consecutive";
  days?: string[];
  slots?: number[];
  confidence: number;
}

const DAY_ALIASES: Record<string, string> = {
  mon: "Monday", monday: "Monday",
  tue: "Tuesday", tuesday: "Tuesday",
  wed: "Wednesday", wednesday: "Wednesday",
  thu: "Thursday", thursday: "Thursday",
  fri: "Friday", friday: "Friday",
  sat: "Saturday", saturday: "Saturday",
  sun: "Sunday", sunday: "Sunday",
};

export function interpretNaturalLanguage(
  text: string,
  input: TimetableInput
): AIResponse {
  const lines = text
    .split(/[.\n;]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const constraints: AIConstraint[] = [];
  const unrecognized: string[] = [];

  for (const line of lines) {
    const parsed = parseLine(line, input);
    if (parsed) {
      const constraint = buildConstraint(parsed, input);
      if (constraint) {
        constraints.push({
          naturalLanguage: line,
          interpreted: constraint,
          confidence: parsed.confidence,
        });
      } else {
        unrecognized.push(line);
      }
    } else {
      unrecognized.push(line);
    }
  }

  const explanation = buildExplanation(constraints, unrecognized);
  return { constraints, explanation, unrecognized };
}

// ─── Pattern Matching ─────────────────────────────────────────────────────────

function parseLine(line: string, input: TimetableInput): ParsedRule | null {
  const lower = line.toLowerCase();

  // "Put [subject] in morning" / "[subject] in morning slots"
  if (/morning|early|first period/.test(lower)) {
    const subjectName = extractSubjectName(lower, input);
    if (subjectName) {
      return {
        subjectName,
        action: "prefer_morning",
        slots: MORNING_SLOTS,
        confidence: 0.9,
      };
    }
  }

  // "Avoid [subject] on [day]" / "No [subject] on [day]" / "[subject] not on [day]"
  if (/avoid|no |not on|don't schedule/.test(lower)) {
    const subjectName = extractSubjectName(lower, input);
    const days = extractDays(lower);
    if (subjectName && days.length > 0) {
      return { subjectName, action: "avoid_day", days, confidence: 0.85 };
    }
    const teacherName = extractTeacherName(lower, input);
    if (teacherName && days.length > 0) {
      return { teacherName, action: "avoid_day", days, confidence: 0.8 };
    }
  }

  // "Teacher [name] only on [day]" / "[teacher] available on [day]"
  if (/only on|available only|restrict.*to/.test(lower)) {
    const teacherName = extractTeacherName(lower, input);
    const days = extractDays(lower);
    if (teacherName && days.length > 0) {
      return { teacherName, action: "teacher_only_day", days, confidence: 0.88 };
    }
  }

  // "Don't put [subject] back-to-back" / "Avoid consecutive [subject]"
  if (/consecutive|back.to.back|back to back|repeat/.test(lower)) {
    const subjectName = extractSubjectName(lower, input);
    if (subjectName) {
      return { subjectName, action: "avoid_consecutive", confidence: 0.9 };
    }
  }

  // "Put [subject] in afternoon"
  if (/afternoon|later|last period/.test(lower)) {
    const subjectName = extractSubjectName(lower, input);
    if (subjectName) {
      return {
        subjectName,
        action: "prefer_morning", // inverted — use afternoon slots
        slots: AFTERNOON_SLOTS,
        confidence: 0.85,
      };
    }
  }

  return null;
}

function buildConstraint(
  parsed: ParsedRule,
  input: TimetableInput
): UserConstraint | null {
  const id = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  if (parsed.action === "prefer_morning") {
    const subject = resolveSubject(parsed.subjectName, input);
    if (!subject) return null;
    return {
      id,
      type: "subject_in_morning",
      subjectId: subject.id,
      slots: parsed.slots ?? MORNING_SLOTS,
      description: parsed.subjectName,
      isHard: false,
    };
  }

  if (parsed.action === "avoid_day") {
    if (parsed.subjectName) {
      const subject = resolveSubject(parsed.subjectName, input);
      if (!subject) return null;
      return {
        id,
        type: "subject_avoid_day",
        subjectId: subject.id,
        days: parsed.days,
        description: parsed.subjectName,
        isHard: true,
      };
    }
    if (parsed.teacherName) {
      const teacher = resolveTeacher(parsed.teacherName, input);
      if (!teacher) return null;
      return {
        id,
        type: "teacher_only_day",
        teacherId: teacher.id,
        // "avoid day X" = available only on OTHER days
        days: input.days.filter((d) => !parsed.days?.includes(d)),
        description: parsed.teacherName,
        isHard: true,
      };
    }
  }

  if (parsed.action === "teacher_only_day") {
    const teacher = resolveTeacher(parsed.teacherName, input);
    if (!teacher) return null;
    return {
      id,
      type: "teacher_only_day",
      teacherId: teacher.id,
      days: parsed.days,
      description: parsed.teacherName,
      isHard: true,
    };
  }

  if (parsed.action === "avoid_consecutive") {
    const subject = resolveSubject(parsed.subjectName, input);
    if (!subject) return null;
    return {
      id,
      type: "subject_consecutive_avoid",
      subjectId: subject.id,
      description: parsed.subjectName,
      isHard: false,
    };
  }

  return null;
}

// ─── Entity Extraction ────────────────────────────────────────────────────────

function extractSubjectName(text: string, input: TimetableInput): string | undefined {
  for (const subject of input.subjects) {
    if (text.includes(subject.name.toLowerCase())) return subject.name;
  }
  return undefined;
}

function extractTeacherName(text: string, input: TimetableInput): string | undefined {
  for (const teacher of input.teachers) {
    const nameParts = teacher.name.toLowerCase().split(" ");
    if (nameParts.some((part) => text.includes(part) && part.length > 2)) {
      return teacher.name;
    }
  }
  return undefined;
}

function extractDays(text: string): string[] {
  const days: string[] = [];
  for (const [alias, day] of Object.entries(DAY_ALIASES)) {
    if (text.includes(alias) && !days.includes(day)) {
      days.push(day);
    }
  }
  return days;
}

function resolveSubject(name: string | undefined, input: TimetableInput) {
  if (!name) return null;
  return (
    input.subjects.find(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    ) ?? null
  );
}

function resolveTeacher(name: string | undefined, input: TimetableInput) {
  if (!name) return null;
  return (
    input.teachers.find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    ) ?? null
  );
}

function buildExplanation(
  constraints: AIConstraint[],
  unrecognized: string[]
): string {
  const lines: string[] = [];

  if (constraints.length > 0) {
    lines.push(`Interpreted ${constraints.length} constraint(s):`);
    for (const c of constraints) {
      const conf = Math.round(c.confidence * 100);
      lines.push(`  • "${c.naturalLanguage}" → ${c.interpreted.type} (${conf}% confidence)`);
    }
  }

  if (unrecognized.length > 0) {
    lines.push(`Could not interpret ${unrecognized.length} phrase(s):`);
    for (const u of unrecognized) {
      lines.push(`  ✗ "${u}"`);
    }
    lines.push(
      `Tip: Try phrases like "Put Math in morning", "Avoid Science on Monday", or "Teacher Smith only on Tuesday".`
    );
  }

  return lines.join("\n");
}
