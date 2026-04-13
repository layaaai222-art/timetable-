import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET a single timetable
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { data, error } = await supabase
      .from("timetables")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Timetable not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error(`GET /api/timetables/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to fetch timetable" }, { status: 500 });
  }
}

// PUT update a timetable
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { class_id, clubbed_classes, data, metadata } = body;

    const { data: result, error } = await supabase
      .from("timetables")
      .update({ class_id, clubbed_classes, data, metadata, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!result) return NextResponse.json({ error: "Timetable not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (err) {
    console.error(`PUT /api/timetables/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to update timetable" }, { status: 500 });
  }
}

// DELETE a timetable
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { error } = await supabase
      .from("timetables")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/timetables/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to delete timetable" }, { status: 500 });
  }
}
