"use client";

import { useState, useEffect } from "react";
import { Trash2, Plus, ArrowLeft } from "lucide-react";

interface Class {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  teacher_id: string;
  subject_id: string;
  teachers: { id: string; name: string };
  subjects: { id: string; name: string; color: string; frequency_per_week: number };
}

// Groups assignments by teacher
interface TeacherGroup {
  teacher: { id: string; name: string };
  assignments: Assignment[];
}

type View = "list" | "detail";

const DEFAULT_COLORS = [
  "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B",
  "#EF4444", "#EC4899", "#06B6D4", "#84CC16",
  "#F97316", "#14B8A6",
];

export function ManagementPanel() {
  const [view, setView] = useState<View>("list");
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [teacherGroups, setTeacherGroups] = useState<TeacherGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Class form
  const [className, setClassName] = useState("");

  // Add teacher form (shown at bottom of detail view)
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [firstSubjectName, setFirstSubjectName] = useState("");
  const [firstSubjectColor, setFirstSubjectColor] = useState(DEFAULT_COLORS[0]);

  // Add subject form per teacher: key = teacher_id
  const [openSubjectForm, setOpenSubjectForm] = useState<string>("");
  const [subjectForms, setSubjectForms] = useState<Record<string, { name: string; color: string }>>({});

  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/classes");
      if (!res.ok) throw new Error("Failed to load classes");
      setClasses(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading classes");
    } finally {
      setLoading(false);
    }
  }

  async function loadClassDetail(cls: Class) {
    setSelectedClass(cls);
    setView("detail");
    setDetailLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/class-teacher-subjects?class_id=${cls.id}`);
      if (!res.ok) throw new Error("Failed to load class data");
      const assignments: Assignment[] = await res.json();

      // Group by teacher
      const groupMap = new Map<string, TeacherGroup>();
      for (const a of assignments) {
        if (!groupMap.has(a.teacher_id)) {
          groupMap.set(a.teacher_id, { teacher: a.teachers, assignments: [] });
        }
        groupMap.get(a.teacher_id)!.assignments.push(a);
      }
      setTeacherGroups(Array.from(groupMap.values()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading class data");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleAddClass() {
    if (!className.trim()) return;
    setError(null);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: className.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add class");
      const newClass = await res.json();
      setClasses((prev) => [newClass, ...prev]);
      setClassName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error adding class");
    }
  }

  async function handleDeleteClass(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete class");
      setClasses((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting class");
    }
  }

  // Add teacher + first subject to the current class
  async function handleAddTeacherWithSubject() {
    if (!selectedClass || !teacherName.trim() || !firstSubjectName.trim()) return;
    setError(null);
    try {
      // 1. Create teacher
      const tRes = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teacherName.trim() }),
      });
      if (!tRes.ok) throw new Error("Failed to create teacher");
      const teacher = await tRes.json();

      // 2. Create subject
      const sRes = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: firstSubjectName.trim(),
          color: firstSubjectColor,
          frequency_per_week: 3,
          prefer_morning: false,
        }),
      });
      if (!sRes.ok) throw new Error("Failed to create subject");
      const subject = await sRes.json();

      // 3. Assign teacher+subject to class
      const aRes = await fetch("/api/class-teacher-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: selectedClass.id,
          teacher_id: teacher.id,
          subject_id: subject.id,
        }),
      });
      if (!aRes.ok) throw new Error("Failed to assign teacher to class");
      const assignment = await aRes.json();

      // Update local state
      const newAssignment: Assignment = {
        ...assignment,
        teachers: { id: teacher.id, name: teacher.name },
        subjects: { id: subject.id, name: subject.name, color: subject.color, frequency_per_week: subject.frequency_per_week },
      };
      setTeacherGroups((prev) => [
        ...prev,
        { teacher: { id: teacher.id, name: teacher.name }, assignments: [newAssignment] },
      ]);

      setTeacherName("");
      setFirstSubjectName("");
      setFirstSubjectColor(DEFAULT_COLORS[0]);
      setShowTeacherForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error adding teacher");
    }
  }

  // Add another subject to an existing teacher in this class
  async function handleAddSubjectToTeacher(teacherId: string) {
    if (!selectedClass) return;
    const form = subjectForms[teacherId];
    if (!form?.name?.trim()) return;
    setError(null);
    try {
      // 1. Create subject
      const sRes = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          color: form.color,
          frequency_per_week: 3,
          prefer_morning: false,
        }),
      });
      if (!sRes.ok) throw new Error("Failed to create subject");
      const subject = await sRes.json();

      // 2. Assign to class+teacher
      const aRes = await fetch("/api/class-teacher-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: selectedClass.id,
          teacher_id: teacherId,
          subject_id: subject.id,
        }),
      });
      if (!aRes.ok) throw new Error("Failed to assign subject");
      const assignment = await aRes.json();

      const newAssignment: Assignment = {
        ...assignment,
        teachers: teacherGroups.find((g) => g.teacher.id === teacherId)!.teacher,
        subjects: { id: subject.id, name: subject.name, color: subject.color, frequency_per_week: subject.frequency_per_week },
      };

      setTeacherGroups((prev) =>
        prev.map((g) =>
          g.teacher.id === teacherId
            ? { ...g, assignments: [...g.assignments, newAssignment] }
            : g
        )
      );
      setSubjectForms((prev) => ({ ...prev, [teacherId]: { name: "", color: DEFAULT_COLORS[0] } }));
      setOpenSubjectForm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error adding subject");
    }
  }

  async function handleDeleteAssignment(assignmentId: string, teacherId: string, subjectId: string) {
    setError(null);
    try {
      // 1. Delete the assignment link first (removes FK references to subject + teacher)
      const res = await fetch(`/api/class-teacher-subjects/${assignmentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete assignment");

      // 2. Delete the subject (always — subjects are created per-class)
      await fetch(`/api/subjects/${subjectId}`, { method: "DELETE" }).catch(() => {});

      // 3. Delete teacher only if they have no other assignments in this class
      const remainingForTeacher = teacherGroups
        .flatMap((g) => g.assignments)
        .filter((a) => a.teacher_id === teacherId && a.id !== assignmentId);

      if (remainingForTeacher.length === 0) {
        // Attempt delete — DB FK will block it silently if teacher exists in other classes
        await fetch(`/api/teachers/${teacherId}`, { method: "DELETE" }).catch(() => {});
      }

      setTeacherGroups((prev) =>
        prev
          .map((g) =>
            g.teacher.id === teacherId
              ? { ...g, assignments: g.assignments.filter((a) => a.id !== assignmentId) }
              : g
          )
          .filter((g) => g.assignments.length > 0)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting assignment");
    }
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────

  if (view === "list") {
    return (
      <div className="p-6 bg-white rounded-lg border max-w-2xl">
        <h2 className="text-xl font-bold mb-5 text-slate-800">Data Management</h2>

        {error && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Add Class */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="Class name (e.g. 9A, 10B)"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddClass()}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddClass}
            disabled={!className.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Plus size={15} /> Add Class
          </button>
        </div>

        {/* Classes list */}
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : classes.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-4xl mb-3">📚</p>
            <p className="text-sm font-medium">No classes yet</p>
            <p className="text-xs mt-1">Add a class above to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-colors group"
              >
                <button
                  onClick={() => loadClassDetail(cls)}
                  className="flex-1 text-left"
                >
                  <p className="font-semibold text-slate-800">{cls.name}</p>
                  <p className="text-xs text-blue-600 mt-0.5 group-hover:underline">
                    Click to manage teachers & subjects →
                  </p>
                </button>
                <button
                  onClick={() => handleDeleteClass(cls.id)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── DETAIL VIEW ──────────────────────────────────────────────────────────

  return (
    <div className="p-6 bg-white rounded-lg border max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => { setView("list"); setSelectedClass(null); setTeacherGroups([]); setShowTeacherForm(false); setError(null); }}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{selectedClass?.name}</h2>
          <p className="text-xs text-slate-500">Manage teachers and subjects for this class</p>
        </div>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {detailLoading ? (
        <p className="text-slate-500 text-sm">Loading class data...</p>
      ) : (
        <div className="space-y-4">
          {/* Teacher groups */}
          {teacherGroups.length === 0 && !showTeacherForm && (
            <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              <p className="text-3xl mb-2">👩‍🏫</p>
              <p className="text-sm font-medium">No teachers yet</p>
              <p className="text-xs mt-1">Add a teacher below</p>
            </div>
          )}

          {teacherGroups.map((group) => (
            <div key={group.teacher.id} className="border border-slate-200 rounded-xl overflow-hidden">
              {/* Teacher header */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                    {group.teacher.name.charAt(0)}
                  </div>
                  <span className="font-semibold text-slate-800 text-sm">{group.teacher.name}</span>
                </div>
              </div>

              {/* Subjects for this teacher */}
              <div className="p-3 space-y-2">
                {group.assignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-white border border-slate-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      {/* Clickable color dot */}
                      <label className="relative shrink-0 cursor-pointer group" title="Change color">
                        <div
                          className="w-4 h-4 rounded-full border border-slate-200 group-hover:ring-2 group-hover:ring-blue-400 transition-all"
                          style={{ backgroundColor: a.subjects.color || "#3b82f6" }}
                        />
                        <input
                          type="color"
                          defaultValue={a.subjects.color || "#3b82f6"}
                          onChange={async (e) => {
                            const color = e.target.value;
                            a.subjects.color = color; // update in place for re-render
                            await fetch(`/api/subjects/${a.subject_id}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ color }),
                            }).catch(() => {});
                            // Force a re-render by updating state shallowly
                            setTeacherGroups((prev) => [...prev]);
                          }}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        />
                      </label>
                      <span className="text-sm text-slate-700">{a.subjects.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteAssignment(a.id, group.teacher.id, a.subject_id)}
                      className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}

                {/* Add subject form for this teacher */}
                {openSubjectForm === group.teacher.id ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                    <input
                      type="text"
                      placeholder="Subject name"
                      value={subjectForms[group.teacher.id]?.name ?? ""}
                      onChange={(e) =>
                        setSubjectForms((prev) => ({
                          ...prev,
                          [group.teacher.id]: { ...prev[group.teacher.id], name: e.target.value },
                        }))
                      }
                      onKeyDown={(e) => e.key === "Enter" && handleAddSubjectToTeacher(group.teacher.id)}
                      className="flex-1 text-sm px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <label className="relative shrink-0 cursor-pointer group" title="Pick color">
                      <div
                        className="w-8 h-8 rounded border border-slate-300 group-hover:ring-2 group-hover:ring-blue-400 transition-all"
                        style={{ backgroundColor: subjectForms[group.teacher.id]?.color ?? DEFAULT_COLORS[0] }}
                      />
                      <input
                        type="color"
                        value={subjectForms[group.teacher.id]?.color ?? DEFAULT_COLORS[0]}
                        onChange={(e) =>
                          setSubjectForms((prev) => ({
                            ...prev,
                            [group.teacher.id]: { ...prev[group.teacher.id], color: e.target.value },
                          }))
                        }
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                    </label>
                    <button
                      onClick={() => handleAddSubjectToTeacher(group.teacher.id)}
                      disabled={!subjectForms[group.teacher.id]?.name?.trim()}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded font-medium hover:bg-blue-700 disabled:bg-slate-300"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setOpenSubjectForm("")}
                      className="px-2 py-1 text-slate-400 text-xs hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setOpenSubjectForm(group.teacher.id);
                      setSubjectForms((prev) => ({
                        ...prev,
                        [group.teacher.id]: prev[group.teacher.id] ?? { name: "", color: DEFAULT_COLORS[group.assignments.length % DEFAULT_COLORS.length] },
                      }));
                    }}
                    className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Plus size={12} /> Add Subject to {group.teacher.name}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add Teacher form */}
          {showTeacherForm ? (
            <div className="border-2 border-dashed border-blue-300 rounded-xl p-4 space-y-3 bg-blue-50/30">
              <p className="text-sm font-semibold text-slate-700">Add New Teacher</p>
              <input
                type="text"
                placeholder="Teacher name"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="First subject name"
                  value={firstSubjectName}
                  onChange={(e) => setFirstSubjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTeacherWithSubject()}
                  className="flex-1 text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <label className="relative shrink-0 cursor-pointer group" title="Pick color">
                  <div
                    className="w-10 h-10 rounded-lg border border-slate-300 group-hover:ring-2 group-hover:ring-blue-400 transition-all"
                    style={{ backgroundColor: firstSubjectColor }}
                  />
                  <input
                    type="color"
                    value={firstSubjectColor}
                    onChange={(e) => setFirstSubjectColor(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddTeacherWithSubject}
                  disabled={!teacherName.trim() || !firstSubjectName.trim()}
                  className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  Add Teacher
                </button>
                <button
                  onClick={() => { setShowTeacherForm(false); setTeacherName(""); setFirstSubjectName(""); }}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowTeacherForm(true)}
              className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/30 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Add Teacher
            </button>
          )}
        </div>
      )}
    </div>
  );
}
