import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET all subjects
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/subjects failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch subjects" },
      { status: 500 }
    );
  }
}

// POST create a new subject
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, color, frequency_per_week, prefer_morning } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Subject name is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("subjects")
      .insert([
        {
          name,
          color,
          frequency_per_week: frequency_per_week || 1,
          prefer_morning: prefer_morning || false,
        },
      ])
      .select();

    if (error) throw error;
    return NextResponse.json(data[0], { status: 201 });
  } catch (err) {
    console.error("POST /api/subjects failed:", err);
    return NextResponse.json(
      { error: "Failed to create subject" },
      { status: 500 }
    );
  }
}
