import { useEffect, useRef, useState } from 'react';
import { X, Send, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const SUGGESTIONS = [
  'How is occupancy looking this week?',
  'Which channel brings the most revenue?',
  'Any urgent housekeeping issues?',
  'What should I focus on today?',
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center mr-2 shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div
        className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-slate-900 text-white rounded-br-sm'
            : 'bg-slate-100 text-slate-800 rounded-bl-sm'
        }`}
      >
        {msg.text}
      </div>
    </div>
  );
}

export function ServvIQ() {
  const { user } = useAuth();
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Only show for manager/superadmin
  if (!user || !['manager', 'superadmin'].includes(user.role)) return null;

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      if (messages.length === 0) {
        setMessages([{
          role: 'model',
          text: `Hi ${user.firstName}! I'm Servv IQ — your AI hotel assistant. I have live access to your hotel's data. What would you like to know?`,
        }]);
      }
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: Message = { role: 'user', text: msg };
    const history = messages.filter((m) => m.role !== 'model' || messages.indexOf(m) > 0);
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const { reply } = await api.post<{ reply: string }>('/api/intelligence/chat', {
        message: msg,
        history: history.map((m) => ({ role: m.role, text: m.text })),
      });
      setMessages((prev) => [...prev, { role: 'model', text: reply }]);
    } catch (e: any) {
      setMessages((prev) => [...prev, {
        role: 'model',
        text: 'Sorry, I ran into an issue. Please try again.',
      }]);
    } finally { setLoading(false); }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <>
      {/* ── Floating button ─────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
          open
            ? 'bg-slate-800 hover:bg-slate-900 rotate-0'
            : 'bg-amber-600 hover:bg-amber-700'
        }`}
        title="Servv IQ — AI Assistant"
      >
        {open
          ? <ChevronDown className="w-5 h-5 text-white" />
          : <Sparkles className="w-6 h-6 text-white" />
        }
      </button>

      {/* ── Chat panel ──────────────────────────────────────── */}
      <div className={`fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-24px)] flex flex-col rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transition-all duration-300 origin-bottom-right ${
        open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'
      }`}>

        {/* Header */}
        <div className="bg-slate-900 px-4 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">Servv IQ</p>
              <p className="text-slate-400 text-[11px] mt-0.5">AI Hotel Assistant · Live data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
            </span>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white transition-colors p-1 ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 bg-white overflow-y-auto p-4 min-h-[320px] max-h-[420px]">
          {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
          {loading && (
            <div className="flex justify-start mb-3">
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center mr-2 shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-slate-100 rounded-2xl rounded-bl-sm">
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions (shown when only greeting is visible) */}
        {messages.length <= 1 && !loading && (
          <div className="bg-slate-50 border-t border-slate-100 px-3 py-2.5 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-600 hover:border-slate-400 hover:text-slate-800 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="bg-white border-t border-slate-100 p-3 flex items-center gap-2 shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything about your hotel…"
            disabled={loading}
            className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent disabled:opacity-50 transition"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-amber-600 hover:bg-amber-700 flex items-center justify-center transition-colors disabled:opacity-40 shrink-0"
          >
            {loading
              ? <Loader2 className="w-4 h-4 text-white animate-spin" />
              : <Send className="w-4 h-4 text-white" />
            }
          </button>
        </div>
      </div>
    </>
  );
}
