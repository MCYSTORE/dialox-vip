// ============================================
// DIALOX VIP - AI Analysis Pipeline (FREE TIER)
// ETAPA 0: Tavily Search (búsqueda contextual)
// ETAPA 1: Gemini Flash (estructuración)
// ETAPA 2: DeepSeek R1 Free (análisis final)
// ============================================

import { Sport } from './types';

// ============================================
// API CONFIGURATION
// ============================================
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TAVILY_API_URL = 'https://api.tavily.com/search';

// Models (FREE via OpenRouter)
const GEMINI_MODEL = 'google/gemini-2.0-flash-exp:free'; // Estructuración
const DEEPSEEK_MODEL = 'deepseek/deepseek-r1-0528:free'; // Análisis final

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

// ============================================
// SYSTEM PROMPTS
// ============================================

// System prompt para Gemini (Estructuración)
const GEMINI_SYSTEM_PROMPT = `Eres un asistente de estructuración de datos deportivos. Tu tarea es recibir información cruda de búsqueda y cuotas, y convertirla en un JSON estructurado y limpio.

REGLAS:
1. Extrae solo información relevante y confirmada del contexto.
2. Si algo no está mencionado explícitamente, usa null.
3. No inventes ni infieras información.
4. Responde SOLO con JSON válido, sin markdown ni explicaciones.

ESQUEMA DE SALIDA:
{
  "contexto_relevante": {
    "noticias": ["noticia 1", "noticia 2"] o null,
    "lesiones": ["jugador - tipo de lesión"] o null,
    "suspensiones": ["jugador - razón"] o null,
    "estado_forma": {
      "local": "descripción forma reciente",
      "visitante": "descripción forma reciente"
    } o null,
    "factores_adicionales": ["factor 1", "factor 2"] o null
  },
  "contexto_disponible": true o false,
  "resumen_contexto": "1-2 frases resumiendo lo más relevante encontrado"
}`;

// System prompt para DeepSeek R1 (Análisis Final)
const DEEPSEEK_SYSTEM_PROMPT = `Rol: Actúa como un Analista Quant Deportivo y Tipster VIP de Élite. Tu función es analizar un partido específico para detectar la mejor "Value Bet" usando únicamente la información recibida en el prompt.

FUENTES PERMITIDAS:
1. Cuotas incluidas en el prompt del usuario.
2. Contexto estructurado incluido en el prompt (proveniente de búsqueda previa con Tavily).

PROHIBICIONES ABSOLUTAS:
1. PROHIBIDO usar conocimiento externo.
2. PROHIBIDO inventar lesiones, bajas, sanciones, clima, pitchers, rachas, estadísticas, estilos de juego, motivación, rotaciones o antecedentes no escritos explícitamente.
3. PROHIBIDO recomendar un mercado o una cuota que no existan literalmente en los datos recibidos.
4. PROHIBIDO completar campos con supuestos cuando falte evidencia.
5. PROHIBIDO usar markdown.
6. PROHIBIDO usar bloques de código.
7. PROHIBIDO incluir etiquetas de razonamiento visible o texto explicativo fuera del JSON.

REGLAS GENERALES DE ANÁLISIS:
1. Usa únicamente información explícita del prompt.
2. Si un dato no está disponible o no tiene sustento suficiente, devuelve null en ese campo.
3. La cuota seleccionada en jugada_principal.cuota debe ser exactamente igual a una cuota presente en la entrada.
4. El Nivel de Confianza debe ser un entero de 1 a 10:
   - 1 a 3 = evidencia débil o datos insuficientes
   - 4 a 6 = evidencia parcial o contexto mixto
   - 7 a 8 = buena consistencia entre cuota y contexto
   - 9 a 10 = evidencia muy sólida dentro del input
5. El análisis debe ser conservador, profesional y sin exageraciones.

REGLAS POR DEPORTE:
1. SOCCER:
   - Evalúa ambos_anotan solo si existe contexto suficiente.
   - Evalúa corners_prevision solo si hay contexto explícito.
   - Si no hay sustento, devuelve null en esos campos.
2. BASKETBALL:
   - Evalúa Total Points u Hándicap si hay respaldo en el contexto.
   - Si el contexto menciona bajas de jugadores clave, considéralo solo si está escrito explícitamente.
3. BASEBALL:
   - Evalúa Run Line o Total Runs si el contexto menciona pitchers abridores, bullpen o clima.
   - Si no hay mención, no inventes.

REGLAS PARA favorito_ganar:
1. Debe ser el equipo con mayor probabilidad implícita según las cuotas disponibles.
2. Si no existe un mercado adecuado para inferirlo con claridad, devuelve null.
3. No inventes favoritismo por narrativa.

REGLAS PARA marcador_estimado:
1. Debe ser plausible para el deporte detectado.
2. Debe ser coherente con la jugada principal recomendada.
3. Si la evidencia es limitada, usa una estimación prudente y realista.

REGLAS DE SALIDA:
1. Responde EXCLUSIVAMENTE con un objeto JSON válido.
2. No escribas texto antes ni después del JSON.
3. Empieza con { y termina con }.
4. Usa comillas dobles válidas en todas las claves y strings.

ESQUEMA JSON OBLIGATORIO:
{
  "deporte": "soccer | basketball | baseball",
  "equipos": "Nombre Local vs Nombre Visitante",
  "favorito_ganar": "Nombre del equipo favorito o null",
  "marcador_estimado": "Resultado estimado coherente",
  "jugada_principal": {
    "mercado": "Nombre exacto del mercado recomendado",
    "cuota": 0.00,
    "confianza": 0,
    "justificacion": "Razón breve basada solo en cuotas y contexto"
  },
  "mercados_especificos": {
    "ambos_anotan": { "valor": "Sí | No | null", "confianza": 0 },
    "corners_prevision": { "valor": "Alta | Baja | null", "confianza": 0 },
    "valor_extra_basket_baseball": { "mercado": "string o null", "valor": "string o null", "confianza": 0 }
  },
  "analisis_vip": "Párrafo de 3 a 4 líneas citando el contexto recibido y explicando cómo respalda la jugada principal."
}

VALIDACIONES ANTES DE RESPONDER:
1. Verifica que el JSON sea parseable.
2. Verifica que la cuota elegida exista en la entrada.
3. Verifica que no hayas usado información externa.
4. Si falta evidencia para un campo, usa null.

CRITERIO FINAL:
Elige siempre la opción mejor respaldada por los datos entregados. Si varias opciones parecen similares, prioriza la más conservadora y mejor justificada.`;

// ============================================
// ETAPA 0: Búsqueda Contextual con Tavily
// ============================================
export async function searchWithTavily(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: Sport;
  startTime: string;
}): Promise<{ report: string; contexto_disponible: boolean }> {
  const apiKey = process.env.TAVILY_API_KEY;
  
  if (!apiKey) {
    console.log('[TAVILY] API Key not configured, using empty context');
    return { 
      report: 'Sin contexto disponible - Configure TAVILY_API_KEY',
      contexto_disponible: false 
    };
  }

  // Build search query
  const today = new Date().toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const sportKeywords = {
    soccer: 'fútbol',
    basketball: 'NBA baloncesto',
    baseball: 'MLB béisbol',
  };

  const query = `${params.homeTeam} vs ${params.awayTeam} ${params.league} ${sportKeywords[params.sport]} noticias lesiones alineación ${today}`;

  console.log('[TAVILY] Searching for:', query);

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        search_depth: 'basic',
        include_answer: true,
        include_raw_content: false,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      console.error('[TAVILY] API error:', response.status);
      const errorText = await response.text();
      console.error('[TAVILY] Error body:', errorText);
      return { 
        report: 'Error en búsqueda contextual',
        contexto_disponible: false 
      };
    }

    const data = await response.json();
    console.log('[TAVILY] Response received, results:', data.results?.length || 0);

    // Extract relevant snippets
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

    const report = snippets.length > 0 
      ? snippets.join('\n\n')
      : 'No se encontró información relevante';

    return { 
      report,
      contexto_disponible: snippets.length > 0 
    };

  } catch (error) {
    console.error('[TAVILY] Error:', error);
    return { 
      report: 'Error en búsqueda contextual',
      contexto_disponible: false 
    };
  }
}

// ============================================
// ETAPA 1: Estructuración con Gemini Flash
// ============================================
export async function structureWithGemini(params: {
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
    console.log('[GEMINI] OpenRouter API Key not configured');
    return generateMockStructuredContext(params);
  }

  const oddsInfo = params.sport === 'soccer'
    ? `Cuotas:
- Local (${params.homeTeam}): ${params.odds.home}
- Empate: ${params.odds.draw}
- Visitante (${params.awayTeam}): ${params.odds.away}`
    : `Cuotas:
- Local (${params.homeTeam}): ${params.odds.home}
- Visitante (${params.awayTeam}): ${params.odds.away}`;

  const userPrompt = `Deporte: ${params.sport}
Equipos: ${params.homeTeam} vs ${params.awayTeam}
Liga: ${params.league}
Fecha: ${params.startTime}

${oddsInfo}

=== CONTEXTO DE BÚSQUEDA (Tavily) ===
${params.searchReport}
=== FIN DEL CONTEXTO ===

Contexto disponible: ${params.contexto_disponible ? 'Sí' : 'No'}

Estructura esta información en JSON siguiendo el esquema obligatorio.`;

  try {
    console.log('[GEMINI] Calling API for structuring...');
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dialox-vip.vercel.app',
        'X-Title': 'Dialox VIP',
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        messages: [
          { role: 'system', content: GEMINI_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error('[GEMINI] API error:', response.status);
      const errorText = await response.text();
      console.error('[GEMINI] Error body:', errorText);
      return generateMockStructuredContext(params);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('[GEMINI] Response length:', content.length);
    
    return cleanJsonResponse(content);

  } catch (error) {
    console.error('[GEMINI] Error:', error);
    return generateMockStructuredContext(params);
  }
}

// ============================================
// ETAPA 2: Análisis Final con DeepSeek R1
// ============================================
export async function analyzeWithDeepSeek(params: {
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
    console.log('[DEEPSEEK] OpenRouter API Key not configured');
    return generateMockAnalysis(params);
  }

  const oddsInfo = params.sport === 'soccer'
    ? `Cuotas disponibles:
- Local (${params.homeTeam}): ${params.odds.home}
- Empate: ${params.odds.draw}
- Visitante (${params.awayTeam}): ${params.odds.away}`
    : `Cuotas disponibles:
- Local (${params.homeTeam}): ${params.odds.home}
- Visitante (${params.awayTeam}): ${params.odds.away}`;

  const userPrompt = `Deporte: ${params.sport}
Equipos: ${params.homeTeam} vs ${params.awayTeam}
Liga: ${params.league}
Fecha: ${params.startTime}

${oddsInfo}

=== CONTEXTO ESTRUCTURADO ===
${params.structuredContext}
=== FIN DEL CONTEXTO ===

Analiza este partido y devuelve SOLO el JSON con tu análisis siguiendo el esquema obligatorio.`;

  try {
    console.log('[DEEPSEEK] Calling API for final analysis...');
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dialox-vip.vercel.app',
        'X-Title': 'Dialox VIP',
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: DEEPSEEK_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error('[DEEPSEEK] API error:', response.status);
      const errorText = await response.text();
      console.error('[DEEPSEEK] Error body:', errorText);
      return generateMockAnalysis(params);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    
    console.log('[DEEPSEEK] Raw response length:', rawContent.length);
    console.log('[DEEPSEEK] Raw response preview:', rawContent.substring(0, 200));
    
    const cleaned = cleanJsonResponse(rawContent);
    console.log('[DEEPSEEK] Cleaned response preview:', cleaned.substring(0, 150));
    
    return cleaned;

  } catch (error) {
    console.error('[DEEPSEEK] Error:', error);
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
  console.log('[PIPELINE] Starting 3-stage analysis pipeline...');
  console.log('[PIPELINE] Match:', `${params.homeTeam} vs ${params.awayTeam}`);

  // ETAPA 0: Búsqueda con Tavily
  console.log('[PIPELINE] Stage 0: Tavily search...');
  const { report: searchReport, contexto_disponible } = await searchWithTavily(params);
  console.log('[PIPELINE] Stage 0 complete. Context available:', contexto_disponible);

  // ETAPA 1: Estructuración con Gemini
  console.log('[PIPELINE] Stage 1: Gemini structuring...');
  const structuredContext = await structureWithGemini({
    ...params,
    searchReport,
    contexto_disponible,
  });
  console.log('[PIPELINE] Stage 1 complete.');

  // ETAPA 2: Análisis con DeepSeek
  console.log('[PIPELINE] Stage 2: DeepSeek analysis...');
  const analysis = await analyzeWithDeepSeek({
    ...params,
    structuredContext,
  });
  console.log('[PIPELINE] Stage 2 complete.');

  // Determine source
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;
  const source = (openrouterKey && tavilyKey) ? 'ai' : 'mock';

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
  
  // Remove DeepSeek R1 reasoning tags
  cleaned = cleaned.replace(/<think[^>]*>[\s\S]*?<\s*\/\s*think\s*>/gi, '');
  cleaned = cleaned.replace(/<reasoning[^>]*>[\s\S]*?<\s*\/\s*reasoning\s*>/gi, '');
  cleaned = cleaned.replace(/<\|[^|]*\|>/gi, '');
  
  // Find JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  // Remove code blocks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '');
  }
  
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\s*```$/i, '');
  }
  
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
  return JSON.stringify({
    contexto_relevante: null,
    contexto_disponible: false,
    resumen_contexto: 'Sin contexto disponible - Configure TAVILY_API_KEY y OPENROUTER_API_KEY',
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
    jugada_principal: {
      mercado: params.odds.home < params.odds.away ? 'Victoria Local' : 'Victoria Visitante',
      cuota: favoriteOdds,
      confianza: Math.min(impliedProb, 75),
      justificacion: `Análisis basado en cuotas. ${favorite} tiene probabilidad implícita del ${impliedProb}%.`,
    },
    mercados_especificos: {
      ambos_anotan: params.sport === 'soccer' ? { valor: 'Sí', confianza: 55 } : { valor: null, confianza: 0 },
      corners_prevision: params.sport === 'soccer' ? { valor: 'Alta', confianza: 50 } : { valor: null, confianza: 0 },
      valor_extra_basket_baseball: params.sport !== 'soccer' 
        ? { mercado: 'Total Points/Runs', valor: 'Over', confianza: 50 }
        : { mercado: null, valor: null, confianza: 0 },
    },
    analisis_vip: `Análisis en modo simulación. Configure TAVILY_API_KEY y OPENROUTER_API_KEY para obtener análisis con IA real. El favorito según cuotas es ${favorite} con probabilidad implícita del ${impliedProb}%.`,
  });
}
