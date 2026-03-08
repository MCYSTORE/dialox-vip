// ============================================
// DIALOX VIP - LocalStorage Utilities
// ============================================

import { Match, HistoryEntry, CacheEntry, STORAGE_KEYS, CACHE_TTL } from './types';

// ============================================
// SAFE LOCAL STORAGE
// ============================================
function isClient(): boolean {
  return typeof window !== 'undefined';
}

function safeGetItem(key: string): string | null {
  if (!isClient()) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    console.warn('localStorage not available');
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  if (!isClient()) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    console.warn('localStorage not available');
    return false;
  }
}

function safeRemoveItem(key: string): boolean {
  if (!isClient()) return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// MATCHES CACHE
// ============================================
export function getCachedMatches(): Match[] | null {
  const cached = safeGetItem(STORAGE_KEYS.MATCHES_CACHE);
  if (!cached) return null;
  
  try {
    const entry: CacheEntry<Match[]> = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now < entry.timestamp + entry.ttl) {
      return entry.data;
    }
    
    // Cache expired, remove it
    safeRemoveItem(STORAGE_KEYS.MATCHES_CACHE);
    return null;
  } catch {
    return null;
  }
}

export function setCachedMatches(matches: Match[]): void {
  const entry: CacheEntry<Match[]> = {
    data: matches,
    timestamp: Date.now(),
    ttl: CACHE_TTL,
  };
  
  safeSetItem(STORAGE_KEYS.MATCHES_CACHE, JSON.stringify(entry));
  safeSetItem(STORAGE_KEYS.LAST_UPDATE, new Date().toISOString());
}

export function clearMatchesCache(): void {
  safeRemoveItem(STORAGE_KEYS.MATCHES_CACHE);
}

// ============================================
// LAST UPDATE
// ============================================
export function getLastUpdate(): string | null {
  return safeGetItem(STORAGE_KEYS.LAST_UPDATE);
}

// ============================================
// HISTORY
// ============================================
export function getHistory(): HistoryEntry[] {
  const stored = safeGetItem(STORAGE_KEYS.HISTORY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored) as HistoryEntry[];
  } catch {
    return [];
  }
}

interface AddToHistoryParams {
  matchId: string;
  equipos: string;
  liga: string;
  deporte: 'soccer' | 'basketball' | 'baseball';
  mercado: string;
  cuota: number;
  confianza: number;
  analisis_vip: string;
}

export function addToHistory(params: AddToHistoryParams): HistoryEntry {
  const history = getHistory();
  
  const entry: HistoryEntry = {
    id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    matchId: params.matchId,
    equipos: params.equipos,
    liga: params.liga,
    deporte: params.deporte,
    mercado: params.mercado,
    cuota: params.cuota,
    confianza: params.confianza,
    timestamp: new Date().toISOString(),
    analisis_vip: params.analisis_vip,
  };
  
  // Add to beginning, keep last 50 entries
  const updated = [entry, ...history].slice(0, 50);
  safeSetItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
  
  return entry;
}

export function clearHistory(): void {
  safeRemoveItem(STORAGE_KEYS.HISTORY);
}

export function removeFromHistory(id: string): void {
  const history = getHistory();
  const updated = history.filter(entry => entry.id !== id);
  safeSetItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
}

// ============================================
// FORMAT UTILITIES
// ============================================
export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Hoy';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Mañana';
  }
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  return formatDate(isoString);
}
