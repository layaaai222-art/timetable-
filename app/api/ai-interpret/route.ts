import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { TimetableInput, UserConstraint, AIResponse } from "@/lib/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

interface RequestBody {
  message: string;
  input: TimetableInput;
  conversationHistory?: Array<{ role: "user" | "model"; parts: [{ text: string }] }>;
}

function buildSystemPrompt(input: TimetableInput): string {
  const subjectList = input.subjects
    .map((s) => `  - id: "${s.id}", name: "${s.name}", freq: ${s.frequencyPerWeek}/week`)
    .join("\n");
  const teacherList = input.teachers
    .map((t) => `  - id: "${t.id}", name: "${t.name}", subjects: [${t.subjects.join(", ")}]`)
    .join("\n");
  const dayList = input.days.join(", ");
  const slotCount =
    typeof input.timeSlotsPerDay === "number"
      ? input.timeSlotsPerDay
      : input.timeSlotsPerDay.length;

  return `You are an AI scheduling assistant for a school timetable builder.

CURRENT SCHOOL SETUP:
Days: ${dayList}
Periods per day: ${slotCount} (indexed 0 to ${slotCount - 1}, where 0-2 = morning, 3+ = afternoon)

Subjects:
${subjectList}

Teachers:
${teacherList}

YOUR JOB:
Convert the user's natural language instruction into structured timetable constraints.
Also answer questions about the timetable, explain conflicts, or give scheduling advice.

When the user gives a scheduling rule, respond with VALID JSON in this exact format:
{
  "constraints": [
    {
      "id": "unique_id",
      "type": "subject_in_morning" | "subject_avoid_day" | "teacher_only_day" | "subject_consecutive_avoid" | "custom",
      "subjectId": "<exact subject id from list above or null>",
      "teacherId": "<exact teacher id from list above or null>",
      "days": ["Monday", "Tuesday", ...] or null,
      "slots": [0,1,2,...] or null,
      "description": "short human-readable label",
      "isHard": true or false
    }
  ],
  "explanation": "Friendly explanation of what you understood and applied. Mention subject/teacher names.",
  "unrecognized": ["list of phrases you couldn't map to a constraint"]
}

CONSTRAINT TYPE GUIDE:
- subject_in_morning: subject should go in slots 0-2. Set slots=[0,1,2], isHard=false
- subject_avoid_day: subject must not appear on certain days. Set days=[...], isHard=true
- teacher_only_day: teacher restricted to specific days. Set days=[allowed days], isHard=true
- subject_consecutive_avoid: no back-to-back same subject. isHard=false
- custom: anything else

RULES:
- Use EXACT ids from the lists above (not names)
- If no constraint applies (user is asking a question), return {"constraints":[], "explanation":"<your answer>", "unrecognized":[]}
- isHard=true means the solver will strictly enforce it; false means it's a preference
- Always return valid parseable JSON — no markdown code blocks, no trailing commas
- Be concise and friendly in explanations`;
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { message, input, conversationHistory = [] } = body;

  if (!message || !input) {
    return NextResponse.json({ error: "Missing message or input" }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const systemPrompt = buildSystemPrompt(input);

    // Build chat history for multi-turn context
    const history = [
      // Seed with system context as first user/model exchange
      {
        role: "user" as const,
        parts: [{ text: systemPrompt }],
      },
      {
        role: "model" as const,
        parts: [{ text: '{"constraints":[],"explanation":"Ready to help with scheduling!","unrecognized":[]}' }],
      },
      ...conversationHistory,
    ];

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(message);
    const rawText = result.response.text().trim();

    // Parse JSON response from Gemini
    // Use a loose type here — Gemini returns flat UserConstraint objects, not AIConstraint
    interface GeminiRawResponse {
      constraints?: UserConstraint[];
      explanation?: string;
      unrecognized?: string[];
    }
    let raw: GeminiRawResponse;
    try {
      const clean = rawText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
      raw = JSON.parse(clean);
    } catch {
      raw = { constraints: [], explanation: rawText, unrecognized: [] };
    }

    // Stamp ids and wrap into AIConstraint shape
    const aiConstraints = (raw.constraints ?? []).map((c, i) => ({
      naturalLanguage: c.description ?? c.type,
      interpreted: { ...c, id: c.id ?? `gemini_${Date.now()}_${i}` },
      confidence: 0.92,
    }));

    const parsed: AIResponse = {
      constraints: aiConstraints,
      explanation: raw.explanation ?? "",
      unrecognized: raw.unrecognized,
    };

    return NextResponse.json({
      ...parsed,
      // Echo back for building next conversation turn
      modelTurn: { role: "model", parts: [{ text: rawText }] },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gemini request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
