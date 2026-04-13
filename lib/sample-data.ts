import type { TimetableInput } from "./types";

export const SUBJECT_COLORS: Record<string, string> = {
  math: "#3B82F6",
  science: "#10B981",
  english: "#8B5CF6",
  history: "#F59E0B",
  pe: "#EF4444",
  art: "#EC4899",
  cs: "#06B6D4",
  geography: "#84CC16",
  music: "#F97316",
  biology: "#14B8A6",
  chemistry: "#6366F1",
  physics: "#0EA5E9",
};

export function getSubjectColor(subjectId: string): string {
  const lower = subjectId.toLowerCase();
  for (const [key, color] of Object.entries(SUBJECT_COLORS)) {
    if (lower.includes(key)) return color;
  }
  // Deterministic fallback based on id hash
  const palette = [
    "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B",
    "#EF4444", "#EC4899", "#06B6D4", "#84CC16",
  ];
  let hash = 0;
  for (const c of subjectId) hash = (hash * 31 + c.charCodeAt(0)) % palette.length;
  return palette[Math.abs(hash)];
}

export const SAMPLE_INPUT: TimetableInput = {
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  timeSlotsPerDay: 7,
  subjects: [],
  teachers: [],
  breakSlots: [],
};

export const SLOT_LABELS = [
  "8:00–9:00",
  "9:00–10:00",
  "10:00–11:00",
  "11:00–12:00 (Break)",
  "12:00–1:00",
  "1:00–2:00",
  "2:00–3:00",
];

export function getSlotLabel(
  input: TimetableInput,
  slot: number
): string {
  if (Array.isArray(input.timeSlotsPerDay)) {
    return String(input.timeSlotsPerDay[slot] ?? `P${slot + 1}`);
  }
  return `Period ${slot + 1}`;
}
