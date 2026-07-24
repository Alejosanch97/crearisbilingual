/* ============================================================
   LUMI AVATAR — utilidades compartidas
   Usado por LumiCard (Dashboard) y PlanningCLIL (chat de Lumi)
   ============================================================ */

export const AVATAR_STYLE = 'bottts-neutral';

export const DEFAULT_CFG = {
  seed: 'Felix',
  eyes: 'happy',
  mouth: 'smile01',
  baseColor: '7c3aed',
  backgroundColor: 'ede9fe',
};

/* Construye la URL del avatar a partir de la config */
export const buildAvatarUrl = (cfg, size) => {
  const c = cfg || DEFAULT_CFG;
  const params = new URLSearchParams();
  params.set('seed', c.seed || DEFAULT_CFG.seed);
  if (c.eyes) params.set('eyes', c.eyes);
  if (c.mouth) params.set('mouth', c.mouth);
  if (c.baseColor) params.set('baseColor', c.baseColor);
  if (c.backgroundColor && c.backgroundColor !== 'transparent') {
    params.set('backgroundColor', c.backgroundColor);
  }
  if (size) params.set('size', String(size));
  return `https://api.dicebear.com/10.x/${AVATAR_STYLE}/svg?${params.toString()}`;
};

/* Lee la config guardada en caché local para un profe */
export const getCachedLumiCfg = (teacherKey) => {
  if (!teacherKey) return DEFAULT_CFG;
  try {
    const cached = localStorage.getItem(`lumiCfg_${teacherKey}`);
    if (cached) return JSON.parse(cached);
  } catch {}
  return DEFAULT_CFG;
};