'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSessionChat, ChatMessage } from '../hooks/useSessionChat';

interface ChatPanelProps {
  sessionId: string;
  myUserId: string;
  myDisplayName: string;
}

/**
 * Floating chat button + slide-up panel for online sessions.
 * - Shows unread badge when closed
 * - Toast notification preview for new messages when closed
 * - Persists messages via DB (survives WebSocket drops)
 *
 * Position: fixed bottom-right corner, z-50.
 * The open panel is bottom-right anchored and max-height constrained so it
 * doesn't cover critical game controls (score buttons are at the very bottom;
 * the panel sits above them).
 */
export default function ChatPanel({ sessionId, myUserId, myDisplayName }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [toast, setToast] = useState<ChatMessage | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSeenCountRef = useRef(0); // # of opponent messages "seen" when panel was last opened

  const { messages, sendMessage } = useSessionChat(sessionId);

  // ── Unread count ────────────────────────────────────────────────────────────
  const opponentMessages = messages.filter((m) => m.userId !== myUserId);
  const unreadCount = Math.max(0, opponentMessages.length - lastSeenCountRef.current);

  // ── Toast when closed ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) return;
    if (!opponentMessages.length) return;
    const latest = opponentMessages[opponentMessages.length - 1];
    // Only toast for messages we haven't accounted for yet
    if (opponentMessages.length <= lastSeenCountRef.current) return;

    setToast(latest);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // ── Auto-scroll to latest message ───────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // ── Focus input when panel opens ────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setToast(null);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    // Mark all current opponent messages as seen
    lastSeenCountRef.current = opponentMessages.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opponentMessages.length]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Seal the current read count so future messages generate unread badges
    lastSeenCountRef.current = opponentMessages.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opponentMessages.length]);

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;
    sendMessage(text, myUserId, myDisplayName);
    setInputValue('');
  }, [inputValue, myUserId, myDisplayName, sendMessage]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* ── Toast notification ─────────────────────────────────────────────── */}
      {toast && !isOpen && (
        <div
          className="fixed top-16 right-3 z-[60] bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-2.5 shadow-2xl max-w-[260px] cursor-pointer"
          onClick={handleOpen}
        >
          <p className="text-xs font-bold text-[#4CAF50] truncate">{toast.displayName}</p>
          <p className="text-sm truncate mt-0.5">{toast.message}</p>
        </div>
      )}

      {/* ── Floating chat button ───────────────────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-20 right-4 z-50 w-12 h-12 bg-gray-800 border border-gray-600 rounded-full shadow-lg flex items-center justify-center text-xl hover:bg-gray-700 transition-colors"
          aria-label="Open chat"
        >
          💬
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* ── Chat panel ────────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 z-50 w-full sm:w-80 flex flex-col bg-gray-900 border-t border-l border-gray-700 sm:rounded-tl-2xl shadow-2xl"
          style={{ maxHeight: '65vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              <span className="text-white font-bold text-sm">Chat</span>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white text-xl leading-none px-1"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Message list */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
            {messages.length === 0 && (
              <p className="text-gray-500 text-xs text-center mt-4">No messages yet. Say hi!</p>
            )}
            {messages.map((msg) => {
              const isMe = msg.userId === myUserId;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <span className="text-[10px] text-gray-400 mb-0.5 ml-1">{msg.displayName}</span>
                  )}
                  <div
                    className={`px-3 py-1.5 rounded-2xl text-sm max-w-[85%] break-words ${
                      isMe
                        ? 'bg-[#4CAF50] text-white rounded-br-sm'
                        : 'bg-gray-700 text-white rounded-bl-sm'
                    }`}
                  >
                    {msg.message}
                  </div>
                  <span className="text-[10px] text-gray-600 mt-0.5 mx-1">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-700 flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Message..."
              maxLength={500}
              className="flex-1 bg-gray-800 text-white text-sm rounded-full px-3 py-2 outline-none border border-gray-600 focus:border-[#4CAF50] placeholder-gray-500 min-w-0"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="text-[#4CAF50] font-bold text-sm disabled:opacity-40 flex-shrink-0 px-1"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
