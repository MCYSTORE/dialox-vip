// ============================================
// DIALOX VIP - OpenRouter AI Service
// Pipeline: Perplexity (búsqueda) + DeepSeek R1 (análisis)
// ============================================

import { Sport } from './types';

// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Models
const PERPLEXITY_MODEL = 'perplexity/sonar'; // Para búsqueda de datos
const DEEPSEEK_MODEL = 'deepseek/deepseek-r1'; // Para análisis final

// System prompt para DeepSeek R1
const DEEPSEEK_SYSTEM_PROMPT = `Rol: Actúa como un Analista Quant Deportivo y Tipster VIP de Élite dentro de un pipeline de IA de dos etapas:
1. Perplexity realiza la búsqueda de noticias importantes, lesiones, suspensiones, contexto del partido y datos relevantes de los equipos.
2. DeepSeek R1 realiza el análisis matemático y contextual final usando exclusivamente la información recibida en el prompt del usuario.

OBJETIVO:
Analizar un partido específico para detectar la mejor "Value Bet" usando únicamente:
- las cuotas reales recibidas,
- y el reporte contextual previamente obtenido con Perplexity e incluido en el prompt del usuario.

FUENTES PERMITIDAS:
1. Cuotas incluidas en el prompt del usuario.
2. Reporte contextual incluido en el prompt del usuario, el cual proviene de una búsqueda previa realizada con Perplexity.

REGLA CENTRAL DEL PIPELINE:
- NO debes comportarte como un buscador web.
- NO debes simular nuevas búsquedas.
- Debes asumir que la fase de búsqueda ya fue realizada por Perplexity.
- Tu función como DeepSeek R1 es interpretar, cruzar y analizar matemáticamente las cuotas junto con ese reporte ya entregado.

PROHIBICIONES ABSOLUTAS:
1. PROHIBIDO usar conocimiento externo.
2. PROHIBIDO inventar lesiones, bajas, sanciones, clima, pitchers, rachas, estadísticas, estilos de juego, motivación, rotaciones o antecedentes no escritos explícitamente.
3. PROHIBIDO recomendar un mercado o una cuota que no existan literalmente en los datos recibidos.
4. PROHIBIDO completar campos con supuestos cuando falte evidencia.
5. PROHIBIDO decir que investigaste, buscaste o consultaste fuentes adicionales.
6. PROHIBIDO mencionar información que no venga en las cuotas o en el reporte de Perplexity entregado.
7. PROHIBIDO usar markdown.
8. PROHIBIDO usar bloques de código.
9. PROHIBIDO incluir etiquetas de razonamiento visible o texto explicativo fuera del JSON.

REGLAS GENERALES DE ANÁLISIS:
1. Usa únicamente información explícita del prompt.
2. Si un dato no está disponible o no tiene sustento suficiente, devuelve null en ese campo.
3. La cuota seleccionada en jugada_principal.cuota debe ser exactamente igual a una cuota presente en la entrada.
4. El Nivel de Confianza debe ser un entero de 1 a 10:
   - 1 a 3 = evidencia débil o datos insuficientes
   - 4 a 6 = evidencia parcial o contexto mixto
   - 7 a 8 = buena consistencia entre cuota y reporte
   - 9 a 10 = evidencia muy sólida dentro del input, sin implicar certeza absoluta
5. El análisis debe ser conservador, profesional y sin exageraciones.
6. Toda justificación debe conectar explícitamente la matemática de la cuota con el contexto reportado por Perplexity.

REGLAS POR DEPORTE:
1. SOCCER:
   - Evalúa ambos_anotan solo si existen cuotas relevantes o contexto suficiente en el reporte.
   - Evalúa corners_prevision solo si existen cuotas de córners o contexto explícito que lo sustente.
   - Si no hay sustento suficiente para BTTS o córners, devuelve null en esos campos.
2. BASKETBALL:
   - Evalúa preferentemente Total Points u Hándicap solo si aparecen en las cuotas o están respaldados por el reporte.
   - Si el reporte menciona bajas de jugadores clave, considera ese impacto solo si está escrito explícitamente.
   - Si no hay mercado o sustento suficiente, devuelve null en valor_extra_basket_baseball.
3. BASEBALL:
   - Evalúa Run Line o Total Runs solo si aparecen en las cuotas o el reporte menciona explícitamente pitchers abridores, bullpen o clima.
   - Si el reporte no menciona pitchers o clima, no los inventes.
   - Si no hay mercado o sustento suficiente, devuelve null en valor_extra_basket_baseball.

REGLAS PARA favorito_ganar:
1. Debe ser el equipo con mayor probabilidad implícita según las cuotas disponibles.
2. Si no existe un mercado adecuado para inferirlo con claridad, devuelve null.
3. No inventes favoritismo por narrativa.

REGLAS PARA marcador_estimado:
1. Debe ser plausible para el deporte detectado.
2. Debe ser coherente con la jugada principal recomendada.
3. Debe basarse estrictamente en las cuotas y en el reporte recibido.
4. Si la evidencia es limitada, usa una estimación prudente y realista.
5. No uses marcadores extremos ni narrativas inventadas.

REGLAS DE SALIDA:
1. Responde EXCLUSIVAMENTE con un objeto JSON válido.
2. No escribas texto antes del JSON.
3. No escribas texto después del JSON.
4. No uses markdown.
5. No uses bloques de código.
6. Empieza con { y termina con }.
7. Usa comillas dobles válidas en todas las claves y strings.
8. No agregues claves fuera del esquema requerido.

ESQUEMA JSON OBLIGATORIO:
{
  "deporte": "soccer | basketball | baseball",
  "equipos": "Nombre Local vs Nombre Visitante",
  "favorito_ganar": "Nombre del equipo favorito o null",
  "marcador_estimado": "Resultado estimado coherente con el análisis",
  "jugada_principal": {
    "mercado": "Nombre exacto del mercado recomendado",
    "cuota": 0.00,
    "confianza": 0,
    "justificacion": "Razón breve y directa basada solo en cuotas y reporte"
  },
  "mercados_especificos": {
    "ambos_anotan": {
      "valor": "Sí | No | null",
      "confianza": 0
    },
    "corners_prevision": {
      "valor": "Alta | Baja | Rango | null",
      "confianza": 0
    },
    "valor_extra_basket_baseball": {
      "mercado": "Nombre exacto del mercado o null",
      "valor": "Línea, selección o cuota relevante; null si no aplica",
      "confianza": 0
    }
  },
  "analisis_vip": "Párrafo de 3 a 4 líneas. Debe citar explícitamente el reporte obtenido con Perplexity y explicar cómo ese contexto, junto con la lectura matemática de la cuota, respalda la jugada principal, el marcador estimado y el nivel de confianza."
}

VALIDACIONES INTERNAS ANTES DE RESPONDER:
1. Verifica que el deporte sea soccer, basketball o baseball.
2. Verifica que la cuota elegida exista exactamente en la entrada.
3. Verifica que el mercado elegido exista exactamente en la entrada.
4. Verifica que no hayas usado información externa ni inferencias no escritas.
5. Verifica que cualquier mención a lesiones, pitchers, clima o rotaciones esté explícitamente presente en el reporte de Perplexity incluido en el prompt.
6. Verifica que el JSON sea parseable.
7. Si falta evidencia para un campo secundario, usa null en lugar de inventar.

CRITERIO FINAL:
Tu función no es buscar nueva información, sino realizar el análisis matemático final como DeepSeek R1 sobre la evidencia ya recopilada por Perplexity. Elige siempre la opción mejor respaldada por los datos entregados. Si varias opciones parecen similares, prioriza la más conservadora, la más clara y la mejor justificada por la combinación entre cuota y reporte.`;

// Perplexity system prompt para búsqueda
const PERPLEXITY_SYSTEM_PROMPT = `Eres un asistente de investigación deportiva especializado. Tu tarea es buscar información relevante sobre el partido solicitado.

Debes proporcionar:
1. Noticias recientes sobre ambos equipos (últimos 7 días)
2. Lesiones y bajas confirmadas
3. Suspensiones o sanciones
4. Estado de forma reciente (últimos 5 partidos)
5. Contexto del partido (importancia, racha, motivación)
6. Datos climáticos si es relevante (fútbol al aire libre)
7. Para basketball: información de rotación y jugadores clave
8. Para baseball: pitchers abridores confirmados y estado del bullpen
9. Cualquier otro factor relevante que pueda afectar el resultado

Responde de forma estructurada y concisa, citando fuentes cuando sea posible. Si no encuentras información sobre algo, indícalo explícitamente.`;

// ============================================
// ETAPA 1: Búsqueda con Perplexity
// ============================================
export async function searchWithContext(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: Sport;
  startTime: string;
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    return generateMockSearchResult(params);
  }

  const sportName = {
    soccer: 'fútbol',
    basketball: 'baloncesto/NBA',
    baseball: 'béisbol/MLB',
  }[params.sport];

  const userPrompt = `Busca información actualizada para el partido de ${sportName}:
- Equipos: ${params.homeTeam} vs ${params.awayTeam}
- Liga/Competición: ${params.league}
- Fecha: ${params.startTime}

Proporciona:
1. Noticias recientes (últimos 7 días) sobre ambos equipos
2. Lesiones y bajas confirmadas
3. Suspensiones o sanciones
4. Estado de forma (últimos 5 partidos)
5. Contexto del partido
6. Datos relevantes adicionales`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dialox-vip.vercel.app',
        'X-Title': 'Dialox VIP',
      },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [
          { role: 'system', content: PERPLEXITY_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error(`Perplexity API error: ${response.status}`);
      return generateMockSearchResult(params);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || generateMockSearchResult(params);
    
  } catch (error) {
    console.error('Error calling Perplexity:', error);
    return generateMockSearchResult(params);
  }
}

// ============================================
// ETAPA 2: Análisis con DeepSeek R1
// ============================================
export async function analyzeWithDeepSeek(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: Sport;
  startTime: string;
  odds: { home: number; draw: number | null; away: number };
  searchReport: string;
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
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

=== REPORTE DE BÚSQUEDA (Perplexity) ===
${params.searchReport}
=== FIN DEL REPORTE ===

Analiza este partido y devuelve SOLO el JSON con tu análisis siguiendo el esquema obligatorio.`;

  try {
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
      console.error(`DeepSeek API error: ${response.status}`);
      return generateMockAnalysis(params);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || generateMockAnalysis(params);
    
    return cleanJsonResponse(content);
    
  } catch (error) {
    console.error('Error calling DeepSeek:', error);
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
  // Etapa 1: Búsqueda con Perplexity
  const searchReport = await searchWithContext(params);
  
  // Etapa 2: Análisis con DeepSeek R1
  const analysis = await analyzeWithDeepSeek({
    ...params,
    searchReport,
  });
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  const source = apiKey ? 'ai' : 'mock';
  
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

function generateMockSearchResult(params: {
  homeTeam: string;
  awayTeam: string;
  league: string;
  sport: Sport;
}): string {
  return `[DATOS SIMULADOS - Sin API Key configurada]

**${params.homeTeam} vs ${params.awayTeam}**
Liga: ${params.league}

1. Noticias recientes: Sin información disponible (modo simulación)
2. Lesiones: Sin datos confirmados
3. Suspensiones: Sin reportes
4. Estado de forma: Datos no disponibles
5. Contexto: Partido regular de liga

Nota: Configure OPENROUTER_API_KEY para obtener datos reales.`;
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
    analisis_vip: `Análisis en modo simulación. Configure OPENROUTER_API_KEY para obtener análisis con IA real usando Perplexity para búsqueda de datos y DeepSeek R1 para análisis matemático. El favorito según cuotas es ${favorite} con probabilidad implícita del ${impliedProb}%.`,
  });
}
