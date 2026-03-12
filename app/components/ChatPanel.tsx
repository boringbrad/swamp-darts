'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSessionChat, ChatMessage } from '../hooks/useSessionChat';

interface ChatPanelProps {
  sessionId: string;
  myUserId: string;
  myDisplayName: string;
}

const BTN_STORAGE_KEY   = 'chatBtnPos';
const PANEL_STORAGE_KEY = 'chatPanelPos';
const BTN_SIZE   = 48;
const PANEL_W    = 440; // max panel width (px)
const PANEL_H    = 320; // panel height (px)

/**
 * Floating, draggable chat button + draggable panel.
 *
 * Button: drag anywhere on screen (Pointer Events, touch + mouse).
 * Panel:  drag by the header bar on any device.
 * Keyboard: Visual Viewport API clamps the panel's top so it never
 *   hides behind the software keyboard on mobile.
 */
export default function ChatPanel({ sessionId, myUserId, myDisplayName }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [toast, setToast] = useState<ChatMessage | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  // Button drag position (top-left corner of the 48×48 button)
  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  // Panel drag position (top-left corner of the panel)
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
  // Visible viewport height — shrinks when the software keyboard opens on mobile
  const [viewportHeight, setViewportHeight] = useState<number>(
    typeof window !== 'undefined' ? (window.visualViewport?.height ?? window.innerHeight) : 600
  );

  const toastTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastFadeRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLInputElement>(null);
  const lastSeenCountRef = useRef(0);

  const btnDragRef = useRef({ active: false, moved: false, startX: 0, startY: 0, startBtnX: 0, startBtnY: 0 });
  const panelDragRef = useRef({ active: false, startX: 0, startY: 0, startPanelX: 0, startPanelY: 0 });

  const { messages, sendMessage } = useSessionChat(sessionId);
  const opponentMessages = messages.filter((m) => m.userId !== myUserId);
  const unreadCount = Math.max(0, opponentMessages.length - lastSeenCountRef.current);

  // ── Initialise positions from localStorage ────────────────────────────────
  useEffect(() => {
    // Button
    try {
      const saved = localStorage.getItem(BTN_STORAGE_KEY);
      if (saved) {
        const pos = JSON.parse(saved);
        setBtnPos({
          x: Math.max(8, Math.min(window.innerWidth  - BTN_SIZE - 8, pos.x)),
          y: Math.max(8, Math.min(window.innerHeight - BTN_SIZE - 8, pos.y)),
        });
      } else {
        setBtnPos({ x: window.innerWidth - BTN_SIZE - 16, y: window.innerHeight - 120 });
      }
    } catch {
      setBtnPos({ x: window.innerWidth - BTN_SIZE - 16, y: window.innerHeight - 120 });
    }

    // Panel
    try {
      const saved = localStorage.getItem(PANEL_STORAGE_KEY);
      if (saved) {
        const pos = JSON.parse(saved);
        const pw = Math.min(PANEL_W, window.innerWidth - 32);
        setPanelPos({
          x: Math.max(8, Math.min(window.innerWidth  - pw - 8,      pos.x)),
          y: Math.max(8, Math.min(window.innerHeight - PANEL_H - 8, pos.y)),
        });
      } else {
        // Default: horizontally centred, near the bottom
        const pw = Math.min(PANEL_W, window.innerWidth - 32);
        setPanelPos({ x: (window.innerWidth - pw) / 2, y: window.innerHeight - PANEL_H - 20 });
      }
    } catch {
      const pw = Math.min(PANEL_W, window.innerWidth - 32);
      setPanelPos({ x: (window.innerWidth - pw) / 2, y: window.innerHeight - PANEL_H - 20 });
    }
  }, []);

  // ── Visual Viewport: always track visible height (catches keyboard open/close) ──
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setViewportHeight(vv.height);
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, []);

  // ── Toast ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen || !opponentMessages.length) return;
    if (opponentMessages.length <= lastSeenCountRef.current) return;
    const latest = opponentMessages[opponentMessages.length - 1];
    setToast(latest);
    setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (toastFadeRef.current)  clearTimeout(toastFadeRef.current);
    toastFadeRef.current  = setTimeout(() => setToastVisible(false), 2200);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // ── Auto-scroll + focus ───────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 60);
  }, [isOpen]);

  // ── Button drag ───────────────────────────────────────────────────────────
  const handleBtnPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!btnPos) return;
    e.preventDefault();
    btnDragRef.current = { active: true, moved: false, startX: e.clientX, startY: e.clientY, startBtnX: btnPos.x, startBtnY: btnPos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [btnPos]);

  const handleBtnPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!btnDragRef.current.active) return;
    const dx = e.clientX - btnDragRef.current.startX;
    const dy = e.clientY - btnDragRef.current.startY;
    if (!btnDragRef.current.moved && Math.hypot(dx, dy) < 6) return;
    btnDragRef.current.moved = true;
    setBtnPos({
      x: Math.max(8, Math.min(window.innerWidth  - BTN_SIZE - 8, btnDragRef.current.startBtnX + dx)),
      y: Math.max(8, Math.min(window.innerHeight - BTN_SIZE - 8, btnDragRef.current.startBtnY + dy)),
    });
  }, []);

  const handleBtnPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!btnDragRef.current.active) return;
    btnDragRef.current.active = false;
    if (btnDragRef.current.moved) {
      const dx = e.clientX - btnDragRef.current.startX;
      const dy = e.clientY - btnDragRef.current.startY;
      const newPos = {
        x: Math.max(8, Math.min(window.innerWidth  - BTN_SIZE - 8, btnDragRef.current.startBtnX + dx)),
        y: Math.max(8, Math.min(window.innerHeight - BTN_SIZE - 8, btnDragRef.current.startBtnY + dy)),
      };
      try { localStorage.setItem(BTN_STORAGE_KEY, JSON.stringify(newPos)); } catch {}
    } else {
      handleOpen();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Panel header drag ─────────────────────────────────────────────────────
  const handleHeaderPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!panelPos) return;
    e.preventDefault();
    panelDragRef.current = { active: true, startX: e.clientX, startY: e.clientY, startPanelX: panelPos.x, startPanelY: panelPos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [panelPos]);

  const handleHeaderPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!panelDragRef.current.active) return;
    const dx = e.clientX - panelDragRef.current.startX;
    const dy = e.clientY - panelDragRef.current.startY;
    const pw = Math.min(PANEL_W, window.innerWidth - 32);
    setPanelPos({
      x: Math.max(8, Math.min(window.innerWidth  - pw       - 8, panelDragRef.current.startPanelX + dx)),
      y: Math.max(8, Math.min(window.innerHeight - PANEL_H  - 8, panelDragRef.current.startPanelY + dy)),
    });
  }, []);

  const handleHeaderPointerUp = useCallback(() => {
    if (!panelDragRef.current.active) return;
    panelDragRef.current.active = false;
    setPanelPos((pos) => {
      if (pos) {
        try { localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(pos)); } catch {}
      }
      return pos;
    });
  }, []);

  // ── Computed panel top (clamped within visible viewport, above keyboard) ────
  const effectivePanelTop = panelPos
    ? Math.min(panelPos.y, viewportHeight - PANEL_H - 8)
    : 8;

  // ── Open / close ──────────────────────────────────────────────────────────
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setToast(null);
    setToastVisible(false);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (toastFadeRef.current)  clearTimeout(toastFadeRef.current);
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

  if (!btnPos || !panelPos) return null;

  return (
    <>
      {/* ── Toast preview — floats directly above the chat button ─────────── */}
      {toast && btnPos && (
        <div
          className="fixed z-[200] bg-gray-900 border border-gray-600 text-white rounded-2xl px-5 py-4 shadow-2xl max-w-[300px] cursor-pointer select-none"
          style={{
            // Right-align to button's right edge, clamped to viewport
            left: Math.max(8, Math.min(btnPos.x + BTN_SIZE - 300, window.innerWidth - 308)),
            // Sit just above the button
            top: btnPos.y,
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            opacity: toastVisible ? 1 : 0,
            transform: toastVisible
              ? 'translateY(calc(-100% - 10px))'
              : 'translateY(calc(-100% - 10px)) translateX(16px)',
            pointerEvents: toastVisible ? 'auto' : 'none',
          }}
          onClick={handleOpen}
        >
          <p className="text-base font-bold text-[#4CAF50] truncate">💬 {toast.displayName}</p>
          <p className="text-lg truncate mt-1">{toast.message}</p>
        </div>
      )}

      {/* ── Draggable floating button ──────────────────────────────────────── */}
      {!isOpen && (
        <button
          onPointerDown={handleBtnPointerDown}
          onPointerMove={handleBtnPointerMove}
          onPointerUp={handleBtnPointerUp}
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

      {/* ── Chat panel ────────────────────────────────────────────────────── */}
      {isOpen && (
        <>
          {/* Backdrop (click to close) */}
          <div className="fixed inset-0 z-50 bg-black/50" onClick={handleClose} />

          {/* Panel — left/top absolutely positioned, clamped above keyboard */}
          <div
            className="fixed z-[55] flex flex-col bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
            style={{
              left: panelPos.x,
              top: effectivePanelTop,
              width: Math.min(PANEL_W, window.innerWidth - 32),
              height: PANEL_H,
            }}
          >
            {/* Header — drag handle */}
            <div
              className="flex items-center justify-between px-5 py-3 border-b border-gray-700 flex-shrink-0 cursor-move select-none"
              onPointerDown={handleHeaderPointerDown}
              onPointerMove={handleHeaderPointerMove}
              onPointerUp={handleHeaderPointerUp}
            >
              <div className="flex items-center gap-2 pointer-events-none">
                <span className="text-xl">💬</span>
                <span className="text-white font-bold text-lg">Chat</span>
                <span className="text-gray-500 text-xs ml-1 hidden sm:inline">drag to move</span>
              </div>
              {/* Close button needs pointer-events so it works despite cursor-move on parent */}
              <button
                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="text-gray-400 hover:text-white w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-700 transition-colors text-xl pointer-events-auto"
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
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
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
