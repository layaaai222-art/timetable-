"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, X, CheckCircle, AlertCircle } from "lucide-react";
import type { AIConstraint, UserConstraint } from "@/lib/types";
import { useTimetableStore } from "@/store/timetable-store";
import { cn } from "@/lib/utils";

interface GeminiTurn {
  role: "user" | "model";
  parts: [{ text: string }];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  constraints?: AIConstraint[];
  error?: boolean;
}

const EXAMPLES = [
  "Put Mathematics in morning slots",
  "Avoid Science on Monday",
  "Teacher Priya Sharma only on Tuesday and Wednesday",
  "Don't schedule Art back-to-back",
  "Why might there be a conflict in my timetable?",
  "What subjects need the most scheduling attention?",
];

export default function AIPanel() {
  const { input, addAiConstraints, aiConstraints, removeAiConstraint } = useTimetableStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm powered by Gemini. Ask me to create scheduling rules in plain English, or ask questions about your timetable.\n\nTry: \"Put Mathematics in morning\" or \"Avoid PE on Monday\"",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [geminiHistory, setGeminiHistory] = useState<GeminiTurn[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  async function handleSend() {
    const text = inputText.trim();
    if (!text || isProcessing) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsProcessing(true);

    try {
      const res = await fetch("/api/ai-interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          input,
          conversationHistory: geminiHistory,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${data.error ?? "Gemini request failed"}`,
            error: true,
          },
        ]);
        return;
      }

      // Save turn to history for multi-turn context
      setGeminiHistory((prev) => [
        ...prev,
        { role: "user", parts: [{ text }] },
        ...(data.modelTurn ? [data.modelTurn as GeminiTurn] : []),
      ]);

      const assistantMsg: Message = {
        role: "assistant",
        content: data.explanation ?? "",
        constraints: data.constraints?.length > 0 ? data.constraints : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error — please try again.", error: true },
      ]);
    } finally {
      setIsProcessing(false);
    }
  }

  function applyConstraints(constraints: AIConstraint[]) {
    const toAdd: UserConstraint[] = constraints.map((c) => c.interpreted ?? c as unknown as UserConstraint);
    addAiConstraints(toAdd);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `Applied ${constraints.length} constraint(s). Click Generate in the header to rebuild the timetable with these rules.`,
      },
    ]);
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Active constraints badge */}
      {aiConstraints.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 shrink-0">
          <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Active Gemini Constraints ({aiConstraints.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {aiConstraints.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 rounded-full text-xs text-blue-700"
              >
                {c.description ?? c.type.replace(/_/g, " ")}
                <button onClick={() => removeAiConstraint(c.id)} className="ml-0.5 hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Example chips */}
      <div className="shrink-0">
        <p className="text-xs text-slate-500 mb-2 font-medium">Try these:</p>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setInputText(ex)}
              className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-full transition-colors border border-transparent hover:border-blue-200"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 max-h-[420px] pr-1">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
          >
            {msg.role === "assistant" && (
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                  msg.error
                    ? "bg-red-100"
                    : "bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500"
                )}
              >
                {msg.error ? (
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                )}
              </div>
            )}
            <div
              className={cn(
                "max-w-[82%] rounded-xl px-3 py-2 text-sm",
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : msg.error
                  ? "bg-red-50 border border-red-200 text-red-700"
                  : "bg-slate-100 text-slate-800"
              )}
            >
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                {msg.content}
              </pre>

              {/* Constraint application button */}
              {msg.constraints && msg.constraints.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200 space-y-1.5">
                  {msg.constraints.map((c, ci) => {
                    // Handle both {interpreted} wrapper and flat constraint objects
                    const constraint = (c as { interpreted?: UserConstraint }).interpreted ?? (c as unknown as UserConstraint);
                    return (
                      <div key={ci} className="text-[10px] text-slate-500 bg-white rounded px-2 py-1 border border-slate-200">
                        <span className="font-medium text-slate-600">{constraint.type?.replace(/_/g, " ")}</span>
                        {constraint.description && <span className="ml-1">— {constraint.description}</span>}
                        {constraint.isHard && (
                          <span className="ml-1 text-red-500 font-semibold">(hard)</span>
                        )}
                      </div>
                    );
                  })}
                  <button
                    onClick={() => applyConstraints(msg.constraints!)}
                    className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors mt-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Apply {msg.constraints.length} Constraint(s)
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isProcessing && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
            </div>
            <div className="bg-slate-100 rounded-xl px-3 py-2.5 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Gemini badge + input */}
      <div className="shrink-0 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
          Powered by Google Gemini 2.5 Flash
        </div>
        <div className="flex gap-2">
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Describe a scheduling rule or ask a question…"
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            disabled={isProcessing}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isProcessing}
            className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-lg transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
