import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET all classes
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/classes failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch classes" },
      { status: 500 }
    );
  }
}

// POST create a new class
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, section, students } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Class name is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("classes")
      .insert([{ name, section, students }])
      .select();

    if (error) throw error;
    return NextResponse.json(data[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/classes failed:", err);
    return NextResponse.json(
      { error: "Failed to create class" },
      { status: 500 }
    );
  }
}
