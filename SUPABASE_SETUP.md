# Supabase Database Setup Guide

This guide will help you set up the Supabase database for the AI Timetable Builder with full CRUD support for classes, teachers, subjects, and their relationships.

## Prerequisites

- A Supabase account (free at https://supabase.com)
- Node.js environment already set up

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Name your project (e.g., "timetable-builder")
4. Set a strong password for the database
5. Select your preferred region
6. Wait for the project to initialize (2-3 minutes)

## Step 2: Get Your Credentials

1. In your Supabase dashboard, go to **Settings → API**
2. Copy the **Project URL** and save it
3. Copy the **Anon Key** (public API key) and save it
4. You'll use these for the environment variables

## Step 3: Initialize the Database Schema

### Option A: Using Supabase SQL Editor (Recommended)

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `scripts/init-db.sql` from this project
4. Paste it into the SQL editor
5. Click **Run** to execute

### Option B: Using CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link your project
supabase link --project-ref your_project_id

# Run migrations
supabase db push < scripts/init-db.sql
```

## Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env.local` (if not already done)
2. Add your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

3. Keep these variables in `.env.local` (never commit to git)

## Step 5: Verify the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the **Data** tab in the app
3. Try adding a class:
   - Click the "Classes" tab
   - Enter a class name (e.g., "Class 10A")
   - Click "Add Class"
4. If successful, the class appears in the list below

## Database Schema Overview

### Tables

#### `classes`
Stores class information
- `id` (UUID, primary key)
- `name` (TEXT, required)
- `section` (TEXT, optional)
- `students` (INTEGER, optional)
- `created_at`, `updated_at` (timestamps)

#### `teachers`
Stores teacher information
- `id` (UUID, primary key)
- `name` (TEXT, required)
- `email` (TEXT, optional)
- `phone` (TEXT, optional)
- `created_at`, `updated_at` (timestamps)

#### `subjects`
Stores subject information
- `id` (UUID, primary key)
- `name` (TEXT, required, unique)
- `color` (TEXT, optional hex color)
- `frequency_per_week` (INTEGER, default 1)
- `prefer_morning` (BOOLEAN, default false)
- `created_at`, `updated_at` (timestamps)

#### `class_teacher_subjects`
Junction table linking classes, teachers, and subjects
- `id` (UUID, primary key)
- `class_id` (UUID, foreign key → classes)
- `teacher_id` (UUID, foreign key → teachers)
- `subject_id` (UUID, foreign key → subjects)
- `created_at` (timestamp)
- Constraint: unique combination of (class_id, teacher_id, subject_id)

#### `timetables`
Stores generated timetables per class or clubbed classes
- `id` (UUID, primary key)
- `class_id` (UUID, optional, foreign key → classes)
- `clubbed_classes` (TEXT[], optional array of class IDs)
- `data` (JSONB, timetable structure)
- `metadata` (JSONB, optional metadata)
- `created_at`, `updated_at` (timestamps)

## Using the Management UI

### Adding Classes

1. Go to **Data** tab
2. Select **Classes** tab
3. Fill in:
   - **Class name** (required): e.g., "Class 10A"
   - **Section** (optional): e.g., "A"
   - **Students** (optional): e.g., 45
4. Click **Add Class**

### Adding Teachers

1. Go to **Data** tab
2. Select **Teachers** tab
3. Fill in:
   - **Name** (required): e.g., "John Doe"
   - **Email** (optional)
   - **Phone** (optional)
4. Click **Add Teacher**

### Adding Subjects

1. Go to **Data** tab
2. Select **Subjects** tab
3. Fill in:
   - **Name** (required): e.g., "Mathematics"
   - **Color** (optional): pick a color for UI display
   - **Frequency per week** (default 1): how many times per week
   - **Prefer morning** (optional checkbox)
4. Click **Add Subject**

### Creating Assignments

This is where you define which teacher teaches which subject in which class.

1. Go to **Data** tab
2. Select **Assignments** tab
3. Select:
   - **Class**: which class
   - **Teacher**: which teacher
   - **Subject**: which subject
4. Click **Assign**

## API Endpoints

All endpoints are REST-based and accept/return JSON.

### Classes
- `GET /api/classes` — List all classes
- `POST /api/classes` — Create a class
- `GET /api/classes/[id]` — Get a specific class
- `PUT /api/classes/[id]` — Update a class
- `DELETE /api/classes/[id]` — Delete a class

### Teachers
- `GET /api/teachers` — List all teachers
- `POST /api/teachers` — Create a teacher
- `GET /api/teachers/[id]` — Get a specific teacher
- `PUT /api/teachers/[id]` — Update a teacher
- `DELETE /api/teachers/[id]` — Delete a teacher

### Subjects
- `GET /api/subjects` — List all subjects
- `POST /api/subjects` — Create a subject
- `GET /api/subjects/[id]` — Get a specific subject
- `PUT /api/subjects/[id]` — Update a subject
- `DELETE /api/subjects/[id]` — Delete a subject

### Class-Teacher-Subject Assignments
- `GET /api/class-teacher-subjects?class_id=UUID` — Get assignments (optionally filtered by class)
- `POST /api/class-teacher-subjects` — Create an assignment
- `DELETE /api/class-teacher-subjects/[id]` — Delete an assignment

### Timetables
- `GET /api/timetables?class_id=UUID` — Get timetables (optionally filtered by class)
- `POST /api/timetables` — Save a timetable
- `GET /api/timetables/[id]` — Get a specific timetable
- `PUT /api/timetables/[id]` — Update a timetable
- `DELETE /api/timetables/[id]` — Delete a timetable

## Integrating with Timetable Generation

### Generating for a Single Class

1. Add your school data via the **Data** tab
2. Go to **Setup** tab
3. The system will load subjects and teachers from the database
4. Configure timetable parameters (days, time slots, etc.)
5. Click **Generate** to create a timetable for that class
6. Go to **Data** tab → **Timetables** to save it

### Clubbing Multiple Classes

To generate a single timetable for 2 or more classes:

1. Complete assignments for both classes first
2. In the **Setup** tab, you can use the API to:
   ```javascript
   // Create input for both classes
   const clubbedInput = {
     days: ["Monday", "Tuesday", ...],
     timeSlotsPerDay: 6,
     classIds: ["class-id-1", "class-id-2"],
     classNames: ["Class 10A", "Class 10B"],
     // Combine subjects and teachers from both classes
   };
   ```
3. Send to generate endpoint
4. Save the timetable with `clubbed_classes` array

## Troubleshooting

### "Failed to fetch classes" error
- Check that `.env.local` has the correct Supabase credentials
- Verify the database schema was initialized
- Check browser console for CORS errors

### "Connection refused" 
- Ensure Supabase project is active (check dashboard)
- Verify network connectivity
- Check that NEXT_PUBLIC_SUPABASE_URL is correct

### Duplicate key error when adding assignment
- This means the teacher-subject combination already exists for that class
- Delete the old assignment first if you want to modify it

### Row Level Security (RLS) errors
- By default, RLS is permissive. If you see auth errors:
  - Go to Supabase dashboard → RLS Policies
  - Verify policies allow public read/write (development mode)
  - In production, implement proper JWT authentication

## Next Steps

1. Populate your school data through the Management UI
2. Generate timetables for each class
3. Implement class clubbing as needed
4. Export and use your timetables

## Security Notes

- The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public (visible in browser)
- For production, implement Row Level Security (RLS) policies
- Never expose the service role key in client code
- Consider adding authentication before deploying publicly

## Support

- Supabase Docs: https://supabase.com/docs
- Project Issues: Check the GitHub repository
