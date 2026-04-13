import { NextRequest, NextResponse } from "next/server";
import type { TimetableInput, TimetableOutput } from "@/lib/types";
import { TimetableCSPSolver } from "@/lib/solver/csp-solver";
import { scoreTimetable } from "@/lib/solver/scorer";
import { validateTimetable } from "@/lib/validator";
import { checkFeasibility } from "@/lib/solver/constraints";

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  let input: TimetableInput;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Pre-flight feasibility check
  const feasibility = checkFeasibility(input);
  if (!feasibility.feasible) {
    return NextResponse.json(
      {
        error: "Infeasible constraints",
        details: feasibility.errors,
        warnings: feasibility.warnings,
      },
      { status: 422 }
    );
  }

  // Generate up to 3 diverse timetables
  const solver = new TimetableCSPSolver(input);
  const alternates = solver.solveMultiple(3);

  if (alternates.length === 0) {
    return NextResponse.json(
      {
        error: "Could not find a valid timetable with these constraints.",
        details: [
          "The constraint solver exhausted all possibilities. Try:",
          "• Reducing frequency requirements",
          "• Expanding teacher availability",
          "• Removing hard constraints",
        ],
      },
      { status: 422 }
    );
  }

  const primary = alternates[0];
  const { violations } = validateTimetable(primary, input);
  const scoreBreakdown = scoreTimetable(primary, input);

  const slotCount = Array.isArray(input.timeSlotsPerDay)
    ? input.timeSlotsPerDay.length
    : (input.timeSlotsPerDay as number);

  let totalSlots = 0;
  let filledSlots = 0;
  for (const day of input.days) {
    for (let s = 0; s < slotCount; s++) {
      totalSlots++;
      const cell = primary[day]?.[s];
      if (cell && !cell.isBreak) filledSlots++;
    }
  }

  const output: TimetableOutput = {
    timetable: primary,
    violations,
    optimizationScore: scoreBreakdown.total,
    scoreBreakdown,
    alternates: alternates.slice(1), // extra options
    metadata: {
      generationTime: Date.now() - startTime,
      iterations: 0, // solver doesn't expose this per-run in multi mode
      algorithm: "CSP Backtracking + Local Search Optimization",
      totalSlots,
      filledSlots,
      solvable: true,
    },
  };

  return NextResponse.json(output);
}
