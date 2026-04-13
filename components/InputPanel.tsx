"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { BreakSlot } from "@/lib/types";
import { useTimetableStore } from "@/store/timetable-store";
import { getSubjectColor } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Section = "class" | "days" | "subjects" | "teachers" | "breaks";

interface Class {
  id: string;
  name: string;
}

interface ClassTeacherSubject {
  id: string;
  class_id: string;
  teacher_id: string;
  subject_id: string;
}

interface DBSubject {
  id: string;
  name: string;
  color?: string;
  frequency_per_week: number;
  prefer_morning?: boolean;
}

export default function InputPanel() {
  const { input, setInput, generate, isGenerating, setSelectedClass } = useTimetableStore();
  const [openSection, setOpenSection] = useState<Section>("class");
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClassLocal] = useState<string>("");
  const [assignments, setAssignments] = useState<ClassTeacherSubject[]>([]);
  const [loadingClass, setLoadingClass] = useState(false);

  // Load classes on mount
  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    try {
      const res = await fetch("/api/classes");
      if (res.ok) {
        setClasses(await res.json());
      }
    } catch (err) {
      console.error("Failed to load classes", err);
    }
  }

  // Load data for selected class
  async function handleSelectClass(classId: string) {
    setSelectedClassLocal(classId);
    setLoadingClass(true);
    try {
      const res = await fetch(`/api/class-teacher-subjects?class_id=${classId}`);
      if (!res.ok) throw new Error("Failed to load class data");
      const assigns = await res.json();

      setAssignments(assigns);

      // Build subjects list — unique subjects from assignments only
      const subjectMap = new Map<string, DBSubject>();
      assigns.forEach((a: any) => {
        if (a.subjects && !subjectMap.has(a.subjects.id)) {
          subjectMap.set(a.subjects.id, a.subjects);
        }
      });

      // Build teachers list from assignments
      const teacherMap = new Map<string, { id: string; name: string; subjects: string[] }>();
      assigns.forEach((a: any) => {
        if (!teacherMap.has(a.teacher_id)) {
          teacherMap.set(a.teacher_id, {
            id: a.teacher_id,
            name: a.teachers?.name || "Unknown",
            subjects: [],
          });
        }
        if (a.subject_id) {
          teacherMap.get(a.teacher_id)!.subjects.push(a.subject_id);
        }
      });

      const className = classes.find((c) => c.id === classId)?.name ?? null;
      setSelectedClass(classId, className);

      setInput({
        ...input,
        classId,
        teachers: Array.from(teacherMap.values()),
        subjects: Array.from(subjectMap.values()).map((s) => ({
          id: s.id,
          name: s.name,
          frequencyPerWeek: s.frequency_per_week ?? 3,
          color: s.color,
          preferMorning: s.prefer_morning,
        })),
      });
    } catch (err) {
      console.error("Failed to load class data", err);
    } finally {
      setLoadingClass(false);
    }
  }

  function toggle(s: Section) {
    setOpenSection((prev) => (prev === s ? "class" : s));
  }

  // ── Days ──────────────────────────────────────────────────────────────────
  function toggleDay(day: string) {
    const days = input.days.includes(day)
      ? input.days.filter((d) => d !== day)
      : [...input.days, day];
    setInput({ ...input, days });
  }

  // ── Breaks ────────────────────────────────────────────────────────────────
  function addBreak() {
    const newBreak: BreakSlot = {
      day: input.days[0] ?? "Monday",
      slot: 3,
      label: "Lunch Break",
    };
    setInput({ ...input, breakSlots: [...(input.breakSlots ?? []), newBreak] });
  }

  function updateBreak(i: number, patch: Partial<BreakSlot>) {
    const breakSlots = [...(input.breakSlots ?? [])];
    breakSlots[i] = { ...breakSlots[i], ...patch };
    setInput({ ...input, breakSlots });
  }

  function removeBreak(i: number) {
    const breakSlots = (input.breakSlots ?? []).filter((_, idx) => idx !== i);
    setInput({ ...input, breakSlots });
  }

  const slotCount =
    typeof input.timeSlotsPerDay === "number" ? input.timeSlotsPerDay : 7;

  return (
    <div className="space-y-3">
      {/* Class Selection */}
      <Accordion title="Class Selection" isOpen={openSection === "class"} onToggle={() => toggle("class")}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-2 block">Select Class</label>
            <select
              value={selectedClass}
              onChange={(e) => handleSelectClass(e.target.value)}
              disabled={loadingClass}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Choose a class...</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
            {loadingClass && <p className="text-xs text-slate-500 mt-1">Loading data...</p>}
            {selectedClass && !loadingClass && (
              <p className="text-xs text-slate-600 mt-1">✓ {classes.find((c) => c.id === selectedClass)?.name} loaded</p>
            )}
          </div>
        </div>
      </Accordion>

      {/* Days & Slots */}
      <Accordion title="Days & Time Slots" isOpen={openSection === "days"} onToggle={() => toggle("days")}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-2 block">School Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-lg border transition-colors",
                    input.days.includes(day)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                  )}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">
              Periods per day: <strong>{slotCount}</strong>
            </label>
            <input
              type="range"
              min={4}
              max={10}
              value={slotCount}
              onChange={(e) =>
                setInput({ ...input, timeSlotsPerDay: parseInt(e.target.value) })
              }
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>4</span>
              <span>10</span>
            </div>
          </div>
        </div>
      </Accordion>

      {/* Subjects — loaded from class, frequency editable */}
      <Accordion title={`Subjects (${input.subjects.length})`} isOpen={openSection === "subjects"} onToggle={() => toggle("subjects")}>
        <div className="space-y-2">
          {input.subjects.length === 0 && (
            <p className="text-xs text-slate-500">Select a class to see assigned subjects</p>
          )}
          {input.subjects.map((s) => (
            <div key={s.id} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                {/* Clickable color swatch */}
                <label className="relative shrink-0 cursor-pointer group" title="Change color">
                  <div
                    className="w-5 h-5 rounded border border-slate-300 group-hover:ring-2 group-hover:ring-blue-400 transition-all"
                    style={{ backgroundColor: s.color ?? getSubjectColor(s.id) }}
                  />
                  <input
                    type="color"
                    value={s.color ?? getSubjectColor(s.id)}
                    onChange={async (e) => {
                      const color = e.target.value;
                      setInput({
                        ...input,
                        subjects: input.subjects.map((sub) =>
                          sub.id === s.id ? { ...sub, color } : sub
                        ),
                      });
                      // Persist to DB
                      await fetch(`/api/subjects/${s.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ color }),
                      }).catch(() => {});
                    }}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </label>
                <span className="flex-1 text-sm font-medium text-slate-700">{s.name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-slate-500">×/wk</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={s.frequencyPerWeek}
                    onChange={(e) =>
                      setInput({
                        ...input,
                        subjects: input.subjects.map((sub) =>
                          sub.id === s.id
                            ? { ...sub, frequencyPerWeek: parseInt(e.target.value) || 1 }
                            : sub
                        ),
                      })
                    }
                    className="w-10 text-sm text-center border border-slate-300 rounded px-1 py-0.5"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Accordion>

      {/* Teachers (Read-only) */}
      <Accordion title={`Teachers (${input.teachers.length})`} isOpen={openSection === "teachers"} onToggle={() => toggle("teachers")}>
        {selectedClass && (
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            Teachers and subjects loaded from class setup
          </div>
        )}
        <div className="space-y-2">
          {input.teachers.length === 0 && (
            <p className="text-xs text-slate-500">Select a class to see assigned teachers</p>
          )}
          {input.teachers.map((t) => (
            <div key={t.id} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-700 mb-2">{t.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {t.subjects.map((subId) => {
                  const subj = input.subjects.find((s) => s.id === subId);
                  return (
                    <span
                      key={subId}
                      className="text-xs px-2 py-1 rounded-full text-white"
                      style={{ backgroundColor: subj?.color ?? "#3b82f6" }}
                    >
                      {subj?.name}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Accordion>

      {/* Breaks */}
      <Accordion title={`Break Slots (${(input.breakSlots ?? []).length})`} isOpen={openSection === "breaks"} onToggle={() => toggle("breaks")}>
        <div className="space-y-2">
          {(input.breakSlots ?? []).map((b, i) => (
            <div key={i} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <select
                value={b.day}
                onChange={(e) => updateBreak(i, { day: e.target.value })}
                className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
              >
                {input.days.map((d) => (
                  <option key={d} value={d}>
                    {d.slice(0, 3)}
                  </option>
                ))}
              </select>
              <select
                value={b.slot}
                onChange={(e) => updateBreak(i, { slot: parseInt(e.target.value) })}
                className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
              >
                {Array.from({ length: slotCount }, (_, s) => (
                  <option key={s} value={s}>
                    P{s + 1}
                  </option>
                ))}
              </select>
              <input
                value={b.label ?? ""}
                onChange={(e) => updateBreak(i, { label: e.target.value })}
                placeholder="Label"
                className="flex-1 text-xs border border-slate-300 rounded px-2 py-1"
              />
              <button onClick={() => removeBreak(i)} className="text-slate-300 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={addBreak}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium py-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Break
          </button>
        </div>
      </Accordion>

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={isGenerating || !selectedClass}
        className={cn(
          "w-full py-3 rounded-xl text-sm font-semibold transition-all",
          isGenerating || !selectedClass
            ? "bg-blue-400 text-white cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
        )}
      >
        {isGenerating ? "Generating Timetable…" : !selectedClass ? "Select a class first" : "Generate Timetable"}
      </button>
    </div>
  );
}

function Accordion({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        {title}
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {isOpen && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}
