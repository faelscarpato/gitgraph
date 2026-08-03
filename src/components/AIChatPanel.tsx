import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";
import type { Analysis } from "@/lib/graph-types";
import { sendAnalysisMessage, type ChatMessage } from "@/lib/ai/chat";

interface Props {
  analysis: Analysis;
}

const INITIAL_SUGGESTIONS = [
  "Resuma a arquitetura geral deste repositório",
  "Quais são os principais problemas arquiteturais?",
  "Sugira refatorações para reduzir acoplamento",
  "Quais módulos têm mais responsabilidades?",
];

export function AIChatPanel({ analysis }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsLoading(true);
    setStreamingText("");

    const result = await sendAnalysisMessage(analysis, updated);

    if (result.error) {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: `**Erro:** ${result.error}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } else if (result.content) {
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: result.content,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }
    setIsLoading(false);
    setStreamingText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center gap-6 pt-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bot className="h-6 w-6" />
            </div>
            <div className="text-center">
              <h2 className="text-base font-semibold text-foreground">
                Analista de Arquitetura
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Faça perguntas sobre a arquitetura, dependências e qualidade do
                código.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {INITIAL_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Sparkles className="h-3 w-3" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
          >
            {msg.role === "assistant" && (
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-2 text-foreground"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
            {msg.role === "user" && (
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && streamingText && (
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="max-w-[80%] rounded-2xl bg-surface-2 px-4 py-2.5 text-sm leading-relaxed text-foreground">
              <div className="whitespace-pre-wrap">{streamingText}</div>
            </div>
          </div>
        )}

        {isLoading && !streamingText && (
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-surface-2 px-4 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analisando...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre a arquitetura..."
            disabled={isLoading}
            className="focus-ring flex-1 rounded-xl border border-input bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={isLoading || !input.trim()}
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
