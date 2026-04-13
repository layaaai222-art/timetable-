-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  section TEXT,
  students INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  frequency_per_week INTEGER DEFAULT 1,
  prefer_morning BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Class-Teacher-Subject relationship table
CREATE TABLE IF NOT EXISTS class_teacher_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, teacher_id, subject_id)
);

-- Timetables table
CREATE TABLE IF NOT EXISTS timetables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  clubbed_classes TEXT[], -- array of class IDs as text (JSON)
  data JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_class_teacher_subjects_class_id ON class_teacher_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_teacher_subjects_teacher_id ON class_teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_teacher_subjects_subject_id ON class_teacher_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_timetables_class_id ON timetables(class_id);
CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(name);
CREATE INDEX IF NOT EXISTS idx_teachers_name ON teachers(name);
CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects(name);

-- Enable RLS (Row Level Security) if needed in future
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (modify based on your auth needs)
CREATE POLICY "Allow all operations on classes" ON classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on subjects" ON subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on teachers" ON teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on class_teacher_subjects" ON class_teacher_subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on timetables" ON timetables FOR ALL USING (true) WITH CHECK (true);
