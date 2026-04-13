import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars"
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Database Types ──────────────────────────────────────────────────────────

export interface Class {
  id: string;
  name: string;
  section?: string;
  students?: number;
  created_at: string;
}

export interface SubjectRecord {
  id: string;
  name: string;
  color?: string;
  frequency_per_week: number;
  prefer_morning?: boolean;
  created_at: string;
}

export interface TeacherRecord {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  created_at: string;
}

export interface ClassTeacherSubject {
  id: string;
  class_id: string;
  teacher_id: string;
  subject_id: string;
  created_at: string;
}

export interface Timetable {
  id: string;
  class_id?: string;
  clubbed_classes?: string[]; // array of class IDs if clubbed
  data: Record<string, Record<string, any>>;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}
