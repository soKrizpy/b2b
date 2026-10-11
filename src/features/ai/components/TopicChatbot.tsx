'use client';
// src/features/ai/components/TopicChatbot.tsx
// Floating AI tutor chatbot on the student topic page.
// Knows the topic's lesson content. Dismissible. Opens on fab click.

import { useState, useRef, useEffect, useTransition, useCallback } from 'react';
import { chatWithTutor, type ChatMessage } from '@/features/ai/actions';

interface Props {
  topicTitle:   string;
  topicContext: string; // stringified lesson_content summary for context
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center
        flex-shrink-0 text-base select-none
        ${isUser
          ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-400'
          : 'bg-gradient-to-br from-violet-600 to-purple-700 text-white'
        }`}>
        {isUser ? '👤' : '⚡'}
      </div>

      {/* Text bubble */}
      <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed
        ${isUser
          ? 'bg-indigo-600 text-white rounded-br-sm'
          : 'bg-zinc-800 border border-zinc-700/60 text-zinc-100 rounded-bl-sm'
        }`}>
        <p className="whitespace-pre-wrap">{msg.content}</p>
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
        bg-gradient-to-br from-violet-600 to-purple-700 text-white text-base select-none">
        ⚡
      </div>
      <div className="bg-zinc-800 border border-zinc-700/60 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main chatbot ──────────────────────────────────────────────────────────────

export function TopicChatbot({ topicTitle, topicContext }: Props) {
  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState('');
  const [history,  setHistory]  = useState<ChatMessage[]>([]);
  const [pending,  startSend]   = useTransition();
  const [error,    setError]    = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, pending]);

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = useCallback(() => {
    const msg = input.trim();
    if (!msg || pending) return;

    const userMsg: ChatMessage = { role: 'user', content: msg };
    setInput('');
    setError(null);

    // Optimistically add user message
    setHistory((prev) => [...prev, userMsg]);

    const fd = new FormData();
    fd.append('topic_title',   topicTitle);
    fd.append('topic_context', topicContext.slice(0, 2000));
    fd.append('message',       msg);
    fd.append('history',       JSON.stringify(history));

    startSend(async () => {
      const res = await chatWithTutor(null, fd);
      if (res.success) {
        setHistory((prev) => [...prev, { role: 'model', content: res.data }]);
      } else {
        setError(res.error);
        // Remove optimistic user message on error
        setHistory((prev) => prev.slice(0, -1));
      }
    });
  }, [input, pending, history, topicTitle, topicContext]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedQuestions = [
    `Apa itu ${topicTitle}?`,
    'Bisakah beri contoh nyata?',
    'Apa yang perlu aku hafalkan?',
  ];

  return (
    <>
      {/* ── Floating action button ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Buka AI Tutor"
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full
          flex items-center justify-center text-xl
          bg-gradient-to-br from-violet-600 to-purple-700 text-white
          shadow-xl shadow-purple-900/50
          hover:shadow-purple-500/60 hover:scale-110 active:scale-95
          transition-all duration-200
          ${open ? 'rotate-45' : ''}`}
      >
        {open ? '✕' : '⚡'}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[340px] sm:w-[380px]
          bg-zinc-950 border border-zinc-700/60 rounded-3xl shadow-2xl shadow-black/60
          flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
          style={{ maxHeight: 'min(560px, calc(100dvh - 120px))' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r
            from-violet-900/60 to-purple-900/60 border-b border-zinc-800">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700
              flex items-center justify-center text-base shadow-md flex-shrink-0">
              ⚡
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate">Byte — AI Tutor</p>
              <p className="text-[10px] text-purple-300 truncate">{topicTitle}</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-bold">Online</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-0">
            {/* Greeting */}
            {history.length === 0 && (
              <div className="flex flex-col gap-3">
                <Bubble
                  msg={{
                    role: 'model',
                    content: `Halo! Aku Byte, tutor AI kamu 🚀\nAku siap bantu kamu memahami **${topicTitle}**. Ada yang ingin ditanyakan?`,
                  }}
                />
                {/* Suggested questions */}
                <div className="flex flex-col gap-1.5 pl-9">
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => { setInput(q); inputRef.current?.focus(); }}
                      className="text-left text-[11px] text-purple-300 bg-purple-500/10
                        border border-purple-500/25 rounded-xl px-3 py-1.5
                        hover:bg-purple-500/20 transition-colors truncate"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {history.map((msg, i) => (
              <Bubble key={i} msg={msg} />
            ))}

            {pending && <TypingIndicator />}

            {error && (
              <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20
                rounded-xl px-3 py-2 text-center">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-zinc-800 flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanya sesuatu… (Enter kirim)"
              rows={1}
              className="flex-1 resize-none rounded-2xl border border-zinc-700 bg-zinc-800/80
                px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500
                focus:outline-none focus:ring-2 focus:ring-purple-500
                max-h-28 overflow-y-auto leading-relaxed"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim() || pending}
              className="w-9 h-9 rounded-2xl flex-shrink-0 flex items-center justify-center
                bg-gradient-to-br from-violet-600 to-purple-700 text-white text-sm
                shadow-md hover:shadow-purple-500/40 hover:scale-105 active:scale-95
                disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              aria-label="Kirim"
            >
              {pending
                ? <span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" />
                : '→'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
