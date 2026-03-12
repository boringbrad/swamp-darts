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
const PANEL_HEIGHT = 320; // px — fixed height so keyboard maths are predictable

/**
 * Floating, draggable chat button + keyboard-aware panel.
 *
 * Keyboard handling:
 *   Uses the Visual Viewport API (window.visualViewport) to track how much
 *   screen space the software keyboard is consuming. The panel's bottom edge
 *   is pinned 8 px above the keyboard so it never scrolls out of view.
 *   Falls back gracefully on browsers without visualViewport support.
 */
export default function ChatPanel({ sessionId, myUserId, myDisplayName }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [toast, setToast] = useState<ChatMessage | null>(null);
  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  // Bottom offset for the panel (px from bottom of screen) — increases when keyboard opens
  const [panelBottom, setPanelBottom] = useState(8);

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

  // ── Button position (client-side init from localStorage) ──────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const pos = JSON.parse(saved);
        setBtnPos({
          x: Math.max(8, Math.min(window.innerWidth - BTN_SIZE - 8, pos.x)),
          y: Math.max(8, Math.min(window.innerHeight - BTN_SIZE - 8, pos.y)),
        });
        return;
      }
    } catch {}
    setBtnPos({ x: window.innerWidth - BTN_SIZE - 16, y: window.innerHeight - 120 });
  }, []);

  const savePos = useCallback((pos: { x: number; y: number }) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {}
  }, []);

  // ── Visual Viewport: track keyboard height, keep panel above it ──────────
  useEffect(() => {
    if (!isOpen) {
      setPanelBottom(8);
      return;
    }
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;

    const update = () => {
      // keyboardHeight = gap between layout viewport bottom and visual viewport bottom
      const keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setPanelBottom(keyboardHeight + 8);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [isOpen]);

  // ── Toast when closed ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen || !opponentMessages.length) return;
    if (opponentMessages.length <= lastSeenCountRef.current) return;

    const latest = opponentMessages[opponentMessages.length - 1];
    setToast(latest);
    setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (toastFadeRef.current) clearTimeout(toastFadeRef.current);
    toastFadeRef.current = setTimeout(() => setToastVisible(false), 2200);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // ── Focus input on open ───────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 60);
  }, [isOpen]);

  // ── Drag (Pointer Events — mouse + touch) ────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!btnPos) return;
      e.preventDefault();
      dragRef.current = {
        active: true, moved: false,
        startX: e.clientX, startY: e.clientY,
        startBtnX: btnPos.x, startBtnY: btnPos.y,
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
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        const newPos = {
          x: Math.max(8, Math.min(window.innerWidth - BTN_SIZE - 8, dragRef.current.startBtnX + dx)),
          y: Math.max(8, Math.min(window.innerHeight - BTN_SIZE - 8, dragRef.current.startBtnY + dy)),
        };
        savePos(newPos);
      } else {
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
          <p className="text-sm font-bold text-[#4CAF50] truncate">{toast.displayName}</p>
          <p className="text-base truncate mt-0.5">{toast.message}</p>
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

      {/* ── Open panel ────────────────────────────────────────────────────── */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-50 bg-black/50" onClick={handleClose} />

          {/* Panel — bottom-anchored so keyboard pushes it up instead of under it */}
          <div
            className="fixed z-[55] flex flex-col bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
            style={{
              left: '50%',
              bottom: panelBottom,
              transform: 'translateX(-50%)',
              width: 'min(440px, calc(100vw - 32px))',
              height: PANEL_HEIGHT,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">💬</span>
                <span className="text-white font-bold text-lg">Chat</span>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-700 transition-colors text-xl"
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {messages.length === 0 && (
                <p className="text-gray-500 text-lg text-center mt-6">No messages yet. Say hi! 👋</p>
              )}
              {messages.map((msg) => {
                const isMe = msg.userId === myUserId;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && (
                      <span className="text-sm text-gray-400 mb-1 ml-2">{msg.displayName}</span>
                    )}
                    <div
                      className={`px-5 py-3 rounded-2xl max-w-[82%] break-words text-lg leading-snug ${
                        isMe
                          ? 'bg-[#4CAF50] text-white rounded-br-sm'
                          : 'bg-gray-700 text-white rounded-bl-sm'
                      }`}
                    >
                      {msg.message}
                    </div>
                    <span className="text-xs text-gray-600 mt-1 mx-2">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-700 flex-shrink-0">
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
                className="flex-1 bg-gray-800 text-white rounded-full px-5 py-3 outline-none border border-gray-600 focus:border-[#4CAF50] placeholder-gray-500 min-w-0 text-lg"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="bg-[#4CAF50] hover:bg-[#43a047] text-white font-bold px-6 py-3 rounded-full disabled:opacity-40 flex-shrink-0 text-lg transition-colors"
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
