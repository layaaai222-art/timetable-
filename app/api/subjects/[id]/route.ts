import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET a single subject
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error(`GET /api/subjects/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to fetch subject" }, { status: 500 });
  }
}

// PUT update a subject
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { name, color, frequency_per_week, prefer_morning } = body;

    const { data, error } = await supabase
      .from("subjects")
      .update({ name, color, frequency_per_week, prefer_morning, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error(`PUT /api/subjects/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to update subject" }, { status: 500 });
  }
}

// DELETE a subject
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/subjects/${id} failed:`, err);
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });
  }
}
