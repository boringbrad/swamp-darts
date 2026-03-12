'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSessionChat, ChatMessage } from '../hooks/useSessionChat';

interface ChatPanelProps {
  sessionId: string;
  myUserId: string;
  myDisplayName: string;
}

const STORAGE_KEY = 'chatBtnPos';
const BTN_SIZE = 48;

/**
 * Floating, draggable chat button + centered modal panel.
 * - Button is draggable (Pointer Events API — works for touch + mouse)
 * - Tap vs drag distinguished by movement threshold
 * - Button position saved to localStorage
 * - Open panel is a centered modal (not pinned to screen edge)
 * - Toast preview slides in when a message arrives while closed
 */
export default function ChatPanel({ sessionId, myUserId, myDisplayName }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [toast, setToast] = useState<ChatMessage | null>(null);
  // null until client-side mount so SSR doesn't read window
  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastFadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSeenCountRef = useRef(0);

  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    startBtnX: 0,
    startBtnY: 0,
  });

  const { messages, sendMessage } = useSessionChat(sessionId);
  const opponentMessages = messages.filter((m) => m.userId !== myUserId);
  const unreadCount = Math.max(0, opponentMessages.length - lastSeenCountRef.current);

  // ── Initialise button position from localStorage (client-side only) ────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const pos = JSON.parse(saved);
        // Clamp saved position in case screen size changed
        setBtnPos({
          x: Math.max(8, Math.min(window.innerWidth - BTN_SIZE - 8, pos.x)),
          y: Math.max(8, Math.min(window.innerHeight - BTN_SIZE - 8, pos.y)),
        });
        return;
      }
    } catch {}
    // Default: bottom-right, clear of typical game controls
    setBtnPos({ x: window.innerWidth - BTN_SIZE - 16, y: window.innerHeight - 120 });
  }, []);

  const savePos = useCallback((pos: { x: number; y: number }) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {}
  }, []);

  // ── Toast when panel is closed ─────────────────────────────────────────────
  useEffect(() => {
    if (isOpen || !opponentMessages.length) return;
    if (opponentMessages.length <= lastSeenCountRef.current) return;

    const latest = opponentMessages[opponentMessages.length - 1];
    setToast(latest);
    setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (toastFadeRef.current) clearTimeout(toastFadeRef.current);
    // Start fade-out 300ms before removing
    toastFadeRef.current = setTimeout(() => setToastVisible(false), 2200);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // ── Auto-scroll to latest ──────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // ── Focus input on open ───────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 60);
  }, [isOpen]);

  // ── Drag (Pointer Events — handles both mouse and touch) ──────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!btnPos) return;
      e.preventDefault();
      dragRef.current = {
        active: true,
        moved: false,
        startX: e.clientX,
        startY: e.clientY,
        startBtnX: btnPos.x,
        startBtnY: btnPos.y,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [btnPos]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (!dragRef.current.moved && Math.hypot(dx, dy) < 6) return;
    dragRef.current.moved = true;
    const newX = Math.max(8, Math.min(window.innerWidth - BTN_SIZE - 8, dragRef.current.startBtnX + dx));
    const newY = Math.max(8, Math.min(window.innerHeight - BTN_SIZE - 8, dragRef.current.startBtnY + dy));
    setBtnPos({ x: newX, y: newY });
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      if (dragRef.current.moved) {
        // Save final position
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        const newPos = {
          x: Math.max(8, Math.min(window.innerWidth - BTN_SIZE - 8, dragRef.current.startBtnX + dx)),
          y: Math.max(8, Math.min(window.innerHeight - BTN_SIZE - 8, dragRef.current.startBtnY + dy)),
        };
        savePos(newPos);
      } else {
        // It was a tap — open the panel
        handleOpen();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savePos]
  );

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setToast(null);
    setToastVisible(false);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (toastFadeRef.current) clearTimeout(toastFadeRef.current);
    lastSeenCountRef.current = opponentMessages.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opponentMessages.length]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    lastSeenCountRef.current = opponentMessages.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opponentMessages.length]);

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;
    sendMessage(text, myUserId, myDisplayName);
    setInputValue('');
  }, [inputValue, myUserId, myDisplayName, sendMessage]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!btnPos) return null;

  return (
    <>
      {/* ── Toast preview ──────────────────────────────────────────────────── */}
      {toast && (
        <div
          className="fixed top-16 right-3 z-[60] bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 shadow-2xl max-w-[280px] cursor-pointer select-none"
          style={{
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            opacity: toastVisible ? 1 : 0,
            transform: toastVisible ? 'translateX(0)' : 'translateX(16px)',
          }}
          onClick={handleOpen}
        >
          <p className="text-xs font-bold text-[#4CAF50] truncate">{toast.displayName}</p>
          <p className="text-sm truncate mt-0.5">{toast.message}</p>
        </div>
      )}

      {/* ── Draggable floating button ──────────────────────────────────────── */}
      {!isOpen && (
        <button
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="fixed z-50 w-12 h-12 bg-gray-800 border border-gray-600 rounded-full shadow-lg flex items-center justify-center text-xl select-none touch-none cursor-grab active:cursor-grabbing"
          style={{ left: btnPos.x, top: btnPos.y }}
          aria-label="Open chat"
        >
          💬
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 pointer-events-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* ── Open panel (centered modal) ────────────────────────────────────── */}
      {isOpen && (
        <>
          {/* Backdrop — tap to close */}
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={handleClose}
          />

          {/* Panel */}
          <div
            className="fixed z-[55] flex flex-col bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(440px, calc(100vw - 32px))',
              height: 'min(300px, calc(100dvh - 80px))',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-700 flex-shrink-0 bg-gray-900">
              <div className="flex items-center gap-2">
                <span className="text-xl">💬</span>
                <span className="text-white font-bold text-base">Chat</span>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700 transition-colors text-lg"
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {messages.length === 0 && (
                <p className="text-gray-500 text-base text-center mt-6">No messages yet. Say hi! 👋</p>
              )}
              {messages.map((msg) => {
                const isMe = msg.userId === myUserId;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && (
                      <span className="text-xs text-gray-400 mb-1 ml-1">{msg.displayName}</span>
                    )}
                    <div
                      className={`px-4 py-2 rounded-2xl max-w-[80%] break-words text-base leading-relaxed ${
                        isMe
                          ? 'bg-[#4CAF50] text-white rounded-br-sm'
                          : 'bg-gray-700 text-white rounded-bl-sm'
                      }`}
                    >
                      {msg.message}
                    </div>
                    <span className="text-xs text-gray-600 mt-1 mx-1">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-700 flex-shrink-0">
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
                className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2.5 outline-none border border-gray-600 focus:border-[#4CAF50] placeholder-gray-500 min-w-0 text-base"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="bg-[#4CAF50] hover:bg-[#43a047] text-white font-bold px-4 py-2.5 rounded-full disabled:opacity-40 flex-shrink-0 text-base transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
