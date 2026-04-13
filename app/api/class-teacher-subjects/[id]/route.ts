import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// DELETE a class-teacher-subject assignment
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from("class_teacher_subjects")
      .delete()
      .eq("id", params.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/class-teacher-subjects/${params.id} failed:`, err);
    return NextResponse.json(
      { error: "Failed to delete assignment" },
      { status: 500 }
    );
  }
}
