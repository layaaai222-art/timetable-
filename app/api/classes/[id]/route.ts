import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET a single class
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Class not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error(`GET /api/classes/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to fetch class" }, { status: 500 });
  }
}

// PUT update a class
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { name, section, students } = body;

    const { data, error } = await supabase
      .from("classes")
      .update({ name, section, students, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Class not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error(`PUT /api/classes/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to update class" }, { status: 500 });
  }
}

// DELETE a class
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { error } = await supabase
      .from("classes")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/classes/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to delete class" }, { status: 500 });
  }
}
