import React, { useState, useEffect, useRef, useMemo } from 'react';
import '../Styles/planning.css';
import { AVATAR_STYLE, DEFAULT_CFG, buildAvatarUrl } from './lumiAvatar';

const API_URL = 'https://script.google.com/macros/s/AKfycbxIgwbIuGymDkRREiidM0lJYZRi5KdKS217_inoU751zp_x3EAzzxcljjNHSxZc34zBxQ/exec';



/* ============================================================
   MENSAJES DE LUMI (rotan cada cierto tiempo)
   Agrega los tuyos aquí; {name} se reemplaza por el nombre del profe.
   ============================================================ */

const WELCOME_MESSAGE = { 
  tag: '👋 Bienvenida', 
  text: '¡Hola, {name}! Soy Lumi, tu asistente. Estoy aquí para acompañarte en tus planeaciones y en el día a día.' 
};

const LUMI_MESSAGES = [
  { tag: '💡 CLIL Tip of the Day', text: 'Un buen "hook" no explica: provoca. Empieza tu clase con una pregunta que los estudiantes no puedan dejar sin responder.' },
  { tag: '💡 CLIL Tip of the Day', text: 'Los language frames no son muletas, son andamios. Dáselos al inicio y retíralos cuando ya no los necesiten.' },
  { tag: '🧠 Thinking Routine', text: '¿Probaste "See–Think–Wonder"? Funciona con casi cualquier imagen y activa el pensamiento en menos de 5 minutos.' },
  { tag: '🎯 Recordatorio', text: 'Cada sesión que planeas con un DBA anclado es trazabilidad curricular real. La coordinación lo nota.' },
  { tag: '✨ Sabías que', text: 'Puedo diseñar hasta 5 sesiones a la vez usando tu malla y tu plan de área. Búscame en Planning.' },
  
  // Mensajes integrados con las estrategias proporcionadas
  { tag: '💡 CLIL Tip', text: 'Simplifica las instrucciones, no el contenido. Mantén el rigor académico usando andamios para el lenguaje.' },
  { tag: '💡 CLIL Tip', text: 'Usa visuales antes de introducir texto complejo para asegurar la comprensión conceptual.' },
  { tag: '💡 CLIL Tip', text: 'Fomenta el uso de sentence starters y frames para guiar las respuestas de tus estudiantes.' },
  { tag: '💡 CLIL Tip', text: 'Permite tiempo de pensamiento ("wait time") tras hacer una pregunta; la calidad de la respuesta mejora drásticamente.' },
  { tag: '💡 CLIL Tip', text: 'Utiliza el trabajo en parejas (pair work) para reducir la ansiedad y aumentar el tiempo de habla de cada alumno.' },
  { tag: '💡 CLIL Tip', text: 'Acepta los errores como parte natural del aprendizaje; enfócate en el significado antes que en la perfección gramatical.' },
  { tag: '💡 CLIL Tip', text: 'Proporciona word banks y checklists para apoyar la autonomía de los estudiantes durante tareas complejas.' },
  { tag: '💡 CLIL Tip', text: 'Integra las cuatro habilidades (escucha, habla, lectura y escritura) en cada unidad de aprendizaje.' },
  { tag: '💡 CLIL Tip', text: 'Refuerza el lenguaje objetivo diariamente; hazlo visible en el salón con posters o mini word walls.' },
  { tag: '💡 CLIL Tip', text: 'Promueve el pensamiento de orden superior pidiendo a los alumnos que comparen, analicen y justifiquen sus ideas.' },
  { tag: '💡 CLIL Tip', text: 'Modelar oraciones completas es clave: no aceptes solo palabras sueltas, fomenta el discurso académico.' },
  { tag: '💡 CLIL Tip', text: 'Vincula siempre los contenidos nuevos con el conocimiento previo de los estudiantes para una mayor retención.' },
  { tag: '💡 CLIL Tip', text: 'Utiliza organizadores gráficos, diagramas y líneas de tiempo para estructurar el pensamiento lógico.' },
  { tag: '💡 CLIL Tip', text: 'Da retroalimentación balanceada: comenta tanto sobre el dominio del contenido como sobre el uso del lenguaje.' },
  { tag: '💡 CLIL Tip', text: 'Divide las tareas complejas en pasos pequeños ("chunking") para evitar la sobrecarga cognitiva.' },
  { tag: '💡 CLIL Tip', text: 'Usa ejemplos reales y datos actuales siempre que sea posible para conectar la teoría con su entorno.' },
  { tag: '💡 CLIL Tip', text: 'Promueve la autoevaluación y la reflexión mediante exit tickets al finalizar tus sesiones.' },
  { tag: '💡 CLIL Tip', text: 'Practica la repetición con variación para reciclar el vocabulario clave sin que la clase pierda dinamismo.' },
  { tag: '💡 CLIL Tip', text: 'Fomenta explicaciones breves en lugar de memorización; el aprendizaje profundo ocurre al explicar ideas en voz alta.' },
  { tag: '💡 CLIL Tip', text: 'Celebra el esfuerzo y la toma de riesgos; el lenguaje académico se construye con práctica constante y sin miedo al error.' }
];

/* Genera mensajes dinámicos según el estado real del usuario */
const buildDynamicMessages = (s) => {
  const msgs = [];

  // --- Agenda ---
  if (s.urgentTasks > 0) {
    msgs.push({
      tag: '🔥 Agenda',
      text: `Tienes ${s.urgentTasks} ${s.urgentTasks === 1 ? 'tarea urgente' : 'tareas urgentes'} esperando. ¿Empezamos por ahí?`
    });
  }
  else if (s.totalTasks > 0) {
    msgs.push({
      tag: '✅ Agenda',
      text: '¡Agenda al día! Completaste todas tus tareas. Buen trabajo, {name}.'
    });
  }

  // --- Actividades sin responsable ---
  if (s.unassignedActivities > 0) {
    msgs.push({
      tag: '🙋 Actividades',
      text: s.unassignedActivities === 1
        ? 'Queda 1 actividad institucional sin responsable. ¿Te animas a tomarla?'
        : `Aún hay ${s.unassignedActivities} actividades sin responsable asignado. Elige una en la pestaña Activities.`
    });
  }

  // --- Mis actividades ---
  if (s.myActivities > 0) {
    msgs.push({
      tag: '📌 Tus actividades',
      text: `Tienes ${s.myActivities} ${s.myActivities === 1 ? 'actividad asignada' : 'actividades asignadas'}. Revisa sus fechas de entrega.`
    });
  }

  // --- Recursos ---
  if (s.resources === 0) {
    msgs.push({
      tag: '🔗 Recursos',
      text: 'Aún no guardas ningún enlace. Agrega los que uses siempre y los tendrás a un clic.'
    });
  }

  return msgs;
};

const ROTATE_MS = 5000; // cada cuánto cambia el mensaje


export const LumiCard = ({ userData, stats = {}, notifications = [], onNotificationsRead }) => {
  const teacherKey = String(userData?.Teacher_Key || userData?.User_Key || '').trim();
  const firstName = (userData?.Teacher_Name || userData?.User_Key || 'profe').split(' ')[0];
  const allMessages = useMemo(() => {
    const dynamic = buildDynamicMessages(stats);
    return [WELCOME_MESSAGE, ...dynamic, ...LUMI_MESSAGES];
  }, [stats.pendingTasks, stats.totalTasks, stats.urgentTasks, stats.unassignedActivities, stats.myActivities, stats.resources]);

  const [cfg, setCfg] = useState(DEFAULT_CFG);
  const [draftCfg, setDraftCfg] = useState(DEFAULT_CFG);
  const [lumiName, setLumiName] = useState('Lumi');
  const [draftName, setDraftName] = useState('Lumi');

  const [msgIndex, setMsgIndex] = useState(0);
  const [msgVisible, setMsgVisible] = useState(true);
  const [customizing, setCustomizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const rotateRef = useRef(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const unreadCount = notifications.filter(n => String(n.Status).trim() !== 'read').length;

  /* ---------- Cargar config guardada ---------- */
  useEffect(() => {
    if (!teacherKey) { setLoaded(true); return; }

    // 1) Pintar de inmediato desde caché local (sin esperar la red)
    try {
      const cached = localStorage.getItem(`lumiCfg_${teacherKey}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setCfg(parsed);
        setDraftCfg(parsed);
        setLoaded(true);
      }
    } catch {}

    // 2) Confirmar/actualizar desde el backend
    const loadConfig = async () => {
      try {
        const resp = await fetch(`${API_URL}?sheet=Lumi_Config`);
        const data = await resp.json();
        if (Array.isArray(data)) {
          const mine = data.find(r => String(r.Teacher_Key || '').trim() === teacherKey);
          if (mine) {
            let opts = {};
            try { opts = JSON.parse(mine.Avatar_Options_JSON || '{}'); } catch { opts = {}; }
            const loadedCfg = {
              seed: mine.Avatar_Seed || DEFAULT_CFG.seed,
              eyes: opts.eyes || DEFAULT_CFG.eyes,
              mouth: opts.mouth || DEFAULT_CFG.mouth,
              baseColor: opts.baseColor || DEFAULT_CFG.baseColor,
              backgroundColor: opts.backgroundColor || DEFAULT_CFG.backgroundColor,
            };
            setCfg(loadedCfg);
            setDraftCfg(loadedCfg);
            try { localStorage.setItem(`lumiCfg_${teacherKey}`, JSON.stringify(loadedCfg)); } catch {}
          }
        }
      } catch (e) { console.error('Error cargando config de Lumi:', e); }
      setLoaded(true);
    };
    loadConfig();
  }, [teacherKey]);

  /* ---------- Rotación de mensajes ---------- */
  useEffect(() => {
    if (customizing) return; // pausa mientras personaliza
    rotateRef.current = setInterval(() => {
      setMsgVisible(false);
      setTimeout(() => {
        setMsgIndex(i => (i + 1) % allMessages.length);
        setMsgVisible(true);
      }, 400);
    }, ROTATE_MS);
    return () => clearInterval(rotateRef.current);
  }, [customizing, allMessages.length]);

  const nextMessage = () => {
    setMsgVisible(false);
    setTimeout(() => {
      setMsgIndex(i => (i + 1) % allMessages.length);
      setMsgVisible(true);
    }, 300);
  };

  /* ---------- Guardar personalización ---------- */
  const saveConfig = async () => {
    setSaving(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'saveLumiConfig',
          data: {
            Teacher_Key: teacherKey,
            Avatar_Style: AVATAR_STYLE,
            Avatar_Seed: draftCfg.seed,
            Avatar_Options_JSON: JSON.stringify({
              eyes: draftCfg.eyes,
              mouth: draftCfg.mouth,
              baseColor: draftCfg.baseColor,
              backgroundColor: draftCfg.backgroundColor,
            }),
            Lumi_Name: draftName || 'Lumi',
          }
        })
      });
      setCfg(draftCfg);
      try { localStorage.setItem(`lumiCfg_${teacherKey}`, JSON.stringify(draftCfg)); } catch {}
      setCustomizing(false);
      setLumiName(draftName || 'Lumi');
    } catch (e) {
      alert('No pude guardar los cambios. Intenta de nuevo.');
    }
    setSaving(false);
  };

  const cancelCustomize = () => {
    setDraftCfg(cfg);
    setDraftName(lumiName);
    setCustomizing(false);
  };

  /* Abre el panel de alertas y marca las no leídas como leídas (auto) */
  const openAlerts = async () => {
    setShowAlerts(true);
    const unread = notifications.filter(n => String(n.Status).trim() !== 'read');
    if (unread.length === 0) return;
    const ids = unread.map(n => n.ID_Notification);
    if (onNotificationsRead) onNotificationsRead(ids); // optimista en el padre
    try {
      await Promise.all(unread.map(n => fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'markNotificationRead', idValue: n.ID_Notification })
      })));
    } catch (e) { console.error('No se pudieron marcar como leídas:', e); }
  };

  const randomizeSeed = () => {
    const seeds = ['Felix', 'Luna', 'Nova', 'Pixel', 'Cosmo', 'Kiwi', 'Zeta', 'Orbit', 'Mango', 'Iris', 'Atlas', 'Vega'];
    const random = seeds[Math.floor(Math.random() * seeds.length)] + Math.floor(Math.random() * 100);
    setDraftCfg(c => ({ ...c, seed: random }));
  };

  const activeCfg = customizing ? draftCfg : cfg;
  
  const currentMsg = allMessages[msgIndex % allMessages.length] || allMessages[0];
  const msgText = (currentMsg?.text || '').replace('{name}', firstName);

  return (
    <div className="lumi-card">
      <div className="lumi-card-glow" aria-hidden="true" />

      {/* ---------- Cabecera: avatar + presentación ---------- */}
      <div className="lumi-card-main">
        <div className="lumi-avatar-wrap">
          {loaded ? (
            <img
              src={buildAvatarUrl(activeCfg, 240)}
              alt={lumiName}
              className="lumi-avatar-big"
              key={buildAvatarUrl(activeCfg)}
            />
          ) : (
            <div className="lumi-avatar-skeleton" />
          )}
          <span className="lumi-halo" />
          <span className="lumi-online-dot" title="En línea" />
        </div>

        <div className="lumi-card-body">
          <div className="lumi-card-eyebrow">TU ASISTENTE</div>
          <h2 className="lumi-card-name">{lumiName}</h2>

          {/* Cuadro de diálogo con mensajes rotativos */}
          <div className={`lumi-speech ${msgVisible ? 'in' : 'out'}`}>
            <span className="lumi-speech-tag">{currentMsg?.tag}</span>
            <p>{msgText}</p>
          </div>

          <div className="lumi-card-actions">
            <button className="lumi-btn primary" onClick={() => setCustomizing(v => !v)}>
              {customizing ? '✕ Cerrar' : '🎨 Personalizar'}
            </button>
            <button className="lumi-btn ghost lumi-alerts-btn" onClick={openAlerts}>
              🔔 Alertas
              {unreadCount > 0 && <span className="lumi-alert-badge">{unreadCount}</span>}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Panel de personalización ---------- */}
      {customizing && (
        <div className="lumi-customizer">
          <div className="lumi-cust-row">
            <label>Rostro de Lumi</label>
            <p className="lumi-cust-hint">Genera un nuevo rostro hasta encontrar el que más te guste.</p>
            <button className="lumi-btn ghost full" onClick={randomizeSeed}>
              🎲 Generar otro rostro
            </button>
          </div>

          <div className="lumi-cust-actions">
            <button className="lumi-btn ghost" onClick={cancelCustomize} disabled={saving}>Cancelar</button>
            <button className="lumi-btn primary" onClick={saveConfig} disabled={saving}>
              {saving ? 'Guardando…' : '✅ Guardar mi Lumi'}
            </button>
          </div>
        </div>
      )}

      {/* ---------- Panel de alertas / notificaciones de coordinación ---------- */}
      {showAlerts && (
        <div className="lumi-alerts-overlay" onClick={() => setShowAlerts(false)}>
          <div className="lumi-alerts-panel" onClick={e => e.stopPropagation()}>
            <div className="lumi-alerts-head">
              <div>
                <span className="lumi-alerts-eyebrow">📩 COORDINACIÓN</span>
                <h3>Tus notificaciones</h3>
              </div>
              <button className="lumi-alerts-close" onClick={() => setShowAlerts(false)}>×</button>
            </div>
            <div className="lumi-alerts-body">
              {notifications.length === 0 ? (
                <p className="lumi-alerts-empty">No tienes notificaciones de coordinación por ahora.</p>
              ) : (
                [...notifications]
                  .sort((a, b) => new Date(b.Created_At) - new Date(a.Created_At))
                  .map(n => (
                    <div key={n.ID_Notification} className="lumi-alert-item">
                      <p>{n.Message}</p>
                      <small>{n.Sender ? `${n.Sender} · ` : ''}{n.Created_At ? new Date(n.Created_At).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : ''}</small>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LumiCard;