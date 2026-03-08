import { NextResponse } from 'next/server';
import { matches as mockMatches, generateAnalysis } from '@/lib/data';
import { runAnalysisPipeline } from '@/lib/openrouter-service';
import { Analysis, Match, CacheEntry } from '@/lib/types';

// ============================================
// DIALOX VIP - Analyze API
// Pipeline: Perplexity (búsqueda) + DeepSeek R1 (análisis)
// ============================================

// Simple in-memory cache for analysis results
const analysisCache = new Map<string, CacheEntry<Analysis>>();
const ANALYSIS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
      return NextResponse.json({
        success: true,
        data: cached,
        cached: true,
        source: 'cache',
      });
    }
    
    // Run the full AI pipeline (Perplexity + DeepSeek R1)
    console.log('[ANALYZE] Starting pipeline for match:', match.id);
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
    
    console.log('[ANALYZE] Pipeline completed. Source:', pipelineResult.source);
    console.log('[ANALYZE] Raw analysis length:', pipelineResult.analysis.length);
    console.log('[ANALYZE] Raw analysis preview:', pipelineResult.analysis.substring(0, 200));
    
    // Parse the analysis JSON
    let analysisResult: Analysis;
    
    try {
      const parsedAnalysis = JSON.parse(pipelineResult.analysis);
      console.log('[ANALYZE] JSON parsed successfully');
      
      // Transform to our Analysis type
      analysisResult = {
        id: `analysis-${match.id}`,
        matchId: match.id,
        timestamp: new Date().toISOString(),
        deporte: parsedAnalysis.deporte || match.league.sport,
        equipos: parsedAnalysis.equipos || `${match.homeTeam.name} vs ${match.awayTeam.name}`,
        favorito_ganar: parsedAnalysis.favorito_ganar || null,
        marcador_estimado: parsedAnalysis.marcador_estimado || 'N/A',
        jugada_principal: parsedAnalysis.jugada_principal || {
          mercado: 'Victoria Local',
          cuota: match.odds.home,
          confianza: 50,
          justificacion: 'Análisis no disponible',
        },
        mercados_especificos: parsedAnalysis.mercados_especificos || {
          ambos_anotan: { valor: null, confianza: 0 },
          corners_prevision: { valor: null, confianza: 0 },
          valor_extra_basket_baseball: { mercado: null, valor: null, confianza: 0 },
        },
        analisis_vip: parsedAnalysis.analisis_vip || 'Análisis no disponible',
      };
    } catch (parseError) {
      console.error('[ANALYZE] JSON parse error:', parseError);
      console.error('[ANALYZE] Failed to parse:', pipelineResult.analysis.substring(0, 500));
      
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
    console.error('Analysis error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error al procesar el análisis. Intenta de nuevo.',
    }, { status: 500 });
  }
}
