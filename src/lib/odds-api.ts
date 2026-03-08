// ============================================
// DIALOX VIP - The Odds API Service
// https://the-odds-api.com
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

const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';
const API_KEY = process.env.THE_ODDS_API_KEY;

// Sport mappings
export const SPORT_KEYS = {
  soccer: [
    'soccer_epl',           // Premier League
    'soccer_germany_bundesliga',
    'soccer_italy_serie_a',
    'soccer_spain_la_liga',
    'soccer_france_ligue_one',
    'soccer_champions_league',
    'soccer_uefa_europa_league',
  ],
  basketball: [
    'basketball_nba',
  ],
  baseball: [
    'baseball_mlb',
  ],
};

// Get odds for a specific sport
export async function fetchOddsForSport(
  sportKey: string,
  regions: string = 'us,eu,uk'
): Promise<OddsAPIMatch[]> {
  if (!API_KEY) {
    console.warn('The Odds API key not configured');
    return [];
  }

  try {
    const url = `${ODDS_API_BASE_URL}/sports/${sportKey}/odds/?apiKey=${API_KEY}&regions=${regions}&markets=h2h,totals,spreads&oddsFormat=decimal`;

    const response = await fetch(url, {
      method: 'GET',
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      console.error(`Odds API error for ${sportKey}: ${response.status}`);
      return [];
    }

    const data: OddsAPIMatch[] = await response.json();
    return data;
    
  } catch (error) {
    console.error(`Error fetching odds for ${sportKey}:`, error);
    return [];
  }
}

// Get all available sports
export async function fetchAvailableSports(): Promise<{ key: string; title: string }[]> {
  if (!API_KEY) {
    return [];
  }

  try {
    const url = `${ODDS_API_BASE_URL}/sports/?apiKey=${API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.map((sport: { key: string; title: string }) => ({
      key: sport.key,
      title: sport.title,
    }));
    
  } catch (error) {
    console.error('Error fetching available sports:', error);
    return [];
  }
}

// Extract best odds from bookmakers
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

  // Fallback if no odds found
  if (bestHome === 0) bestHome = 1.85;
  if (bestAway === 0) bestAway = 1.85;

  return {
    home: bestHome,
    draw: bestDraw > 0 ? bestDraw : null,
    away: bestAway,
    timestamp: lastUpdate,
  };
}

// Transform Odds API match to our format
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
  
  // Determine if live (commence_time in the past)
  const commenceTime = new Date(match.commence_time).getTime();
  const isLive = commenceTime < Date.now() && commenceTime > Date.now() - 3 * 60 * 60 * 1000; // Within last 3 hours

  // Extract league name from sport_title
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

// Fetch all odds for configured sports
export async function fetchAllOdds(): Promise<OddsAPIMatch[]> {
  const allMatches: OddsAPIMatch[] = [];
  
  // Fetch for each sport category
  for (const soccerKey of SPORT_KEYS.soccer.slice(0, 3)) { // Limit to 3 soccer leagues
    const matches = await fetchOddsForSport(soccerKey);
    allMatches.push(...matches);
  }
  
  for (const basketballKey of SPORT_KEYS.basketball) {
    const matches = await fetchOddsForSport(basketballKey);
    allMatches.push(...matches);
  }
  
  for (const baseballKey of SPORT_KEYS.baseball) {
    const matches = await fetchOddsForSport(baseballKey);
    allMatches.push(...matches);
  }

  return allMatches;
}
