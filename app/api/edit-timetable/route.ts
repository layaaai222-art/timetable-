import { NextRequest, NextResponse } from "next/server";
import type { Timetable, TimetableInput, EditOperation } from "@/lib/types";
import { applyEdit, partialRegenerate } from "@/lib/editor";

interface RequestBody {
  timetable: Timetable;
  input: TimetableInput;
  operation: EditOperation | { type: "partial_regenerate" };
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { timetable, input, operation } = body;

  if (!timetable || !input || !operation) {
    return NextResponse.json(
      { error: "Missing required fields: timetable, input, operation" },
      { status: 400 }
    );
  }

  if (operation.type === "partial_regenerate") {
    const result = partialRegenerate(timetable, input);
    return NextResponse.json(result);
  }

  const result = applyEdit(timetable, input, operation as EditOperation);
  return NextResponse.json(result);
}
