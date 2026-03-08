// ============================================
// DIALOX VIP - The Odds API Service
// Optimizado para minimizar consumo de créditos
// https://the-odds-api.com
// ============================================

import { CACHE_TTL, API_LIMITS } from './types';

// ============================================
// TYPES
// ============================================
interface OddsAPIOutcome {
  name: string;
  price: number;
  point?: number;
}

interface OddsAPIMarket {
  key: string;
  last_update: string;
  outcomes: OddsAPIOutcome[];
}

interface OddsAPIBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: OddsAPIMarket[];
}

export interface OddsAPIMatch {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsAPIBookmaker[];
}

interface OddsAPIResponse {
  data?: OddsAPIMatch[];
  error?: string;
}

// ============================================
// IN-MEMORY CACHE (Server-side)
// ============================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const scheduleCache = new Map<string, CacheEntry<OddsAPIMatch[]>>();
const oddsCache = new Map<string, CacheEntry<OddsAPIMatch>>();

// Contador de API calls (server-side)
let apiCallCounter = {
  date: new Date().toISOString().split('T')[0],
  count: 0,
};

function resetCounterIfNewDay(): void {
  const today = new Date().toISOString().split('T')[0];
  if (apiCallCounter.date !== today) {
    apiCallCounter = { date: today, count: 0 };
    console.log('[ODDS-API] Contador reseteado para nuevo día');
  }
}

function canMakeAPICall(): boolean {
  resetCounterIfNewDay();
  return apiCallCounter.count < API_LIMITS.DAILY_MAX;
}

function incrementAPICounter(): void {
  resetCounterIfNewDay();
  apiCallCounter.count++;
  console.log(`[ODDS-API] Llamada #${apiCallCounter.count} de ${API_LIMITS.DAILY_MAX} hoy`);
}

export function getAPICounterStatus(): { count: number; max: number; remaining: number } {
  resetCounterIfNewDay();
  return {
    count: apiCallCounter.count,
    max: API_LIMITS.DAILY_MAX,
    remaining: Math.max(0, API_LIMITS.DAILY_MAX - apiCallCounter.count),
  };
}

// ============================================
// CONFIGURATION
// ============================================
const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';
const API_KEY = process.env.THE_ODDS_API_KEY;

// Sport mappings - Solo ligas principales para reducir llamadas
export const SPORT_KEYS = {
  soccer: [
    'soccer_epl',           // Premier League
    'soccer_germany_bundesliga',
    'soccer_italy_serie_a',
    'soccer_spain_la_liga',
    'soccer_france_ligue_one',
  ],
  basketball: [
    'basketball_nba',
  ],
  baseball: [
    'baseball_mlb',
  ],
};

// ============================================
// NIVEL 1: OBTENER EVENTOS SIN CUOTAS DETALLADAS
// Para la cartelera general - usa endpoint de eventos
// ============================================
export async function fetchScheduleOnly(
  sportKey: string
): Promise<OddsAPIMatch[]> {
  if (!API_KEY) {
    console.warn('[ODDS-API] API key no configurada');
    return [];
  }

  // Verificar caché primero
  const cacheKey = `schedule_${sportKey}`;
  const cached = scheduleCache.get(cacheKey);
  if (cached && Date.now() < cached.timestamp + cached.ttl) {
    console.log(`[ODDS-API] Usando caché de schedule para ${sportKey}`);
    return cached.data;
  }

  // Verificar límite diario
  if (!canMakeAPICall()) {
    console.warn('[ODDS-API] Límite diario alcanzado, usando caché expirado si existe');
    if (cached) return cached.data;
    return [];
  }

  try {
    incrementAPICounter();
    
    // Endpoint de eventos sin mercados detallados - más ligero
    // Solo pedimos h2h para tener cuotas básicas
    const url = `${ODDS_API_BASE_URL}/sports/${sportKey}/odds/?apiKey=${API_KEY}&regions=us,eu&markets=h2h&oddsFormat=decimal`;

    console.log(`[ODDS-API] Fetching schedule for ${sportKey}...`);
    
    const response = await fetch(url, {
      method: 'GET',
      next: { revalidate: 3600 }, // Cache Next.js por 1 hora
    });

    if (!response.ok) {
      console.error(`[ODDS-API] Error ${response.status} para ${sportKey}`);
      return cached?.data || [];
    }

    const data: OddsAPIMatch[] = await response.json();
    
    // Guardar en caché
    scheduleCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: CACHE_TTL.SCHEDULE, // 60 minutos
    });
    
    console.log(`[ODDS-API] ✓ ${data.length} eventos obtenidos para ${sportKey}`);
    return data;
    
  } catch (error) {
    console.error(`[ODDS-API] Error fetching schedule for ${sportKey}:`, error);
    return cached?.data || [];
  }
}

// ============================================
// NIVEL 2: OBTENER CUOTAS DETALLADAS PARA PARTIDO ESPECÍFICO
// Solo se llama cuando se va a analizar un partido
// ============================================
export async function fetchDetailedOdds(
  sportKey: string,
  matchId: string
): Promise<OddsAPIMatch | null> {
  if (!API_KEY) {
    console.warn('[ODDS-API] API key no configurada');
    return null;
  }

  // Verificar caché primero
  const cacheKey = `odds_${matchId}`;
  const cached = oddsCache.get(cacheKey);
  if (cached && Date.now() < cached.timestamp + cached.ttl) {
    console.log(`[ODDS-API] Usando caché de cuotas para ${matchId}`);
    return cached.data;
  }

  // Verificar límite diario
  if (!canMakeAPICall()) {
    console.warn('[ODDS-API] Límite diario alcanzado, usando caché expirado si existe');
    if (cached) return cached.data;
    return null;
  }

  try {
    incrementAPICounter();
    
    // Endpoint con mercados completos
    const url = `${ODDS_API_BASE_URL}/sports/${sportKey}/odds/?apiKey=${API_KEY}&regions=us,eu,uk&markets=h2h,totals,spreads&oddsFormat=decimal&eventIds=${matchId}`;

    console.log(`[ODDS-API] Fetching detailed odds for ${matchId}...`);
    
    const response = await fetch(url, {
      method: 'GET',
      next: { revalidate: 1800 }, // Cache Next.js por 30 min
    });

    if (!response.ok) {
      console.error(`[ODDS-API] Error ${response.status} obteniendo cuotas para ${matchId}`);
      return cached?.data || null;
    }

    const data: OddsAPIMatch[] = await response.json();
    
    if (data && data.length > 0) {
      const match = data[0];
      
      // Guardar en caché
      oddsCache.set(cacheKey, {
        data: match,
        timestamp: Date.now(),
        ttl: CACHE_TTL.ODDS, // 30 minutos
      });
      
      console.log(`[ODDS-API] ✓ Cuotas detalladas obtenidas para ${matchId}`);
      return match;
    }
    
    return null;
    
  } catch (error) {
    console.error(`[ODDS-API] Error fetching detailed odds:`, error);
    return cached?.data || null;
  }
}

// ============================================
// NIVEL 3: OBTENER CUOTAS PARA TOP 3 PARTIDOS
// Llamada optimizada para Triple Corona
// ============================================
export async function fetchOddsForTop3(
  sportKey: string,
  matchIds: string[]
): Promise<Map<string, OddsAPIMatch>> {
  const results = new Map<string, OddsAPIMatch>();
  
  // Verificar cuáles ya están en caché
  const needsFetch: string[] = [];
  
  for (const matchId of matchIds) {
    const cacheKey = `odds_${matchId}`;
    const cached = oddsCache.get(cacheKey);
    
    if (cached && Date.now() < cached.timestamp + cached.ttl) {
      console.log(`[ODDS-API] Usando caché para Top3: ${matchId}`);
      results.set(matchId, cached.data);
    } else {
      needsFetch.push(matchId);
    }
  }
  
  // Si todos están en caché, retornar
  if (needsFetch.length === 0) {
    console.log('[ODDS-API] ✓ Todos los Top3 en caché');
    return results;
  }
  
  // Verificar límite antes de hacer llamadas
  if (!canMakeAPICall()) {
    console.warn('[ODDS-API] Límite diario alcanzado');
    // Usar caché expirado si existe
    for (const matchId of needsFetch) {
      const cached = oddsCache.get(`odds_${matchId}`);
      if (cached) results.set(matchId, cached.data);
    }
    return results;
  }
  
  // Hacer una sola llamada con todos los eventIds
  if (needsFetch.length > 0 && API_KEY) {
    try {
      incrementAPICounter();
      
      const url = `${ODDS_API_BASE_URL}/sports/${sportKey}/odds/?apiKey=${API_KEY}&regions=us,eu,uk&markets=h2h,totals,spreads&oddsFormat=decimal&eventIds=${needsFetch.join(',')}`;
      
      console.log(`[ODDS-API] Fetching odds for ${needsFetch.length} Top3 matches...`);
      
      const response = await fetch(url, {
        method: 'GET',
        next: { revalidate: 1800 },
      });
      
      if (response.ok) {
        const data: OddsAPIMatch[] = await response.json();
        
        for (const match of data) {
          results.set(match.id, match);
          
          // Guardar en caché
          oddsCache.set(`odds_${match.id}`, {
            data: match,
            timestamp: Date.now(),
            ttl: CACHE_TTL.ODDS,
          });
        }
        
        console.log(`[ODDS-API] ✓ ${data.length} partidos actualizados`);
      }
    } catch (error) {
      console.error('[ODDS-API] Error fetching Top3 odds:', error);
    }
  }
  
  return results;
}

// ============================================
// LEGACY: FETCH ALL ODDS (compatibilidad)
// Solo usar cuando sea estrictamente necesario
// ============================================
export async function fetchOddsForSport(
  sportKey: string,
  regions: string = 'us,eu'
): Promise<OddsAPIMatch[]> {
  // Usar el nuevo sistema de schedule
  return fetchScheduleOnly(sportKey);
}

// ============================================
// FETCH ALL ODDS
// ============================================
export async function fetchAllOdds(): Promise<OddsAPIMatch[]> {
  const allMatches: OddsAPIMatch[] = [];
  
  // Solo fetch de schedule básico, no cuotas detalladas
  // Limitar a 2 ligas de soccer para reducir consumo
  const soccerKeys = SPORT_KEYS.soccer.slice(0, 2);
  
  for (const sportKey of soccerKeys) {
    const matches = await fetchScheduleOnly(sportKey);
    allMatches.push(...matches);
  }
  
  for (const basketballKey of SPORT_KEYS.basketball) {
    const matches = await fetchScheduleOnly(basketballKey);
    allMatches.push(...matches);
  }
  
  for (const baseballKey of SPORT_KEYS.baseball) {
    const matches = await fetchScheduleOnly(baseballKey);
    allMatches.push(...matches);
  }

  return allMatches;
}

// ============================================
// GET AVAILABLE SPORTS
// ============================================
export async function fetchAvailableSports(): Promise<{ key: string; title: string }[]> {
  if (!API_KEY) {
    return [];
  }

  // Esta llamada no consume créditos significativos
  try {
    const url = `${ODDS_API_BASE_URL}/sports/?apiKey=${API_KEY}`;
    const response = await fetch(url, { next: { revalidate: 86400 } }); // Cache 24h
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.map((sport: { key: string; title: string }) => ({
      key: sport.key,
      title: sport.title,
    }));
    
  } catch (error) {
    console.error('[ODDS-API] Error fetching available sports:', error);
    return [];
  }
}

// ============================================
// EXTRACT BEST ODDS
// ============================================
export function extractBestOdds(match: OddsAPIMatch): {
  home: number;
  draw: number | null;
  away: number;
  timestamp: number;
} {
  let bestHome = 0;
  let bestDraw = 0;
  let bestAway = 0;
  let lastUpdate = Date.now();

  if (!match.bookmakers || match.bookmakers.length === 0) {
    return { home: 0, draw: null, away: 0, timestamp: lastUpdate };
  }

  for (const bookmaker of match.bookmakers) {
    const h2hMarket = bookmaker.markets.find(m => m.key === 'h2h');
    
    if (h2hMarket) {
      for (const outcome of h2hMarket.outcomes) {
        if (outcome.name === match.home_team && outcome.price > bestHome) {
          bestHome = outcome.price;
        } else if (outcome.name === match.away_team && outcome.price > bestAway) {
          bestAway = outcome.price;
        } else if (outcome.name === 'Draw' && outcome.price > bestDraw) {
          bestDraw = outcome.price;
        }
      }
    }

    const updateTime = new Date(bookmaker.last_update).getTime();
    if (updateTime < lastUpdate) {
      lastUpdate = updateTime;
    }
  }

  // Fallback si no hay cuotas
  if (bestHome === 0) bestHome = 1.85;
  if (bestAway === 0) bestAway = 1.85;

  return {
    home: bestHome,
    draw: bestDraw > 0 ? bestDraw : null,
    away: bestAway,
    timestamp: lastUpdate,
  };
}

// ============================================
// TRANSFORM ODDS MATCH
// ============================================
export function transformOddsMatch(
  match: OddsAPIMatch,
  sport: 'soccer' | 'basketball' | 'baseball'
): {
  id: string;
  homeTeam: { id: string; name: string; shortName: string };
  awayTeam: { id: string; name: string; shortName: string };
  league: { id: string; name: string; shortName: string; country: string; sport: 'soccer' | 'basketball' | 'baseball' };
  startTime: string;
  status: string;
  odds: { home: number; draw: number | null; away: number; timestamp: number };
  isLive: boolean;
} {
  const odds = extractBestOdds(match);
  
  const commenceTime = new Date(match.commence_time).getTime();
  const isLive = commenceTime < Date.now() && commenceTime > Date.now() - 3 * 60 * 60 * 1000;

  const leagueName = match.sport_title || 'Unknown League';

  return {
    id: `odds-${match.id}`,
    homeTeam: {
      id: `team-${match.home_team.toLowerCase().replace(/\s+/g, '-')}`,
      name: match.home_team,
      shortName: match.home_team.substring(0, 3).toUpperCase(),
    },
    awayTeam: {
      id: `team-${match.away_team.toLowerCase().replace(/\s+/g, '-')}`,
      name: match.away_team,
      shortName: match.away_team.substring(0, 3).toUpperCase(),
    },
    league: {
      id: match.sport_key,
      name: leagueName,
      shortName: leagueName,
      country: 'International',
      sport,
    },
    startTime: match.commence_time,
    status: isLive ? 'live' : 'scheduled',
    odds,
    isLive,
  };
}

// ============================================
// EXPORT HELPERS FOR EXTERNAL USE
// ============================================
export { canMakeAPICall };
