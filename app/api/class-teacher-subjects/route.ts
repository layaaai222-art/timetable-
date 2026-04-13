import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET all class-teacher-subject relationships (optionally filtered by class_id)
export async function GET(req: NextRequest) {
  try {
    const classId = req.nextUrl.searchParams.get("class_id");

    let query = supabase.from("class_teacher_subjects").select(`
      *,
      classes:class_id(id, name, section),
      teachers:teacher_id(id, name),
      subjects:subject_id(id, name, color, frequency_per_week)
    `);

    if (classId) {
      query = query.eq("class_id", classId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/class-teacher-subjects failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch relationships" },
      { status: 500 }
    );
  }
}

// POST assign teacher-subject to a class
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { class_id, teacher_id, subject_id } = body;

    if (!class_id || !teacher_id || !subject_id) {
      return NextResponse.json(
        {
          error:
            "class_id, teacher_id, and subject_id are required",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("class_teacher_subjects")
      .insert([{ class_id, teacher_id, subject_id }])
      .select();

    if (error) throw error;
    return NextResponse.json(data[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/class-teacher-subjects failed:", err);
    return NextResponse.json(
      { error: "Failed to create assignment" },
      { status: 500 }
    );
  }
}
