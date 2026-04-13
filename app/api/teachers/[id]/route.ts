import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET a single teacher
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabase
      .from("teachers")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error(`GET /api/teachers/${params.id} failed:`, err);
    return NextResponse.json(
      { error: "Failed to fetch teacher" },
      { status: 500 }
    );
  }
}

// PUT update a teacher
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { name, email, phone } = body;

    const { data, error } = await supabase
      .from("teachers")
      .update({ name, email, phone, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error(`PUT /api/teachers/${params.id} failed:`, err);
    return NextResponse.json(
      { error: "Failed to update teacher" },
      { status: 500 }
    );
  }
}

// DELETE a teacher
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from("teachers")
      .delete()
      .eq("id", params.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/teachers/${params.id} failed:`, err);
    return NextResponse.json(
      { error: "Failed to delete teacher" },
      { status: 500 }
    );
  }
}
