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
  { id: 'avatar-3', emoji: '🔥', color: '#FF4500', label: 'Fire' },
  { id: 'avatar-5', emoji: '🎯', color: '#FF0000', label: 'Dart' },
  { id: 'avatar-6', emoji: '🏆', color: '#FFD700', label: 'Trophy' },
  { id: 'avatar-8', emoji: '🚀', color: '#1E90FF', label: 'Rocket' },
  { id: 'avatar-10', emoji: '⭐', color: '#FFD700', label: 'Star' },
];

export function getAvatarById(id: string): StockAvatar | undefined {
  return STOCK_AVATARS.find(a => a.id === id);
}

export function getDefaultAvatar(): StockAvatar {
  return STOCK_AVATARS[0];
}
