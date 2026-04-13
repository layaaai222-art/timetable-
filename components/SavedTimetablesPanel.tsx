"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, FolderOpen, RefreshCw } from "lucide-react";
import { useTimetableStore } from "@/store/timetable-store";
import type { Timetable, TimetableInput, Violation } from "@/lib/types";

interface SavedTimetable {
  id: string;
  class_id: string | null;
  data: {
    timetable: Timetable;
    input: TimetableInput;
    violations?: Violation[];
  };
  metadata: {
    className?: string;
    savedAt?: string;
    optimizationScore?: number | null;
    generationTime?: number;
    algorithm?: string;
  };
  updated_at: string;
}

interface DBClass {
  id: string;
  name: string;
}

export default function SavedTimetablesPanel() {
  const { loadSavedTimetable, setActiveTab, selectedClassId } = useTimetableStore();

  const [classes, setClasses] = useState<DBClass[]>([]);
  const [filterClassId, setFilterClassId] = useState(selectedClassId ?? "");
  const [saved, setSaved] = useState<SavedTimetable[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((data) => setClasses(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const fetchSaved = useCallback(async (classId: string) => {
    setLoading(true);
    try {
      const url = classId
        ? `/api/timetables?class_id=${classId}`
        : "/api/timetables";
      const res = await fetch(url);
      const data = await res.json();
      setSaved(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSaved(filterClassId);
  }, [filterClassId, fetchSaved]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/timetables/${id}`, { method: "DELETE" });
      setSaved((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  function handleLoad(item: SavedTimetable) {
    loadSavedTimetable({
      timetable: item.data.timetable,
      input: item.data.input,
      violations: item.data.violations,
      classId: item.class_id,
      className: item.metadata?.className ?? null,
    });
    setSuccessId(item.id);
    setActiveTab("timetable");
    setTimeout(() => setSuccessId(null), 2000);
  }

  const formatDate = (item: SavedTimetable) => {
    const raw = item.metadata?.savedAt ?? item.updated_at;
    return new Date(raw).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Saved Timetables</h3>
        <button
          onClick={() => fetchSaved(filterClassId)}
          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Class filter */}
      <select
        value={filterClassId}
        onChange={(e) => setFilterClassId(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All classes</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* List */}
      {loading ? (
        <p className="text-xs text-slate-400 text-center py-4">Loading…</p>
      ) : saved.length === 0 ? (
        <div className="text-center py-6 text-slate-400">
          <FolderOpen size={24} className="mx-auto mb-2 opacity-40" />
          <p className="text-xs">No saved timetables{filterClassId ? " for this class" : ""}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {saved.map((item) => {
            const className =
              item.metadata?.className ??
              classes.find((c) => c.id === item.class_id)?.name ??
              "Timetable";

            return (
              <div
                key={item.id}
                className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg hover:border-blue-200 hover:bg-blue-50/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{className}</p>
                  <p className="text-[10px] text-slate-400">{formatDate(item)}</p>
                  {item.metadata?.optimizationScore != null && (
                    <p className="text-[10px] text-blue-600">
                      Score: {item.metadata.optimizationScore}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleLoad(item)}
                  className="px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shrink-0"
                >
                  {successId === item.id ? "Loaded!" : "Load"}
                </button>

                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 disabled:opacity-40"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
