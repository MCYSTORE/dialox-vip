import { NextResponse } from 'next/server';
import { matches as mockMatches, generateAnalysis } from '@/lib/data';
import { runAnalysisPipeline } from '@/lib/openrouter-service';
import { Analysis, Match, CacheEntry, EdgeDetectado, MercadosEspecificos } from '@/lib/types';

// ============================================
// DIALOX VIP - Analyze API
// Pipeline: Serper (búsqueda) + Trinity + DeepSeek V3.2
// ============================================

// Simple in-memory cache for analysis results
const analysisCache = new Map<string, CacheEntry<Analysis>>();
const ANALYSIS_CACHE_TTL = 45 * 60 * 1000; // 45 minutos

function getCached(key: string): Analysis | null {
  const entry = analysisCache.get(key);
  if (entry && Date.now() < entry.timestamp + entry.ttl) {
    return entry.data;
  }
  analysisCache.delete(key);
  return null;
}

function setCache(key: string, data: Analysis, ttl = ANALYSIS_CACHE_TTL): void {
  analysisCache.set(key, { data, timestamp: Date.now(), ttl });
}

// Find match from mock data
function findMatch(matchId: string): Match | null {
  return mockMatches.find((m: Match) => m.id === matchId) || null;
}

// Parse confidence to ensure it's 1-10
function parseConfidence(value: unknown): number {
  if (typeof value === 'number') {
    // Si es mayor a 10, asumimos que es porcentaje y convertimos
    if (value > 10) {
      return Math.min(Math.max(Math.round(value / 10), 1), 10);
    }
    return Math.min(Math.max(Math.round(value), 1), 10);
  }
  return 5; // Default
}

// Parse edge detection
function parseEdgeDetectado(data: unknown): EdgeDetectado {
  if (!data || typeof data !== 'object') {
    return { mercado: null, prob_implicita: null, prob_estimada: null, edge_pct: null };
  }
  
  const edge = data as Record<string, unknown>;
  return {
    mercado: typeof edge.mercado === 'string' ? edge.mercado : null,
    prob_implicita: typeof edge.prob_implicita === 'number' ? edge.prob_implicita : null,
    prob_estimada: typeof edge.prob_estimada === 'number' ? edge.prob_estimada : null,
    edge_pct: typeof edge.edge_pct === 'number' ? edge.edge_pct : null,
  };
}

// Parse mercados específicos
function parseMercadosEspecificos(data: unknown, sport: string): MercadosEspecificos {
  const defaultResult: MercadosEspecificos = {
    ambos_anotan: { valor: null, confianza: 0 },
    corners_prevision: { valor: null, confianza: 0 },
    valor_extra: { mercado: null, valor: null, confianza: 0 },
  };

  if (!data || typeof data !== 'object') {
    return defaultResult;
  }

  const mercados = data as Record<string, unknown>;

  // Parse ambos_anotan
  if (mercados.ambos_anotan && typeof mercados.ambos_anotan === 'object') {
    const aa = mercados.ambos_anotan as Record<string, unknown>;
    defaultResult.ambos_anotan = {
      valor: typeof aa.valor === 'string' ? aa.valor : null,
      confianza: parseConfidence(aa.confianza),
    };
  }

  // Parse corners_prevision
  if (mercados.corners_prevision && typeof mercados.corners_prevision === 'object') {
    const cp = mercados.corners_prevision as Record<string, unknown>;
    defaultResult.corners_prevision = {
      valor: typeof cp.valor === 'string' ? cp.valor : null,
      confianza: parseConfidence(cp.confianza),
    };
  }

  // Parse valor_extra (nuevo campo unificado)
  if (mercados.valor_extra && typeof mercados.valor_extra === 'object') {
    const ve = mercados.valor_extra as Record<string, unknown>;
    defaultResult.valor_extra = {
      mercado: typeof ve.mercado === 'string' ? ve.mercado : null,
      valor: typeof ve.valor === 'string' ? ve.valor : null,
      confianza: parseConfidence(ve.confianza),
    };
  }
  
  // Fallback: valor_extra_basket_baseball (compatibilidad)
  if (!defaultResult.valor_extra.mercado && 
      mercados.valor_extra_basket_baseball && typeof mercados.valor_extra_basket_baseball === 'object') {
    const vbb = mercados.valor_extra_basket_baseball as Record<string, unknown>;
    defaultResult.valor_extra = {
      mercado: typeof vbb.mercado === 'string' ? vbb.mercado : null,
      valor: typeof vbb.valor === 'string' ? vbb.valor : null,
      confianza: parseConfidence(vbb.confianza),
    };
  }

  return defaultResult;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { matchId, matchData } = body;
    
    // Get match data - either from request or from mock
    let match: Match | null = null;
    
    if (matchData) {
      match = matchData as Match;
    } else if (matchId) {
      match = findMatch(matchId);
    }
    
    if (!match) {
      return NextResponse.json({
        success: false,
        error: 'Partido no encontrado.',
      }, { status: 404 });
    }
    
    // Check cache first
    const cacheKey = `analysis-${match.id}`;
    const cached = getCached(cacheKey);
    
    if (cached) {
      console.log('[API] Retornando análisis cacheado');
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
        source: 'cache',
      });
    }
    
    console.log('[API] Iniciando pipeline de análisis para:', match.homeTeam.name, 'vs', match.awayTeam.name);
    
    // Run the full AI pipeline (Serper + Trinity + DeepSeek)
    const pipelineResult = await runAnalysisPipeline({
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      league: match.league.name,
      sport: match.league.sport,
      startTime: match.startTime,
      odds: {
        home: match.odds.home,
        draw: match.odds.draw,
        away: match.odds.away,
      },
    });
    
    // Parse the analysis JSON
    let analysisResult: Analysis;
    
    try {
      const parsedAnalysis = JSON.parse(pipelineResult.analysis);
      
      // Transform to our Analysis type with proper parsing
      analysisResult = {
        id: `analysis-${match.id}`,
        matchId: match.id,
        timestamp: new Date().toISOString(),
        deporte: parsedAnalysis.deporte || match.league.sport,
        equipos: parsedAnalysis.equipos || `${match.homeTeam.name} vs ${match.awayTeam.name}`,
        favorito_ganar: parsedAnalysis.favorito_ganar || null,
        marcador_estimado: parsedAnalysis.marcador_estimado || 'N/A',
        jugada_principal: {
          mercado: parsedAnalysis.jugada_principal?.mercado || 'Victoria Local',
          cuota: parsedAnalysis.jugada_principal?.cuota || match.odds.home,
          confianza: parseConfidence(parsedAnalysis.jugada_principal?.confianza),
          justificacion: parsedAnalysis.jugada_principal?.justificacion || 'Análisis no disponible',
        },
        edge_detectado: parseEdgeDetectado(parsedAnalysis.edge_detectado),
        mercados_especificos: parseMercadosEspecificos(parsedAnalysis.mercados_especificos, match.league.sport),
        analisis_vip: parsedAnalysis.analisis_vip || 'Análisis no disponible',
        contexto: pipelineResult.searchReport || null,
      };
      
      console.log('[API] Análisis parseado correctamente');
      console.log('[API] Confianza:', analysisResult.jugada_principal.confianza, '/10');
      
    } catch (parseError) {
      console.error('[API] Error parsing AI analysis, using fallback:', parseError);
      
      // Fallback to mock analysis
      analysisResult = generateAnalysis(match);
    }
    
    // Cache the result
    setCache(cacheKey, analysisResult);
    
    return NextResponse.json({
      success: true,
      data: analysisResult,
      cached: false,
      source: pipelineResult.source,
      searchReport: pipelineResult.searchReport,
    });
    
  } catch (error) {
    console.error('[API] Analysis error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error al procesar el análisis. Intenta de nuevo.',
    }, { status: 500 });
  }
}
