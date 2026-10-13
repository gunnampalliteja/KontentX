import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatNumber(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export function getAvailabilityColor(availability: string) {
  switch (availability) {
    case 'available': return 'text-emerald-400';
    case 'busy': return 'text-amber-400';
    case 'unavailable': return 'text-red-400';
    default: return 'text-gray-400';
  }
}

export function getAvailabilityBg(availability: string) {
  switch (availability) {
    case 'available': return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
    case 'busy': return 'bg-amber-400/10 text-amber-400 border-amber-400/20';
    case 'unavailable': return 'bg-red-400/10 text-red-400 border-red-400/20';
    default: return 'bg-gray-400/10 text-gray-400 border-gray-400/20';
  }
}

export function getToolCategoryIcon(category: string) {
  const icons: Record<string, string> = {
    image: '🖼️',
    video: '🎬',
    audio: '🎵',
    '3d': '🎲',
    animation: '✨',
    text: '📝',
    other: '🔧',
  };
  return icons[category] || '🔧';
}

export function getRatingStars(rating: number) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return { full, half, empty: 5 - full - (half ? 1 : 0) };
}

export function truncate(str: string, maxLength: number) {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}
