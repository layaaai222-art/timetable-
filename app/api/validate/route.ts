import { NextRequest, NextResponse } from "next/server";
import type { Timetable, TimetableInput } from "@/lib/types";
import { validateTimetable } from "@/lib/validator";
import { scoreTimetable } from "@/lib/solver/scorer";

export async function POST(req: NextRequest) {
  let body: { timetable: Timetable; input: TimetableInput };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { timetable, input } = body;
  if (!timetable || !input) {
    return NextResponse.json(
      { error: "Missing timetable or input" },
      { status: 400 }
    );
  }

  const validation = validateTimetable(timetable, input);
  const scoreBreakdown = scoreTimetable(timetable, input);

  return NextResponse.json({
    ...validation,
    scoreBreakdown,
    optimizationScore: scoreBreakdown.total,
  });
}
