import { supabase } from "./supabase";
import type { Class, SubjectRecord, TeacherRecord, ClassTeacherSubject } from "./supabase";

// ─── Classes ─────────────────────────────────────────────────────────────────

export async function fetchClasses() {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch classes: ${error.message}`);
  return data as Class[];
}

export async function fetchClass(id: string) {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(`Failed to fetch class: ${error.message}`);
  return data as Class;
}

export async function createClass(input: { name: string; section?: string; students?: number }) {
  const { data, error } = await supabase
    .from("classes")
    .insert([input])
    .select()
    .single();

  if (error) throw new Error(`Failed to create class: ${error.message}`);
  return data as Class;
}

export async function updateClass(id: string, input: Partial<Class>) {
  const { data, error } = await supabase
    .from("classes")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update class: ${error.message}`);
  return data as Class;
}

export async function deleteClass(id: string) {
  const { error } = await supabase.from("classes").delete().eq("id", id);

  if (error) throw new Error(`Failed to delete class: ${error.message}`);
}

// ─── Teachers ────────────────────────────────────────────────────────────────

export async function fetchTeachers() {
  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch teachers: ${error.message}`);
  return data as TeacherRecord[];
}

export async function fetchTeacher(id: string) {
  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(`Failed to fetch teacher: ${error.message}`);
  return data as TeacherRecord;
}

export async function createTeacher(input: { name: string; email?: string; phone?: string }) {
  const { data, error } = await supabase
    .from("teachers")
    .insert([input])
    .select()
    .single();

  if (error) throw new Error(`Failed to create teacher: ${error.message}`);
  return data as TeacherRecord;
}

export async function updateTeacher(id: string, input: Partial<TeacherRecord>) {
  const { data, error } = await supabase
    .from("teachers")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update teacher: ${error.message}`);
  return data as TeacherRecord;
}

export async function deleteTeacher(id: string) {
  const { error } = await supabase.from("teachers").delete().eq("id", id);

  if (error) throw new Error(`Failed to delete teacher: ${error.message}`);
}

// ─── Subjects ────────────────────────────────────────────────────────────────

export async function fetchSubjects() {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch subjects: ${error.message}`);
  return data as SubjectRecord[];
}

export async function fetchSubject(id: string) {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(`Failed to fetch subject: ${error.message}`);
  return data as SubjectRecord;
}

export async function createSubject(input: {
  name: string;
  color?: string;
  frequency_per_week?: number;
  prefer_morning?: boolean;
}) {
  const { data, error } = await supabase
    .from("subjects")
    .insert([{ ...input, frequency_per_week: input.frequency_per_week || 1 }])
    .select()
    .single();

  if (error) throw new Error(`Failed to create subject: ${error.message}`);
  return data as SubjectRecord;
}

export async function updateSubject(id: string, input: Partial<SubjectRecord>) {
  const { data, error } = await supabase
    .from("subjects")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update subject: ${error.message}`);
  return data as SubjectRecord;
}

export async function deleteSubject(id: string) {
  const { error } = await supabase.from("subjects").delete().eq("id", id);

  if (error) throw new Error(`Failed to delete subject: ${error.message}`);
}

// ─── Class-Teacher-Subject ───────────────────────────────────────────────────

export async function fetchClassTeacherSubjects(classId?: string) {
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

  if (error) throw new Error(`Failed to fetch assignments: ${error.message}`);
  return data as ClassTeacherSubject[];
}

export async function createClassTeacherSubject(input: {
  class_id: string;
  teacher_id: string;
  subject_id: string;
}) {
  const { data, error } = await supabase
    .from("class_teacher_subjects")
    .insert([input])
    .select()
    .single();

  if (error) throw new Error(`Failed to create assignment: ${error.message}`);
  return data as ClassTeacherSubject;
}

export async function deleteClassTeacherSubject(id: string) {
  const { error } = await supabase
    .from("class_teacher_subjects")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Failed to delete assignment: ${error.message}`);
}

// ─── Get fully populated class data ───────────────────────────────────────────

export async function fetchClassWithRelations(classId: string) {
  const [classData, assignments] = await Promise.all([
    fetchClass(classId),
    fetchClassTeacherSubjects(classId),
  ]);

  return {
    class: classData,
    assignments,
  };
}
