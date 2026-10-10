import React, { useEffect, useRef, useState } from 'react';
import { Bot, MessageCircle, Send, Sparkles, X } from 'lucide-react';

const SUGGESTIONS = ['Book a table', 'My upcoming reservation', 'How do I check in?'];
const CHAT_WEBHOOK_URL = import.meta.env.VITE_OCCUPIE_CHAT_WEBHOOK
  || 'https://harshi-kumar.app.n8n.cloud/webhook/a86595df-ebf5-48c1-8aaa-be24bc4352a1/chat';

function extractReply(payload) {
  const result = Array.isArray(payload) ? payload[0] : payload;
  if (typeof result === 'string') return result.trim();
  if (!result || typeof result !== 'object') return '';
  for (const key of ['output', 'reply', 'response', 'message', 'text']) {
    if (typeof result[key] === 'string' && result[key].trim()) return result[key].trim();
  }
  return typeof result.data === 'string' ? result.data.trim() : '';
}

function parseWebhookReply(responseText) {
  if (!responseText) return '';
  try {
    const reply = extractReply(JSON.parse(responseText));
    if (reply) return reply;
  } catch { /* Try n8n's line-delimited streaming format below. */ }
  const chunks = responseText.split(/\r?\n/).map((line) => {
    const trimmed = line.trim().replace(/^data:\s*/, '');
    if (!trimmed || trimmed === '[DONE]') return '';
    try {
      const event = JSON.parse(trimmed);
      return event.type === 'item' && typeof event.content === 'string' ? event.content : '';
    } catch { return ''; }
  });
  if (chunks.some(Boolean)) return chunks.join('').trim();
  return responseText.trim();
}

export function OccupieChat({ reservations = [], userName = '', onBookTable }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([
    { id: 'welcome', from: 'occupie', text: `Hi${userName ? `, ${userName.split(' ')[0]}` : ''}! I’m Occupie. How can I make your dining experience easier?` },
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [isOpen, messages]);

  const sendMessage = async (value = draft) => {
    const text = value.trim();
    if (!text || isSending) return;
    setIsSending(true);
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, from: 'user', text },
    ]);
    setDraft('');
    try {
      const sessionKey = 'occupie-n8n-chat-session';
      let sessionId = window.localStorage.getItem(sessionKey);
      if (!sessionId) {
        sessionId = window.crypto?.randomUUID?.() || `occupie-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        window.localStorage.setItem(sessionKey, sessionId);
      }
      const response = await fetch(CHAT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/plain' },
        body: JSON.stringify({ chatInput: text, sessionId }),
      });
      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(`n8n returned HTTP ${response.status}${responseText ? `: ${responseText.slice(0, 180)}` : '.'}`);
      }
      const reply = parseWebhookReply(responseText);
      if (!reply) throw new Error('The webhook responded without a reply. Return plain text or a JSON output/reply/response/message/text field.');
      setMessages((current) => [...current, { id: `${Date.now()}-occupie`, from: 'occupie', text: reply }]);
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Unknown connection error.';
      const friendlyMessage = error instanceof TypeError
        ? 'I could not reach the n8n service. Check that the webhook is active and allows browser requests (CORS), then try again.'
        : `I could not get a reply from the n8n service. ${details}`;
      setMessages((current) => [...current, { id: `${Date.now()}-occupie-error`, from: 'occupie', text: friendlyMessage }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSuggestion = (suggestion) => {
    if (suggestion === 'Book a table') {
      if (onBookTable) {
        setIsOpen(false);
        onBookTable();
      } else {
        sendMessage(suggestion);
      }
      return;
    }
    sendMessage(suggestion);
  };

  return (
    <div className="occupie-chat fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {isOpen && (
        <section aria-label="Chat with Occupie" className="flex h-[min(34rem,calc(100dvh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
          <header className="flex items-center justify-between bg-gradient-to-r from-occupie-navy-950 via-slate-900 to-occupie-navy-900 px-4 py-3.5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-occupie-teal-400/30 bg-occupie-teal-500/15 text-occupie-teal-300">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Occupie</h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Dining assistant</p>
              </div>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close Occupie chat" className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-occupie-teal-400">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/80 p-4" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${message.from === 'user' ? 'rounded-br-md bg-occupie-navy-900 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm'}`}>
                  {message.from === 'occupie' && <div className="mb-1 flex items-center gap-1 text-[10px] font-bold text-occupie-teal-700"><Sparkles className="h-3 w-3" /> Occupie</div>}
                  {message.text}
                </div>
              </div>
            ))}
            {isSending && <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-500 shadow-sm">Occupie is thinking…</div>}
            <div ref={endRef} />
          </div>

          {messages.length < 4 && (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white px-3.5 py-3">
              {SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => handleSuggestion(suggestion)} className="rounded-full border border-occupie-teal-600/25 bg-occupie-teal-50 px-3 py-1.5 text-[10px] font-semibold text-occupie-teal-800 transition hover:border-occupie-teal-500 hover:bg-occupie-teal-100 focus:outline-none focus:ring-2 focus:ring-occupie-teal-400">
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={(event) => { event.preventDefault(); sendMessage(); }} className="flex items-center gap-2 border-t border-slate-200 bg-white p-3">
            <label htmlFor="occupie-chat-message" className="sr-only">Message Occupie</label>
            <input id="occupie-chat-message" type="text" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask Occupie anything…" autoComplete="off" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-occupie-teal-500 focus:outline-none focus:ring-2 focus:ring-occupie-teal-500/20" />
            <button type="submit" disabled={!draft.trim() || isSending} aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-occupie-teal-600 text-white transition hover:bg-occupie-teal-700 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-occupie-teal-500 focus:ring-offset-2">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}

      <button type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} aria-label={isOpen ? 'Close Occupie chat' : 'Chat with Occupie'} title="Chat with Occupie" className="group flex h-14 w-14 items-center justify-center rounded-full border border-occupie-teal-300/40 bg-gradient-to-br from-occupie-teal-500 to-occupie-cyan-500 text-occupie-navy-950 shadow-xl shadow-occupie-navy-950/25 transition hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-occupie-teal-400 focus:ring-offset-2">
        <MessageCircle className="h-6 w-6 transition-transform group-hover:scale-110" />
      </button>
    </div>
  );
}

export default OccupieChat;
