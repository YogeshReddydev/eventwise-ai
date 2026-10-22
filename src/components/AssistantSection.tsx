import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, User } from 'lucide-react';
import { EventPlan } from '../types.ts';

interface Message {
  role: 'assistant' | 'user';
  text: string;
}

interface AssistantSectionProps {
  plan: EventPlan;
}

const QUICK_PROMPTS = [
  'How can I save ₹5,000 without cutting catering?',
  'Suggest budget-friendly decoration ideas for our wedding',
  'What key questions should I ask our caterer before booking?',
  'How should we schedule the timeline for 150 guests?',
];

export const AssistantSection: React.FC<AssistantSectionProps> = ({ plan }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "I’m ready to help you plan. Ask me for ideas, or try “How can I save ₹5,000 without cutting catering?”",
    },
  ]);
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [aiMode, setAiMode] = useState<string>(
    'Local planning mode is ready. Gemini suggestions activate when an API key is configured.'
  );
  const chatLogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || prompt).trim();
    if (!text || loading) return;

    const userMessage: Message = { role: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, plan }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response.');
      }

      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer }]);

      if (data.mode === 'gemini') {
        setAiMode('Gemini AI suggestions are enabled. Check estimates with vendors.');
      } else if (data.mode === 'fallback') {
        setAiMode('Gemini is unavailable; local planning remains available.');
      } else {
        setAiMode('Local demo mode is active. Add a Gemini API key to enable generated suggestions.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to connect to assistant.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Error: ${message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-[#dedad0] p-6 sm:p-8 mb-8 shadow-xs" aria-labelledby="assistant-heading">
      <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-8">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9c4f2b]">
            A little extra thinking
          </span>
          <h2 id="assistant-heading" className="text-xl sm:text-2xl font-serif text-[#1f1e1a] mb-2">Ask EventWise</h2>
          <p className="text-xs text-[#57554e] leading-relaxed mb-5">
            Get theme ideas, menu suggestions, or explore trade-offs between cost and guest experience.
          </p>

          <div className="space-y-2 mb-4">
            <span className="text-[11px] font-semibold text-[#1f1e1a] block">Suggested questions:</span>
            {QUICK_PROMPTS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(q)}
                disabled={loading}
                aria-label={`Ask suggested question: ${q}`}
                className="w-full text-left text-xs p-2.5 rounded-xl bg-[#fbfaf6] hover:bg-[#f3f0e7] text-[#1f1e1a] border border-[#e8e4d8] transition-colors cursor-pointer flex items-center justify-between group disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#354c3c]"
              >
                <span>{q}</span>
                <Sparkles className="w-3.5 h-3.5 text-[#9c4f2b] group-hover:scale-110 transition-transform shrink-0 ml-2" aria-hidden="true" />
              </button>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-[#f7f5ef] border border-[#dedad0] text-[11px] text-[#57554e] leading-relaxed">
            <p className="font-semibold text-[#1f1e1a] mb-1">Architectural boundary:</p>
            All budget calculations and recovery math are strictly deterministic. Gemini provides advice and ideas without controlling arithmetic.
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex flex-col h-[400px] bg-[#faf9f5] rounded-xl border border-[#dedad0] p-4">
          <div
            ref={chatLogRef}
            role="log"
            aria-live="polite"
            aria-label="Assistant conversation history"
            className="flex-1 overflow-y-auto space-y-3 pr-2 scroll-smooth"
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 max-w-[90%] ${
                  m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                    m.role === 'user'
                      ? 'bg-[#354c3c] text-white'
                      : 'bg-[#eeece3] text-[#354c3c] font-serif font-bold'
                  }`}
                  aria-hidden="true"
                >
                  {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : 'E'}
                </div>
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#354c3c] text-white rounded-tr-xs'
                      : 'bg-[#f0eee7] text-[#1f1e1a] border border-[#dedad0] rounded-tl-xs'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 mr-auto" aria-live="assertive" aria-label="Assistant is thinking">
                <div className="w-7 h-7 rounded-full bg-[#eeece3] text-[#354c3c] font-serif font-bold flex items-center justify-center text-xs" aria-hidden="true">
                  E
                </div>
                <div className="p-3 rounded-2xl bg-[#f0eee7] text-[#57554e] border border-[#dedad0] text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#354c3c] animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-[#354c3c] animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 rounded-full bg-[#354c3c] animate-bounce [animation-delay:0.4s]"></span>
                  <span className="ml-1">Thinking…</span>
                </div>
              </div>
            )}
          </div>

          {/* Chat Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="mt-3 pt-3 border-t border-[#dedad0]"
          >
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={2000}
                aria-label="Ask EventWise about menu, decor, or schedule"
                placeholder="Ask EventWise about menu, decor, schedule..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
                className="flex-1 h-10 px-3.5 rounded-xl border border-[#dedad0] bg-white text-xs text-[#1f1e1a] focus:outline-none focus:ring-2 focus:ring-[#354c3c]"
              />
              <button
                type="submit"
                aria-label="Send question to assistant"
                disabled={loading || !prompt.trim()}
                className="h-10 px-4 rounded-xl bg-[#354c3c] hover:bg-[#28392e] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#9c4f2b]"
              >
                <span>Ask</span>
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] text-[#57554e]">
              <span role="status">{aiMode}</span>
              <span>{prompt.length}/2000</span>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};
