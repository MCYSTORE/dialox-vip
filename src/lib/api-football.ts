// ============================================
// DIALOX VIP - API Football Service
// https://api-football-v1.p.rapidapi.com
// ============================================

interface APIFootballFixture {
  fixture: {
    id: number;
    referee: string;
    timezone: string;
    date: string;
    timestamp: number;
    periods: {
      first: number;
      second: number;
    };
    venue: {
      id: number;
      name: string;
      city: string;
    };
    status: {
      long: string;
      short: string;
      elapsed: number;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    round: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime: {
      home: number | null;
      away: number | null;
    };
    fulltime: {
      home: number | null;
      away: number | null;
    };
    extratime: {
      home: number | null;
      away: number | null;
    };
    penalty: {
      home: number | null;
      away: number | null;
    };
  };
}

interface APIFootballResponse {
  response: APIFootballFixture[];
  results: number;
  paging: {
    current: number;
    total: number;
  };
}

const API_FOOTBALL_BASE_URL = 'https://api-football-v1.p.rapidapi.com/v3';
const API_KEY = process.env.API_FOOTBALL_KEY;

// League IDs for major competitions
const LEAGUE_IDS = {
  // Soccer
  'La Liga': 140,
  'Premier League': 39,
  'Serie A': 135,
  'Bundesliga': 78,
  'Ligue 1': 61,
  'Champions League': 2,
};

// Status mapping
const STATUS_MAP: Record<string, string> = {
  'NS': 'scheduled',     // Not Started
  '1H': 'live',          // First Half
  'HT': 'live',          // Half Time
  '2H': 'live',          // Second Half
  'ET': 'live',          // Extra Time
  'P': 'live',           // Penalty In Progress
  'FT': 'finished',      // Match Finished
  'AET': 'finished',     // Match Finished After Extra Time
  'PEN': 'finished',     // Match Finished After Penalty
  'PST': 'postponed',    // Postponed
  'CANC': 'cancelled',   // Cancelled
  'SUSP': 'live',        // Suspended
  'INT': 'live',         // Interrupted
  'BD': 'postponed',     // Blocked by Dome
  'WO': 'finished',      // WalkOver
  'AW': 'finished',      // Abandoned
};

export async function fetchFootballFixtures(
  date?: string,
  live: boolean = false
): Promise<APIFootballFixture[]> {
  if (!API_KEY) {
    console.warn('API Football key not configured');
    return [];
  }

  try {
    const today = date || new Date().toISOString().split('T')[0];
    
    let url: string;
    if (live) {
      url = `${API_FOOTBALL_BASE_URL}/fixtures?live=all`;
    } else {
      url = `${API_FOOTBALL_BASE_URL}/fixtures?date=${today}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      console.error(`API Football error: ${response.status}`);
      return [];
    }

    const data: APIFootballResponse = await response.json();
    
    // Filter for major leagues only
    const majorLeagueIds = Object.values(LEAGUE_IDS);
    return data.response.filter(fixture => 
      majorLeagueIds.includes(fixture.league.id)
    );
    
  } catch (error) {
    console.error('Error fetching football fixtures:', error);
    return [];
  }
}

export function transformFootballFixture(fixture: APIFootballFixture): {
  id: string;
  homeTeam: { id: string; name: string; shortName: string };
  awayTeam: { id: string; name: string; shortName: string };
  league: { id: string; name: string; shortName: string; country: string; sport: 'soccer' };
  startTime: string;
  status: string;
  score?: { home: number; away: number };
  isLive: boolean;
} {
  const isLive = ['1H', 'HT', '2H', 'ET', 'P', 'SUSP', 'INT'].includes(fixture.fixture.status.short);
  
  return {
    id: `football-${fixture.fixture.id}`,
    homeTeam: {
      id: `team-${fixture.teams.home.id}`,
      name: fixture.teams.home.name,
      shortName: fixture.teams.home.name.substring(0, 3).toUpperCase(),
    },
    awayTeam: {
      id: `team-${fixture.teams.away.id}`,
      name: fixture.teams.away.name,
      shortName: fixture.teams.away.name.substring(0, 3).toUpperCase(),
    },
    league: {
      id: `league-${fixture.league.id}`,
      name: fixture.league.name,
      shortName: fixture.league.name,
      country: fixture.league.country,
      sport: 'soccer',
    },
    startTime: new Date(fixture.fixture.timestamp * 1000).toISOString(),
    status: STATUS_MAP[fixture.fixture.status.short] || 'scheduled',
    score: fixture.goals.home !== null && fixture.goals.away !== null ? {
      home: fixture.goals.home,
      away: fixture.goals.away,
    } : undefined,
    isLive,
  };
}
