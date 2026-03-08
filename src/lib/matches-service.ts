// ============================================
// DIALOX VIP - Unified Matches Service
// Combines API Football + The Odds API
// with fallback to mock data
// ============================================

import { Match, Sport } from './types';
import { matches as mockMatches } from './data';
import { 
  fetchFootballFixtures, 
  transformFootballFixture,
} from './api-football';
import { 
  fetchAllOdds,
  transformOddsMatch,
  extractBestOdds,
  type OddsAPIMatch,
} from './odds-api';

// ============================================
// MAIN FUNCTION: Get all matches
// ============================================
export async function getMatches(
  sport?: Sport | 'all',
  query?: string
): Promise<{ matches: Match[]; source: 'live' | 'cached' | 'mock' }> {
  try {
    // Try to fetch from real APIs
    const liveMatches = await fetchLiveMatches();
    
    if (liveMatches.length > 0) {
      let filtered = liveMatches;
      
      // Apply sport filter
      if (sport && sport !== 'all') {
        filtered = filtered.filter(m => m.league.sport === sport);
      }
      
      // Apply search filter
      if (query) {
        const q = query.toLowerCase();
        filtered = filtered.filter(m =>
          m.homeTeam.name.toLowerCase().includes(q) ||
          m.awayTeam.name.toLowerCase().includes(q) ||
          m.league.name.toLowerCase().includes(q)
        );
      }
      
      return { matches: filtered, source: 'live' };
    }
  } catch (error) {
    console.error('Error fetching live matches:', error);
  }

  // Fallback to mock data
  let filtered = [...mockMatches];
  
  if (sport && sport !== 'all') {
    filtered = filtered.filter(m => m.league.sport === sport);
  }
  
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(m =>
      m.homeTeam.name.toLowerCase().includes(q) ||
      m.awayTeam.name.toLowerCase().includes(q) ||
      m.league.name.toLowerCase().includes(q)
    );
  }

  return { matches: filtered, source: 'mock' };
}

// ============================================
// FETCH LIVE MATCHES FROM APIS
// ============================================
async function fetchLiveMatches(): Promise<Match[]> {
  const matches: Match[] = [];
  
  // Fetch odds from The Odds API (includes all sports)
  const oddsMatches = await fetchAllOdds();
  
  // Group by sport
  const soccerMatches: OddsAPIMatch[] = [];
  const basketballMatches: OddsAPIMatch[] = [];
  const baseballMatches: OddsAPIMatch[] = [];
  
  for (const match of oddsMatches) {
    if (match.sport_key.includes('soccer')) {
      soccerMatches.push(match);
    } else if (match.sport_key.includes('basketball') || match.sport_key.includes('nba')) {
      basketballMatches.push(match);
    } else if (match.sport_key.includes('baseball') || match.sport_key.includes('mlb')) {
      baseballMatches.push(match);
    }
  }
  
  // Transform soccer matches
  for (const match of soccerMatches) {
    try {
      const transformed = transformOddsMatch(match, 'soccer');
      matches.push(transformed as Match);
    } catch (e) {
      console.error('Error transforming soccer match:', e);
    }
  }
  
  // Transform basketball matches
  for (const match of basketballMatches) {
    try {
      const transformed = transformOddsMatch(match, 'basketball');
      matches.push(transformed as Match);
    } catch (e) {
      console.error('Error transforming basketball match:', e);
    }
  }
  
  // Transform baseball matches
  for (const match of baseballMatches) {
    try {
      const transformed = transformOddsMatch(match, 'baseball');
      matches.push(transformed as Match);
    } catch (e) {
      console.error('Error transforming baseball match:', e);
    }
  }
  
  // Sort: live first, then by time
  matches.sort((a, b) => {
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });
  
  return matches;
}

// ============================================
// ENRICH WITH FOOTBALL DATA (optional)
// ============================================
export async function enrichFootballMatches(baseMatches: Match[]): Promise<Match[]> {
  try {
    // Fetch live fixtures from API Football
    const liveFixtures = await fetchFootballFixtures(undefined, true);
    const todayFixtures = await fetchFootballFixtures();
    
    const allFixtures = [...liveFixtures, ...todayFixtures];
    
    // Create a map for quick lookup by team name
    const enrichedMap = new Map<string, typeof baseMatches[0]>();
    
    for (const match of baseMatches) {
      enrichedMap.set(match.id, match);
    }
    
    // Enrich with fixture data where possible
    for (const fixture of allFixtures) {
      const homeTeam = fixture.teams.home.name;
      const awayTeam = fixture.teams.away.name;
      
      // Find matching match by team names
      const matchingMatch = baseMatches.find(m => 
        m.homeTeam.name.toLowerCase().includes(homeTeam.toLowerCase()) ||
        m.awayTeam.name.toLowerCase().includes(homeTeam.toLowerCase()) ||
        m.homeTeam.name.toLowerCase().includes(awayTeam.toLowerCase()) ||
        m.awayTeam.name.toLowerCase().includes(awayTeam.toLowerCase())
      );
      
      if (matchingMatch) {
        // Update with fixture data
        const transformed = transformFootballFixture(fixture);
        matchingMatch.status = transformed.status;
        matchingMatch.score = transformed.score;
        matchingMatch.isLive = transformed.isLive;
      }
    }
    
    return Array.from(enrichedMap.values());
  } catch (error) {
    console.error('Error enriching football matches:', error);
    return baseMatches;
  }
}
