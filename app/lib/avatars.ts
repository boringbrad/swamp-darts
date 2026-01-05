/**
 * Stock avatar system
 * Initially using emoji/text placeholders
 * Can be replaced with actual images later
 */

export interface StockAvatar {
  id: string;
  emoji?: string;
  color: string;
  label: string;
}

export const STOCK_AVATARS: StockAvatar[] = [
  { id: 'avatar-1', emoji: '👑', color: '#FFD700', label: 'Crown' },
  { id: 'avatar-2', emoji: '🌹', color: '#FF1493', label: 'Rose' },
  { id: 'avatar-3', emoji: '🔥', color: '#FF4500', label: 'Fire' },
  { id: 'avatar-4', emoji: '⚡', color: '#FFD700', label: 'Lightning' },
  { id: 'avatar-5', emoji: '🎯', color: '#FF0000', label: 'Dart' },
  { id: 'avatar-6', emoji: '🏆', color: '#FFD700', label: 'Trophy' },
  { id: 'avatar-7', emoji: '🎮', color: '#9370DB', label: 'Game' },
  { id: 'avatar-8', emoji: '🚀', color: '#1E90FF', label: 'Rocket' },
  { id: 'avatar-9', emoji: '💎', color: '#00CED1', label: 'Diamond' },
  { id: 'avatar-10', emoji: '⭐', color: '#FFD700', label: 'Star' },
  { id: 'avatar-11', emoji: '🎸', color: '#8B4513', label: 'Guitar' },
  { id: 'avatar-12', emoji: '🎪', color: '#FF69B4', label: 'Circus' },
];

export function getAvatarById(id: string): StockAvatar | undefined {
  return STOCK_AVATARS.find(a => a.id === id);
}

export function getDefaultAvatar(): StockAvatar {
  return STOCK_AVATARS[0];
}
