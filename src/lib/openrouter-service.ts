// ============================================
// DIALOX VIP - AI Analysis Pipeline (FREE MODELS)
// ETAPA 0: Tavily Search (búsqueda contextual profunda)
// ETAPA 1: Trinity Large (estructuración)
// ETAPA 2: Trinity Large (análisis final)
// ============================================

import { Sport } from './types';

// ============================================
// API CONFIGURATION
// ============================================
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TAVILY_API_URL = 'https://api.tavily.com/search';

// Models (FREE via OpenRouter - Working models!)
const STRUCTURE_MODEL = 'arcee-ai/trinity-large-preview:free';
const ANALYSIS_MODEL = 'arcee-ai/trinity-large-preview:free';

// Timeouts (in milliseconds)
const TAVILY_TIMEOUT = 15000;
const API_TIMEOUT = 60000;

// ============================================
// DEBUG: API Keys Status
// ============================================
const getApiKeyStatus = () => {
  const openrouter = process.env.OPENROUTER_API_KEY;
  const tavily = process.env.TAVILY_API_KEY;
  return {
    openrouter: openrouter ? `${openrouter.substring(0, 10)}...` : 'NOT SET',
    tavily: tavily ? `${tavily.substring(0, 10)}...` : 'NOT SET',
  };
};

console.log('[PIPELINE] API Keys status:', getApiKeyStatus());
console.log('[PIPELINE] Models: Trinity Large Preview (FREE)');

// ============================================
// SYSTEM PROMPTS
// ============================================

// System prompt para estructuración
const STRUCTURE_SYSTEM_PROMPT = `Eres un extractor de datos deportivos de élite. Tu función es limpiar, estructurar y resumir información deportiva cruda para análisis cuantitativo. Debes ser preciso, conciso y eliminar todo ruido. Solo incluyes hechos verificables y explícitos. Nunca inventas ni asumes información no presente en el texto recibido.

REGLAS:
1. Extrae solo información explícita y verificable del contexto.
2. Si algo no está mencionado explícitamente, usa null.
3. Calcula probabilidades implícitas usando: 1/cuota * 100.
4. Elimina todo ruido y opiniones subjetivas.
5. Responde SOLO con JSON válido, sin markdown ni explicaciones.`;

// System prompt para análisis final
const ANALYSIS_SYSTEM_PROMPT = `Rol: Eres el Analista Quant Deportivo y Tipster VIP de Élite más preciso del mundo. Operas en la etapa final de un pipeline de IA de tres etapas:
1. Tavily realizó búsquedas web específicas para obtener noticias, lesiones, alineaciones y contexto.
2. Trinity Large estructuró y limpió esa información en un JSON preciso con probabilidades implícitas.
3. Tú realizas el análisis matemático y cuantitativo final usando exclusivamente ese JSON.

MISIÓN:
Detectar la mejor "Value Bet" del partido analizando:
- Las probabilidades implícitas ya calculadas.
- El edge real entre la probabilidad implícita y la probabilidad real estimada según el contexto.
- Los hechos explícitos del reporte estructurado.
- La consistencia entre cuotas y contexto.

METODOLOGÍA DE ANÁLISIS:
1. ANÁLISIS DE CUOTAS:
   - Calcula el margen de la casa (overround).
   - Identifica la probabilidad justa de cada resultado.
   - Detecta si alguna cuota tiene valor positivo comparando con tu estimación de probabilidad real.

2. ANÁLISIS DE CONTEXTO:
   - Evalúa el impacto de lesiones y bajas si están explícitas en el reporte.
   - Considera la forma reciente si está disponible.
   - Pondera hechos relevantes según su impacto.

3. DETECCIÓN DE VALUE BET:
   - Una Value Bet existe cuando la probabilidad estimada > probabilidad implícita de la cuota.
   - Prioriza picks con edge positivo verificable.
   - Si no hay edge claro, recomienda la opción más conservadora y mejor justificada.

4. CÁLCULO DE CONFIANZA:
   - Basa la confianza en la solidez de la evidencia.
   - Penaliza fuertemente si hay poco contexto.
   - No infles la confianza por complacer.

PROHIBICIONES ABSOLUTAS:
1. PROHIBIDO usar conocimiento externo al JSON recibido.
2. PROHIBIDO inventar lesiones, estadísticas, rachas, estilos de juego o cualquier dato no presente explícitamente en el JSON de entrada.
3. PROHIBIDO recomendar cuota que no exista en la sección "cuotas" del JSON recibido.
4. PROHIBIDO inflar confianza sin evidencia sólida.
5. PROHIBIDO usar markdown, bloques de código o texto fuera del JSON de respuesta.

REGLAS DE CONFIANZA (entero 1-10):
- 1 a 3: contexto_disponible false o datos mínimos
- 4 a 5: solo cuotas disponibles, sin contexto sólido
- 6 a 7: cuotas + algunos hechos relevantes
- 8: cuotas + contexto completo + edge claro
- 9: cuotas + contexto sólido + edge muy claro + consistencia alta
- 10: reservado para evidencia excepcional

REGLAS POR DEPORTE:
1. SOCCER:
   - Analiza los tres resultados: local, empate, visitante.
   - Evalúa ambos_anotan solo si hay contexto ofensivo explícito.
   - Considera el margen del favorito vs cuota de empate.

2. BASKETBALL:
   - Enfócate en Total Points y Hándicap si disponibles.
   - El impacto de bajas de estrellas es alto: si están explícitas, pénalizalas bien.

3. BASEBALL:
   - Pitcher abridor es el factor más importante.
   - Si no hay info de pitcher, baja la confianza.
   - Run Line y Total Runs son los mercados principales.

REGLAS DE SALIDA:
1. Responde EXCLUSIVAMENTE con JSON válido.
2. Empieza con { y termina con }.
3. Sin texto antes ni después del JSON.
4. Sin markdown ni bloques de código.
5. Comillas dobles en todas las claves y strings.

ESQUEMA JSON OBLIGATORIO:
{
  "deporte": "soccer | basketball | baseball",
  "equipos": "Local vs Visitante",
  "favorito_ganar": "nombre del favorito o null",
  "marcador_estimado": "resultado estimado plausible",
  "edge_detectado": {
    "mercado": "mercado con mayor edge o null",
    "prob_implicita": 0.00,
    "prob_estimada": 0.00,
    "edge_pct": 0.00
  },
  "jugada_principal": {
    "mercado": "nombre exacto del mercado recomendado",
    "cuota": 0.00,
    "confianza": 0,
    "justificacion": "razón directa conectando cuota, probabilidad implícita y contexto"
  },
  "mercados_especificos": {
    "ambos_anotan": { "valor": "Sí | No | null", "confianza": 0 },
    "corners_prevision": { "valor": "Alta | Baja | null", "confianza": 0 },
    "valor_extra_basket_baseball": { "mercado": "nombre o null", "valor": "línea o null", "confianza": 0 }
  },
  "analisis_vip": "Párrafo de 4 a 5 líneas citando hechos explícitos del reporte y justificando la jugada principal."
}`;

// ============================================
// ETAPA 0: Búsqueda Contextual con Tavily
// ============================================
async function singleTavilySearch(query: string, apiKey: string): Promise<string[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TAVILY_TIMEOUT);

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        search_depth: 'advanced',
        include_answer: true,
        include_raw_content: false,
        max_results: 5,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[TAVILY] API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const snippets: string[] = [];

    if (data.answer) {
      snippets.push(`Resumen: ${data.answer}`);
    }

    if (data.results && Array.isArray(data.results)) {
      for (const result of data.results.slice(0, 5)) {
        if (result.content) {
          snippets.push(`[${result.title || 'Fuente'}]: ${result.content}`);
        }
      }
    }

    return snippets;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[TAVILY] Error:', error);
    return [];
  }
}

export async function searchWithTavily(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: Sport;
  startTime: string;
}): Promise<{ report: string; contexto_disponible: boolean }> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    console.log('[TAVILY] API Key not configured');
    return {
      report: 'Sin contexto disponible - Configure TAVILY_API_KEY',
      contexto_disponible: false
    };
  }

  const today = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const queries: string[] = [];

  if (params.sport === 'soccer') {
    queries.push(
      `${params.homeTeam} vs ${params.awayTeam} ${params.league} preview noticias lesiones alineación titular forma reciente ${today}`
    );
    queries.push(
      `${params.homeTeam} ${params.awayTeam} head to head estadísticas recientes goles últimos partidos`
    );
  } else if (params.sport === 'basketball') {
    queries.push(
      `${params.homeTeam} vs ${params.awayTeam} NBA preview lesiones bajas jugadores clave rotación ${today}`
    );
    queries.push(
      `${params.homeTeam} ${params.awayTeam} últimos partidos puntos anotados rendimiento ofensivo defensivo`
    );
  } else if (params.sport === 'baseball') {
    queries.push(
      `${params.homeTeam} vs ${params.awayTeam} MLB preview pitcher abridor bullpen clima estadísticas ${today}`
    );
    queries.push(
      `${params.homeTeam} ${params.awayTeam} ERA WHIP batting average últimas salidas pitcher`
    );
  }

  console.log('[TAVILY] Starting searches for:', params.sport);

  const searchPromises = queries.map(q => singleTavilySearch(q, apiKey));
  const searchResults = await Promise.all(searchPromises);

  const allSnippets: string[] = [];
  searchResults.forEach((snippets, index) => {
    if (snippets.length > 0) {
      allSnippets.push(`=== BÚSQUEDA ${index + 1} ===`);
      allSnippets.push(...snippets);
    }
  });

  const report = allSnippets.length > 0
    ? allSnippets.join('\n\n')
    : 'No se encontró información relevante';

  console.log('[TAVILY] Total snippets collected:', allSnippets.length);

  return {
    report,
    contexto_disponible: allSnippets.length > 0
  };
}

// ============================================
// ETAPA 1: Estructuración
// ============================================
export async function structureWithContext(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: Sport;
  startTime: string;
  odds: { home: number; draw: number | null; away: number };
  searchReport: string;
  contexto_disponible: boolean;
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.log('[STRUCTURE] OpenRouter API Key not configured');
    return generateMockStructuredContext(params);
  }

  const oddsSection = params.sport === 'soccer'
    ? `Local (${params.homeTeam}): ${params.odds.home}
Empate: ${params.odds.draw}
Visitante (${params.awayTeam}): ${params.odds.away}`
    : `Local (${params.homeTeam}): ${params.odds.home}
Visitante (${params.awayTeam}): ${params.odds.away}`;

  const userPrompt = `DEPORTE: ${params.sport}
EVENTO: ${params.homeTeam} vs ${params.awayTeam}
LIGA: ${params.league}
FECHA: ${params.startTime}

CUOTAS REALES:
${oddsSection}

REPORTE CONTEXTUAL CRUDO:
${params.searchReport}

TAREA:
Extrae y estructura únicamente la información más relevante para analizar este partido.

Devuelve EXCLUSIVAMENTE este JSON sin texto adicional:
{
  "evento": "Local vs Visitante",
  "deporte": "soccer | basketball | baseball",
  "liga": "nombre exacto de la liga",
  "fecha": "fecha del partido",
  "cuotas": {
    "local": 0.00,
    "empate": 0.00,
    "visitante": 0.00
  },
  "probabilidades_implicitas": {
    "local_pct": 0.00,
    "empate_pct": 0.00,
    "visitante_pct": 0.00
  },
  "favorito": "nombre del favorito según cuotas",
  "hechos_relevantes": [
    "Hecho 1 explícito del reporte",
    "Hecho 2 explícito del reporte"
  ],
  "lesiones_bajas": [
    "Jugador X de equipo Y está lesionado"
  ],
  "forma_reciente": {
    "local": "resumen forma reciente local",
    "visitante": "resumen forma reciente visitante"
  },
  "contexto_adicional": "otros datos relevantes",
  "contexto_disponible": true
}

Si no hay información para un campo, usa null. Nunca inventes datos.
Calcula las probabilidades implícitas: 1/cuota * 100.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    console.log('[STRUCTURE] Calling API...');
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dialox-vip.vercel.app',
        'X-Title': 'Dialox VIP',
      },
      body: JSON.stringify({
        model: STRUCTURE_MODEL,
        messages: [
          { role: 'system', content: STRUCTURE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[STRUCTURE] API error:', response.status);
      const errorText = await response.text();
      console.error('[STRUCTURE] Error:', errorText);
      return generateMockStructuredContext(params);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    console.log('[STRUCTURE] Response length:', content.length);
    console.log('[STRUCTURE] Response preview:', content.substring(0, 200));

    return cleanJsonResponse(content);

  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[STRUCTURE] Error:', error);
    return generateMockStructuredContext(params);
  }
}

// ============================================
// ETAPA 2: Análisis Final
// ============================================
export async function analyzeWithContext(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: Sport;
  startTime: string;
  odds: { home: number; draw: number | null; away: number };
  structuredContext: string;
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.log('[ANALYSIS] OpenRouter API Key not configured');
    return generateMockAnalysis(params);
  }

  const userPrompt = `Analiza el siguiente partido usando el JSON estructurado:

${params.structuredContext}

Devuelve SOLO el JSON con tu análisis siguiendo el esquema obligatorio. Sin texto adicional.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    console.log('[ANALYSIS] Calling API (attempt 1)...');
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dialox-vip.vercel.app',
        'X-Title': 'Dialox VIP',
      },
      body: JSON.stringify({
        model: ANALYSIS_MODEL,
        messages: [
          { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2500,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[ANALYSIS] API error:', response.status);
      const errorText = await response.text();
      console.error('[ANALYSIS] Error:', errorText);
      
      // Retry once
      console.log('[ANALALYSIS] Retrying...');
      return analyzeWithContext(params);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    console.log('[ANALYSIS] Response length:', content.length);
    console.log('[ANALYSIS] Response preview:', content.substring(0, 200));

    return cleanJsonResponse(content);

  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[ANALYSIS] Error:', error);
    return generateMockAnalysis(params);
  }
}

// ============================================
// PIPELINE COMPLETO
// ============================================
export async function runAnalysisPipeline(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: Sport;
  startTime: string;
  odds: { home: number; draw: number | null; away: number };
}): Promise<{
  searchReport: string;
  analysis: string;
  source: 'ai' | 'mock';
}> {
  console.log('[PIPELINE] ========================================');
  console.log('[PIPELINE] Starting 3-stage analysis pipeline');
  console.log('[PIPELINE] Match:', `${params.homeTeam} vs ${params.awayTeam}`);
  console.log('[PIPELINE] Sport:', params.sport);
  console.log('[PIPELINE] ========================================');

  // ETAPA 0: Búsqueda con Tavily
  console.log('[PIPELINE] Stage 0: Tavily search...');
  const { report: searchReport, contexto_disponible } = await searchWithTavily(params);
  console.log('[PIPELINE] Stage 0 complete. Context:', contexto_disponible);

  // ETAPA 1: Estructuración
  console.log('[PIPELINE] Stage 1: Structuring...');
  const structuredContext = await structureWithContext({
    ...params,
    searchReport,
    contexto_disponible,
  });
  console.log('[PIPELINE] Stage 1 complete.');

  // ETAPA 2: Análisis
  console.log('[PIPELINE] Stage 2: Analysis...');
  const analysis = await analyzeWithContext({
    ...params,
    structuredContext,
  });
  console.log('[PIPELINE] Stage 2 complete.');

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;
  const source = (openrouterKey && tavilyKey) ? 'ai' : 'mock';

  console.log('[PIPELINE] ========================================');
  console.log('[PIPELINE] Complete. Source:', source);
  console.log('[PIPELINE] ========================================');

  return {
    searchReport,
    analysis,
    source,
  };
}

// ============================================
// HELPERS
// ============================================
function cleanJsonResponse(content: string): string {
  let cleaned = content.trim();

  // Remove thinking/reasoning tags
  cleaned = cleaned.replace(/<think[^>]*>[\s\S]*?<\s*\/\s*think\s*>/gi, '');
  cleaned = cleaned.replace(/<reasoning[^>]*>[\s\S]*?<\s*\/\s*reasoning\s*>/gi, '');
  cleaned = cleaned.replace(/<\|[^|]*\|>/gi, '');

  // Find JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  // Remove code blocks
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');

  return cleaned.trim();
}

function generateMockStructuredContext(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: Sport;
  odds: { home: number; draw: number | null; away: number };
  searchReport: string;
  contexto_disponible: boolean;
}): string {
  const localProb = Math.round((1 / params.odds.home) * 100);
  const awayProb = Math.round((1 / params.odds.away) * 100);
  const drawProb = params.odds.draw ? Math.round((1 / params.odds.draw) * 100) : 0;

  return JSON.stringify({
    evento: `${params.homeTeam} vs ${params.awayTeam}`,
    deporte: params.sport,
    liga: params.league,
    fecha: params.startTime,
    cuotas: {
      local: params.odds.home,
      empate: params.odds.draw || 0,
      visitante: params.odds.away,
    },
    probabilidades_implicitas: {
      local_pct: localProb,
      empate_pct: drawProb,
      visitante_pct: awayProb,
    },
    favorito: params.odds.home < params.odds.away ? params.homeTeam : params.awayTeam,
    hechos_relevantes: null,
    lesiones_bajas: null,
    forma_reciente: { local: null, visitante: null },
    contexto_adicional: null,
    contexto_disponible: false,
  });
}

function generateMockAnalysis(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: Sport;
  odds: { home: number; draw: number | null; away: number };
}): string {
  const favorite = params.odds.home < params.odds.away ? params.homeTeam : params.awayTeam;
  const favoriteOdds = params.odds.home < params.odds.away ? params.odds.home : params.odds.away;
  const impliedProb = Math.round((1 / favoriteOdds) * 100);

  const estimatedScore = params.sport === 'soccer'
    ? '2 - 1'
    : params.sport === 'basketball'
    ? '108 - 102'
    : '5 - 3';

  return JSON.stringify({
    deporte: params.sport,
    equipos: `${params.homeTeam} vs ${params.awayTeam}`,
    favorito_ganar: favorite,
    marcador_estimado: estimatedScore,
    edge_detectado: {
      mercado: null,
      prob_implicita: impliedProb,
      prob_estimada: 0,
      edge_pct: 0,
    },
    jugada_principal: {
      mercado: params.odds.home < params.odds.away ? 'Victoria Local' : 'Victoria Visitante',
      cuota: favoriteOdds,
      confianza: 4,
      justificacion: `Análisis basado en cuotas. ${favorite} tiene probabilidad implícita del ${impliedProb}%. Sin contexto adicional.`,
    },
    mercados_especificos: {
      ambos_anotan: { valor: null, confianza: 0 },
      corners_prevision: { valor: null, confianza: 0 },
      valor_extra_basket_baseball: { mercado: null, valor: null, confianza: 0 },
    },
    analisis_vip: `Análisis en modo simulación. Configure las API keys para obtener análisis con IA real.`,
  });
}
