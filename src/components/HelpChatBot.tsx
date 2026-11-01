import { useCallback, useEffect, useRef, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/badhon-ai-logo.png";

const STORAGE_KEY = "badhan-help-chat-v1";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "কিভাবে রক্তের অনুরোধ করবো?",
  "Sign up করবো কিভাবে?",
  "রক্তদান করার নিয়ম কী?",
  "Email confirm করবো কিভাবে?",
];

const loadMessages = (): ChatMsg[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-100)
      .map((m, i) => ({ id: String(m.id ?? i), role: m.role, content: m.content }));
  } catch {
    return [];
  }
};

const readSse = async (
  body: ReadableStream<Uint8Array>,
  onDelta: (delta: string) => void
): Promise<void> => {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const d = line.slice(5).trim();
      if (!d || d === "[DONE]") continue;
      try {
        const ev = JSON.parse(d);
        if (ev.error) throw new Error(ev.error);
        if (ev.delta) onDelta(ev.delta);
        if (ev.done) return;
      } catch (e) {
        if (e instanceof SyntaxError) continue; // malformed frame, skip
        throw e;
      }
    }
  }
};

const HelpChatBot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>(loadMessages);
  const [status, setStatus] = useState<"idle" | "submitted" | "streaming">("idle");
  const abortRef = useRef<AbortController | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);

  const focusComposer = useCallback(() => {
    composerRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
  }, []);

  // Persist the single conversation (only when a stream is not running)
  useEffect(() => {
    if (status !== "idle" || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch { /* storage full/blocked */ }
  }, [messages, status]);

  // Keep the composer focused while chatting
  useEffect(() => {
    if (open && status === "idle") focusComposer();
  }, [open, status]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || status !== "idle") return;

      const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content };
      const history = [...messages, userMsg];
      setMessages(history);
      setStatus("submitted");

      const ac = new AbortController();
      abortRef.current = ac;
      const assistantId = crypto.randomUUID();

      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-help-chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            signal: ac.signal,
            body: JSON.stringify({
              messages: history.map(({ role, content: c }) => ({ role, content: c })),
            }),
          }
        );
        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || "সংযোগে সমস্যা হয়েছে, আবার চেষ্টা করুন।");
        }

        setStatus("streaming");
        let created = false;
        await readSse(res.body, (delta) => {
          if (!created) {
            created = true;
            setMessages((m) => [...m, { id: assistantId, role: "assistant", content: delta }]);
          } else {
            setMessages((m) =>
              m.map((mm) => (mm.id === assistantId ? { ...mm, content: mm.content + delta } : mm))
            );
          }
        });
        if (!created) {
          setMessages((m) => [
            ...m,
            { id: assistantId, role: "assistant", content: "দুঃখিত, কোনো উত্তর পাওয়া যায়নি। আবার চেষ্টা করুন।" },
          ]);
        }
      } catch (e) {
        if (!ac.signal.aborted) {
          setMessages((m) => [
            ...m,
            {
              id: assistantId,
              role: "assistant",
              content:
                e instanceof Error && e.message
                  ? `⚠️ ${e.message}`
                  : "⚠️ সংযোগে সমস্যা হয়েছে। Internet আছে কিনা দেখে আবার চেষ্টা করুন।",
            },
          ]);
        }
      } finally {
        abortRef.current = null;
        setStatus("idle");
        setTimeout(focusComposer, 0);
      }
    },
    [messages, status]
  );

  const clearChat = () => {
    if (status !== "idle") return;
    setMessages([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
    setTimeout(focusComposer, 0);
  };

  if (!open) {
    return (
      <button
        type="button"
        aria-label="AI সহায়তা খুলুন"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-card shadow-lg shadow-primary/25 transition-transform hover:scale-105 active:scale-95"
      >
        <img src={logoUrl} alt="বাঁধন AI" className="h-9 w-9" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
          AI
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex h-[min(72vh,620px)] w-[min(94vw,390px)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-primary px-3 py-2.5 text-primary-foreground">
        <img src={logoUrl} alt="" className="h-8 w-8 rounded-full bg-white/90 p-0.5" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight">বাঁধন AI সহকারী</p>
          <p className="text-[11px] leading-tight text-primary-foreground/80">
            {status === "idle" ? "যেকোনো প্রশ্ন করুন" : "লিখছে..."}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={clearChat}
          disabled={status !== "idle" || messages.length === 0}
          className="text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
          aria-label="চ্যাট মুছুন"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen(false)}
          className="text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
          aria-label="বন্ধ করুন"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Transcript */}
      <Conversation className="min-h-0 flex-1 bg-background">
        <ConversationContent className="px-3 py-4">
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="সাহায্য লাগবে?"
              description="Sign up, রক্তের অনুরোধ, রক্তদানের নিয়ম — যেকোনো প্রশ্ন করুন।"
              icon={<img src={logoUrl} alt="" className="h-16 w-16" loading="lazy" />}
            >
              <div className="mt-2 grid w-full grid-cols-1 gap-2 px-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="h-auto whitespace-normal py-2 text-xs text-primary border-primary/30 hover:bg-primary/10"
                    onClick={() => send(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((m) => (
                <Message key={m.id} from={m.role}>
                  <MessageContent className={m.role === "user" ? "bg-primary text-primary-foreground" : "px-0"}>
                    {m.role === "user" ? (
                      <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                    ) : (
                      <MessageResponse className="text-sm prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                        {m.content}
                      </MessageResponse>
                    )}
                  </MessageContent>
                </Message>
              ))}
              {status === "submitted" && (
                <Message from="assistant">
                  <MessageContent className="px-0">
                    <Shimmer className="text-sm text-muted-foreground">উত্তর লিখছি...</Shimmer>
                  </MessageContent>
                </Message>
              )}
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Composer */}
      <div ref={composerRef} className="border-t border-border bg-card p-2">
        <PromptInput
          onSubmit={({ text }) => send(text ?? "")}
          className="rounded-xl border border-input bg-background"
        >
          <PromptInputTextarea
            placeholder="আপনার প্রশ্ন লিখুন..."
            rows={1}
            className="max-h-28"
          />
          <PromptInputFooter className="justify-end px-1 pb-1">
            <PromptInputSubmit
              status={status}
              onStop={() => abortRef.current?.abort()}
              disabled={status === "idle" && !messages.length}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            />
          </PromptInputFooter>
        </PromptInput>
        <p className="px-1 pt-1 text-[10px] text-muted-foreground">
          Enter চাপলে পাঠান • Shift+Enter দিলে নতুন লাইন
        </p>
      </div>
    </div>
  );
};

export default HelpChatBot;
