import React, { useEffect, useRef, useState } from 'react';
import { Bot, MessageCircle, Send, Sparkles, X } from 'lucide-react';

const SUGGESTIONS = ['Book a table', 'My upcoming reservation', 'How do I check in?'];

function getAssistantReply(message, reservations, userName) {
  const text = message.toLowerCase();
  const active = reservations.filter((reservation) =>
    reservation.guestName === userName
    && !['seated', 'cancelled', 'no_show'].includes(reservation.status)
  );

  if (/\b(hi|hello|hey|good morning|good evening)\b/.test(text)) {
    return `Hello${userName ? `, ${userName.split(' ')[0]}` : ''}! I’m Occupie, your dining assistant. I can help with reservations, check-in, and your visit.`;
  }
  if (/\b(book|reserve|reservation|table|booking)\b/.test(text) && /\b(new|book|reserve|make|want|table)\b/.test(text)) {
    return 'I can help you get started. Use the Reserve a Table button on your dashboard to choose your party size, time, and seating preference.';
  }
  if (/\b(upcoming|my reservation|my booking|confirmation|when is)\b/.test(text)) {
    if (!active.length) return 'You don’t have an upcoming reservation yet. Select “Reserve a Table” and I’ll be here if you need help.';
    const reservation = active[0];
    const when = reservation.date && reservation.time
      ? `${reservation.date} at ${reservation.time}`
      : reservation.startsAt
        ? new Date(reservation.startsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
        : 'the scheduled time';
    return `I found your reservation at ${reservation.restaurantName || 'L’Atelier Bistro & Bar'} for ${when}, party of ${reservation.partySize || 'your'} (${reservation.status}).${reservation.confirmationCode ? ` Confirmation: ${reservation.confirmationCode}.` : ''}`;
  }
  if (/\b(check.?in|arrive|arrival|host stand)\b/.test(text)) {
    return 'When you arrive, find your upcoming reservation on this page and choose “Check In.” The host team will then help you to your table.';
  }
  if (/\b(cancel|change|modify|update)\b/.test(text)) {
    return active.length
      ? 'Your upcoming reservation is listed on this page. Use its Cancel option if you can no longer make it. For a time or party-size change, please contact the restaurant team.'
      : 'There isn’t an active reservation to change right now. You can make a new booking with “Reserve a Table.”';
  }
  if (/\b(wait|wait.?time|how long)\b/.test(text)) {
    return 'Wait-time estimates are shown only when current restaurant data supports them. Please check the booking area on your dashboard for the latest available information.';
  }
  if (/\b(help|what can you do|support)\b/.test(text)) {
    return 'I can help you find an upcoming booking, explain check-in, share how to manage a reservation, or guide you to book a table. Try one of the suggestions below.';
  }
  return 'I can help with bookings, upcoming reservations, and check-in. Try asking “When is my reservation?” or “How do I check in?”';
}

export function OccupieChat({ reservations = [], userName = '', onBookTable }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([
    { id: 'welcome', from: 'occupie', text: `Hi${userName ? `, ${userName.split(' ')[0]}` : ''}! I’m Occupie. How can I make your dining experience easier?` },
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [isOpen, messages]);

  const sendMessage = (value = draft) => {
    const text = value.trim();
    if (!text) return;
    const reply = getAssistantReply(text, reservations, userName);
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, from: 'user', text },
      { id: `${Date.now()}-occupie`, from: 'occupie', text: reply },
    ]);
    setDraft('');
  };

  const handleSuggestion = (suggestion) => {
    if (suggestion === 'Book a table') {
      setIsOpen(false);
      onBookTable?.();
      return;
    }
    sendMessage(suggestion);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
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
            <button type="submit" disabled={!draft.trim()} aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-occupie-teal-600 text-white transition hover:bg-occupie-teal-700 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-occupie-teal-500 focus:ring-offset-2">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      )}

      <button type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} aria-label={isOpen ? 'Close Occupie chat' : 'Chat with Occupie'} className="group flex items-center gap-2.5 rounded-full border border-occupie-teal-400/30 bg-gradient-to-r from-occupie-navy-950 to-slate-900 py-2.5 pl-3 pr-4 text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-occupie-teal-400 focus:ring-offset-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-occupie-teal-500 text-occupie-navy-950 transition group-hover:bg-occupie-teal-400"><MessageCircle className="h-5 w-5" /></span>
        <span className="text-left"><span className="block text-xs font-bold">Ask Occupie</span><span className="block text-[10px] text-slate-300">Your dining assistant</span></span>
      </button>
    </div>
  );
}

export default OccupieChat;
