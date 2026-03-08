import { NextResponse } from 'next/server';
import { getMatches } from '@/lib/matches-service';
import { Match, CacheEntry, Sport } from '@/lib/types';

// ============================================
// DIALOX VIP - Matches API
// Uses real APIs with fallback to mock data
// ============================================

// Simple in-memory cache for server-side
const serverCache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 60 * 1000; // 1 minute server cache

function getCached<T>(key: string): T | null {
  const entry = serverCache.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() < entry.timestamp + entry.ttl) {
    return entry.data;
  }
  serverCache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T, ttl = CACHE_TTL): void {
  serverCache.set(key, { data, timestamp: Date.now(), ttl });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase() || '';
  const sport = searchParams.get('sport') as Sport | 'all' | null;
  
  // Check server cache first
  const cacheKey = `matches-${query}-${sport || 'all'}`;
  const cached = getCached<{ matches: Match[]; source: string }>(cacheKey);
  
  if (cached) {
    return NextResponse.json({
      success: true,
      data: cached.matches,
      source: 'cached',
      cached: true,
      timestamp: new Date().toISOString(),
    });
  }
  
  try {
    // Fetch from unified service (real APIs + fallback)
    const result = await getMatches(sport || 'all', query);
    
    // Set cache
    setCache(cacheKey, result);
    
    return NextResponse.json({
      success: true,
      data: result.matches,
      source: result.source,
      cached: false,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Error fetching matches:', error);
    
    return NextResponse.json({
      success: false,
      error: 'No pudimos obtener los mercados. Intenta de nuevo.',
      data: [],
    }, { status: 500 });
  }
}
