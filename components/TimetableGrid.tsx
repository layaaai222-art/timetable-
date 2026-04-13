"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Timetable, TimetableInput, Violation } from "@/lib/types";
import { useTimetableStore } from "@/store/timetable-store";
import SlotCell from "./SlotCell";
import { getSlotLabel } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

interface SlotWrapperProps {
  day: string;
  slot: number;
  timetable: Timetable;
  input: TimetableInput;
  violations: Violation[];
  selectedSlot: { day: string; slot: number } | null;
  dragOverId: string | null;
  draggingId: string | null;
  onSelect: (day: string, slot: number) => void;
  onLock: (day: string, slot: number) => void;
  onClear: (day: string, slot: number) => void;
}

function SlotWrapper({
  day,
  slot,
  timetable,
  input,
  violations,
  selectedSlot,
  dragOverId,
  draggingId,
  onSelect,
  onLock,
  onClear,
}: SlotWrapperProps) {
  const id = `${day}__${slot}`;
  const assignment = timetable[day]?.[slot] ?? null;
  const isLocked = assignment?.locked ?? false;
  const isBreak = assignment?.isBreak ?? false;

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } =
    useDraggable({
      id,
      disabled: isLocked || isBreak || !assignment,
    });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id,
    disabled: isBreak || isLocked,
  });

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      setDragRef(el);
      setDropRef(el);
    },
    [setDragRef, setDropRef]
  );

  return (
    <div
      ref={setRef}
      {...listeners}
      {...attributes}
      className="touch-none"
    >
      <SlotCell
        day={day}
        slot={slot}
        assignment={assignment}
        input={input}
        violations={violations}
        isSelected={selectedSlot?.day === day && selectedSlot?.slot === slot}
        isDragOver={isOver || dragOverId === id}
        isDragging={isDragging || draggingId === id}
        onSelect={() => onSelect(day, slot)}
        onLock={() => onLock(day, slot)}
        onClear={() => onClear(day, slot)}
      />
    </div>
  );
}

export default function TimetableGrid() {
  const {
    timetable,
    input,
    violations,
    selectedSlot,
    setSelectedSlot,
    applyEdit,
    alternates,
    activeAlternateIndex,
    setAlternateIndex,
  } = useTimetableStore();

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const slotCount = Array.isArray(input.timeSlotsPerDay)
    ? input.timeSlotsPerDay.length
    : (input.timeSlotsPerDay as number);

  function parseSlotId(id: string): { day: string; slot: number } {
    const sep = id.lastIndexOf("__");
    return { day: id.slice(0, sep), slot: parseInt(id.slice(sep + 2), 10) };
  }

  function handleDragStart(e: DragStartEvent) {
    setDraggingId(String(e.active.id));
  }

  function handleDragOver(e: DragOverEvent) {
    setDragOverId(e.over ? String(e.over.id) : null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    setDragOverId(null);
    if (!e.over || e.active.id === e.over.id) return;

    const from = parseSlotId(String(e.active.id));
    const to = parseSlotId(String(e.over.id));
    const destCell = timetable![to.day]?.[to.slot];

    if (destCell && !destCell.isBreak) {
      // Swap
      applyEdit({ type: "swap", slot1: from, slot2: to });
    } else {
      // Move
      applyEdit({ type: "move", from, to });
    }
  }

  const handleSelect = useCallback(
    (day: string, slot: number) => {
      if (selectedSlot?.day === day && selectedSlot?.slot === slot) {
        setSelectedSlot(null);
      } else {
        setSelectedSlot({ day, slot });
      }
    },
    [selectedSlot, setSelectedSlot]
  );

  const handleLock = useCallback(
    (day: string, slot: number) => {
      const cell = timetable![day]?.[slot];
      if (!cell) return;
      applyEdit({
        type: cell.locked ? "unlock" : "lock",
        slot: { day, slot },
      });
    },
    [timetable, applyEdit]
  );

  const handleClear = useCallback(
    (day: string, slot: number) => {
      applyEdit({ type: "clear", slot: { day, slot } });
    },
    [applyEdit]
  );

  if (!timetable) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-slate-400">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <span className="text-3xl">📅</span>
        </div>
        <p className="text-lg font-medium text-slate-600">No timetable yet</p>
        <p className="text-sm mt-1">Configure your school in Setup, then click Generate.</p>
      </div>
    );
  }

  // Guard: if input days changed after generation, the timetable keys won't match.
  const staleDays = input.days.some((d) => !(d in timetable));
  if (staleDays) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <p className="font-semibold text-slate-700">Setup changed</p>
        <p className="text-sm text-slate-500 mt-1">
          Days or slots were modified after the last generation.
        </p>
        <p className="text-sm text-slate-500">Click <strong>Generate</strong> to rebuild.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Alternate selector */}
      {alternates.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 font-medium">Options:</span>
          {[0, ...alternates.map((_, i) => i + 1)].map((i) => (
            <button
              key={i}
              onClick={() => setAlternateIndex(i)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                activeAlternateIndex === i
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Option {i + 1}
            </button>
          ))}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="w-28 px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Period
                </th>
                {input.days.map((day) => (
                  <th
                    key={day}
                    className="px-3 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider min-w-[140px]"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: slotCount }, (_, s) => (
                <tr
                  key={s}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-3 py-2 text-xs text-slate-500 font-medium whitespace-nowrap">
                    <div>{getSlotLabel(input, s)}</div>
                  </td>
                  {input.days.map((day) => (
                    <td key={day} className="px-2 py-2">
                      <SlotWrapper
                        day={day}
                        slot={s}
                        timetable={timetable}
                        input={input}
                        violations={violations}
                        selectedSlot={selectedSlot}
                        dragOverId={dragOverId}
                        draggingId={draggingId}
                        onSelect={handleSelect}
                        onLock={handleLock}
                        onClear={handleClear}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DndContext>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        {input.subjects.map((s) => (
          <div key={s.id} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: s.color ?? "#94a3b8" }}
            />
            <span>{s.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-3 h-3 rounded-sm border-2 border-red-400" />
          <span>Conflict</span>
          <div className="w-3 h-3 rounded-sm border-2 border-yellow-400 ml-2" />
          <span>Warning</span>
        </div>
      </div>
    </div>
  );
}
