# Quick Start Guide

Get up and running in 5 minutes.

## Step 1: Create Supabase Project (2 min)

1. Go to https://supabase.com
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Project Name:** timetable-builder
   - **Database Password:** (choose a strong one)
   - **Region:** (select nearest to you)
5. Wait for project to initialize (2-3 minutes)

## Step 2: Get Your Credentials (1 min)

1. Go to **Settings → API** in your Supabase dashboard
2. Copy **Project URL** 
3. Copy **Anon Key** (public key)
4. Save both

## Step 3: Initialize Database (1 min)

1. Go to **SQL Editor** in Supabase dashboard
2. Click **New Query**
3. Open `scripts/init-db.sql` from this project
4. Copy-paste entire contents into SQL editor
5. Click **Run**
6. Wait for success message

## Step 4: Set Environment Variables (1 min)

Create `.env.local` in project root:

```bash
# Copy from Supabase Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Step 5: Test It (30 sec)

```bash
npm run dev
```

1. Open http://localhost:3000
2. Click **"Data"** tab (new tab next to "AI Assistant")
3. Go to **Classes** subtab
4. Enter "Class 10A" in the input
5. Click **Add Class**
6. Success! You should see "Class 10A" appear below

## Done! 🎉

You now have:
- ✅ Supabase database connected
- ✅ CRUD UI for classes, teachers, subjects
- ✅ Ability to link teachers to subjects in each class
- ✅ Ready to generate multi-class timetables

## Next Steps

1. **Add more data:**
   - Add more classes in Data tab
   - Add teachers
   - Add subjects
   - Link them together via Assignments

2. **Generate timetables:**
   - Go to Setup tab
   - Configure days and time slots
   - Click Generate
   - Go to Data tab to save

3. **Club classes:**
   - See FEATURES.md for API examples
   - Will have UI in future update

## Troubleshooting

**"Failed to fetch classes" in Data tab?**
- Check `.env.local` has correct credentials
- Verify Supabase project is active
- Check browser console for errors

**Database initialization failed?**
- Copy-paste entire SQL script (don't skip lines)
- Make sure you're in SQL Editor (not other section)
- Verify Supabase project initialized completely

**Port 3000 already in use?**
```bash
npm run dev -- -p 3001  # Use different port
```

## File Locations

For more detailed info:
- Setup guide: `SUPABASE_SETUP.md`
- Features & examples: `FEATURES.md`
- Full implementation details: `IMPLEMENTATION_SUMMARY.md`

---

That's it! You're ready to build school timetables with multiple classes! 📚
