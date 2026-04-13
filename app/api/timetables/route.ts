import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET all timetables (optionally filtered by class_id)
export async function GET(req: NextRequest) {
  try {
    const classId = req.nextUrl.searchParams.get("class_id");

    let query = supabase
      .from("timetables")
      .select("*")
      .order("updated_at", { ascending: false });

    if (classId) {
      query = query.eq("class_id", classId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/timetables failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch timetables" },
      { status: 500 }
    );
  }
}

// POST save a new timetable
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { class_id, clubbed_classes, data, metadata } = body;

    if (!data) {
      return NextResponse.json(
        { error: "Timetable data is required" },
        { status: 400 }
      );
    }

    const { data: result, error } = await supabase
      .from("timetables")
      .insert([
        {
          class_id,
          clubbed_classes: clubbed_classes || null,
          data,
          metadata,
        },
      ])
      .select();

    if (error) throw error;
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/timetables failed:", err);
    return NextResponse.json(
      { error: "Failed to save timetable" },
      { status: 500 }
    );
  }
}
