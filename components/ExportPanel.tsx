"use client";

import { Download, FileJson, FileText, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { useTimetableStore } from "@/store/timetable-store";
import { getSlotLabel } from "@/lib/sample-data";
import type { Timetable, TimetableInput, Violation } from "@/lib/types";

interface DBClass {
  id: string;
  name: string;
}

interface SavedTimetable {
  id: string;
  class_id: string | null;
  data: { timetable: Timetable; input: TimetableInput; violations?: Violation[] };
  metadata: { className?: string; savedAt?: string; optimizationScore?: number | null };
  updated_at: string;
}

export default function ExportPanel() {
  const { timetable, input, output } = useTimetableStore();
  const [copied, setCopied] = useState(false);

  // Class-wise export state
  const [classes, setClasses] = useState<DBClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [savedList, setSavedList] = useState<SavedTimetable[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState("");
  const [loadingClass, setLoadingClass] = useState(false);

  // The timetable & input shown in preview / used for export
  // Either the store's current one (when no class selected) or the saved one
  const exportTimetable: Timetable | null =
    selectedSavedId
      ? savedList.find((s) => s.id === selectedSavedId)?.data.timetable ?? null
      : timetable;

  const exportInput: TimetableInput | null =
    selectedSavedId
      ? savedList.find((s) => s.id === selectedSavedId)?.data.input ?? null
      : input;

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((data) => setClasses(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setSavedList([]);
      setSelectedSavedId("");
      return;
    }
    setLoadingClass(true);
    fetch(`/api/timetables?class_id=${selectedClassId}`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setSavedList(list);
        setSelectedSavedId(list[0]?.id ?? "");
      })
      .catch(() => {})
      .finally(() => setLoadingClass(false));
  }, [selectedClassId]);

  if (!timetable && !selectedSavedId) {
    return (
      <div className="space-y-6">
        {/* Class-wise export picker even when no current timetable */}
        <ClassPicker
          classes={classes}
          selectedClassId={selectedClassId}
          setSelectedClassId={setSelectedClassId}
          savedList={savedList}
          selectedSavedId={selectedSavedId}
          setSelectedSavedId={setSelectedSavedId}
          loadingClass={loadingClass}
        />
        {!selectedSavedId && (
          <div className="text-center py-12 text-slate-400">
            <Download className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Generate a timetable or select a saved class timetable above.</p>
          </div>
        )}
      </div>
    );
  }

  function exportJSON() {
    if (!exportTimetable || !exportInput) return;
    const data = { timetable: exportTimetable, input: exportInput };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const name = selectedClassId
      ? `timetable-${classes.find((c) => c.id === selectedClassId)?.name ?? selectedClassId}.json`
      : "timetable.json";
    download(blob, name);
  }

  function exportCSV() {
    if (!exportTimetable || !exportInput) return;
    const csv = buildCSV(exportTimetable, exportInput);
    const blob = new Blob([csv], { type: "text/csv" });
    const name = selectedClassId
      ? `timetable-${classes.find((c) => c.id === selectedClassId)?.name ?? selectedClassId}.csv`
      : "timetable.csv";
    download(blob, name);
  }

  async function copyJSON() {
    if (!exportTimetable || !exportInput) return;
    const data = JSON.stringify({ timetable: exportTimetable, input: exportInput }, null, 2);
    await navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const slotCount = exportInput
    ? Array.isArray(exportInput.timeSlotsPerDay)
      ? exportInput.timeSlotsPerDay.length
      : (exportInput.timeSlotsPerDay as number)
    : 0;

  return (
    <div className="space-y-6">
      {/* Class-wise selector */}
      <ClassPicker
        classes={classes}
        selectedClassId={selectedClassId}
        setSelectedClassId={setSelectedClassId}
        savedList={savedList}
        selectedSavedId={selectedSavedId}
        setSelectedSavedId={setSelectedSavedId}
        loadingClass={loadingClass}
      />

      {exportTimetable && exportInput && (
        <>
          {/* Export buttons */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Export Options</h2>
            <div className="grid grid-cols-3 gap-3">
              <ExportCard
                icon={<FileJson className="w-5 h-5 text-blue-500" />}
                title="JSON"
                description="Full structured data with metadata"
                action="Download"
                onClick={exportJSON}
              />
              <ExportCard
                icon={<FileText className="w-5 h-5 text-emerald-500" />}
                title="CSV"
                description="Spreadsheet-ready format"
                action="Download"
                onClick={exportCSV}
              />
              <ExportCard
                icon={copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-purple-500" />}
                title="Copy JSON"
                description="Copy to clipboard"
                action={copied ? "Copied!" : "Copy"}
                onClick={copyJSON}
              />
            </div>
          </div>

          {/* Preview */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Preview</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 text-xs">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Period</th>
                    {exportInput.days.map((d) => (
                      <th key={d} className="px-3 py-2 text-center font-semibold text-slate-700">
                        {d.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: slotCount }, (_, s) => (
                    <tr key={s} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-500">{getSlotLabel(exportInput, s)}</td>
                      {exportInput.days.map((day) => {
                        const cell = exportTimetable[day]?.[s];
                        if (!cell) return <td key={day} className="px-3 py-2 text-slate-300 text-center">—</td>;
                        if (cell.isBreak)
                          return <td key={day} className="px-3 py-2 text-slate-400 text-center italic">Break</td>;
                        const subject = exportInput.subjects.find((sub) => sub.id === cell.subjectId);
                        const teacher = exportInput.teachers.find((t) => t.id === cell.teacherId);
                        return (
                          <td key={day} className="px-3 py-2 text-center">
                            <div className="font-medium text-slate-700">{subject?.name ?? cell.subjectId}</div>
                            <div className="text-slate-400">{teacher?.name?.split(" ").slice(-1)[0]}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ClassPicker({
  classes,
  selectedClassId,
  setSelectedClassId,
  savedList,
  selectedSavedId,
  setSelectedSavedId,
  loadingClass,
}: {
  classes: DBClass[];
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  savedList: SavedTimetable[];
  selectedSavedId: string;
  setSelectedSavedId: (id: string) => void;
  loadingClass: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">Class-wise Export</h2>
      <p className="text-xs text-slate-500">
        Select a saved class timetable to preview and export, or leave empty to export the currently generated one.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Current (generated)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {selectedClassId && (
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Saved timetable</label>
            {loadingClass ? (
              <p className="text-xs text-slate-400 pt-2">Loading…</p>
            ) : savedList.length === 0 ? (
              <p className="text-xs text-slate-400 pt-2">No saved timetables for this class</p>
            ) : (
              <select
                value={selectedSavedId}
                onChange={(e) => setSelectedSavedId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {savedList.map((s) => {
                  const label = s.metadata?.savedAt
                    ? new Date(s.metadata.savedAt).toLocaleString(undefined, {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })
                    : new Date(s.updated_at).toLocaleString();
                  return (
                    <option key={s.id} value={s.id}>{label}</option>
                  );
                })}
              </select>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ExportCard({
  icon,
  title,
  description,
  action,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="border border-slate-200 rounded-xl p-4 flex flex-col gap-2 hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-semibold text-sm text-slate-700">{title}</span>
      </div>
      <p className="text-xs text-slate-500 flex-1">{description}</p>
      <button
        onClick={onClick}
        className="mt-1 text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
      >
        <Download className="w-3 h-3" />
        {action}
      </button>
    </div>
  );
}

function buildCSV(timetable: Timetable, input: TimetableInput): string {
  const slotCount = Array.isArray(input.timeSlotsPerDay)
    ? input.timeSlotsPerDay.length
    : (input.timeSlotsPerDay as number);

  const headers = ["Period", ...input.days];
  const rows: string[][] = [headers];

  for (let s = 0; s < slotCount; s++) {
    const row: string[] = [getSlotLabel(input, s)];
    for (const day of input.days) {
      const cell = timetable[day]?.[s];
      if (!cell) {
        row.push("");
      } else if (cell.isBreak) {
        row.push(cell.breakLabel ?? "Break");
      } else {
        const subject = input.subjects.find((sub) => sub.id === cell.subjectId);
        const teacher = input.teachers.find((t) => t.id === cell.teacherId);
        row.push(`${subject?.name ?? cell.subjectId} (${teacher?.name ?? cell.teacherId})`);
      }
    }
    rows.push(row);
  }

  return rows.map((r) => r.map((cell) => `"${cell}"`).join(",")).join("\n");
}
