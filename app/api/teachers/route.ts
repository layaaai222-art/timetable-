import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET all teachers
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("teachers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/teachers failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch teachers" },
      { status: 500 }
    );
  }
}

// POST create a new teacher
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Teacher name is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("teachers")
      .insert([{ name }])
      .select();

    if (error) throw error;
    return NextResponse.json(data[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/teachers failed:", err);
    return NextResponse.json(
      { error: "Failed to create teacher" },
      { status: 500 }
    );
  }
}
