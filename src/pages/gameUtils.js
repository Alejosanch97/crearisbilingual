/* ============================================================
   GAME UTILS · normaliza las preguntas para todos los juegos
   ============================================================ */

/* Convierte cualquier formato guardado a la estructura del juego.
   Soporta:
   - Formato nuevo: [{q, opts:[4], correct:0}]
   - Formato viejo: ["pregunta 1", "pregunta 2"]  → modo presentación
*/
export const normalizeQuestions = (rawJson) => {
  let data = rawJson;
  if (typeof rawJson === 'string') {
    try { data = JSON.parse(rawJson); } catch { return []; }
  }
  if (!Array.isArray(data)) return [];

  return data.map((item, i) => {
    // Formato nuevo (objeto con opciones)
    if (item && typeof item === 'object' && item.q) {
      const opts = Array.isArray(item.opts) ? item.opts.filter(Boolean) : [];
      const hasOptions = opts.length >= 2;
      const finalOpts = hasOptions ? opts.slice(0, 4) : [];
      const rawCorrect = Number(item.correct);
      const safeCorrect = Number.isInteger(rawCorrect) && rawCorrect >= 0 && rawCorrect < finalOpts.length
        ? rawCorrect
        : 0;
      return {
        id: i,
        q: String(item.q),
        opts: finalOpts,
        correct: hasOptions ? safeCorrect : -1,
        interactive: hasOptions,
      };
    }
    // Formato viejo (solo texto) → modo presentación
    if (typeof item === 'string' && item.trim()) {
      return { id: i, q: item.trim(), opts: [], correct: -1, interactive: false };
    }
    return null;
  }).filter(Boolean);
};

/* ¿Se puede jugar en modo interactivo? */
export const isPlayable = (questions) =>
  questions.length > 0 && questions.every(q => q.interactive);

/* Baraja un array sin mutarlo */
export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* Catálogo de juegos disponibles */
export const GAME_CATALOG = [
  { id: 'dash',    name: 'Lumi Dash',      desc: 'Corre, salta obstáculos y responde en los portales.', icon: '🏃' },
  { id: 'shoot',   name: 'Space Blast',    desc: 'Dispara a la cápsula con la respuesta correcta.',     icon: '🚀' },
  { id: 'memory',  name: 'Memory Flash',   desc: 'Encuentra el par que responde la pregunta.',          icon: '🃏' },
  { id: 'gravity', name: 'Gravity Catch',  desc: 'Atrapa con la plataforma la respuesta correcta.',      icon: '🎯' },
  { id: 'atom',    name: 'Bohr Orbit',     desc: 'Orbita y dispara al núcleo con la opción correcta.',   icon: '⚛️' },
];