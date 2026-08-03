import React, { useState, useEffect, useRef } from 'react';
import '../Styles/planning.css';
import { buildAvatarUrl, getCachedLumiCfg } from './lumiAvatar';
import { FindTheWordGame } from './FindTheWordGame';
import { MemoryFlash } from './MemoryFlash';
import { GravityCatch } from './GravityCatch';
import { SpaceBlast } from './SpaceBlast';
import { BohrOrbit } from './BohrOrbit';
import { LumiDash } from './LumiDash';
import { normalizeQuestions, GAME_CATALOG } from './gameUtils';

const API_URL = 'https://script.google.com/macros/s/AKfycbxIgwbIuGymDkRREiidM0lJYZRi5KdKS217_inoU751zp_x3EAzzxcljjNHSxZc34zBxQ/exec';


/* ============================================================
   BANCO DE PROMPTS  (3 genéricos: 2 en inglés, 1 en español)
   - lang: "es" → Lumi responde en español | "en" → en inglés
   - {placeholders} se rellenan con los fields que llena el profe
   ============================================================ */

const PROMPT_BANK = [
    {
        id: 'general_lesson_es_1',
        label: '📗 Planeación Didáctica Integradora (Español)',
        lang: 'es',
        template:
            'Actúa como un experto en pedagogía. Diseña una planeación de clase estructurada paso a paso para el tema "{topic}". Objetivo de aprendizaje central: {goal}. Contexto institucional, recursos del libro o dinámicas específicas a incluir: {extraContext}. Asegúrate de secuenciar las fases de inicio, desarrollo y cierre con sus respectivos tiempos.',
        fields: [
            { key: 'topic', label: 'Tema o contenidos de la clase', type: 'text', placeholder: 'Ej: 1. Unidades y decenas, 2. Sumas llevando, 3. Restas prestando' },
            { key: 'goal', label: '¿Qué objetivo de aprendizaje quieres lograr?', type: 'text', placeholder: 'Ej: Que cuenten de diez en diez y resuelvan problemas del valor posicional' },
            { key: 'extraContext', label: 'Guía del libro, materiales concretos o dinámicas extras', type: 'textarea', placeholder: 'Ej: Páginas 1-2 del libro PR1ME. Usaremos bloques lógicos en la fase concreta...' },
        ],
    },
    {
        id: 'general_lesson_es_2',
        label: '📙 Planeación Basada en Secuencias Prácticas (Español)',
        lang: 'es',
        template:
            'Desarrolla una propuesta pedagógica detallada y aplicable en el aula. Tema central: "{topic}". Desempeño o meta esperada: {goal}. Recursos disponibles, páginas de referencia o enfoque del taller: {extraContext}. Estructura la sesión priorizando la participación activa, el andamiaje conceptual y una actividad de evaluación formativa al final.',
        fields: [
            { key: 'topic', label: 'Tema o contenidos de la clase', type: 'text', placeholder: 'Ej: Comprensión lectora, técnicas de dibujo, o circuitos eléctricos' },
            { key: 'goal', label: '¿Qué objetivo de aprendizaje quieres lograr?', type: 'text', placeholder: 'Ej: Que identifiquen la idea principal en textos narrativos cortos' },
            { key: 'extraContext', label: 'Guía del libro, materiales concretos o dinámicas extras', type: 'textarea', placeholder: 'Ej: Unidad 3 del texto guía. Se realizará un taller en parejas y un mapa mental.' },
        ],
    },
    {
        id: 'general_lesson_en_1',
        label: '📘 Core Conceptual Lesson Plan (English Response)',
        lang: 'en',
        template:
            'Act as an expert curriculum designer. Develop a comprehensive, step-by-step lesson plan for the topic "{topic}". Target learning goal: {goal}. Core textbook alignment, specific materials, or classroom dynamics: {extraContext}. Structure the timeline with clear warm-up, core presentation, controlled practice, and production stages.',
        fields: [
            { key: 'topic', label: 'Lesson Topic or Content Sequence', type: 'text', placeholder: 'Ex: 1. Place value: ones/tens, 2. Addition with regrouping' },
            { key: 'goal', label: 'What learning goal do you want to achieve?', type: 'text', placeholder: 'Ex: students count by tens and master base-10 place value' },
            { key: 'extraContext', label: 'Textbook pages, concrete materials, or extra activities', type: 'textarea', placeholder: 'Ex: We will use PR1ME pages 1-2 with straws. Session 3 will be a group workshop...' },
        ],
    },
    {
        id: 'prime_math_plan',
        label: '📐 PR1ME Math Plan (Currículo PR1ME)',
        lang: 'en',
        primeMath: true, // ← marca especial: activa el flujo con JSON de PR1ME Math
        template:
            'Act as an expert PR1ME Mathematics curriculum designer for a bilingual Colombian school. Design a step-by-step lesson plan STRICTLY anchored to the PR1ME Mathematics program. Follow the PR1ME lesson flow and the Concrete → Pictorial → Abstract progression. Anchor every activity to the official objectives; do not invent content outside PR1ME. (Per-session details are provided below.)',
        fields: [
            // Este campo lo escribe el profe manualmente (su meta real)
            { key: 'goal', label: 'Tu objetivo de aprendizaje para la sesión', type: 'text', placeholder: 'Ej: Que los estudiantes sumen sin reagrupar usando bloques base 10' },
        ],
    },
    {
        id: 'general_lesson_en_3',
        label: '🌐 Task-Based & Active Learning Plan (English Response)',
        lang: 'en',
        template:
            'Generate an interactive and engaging lesson plan focused on student-centered production. Topic to cover: "{topic}". Performance goal: {goal}. Special context, available space, tools, or methodology: {extraContext}. Break down the lesson into progressive steps, highlighting checking-for-understanding questions and scaffolding strategies.',
        fields: [
            { key: 'topic', label: 'Lesson Topic or Skill Focus', type: 'text', placeholder: 'Ex: Presentation skills, ecosystems, or laboratory safety protocols' },
            { key: 'goal', label: 'What learning goal do you want to achieve?', type: 'text', placeholder: 'Ex: Students design and present a 2-minute pitch using key vocabulary' },
            { key: 'extraContext', label: 'Special instructions, resources, or project phases', type: 'textarea', placeholder: 'Ex: Using flashcards and poster boards. Active group rotation every 10 minutes.' },
        ],
    },
];

const CLIL_RESOURCES = {
    thinkingSkills: {
        remembering: ["Recalling facts", "Naming concepts", "Listing examples", "Recognizing patterns", "Identifying key terms", "Matching concepts and definitions", "Labeling diagrams", "Recalling prior knowledge", "Identifying main ideas", "Noticing details"],
        understanding: ["Explaining ideas", "Summarizing information", "Interpreting data", "Classifying information", "Paraphrasing concepts", "Giving examples", "Explaining processes", "Describing relationships", "Identifying similarities", "Identifying differences"],
        applying: ["Using knowledge in new contexts", "Solving guided problems", "Demonstrating procedures", "Applying rules", "Using formulas", "Following instructions", "Carrying out experiments", "Using models or simulations", "Applying strategies", "Completing real-life tasks"],
        analyzing: ["Comparing and contrasting", "Identifying cause and effect", "Finding relationships", "Analyzing data", "Breaking information into parts", "Detecting patterns and trends", "Organizing information", "Distinguishing facts from opinions", "Identifying assumptions", "Analyzing arguments"],
        evaluating: ["Justifying decisions", "Evaluating sources", "Defending opinions", "Critiquing solutions", "Assessing effectiveness", "Ranking alternatives", "Judging reliability", "Reflecting on outcomes", "Providing constructive feedback", "Supporting conclusions with evidence"],
        creating: ["Designing a product", "Creating a model", "Proposing solutions", "Developing hypotheses", "Planning a project", "Inventing new ideas", "Designing experiments", "Creating presentations", "Producing written texts", "Building prototypes"]
    },
    languageFrames: {
        observing: ["I can see that...", "At first glance...", "It appears that...", "One noticeable detail is...", "This image shows...", "I observe that...", "A key detail is...", "What stands out is...", "It seems clear that..."],
        comparing: ["Both ___ and ___ have...", "___ is similar to ___ because...", "However, ___ differs from ___ in...", "In contrast to ___, ___...", "Compared to ___, ___...", "While ___, ___...", "On the other hand...", "___ is more/less ___ than ___"],
        predicting: ["I predict that...", "If ___ happens, then ___ will...", "It is likely that...", "This may result in...", "I expect that...", "There is a possibility that...", "This could lead to...", "It is possible that..."],
        expressingOpinion: ["In my opinion...", "I strongly believe that...", "From my perspective...", "I think that...", "I agree/disagree because...", "In my view...", "I would argue that...", "Personally, I believe that..."],
        justifying: ["This is supported by...", "The evidence shows that...", "According to the data...", "This proves that...", "Based on the information...", "One reason for this is...", "This can be explained by...", "The results indicate that..."]
    },
    thinkingRoutines: [
        "See-Think-Wonder", "Think-Puzzle-Explore", "3-2-1 Bridge", "Compass Points",
        "Claim-Support-Question", "Generate-Sort-Connect-Elaborate", "Color-Symbol-Image",
        "Headlines", "I Used to Think… Now I Think…", "What Makes You Say That?"
    ]
};

const DIMENSIONS = [
    "Emotional Dimension",
    "Personal Dimension",
    "Mental–Educational Dimension",
    "Health Dimension",
    "Economic and Financial Dimension",
    "Spiritual Dimension",
    "Social, Citizenship, and Coexistence Dimension",
    "Purpose and Life Path Dimension"
];

const VALUES = [
    "Commitment",
    "Respect",
    "Empathy",
    "Altruism",
    "Resilience"
];

const METHODOLOGIES = [
    { id: 'clil', name: 'CLIL (Aprendizaje Integrado de Contenidos y Lenguas Extranjeras)', desc: 'Inmersión lingüística a través del aprendizaje de materias curriculares en otra lengua.' },
    { id: 'meaningful', name: 'Aprendizaje Significativo', desc: 'Construcción de nuevo conocimiento conectándolo con la experiencia y saberes previos del estudiante.' },
    { id: 'abp', name: 'Aprendizaje Basado en Proyectos (Project-Based Learning – PBL)', desc: 'Producto complejo que responde a una pregunta o reto del mundo real.' },
    { id: 'pbl', name: 'Aprendizaje Basado en Problemas (Problem-Based Learning)', desc: 'Problema complejo que se analiza y resuelve de forma colaborativa.' },
    { id: 'cooperative', name: 'Aprendizaje Cooperativo', desc: 'Grupos pequeños con interdependencia positiva y roles definidos.' },
    { id: 'experiential', name: 'Aprendizaje Experiencial', desc: 'Aprender mediante la experiencia directa, la reflexión y la aplicación práctica.' },
    { id: 'visible', name: 'Visible Thinking – Rutinas de Pensamiento', desc: 'Estrategias de Project Zero para hacer visible el proceso de pensamiento y reflexión.' },
    { id: 'maker', name: 'Cultura Maker (Maker Education)', desc: 'Aprender haciendo: prototipado, herramientas y creación de soluciones físicas o digitales.' },
    { id: 'steam', name: 'Educación STEAM', desc: 'Integra Ciencia, Tecnología, Ingeniería, Arte y Matemáticas para retos interdisciplinarios.' },
    { id: 'gamification', name: 'Gamificación', desc: 'Mecánicas de juego: puntos, niveles, retos y recompensas.' },
    { id: 'neuro', name: 'Neuropedagogía', desc: 'Aportes de las neurociencias para favorecer la atención, la motivación y el aprendizaje.' },
    { id: 'socioemotional', name: 'Educación Socioemocional', desc: 'Desarrolla autoconocimiento, autorregulación, empatía y toma de decisiones.' },
    { id: 'storytelling', name: 'Storytelling Pedagógico', desc: 'Uso de narrativas para contextualizar contenidos y estimular la comprensión.' },
];

const INCLUSION_STRATEGIES = [
    "Apoyo visual y pictogramas",
    "Tiempo adicional para completar tareas",
    "Instrucciones segmentadas paso a paso",
    "Trabajo con par tutor",
    "Material manipulativo concreto",
    "Reducción de carga escrita",
    "Ubicación preferencial en el aula",
    "Uso de organizadores gráficos",
    "Evaluación oral como alternativa",
    "Refuerzo positivo frecuente",
];

const TERMS = ["First Term", "Second Term", "Third Term", "Fourth Term"];
const TERM_NUMBER = { "First Term": 1, "Second Term": 2, "Third Term": 3, "Fourth Term": 4 };
const MAX_SESSIONS = 3;

const ASSESSMENT_DIMENSIONS = ["Saber y Pensar (45%)", "Hacer e Innovar (45%)", "Ser y Sentir (10%)"];
const EVALUATION_INSTRUMENTS = ["Exit Ticket (formativa)", "Rúbrica", "Checklist", "Quiz", "Observación directa", "Simulacro tipo SABER", "Proyecto Maker", "Sustentación oral"];

const norm = (v) => String(v || "").trim().toUpperCase();
const safeParse = (val) => { if (!val) return null; if (typeof val === 'object') return val; try { return JSON.parse(val); } catch { return null; } };

const clean = (t) => String(t || '').replace(/\[cite:.*?\]/g, '').trim();

const STEP_ICONS = {
    hook: '🎣', question: '❓', routine: '🧠', development: '🔄',
    concrete: '🧱', pictorial: '🖼️', abstract: '🔢', closing: '🏁',
    sdg: '🌍', maker: '🛠️', check: '✅', default: '▸'
};

const detectStepIcon = (text) => {
    const t = String(text || '').toLowerCase();
    if (/(hook|gancho|engag)/.test(t)) return STEP_ICONS.hook;
    if (/(question|pregunta)/.test(t)) return STEP_ICONS.question;
    if (/(routine|rutina|think)/.test(t)) return STEP_ICONS.routine;
    if (/(concrete|concreto)/.test(t)) return STEP_ICONS.concrete;
    if (/(pictorial|pictórico|pictorico)/.test(t)) return STEP_ICONS.pictorial;
    if (/(abstract|abstracto)/.test(t)) return STEP_ICONS.abstract;
    if (/(closing|cierre|exit ticket)/.test(t)) return STEP_ICONS.closing;
    if (/(sdg|ods)/.test(t)) return STEP_ICONS.sdg;
    if (/(maker|project|proyecto)/.test(t)) return STEP_ICONS.maker;
    if (/(demonstrate|demuestra|show what)/.test(t)) return STEP_ICONS.check;
    if (/(develop|desarrollo)/.test(t)) return STEP_ICONS.development;
    return STEP_ICONS.default;
};

/* Convierte "The Hook" en pasos visuales */
/* Convierte "The Hook" en pasos visuales separados */
const parseHookSteps = (hook) => {
    if (!hook || typeof hook !== 'string') return [];
    const text = hook.trim();
    if (!text) return [];

    const buildStep = (raw, forcedIcon) => {
        // Separa el título del contenido si hay dos puntos (Ej: "Step 1: Warm-up" -> title: "Warm-up")
        const titleMatch = raw.match(/^([^:\n]{3,60}):\s*([\s\S]*)$/);
        const title = titleMatch ? titleMatch[1].trim() : '';
        const content = titleMatch ? titleMatch[2].trim() : raw.trim();
        return {
            icon: forcedIcon || detectStepIcon(title || content),
            title: title || raw.trim(),
            content
        };
    };

    // 1. NUEVA REGLA: Detecta patrones "Step X:" o "Paso X:" seguidos o con saltos de línea
    const stepRegex = /(?:Step|Paso)\s*\d+[:.-]?\s*/gi;
    if (stepRegex.test(text)) {
        // Divide el texto exacto cada vez que encuentra "Step 1:", "Step 2:", etc.
        const rawParts = text.split(/(?=(?:Step|Paso)\s*\d+[:.-]?\s*)/gi).map(s => s.trim()).filter(Boolean);
        if (rawParts.length >= 2) {
            return rawParts.map(part => {
                // Remueve el prefijo "Step X:" del inicio del texto antes de armar la tarjeta
                const cleanText = part.replace(/^(?:Step|Paso)\s*\d+[:.-]?\s*/i, '');
                return buildStep(cleanText);
            });
        }
    }

    // 2. Numeración tradicional tipo "1." o "2)"
    let parts = text.split(/(?=(?:^|\s)\d{1,2}[.)]\s)/g).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
        return parts.map(p => {
            const m = p.match(/^\d{1,2}[.)]\s*([\s\S]*)$/);
            return buildStep(m ? m[1] : p);
        });
    }

    // 3. Bloques marcados con emojis
    parts = text.split(/(?=[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])/gu).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
        return parts.map(p => {
            const em = p.match(/^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]+)\s*([\s\S]*)$/u);
            const icon = em ? em[1] : null;
            return buildStep(em ? em[2] : p, icon);
        });
    }

    // 4. Líneas separadas por salto de línea
    parts = text.split(/\n+/).map(s => s.trim()).filter(s => s.length > 15);
    if (parts.length >= 2) return parts.map(p => buildStep(p));

    // 5. Bloque único de respaldo
    return [buildStep(text, STEP_ICONS.development)];
};

/* Divide una cadena separada por comas en chips */
const toChips = (val) => String(val || '')
    .split(',').map(s => s.trim()).filter(Boolean);


/* Iconos SVG (reemplazan los emojis) */
const Icon = {
    eye: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>,
    pencil: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>,
    trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>,
    calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></svg>,
    user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></svg>,
    clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
    spark: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.8L20 10l-5.1 2.2L12 18l-1.9-5.8L5 10l5.1-1.2z" /></svg>,
    empty: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h10l6 6v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" /><path d="M14 4v6h6" /></svg>,
};

/* Asigna un tono de color según la materia */
const subjectTone = (subject) => {
    const s = String(subject || '').toUpperCase();
    if (s.includes('MATH') || s.includes('GEOMET') || s.includes('STATIS') || s.includes('CALCUL')) return 'math';
    if (s.includes('ENGLISH') || s.includes('LITERA') || s.includes('READ')) return 'english';
    if (s.includes('SCIEN') || s.includes('BIOLOG') || s.includes('CHEMIS') || s.includes('PHYSIC')) return 'science';
    if (s.includes('SOCIAL') || s.includes('HISTOR') || s.includes('GEOGRAP')) return 'social';
    if (s.includes('FINANC') || s.includes('ECONOM') || s.includes('BUSINE')) return 'finance';
    return 'default';
};

/* Fecha corta y legible: "17 jul 2026" */
const shortDate = (raw) => {
    if (!raw) return '';
    const iso = String(raw).split('T')[0];
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const m = meses[Number(parts[1]) - 1] || parts[1];
    return `${Number(parts[2])} ${m} ${parts[0]}`;
};

/* Rango de fechas compacto */
const dateRange = (start, finish) => {
    const a = shortDate(start), b = shortDate(finish);
    if (!a && !b) return 'Sin fechas';
    if (a && b && a !== b) return `${a} → ${b}`;
    return a || b;
};


/* Mensaje listo para pegar en la agenda digital */
const buildAgendaMessage = (plan) => {
    const subject = plan.Subject || '';
    const topic = plan.Topic || '';
    const task = plan['Parent Task'] || plan.Parent_Task || '';
    if (!task) return '';
    return `📚 ${subject} — ${topic}\n\n${task}`;
};

const extractFromMalla = (contentJson, termName) => {
    const json = safeParse(contentJson);
    const result = { dbas: [], standards: [], sdgs: [], objectives: [], contents: [], steps: [], challenge: '', raw: null };
    if (!json || !Array.isArray(json.terms)) return result;
    // Los 8 pasos institucionales viven fuera de los terms
    if (Array.isArray(json.methodology_learning_path?.steps)) {
        result.steps = json.methodology_learning_path.steps;
    }
    const targetNum = TERM_NUMBER[termName];
    const term = json.terms.find(t => Number(t.term_number) === targetNum) || json.terms[0];
    if (!term) return result;
    result.raw = term;
    if (Array.isArray(term.curriculum_framework)) {
        term.curriculum_framework.forEach(fw => {
            if (fw.standard) result.standards.push(String(fw.standard));
            if (Array.isArray(fw.dbas)) fw.dbas.forEach(d => { if (d && d.descriptor) result.dbas.push(`DBA #${d.id}: ${clean(d.descriptor)}`); });
        });
    }
    // ODS del periodo (tu JSON usa "sdg"; se aceptan variantes por compatibilidad)
    const sdgRaw = term.sdg || term.sdg_alignment || term.SDG || term.ods;
    if (sdgRaw) {
        if (Array.isArray(sdgRaw)) sdgRaw.forEach(s => { if (s) result.sdgs.push(String(s)); });
        else result.sdgs.push(String(sdgRaw));
    }
    // Contexto del reto, si existe
    if (term.challenge_context) result.challenge = clean(term.challenge_context);
    if (term.objectives && typeof term.objectives === 'object') Object.values(term.objectives).forEach(o => { if (o) result.objectives.push(clean(o)); });
    // Contenidos específicos del periodo
    if (Array.isArray(term.competency_based_plan)) {
        term.competency_based_plan.forEach(cp => {
            const outcome = cp.general_learning_outcome;
            const specifics = Array.isArray(cp.specific_learning_outcomes) ? cp.specific_learning_outcomes.join(', ') : '';
            if (outcome) result.contents.push(specifics ? `${outcome} → ${specifics}` : outcome);
        });
    }
    result.dbas = [...new Set(result.dbas)];
    result.standards = [...new Set(result.standards)];
    result.contents = [...new Set(result.contents)];
    result.sdgs = [...new Set(result.sdgs)];
    result.objectives = [...new Set(result.objectives)];
    return result;
};


/* Extrae SOLO lo pedagógicamente relevante del plan de área */
const extractFromSyllabus = (syllabusJson) => {
    const j = safeParse(syllabusJson);
    const out = { principles: [], principleNames: [], methodology: '', focus: '', strategies: [], competencies: [], resources: [], inclusion: '' };
    if (!j) return out;

    const pr = j.articulacion_institucional_valores_crear?.principios;
    if (pr && typeof pr === 'object') {
        Object.entries(pr).forEach(([k, v]) => { out.principles.push(`${k}: ${v}`); out.principleNames.push(k); });
    }

    const niveles = j.organizacion_curricular_por_niveles || {};
    const metod = [], recs = [];
    Object.values(niveles).forEach(n => {
        if (n?.metodologia_eje) metod.push(n.metodologia_eje);
        if (Array.isArray(n?.recursos_clave)) recs.push(...n.recursos_clave);
    });
    out.methodology = metod.join(' | ');
    out.resources = [...new Set(recs)].slice(0, 4);

    if (Array.isArray(j.competencias_especificas_evaluadas)) out.competencies = j.competencias_especificas_evaluadas.slice(0, 5);
    if (Array.isArray(j.estrategias_pedagogicas_y_didacticas_clave)) {
        out.strategies = j.estrategias_pedagogicas_y_didacticas_clave.map(s => String(s).split(':')[0].trim()).slice(0, 5);
    }
    if (j.inclusion_y_diversidad?.enfoque) out.inclusion = j.inclusion_y_diversidad.enfoque;
    out.focus = j.institucion?.enfoque_general || '';
    return out;
};

/* Construye el prompt maestro que se envía a Gemini */
const buildMasterPrompt = ({ promptDef, values, sessions, subject, grade, term, mallaCtx, syllabusJson, methodology }) => {
    const langLine = promptDef.lang === 'en'
        ? 'IMPORTANT: Respond ENTIRELY in ENGLISH.'
        : 'IMPORTANTE: Responde COMPLETAMENTE en ESPAÑOL.';

    let userRequest = promptDef.template;
    (promptDef.fields || []).forEach(f => {
        userRequest = userRequest.replace(new RegExp('\\{' + f.key + '\\}', 'g'), values[f.key] || '');
    });

    const dbaList = (mallaCtx?.dbas || []).slice(0, 6).join('\n- ');
    const objList = (mallaCtx?.objectives || []).join('\n- ');
    const sdgList = (mallaCtx?.sdgs || []).join('\n- ');
    const stdList = (mallaCtx?.standards || []).join('\n- ');
    const contentList = (mallaCtx?.contents || []).join('\n- ');
    const stepsList = (mallaCtx?.steps || []).join('\n');
    const syl = extractFromSyllabus(syllabusJson);
    const principlesList = syl.principleNames.join(', ');
    // Agrupadas por categoría: 4 por grupo en vez de las 60 completas
    const skillsList = Object.entries(CLIL_RESOURCES.thinkingSkills)
        .map(([cat, arr]) => `${cat}: ${arr.slice(0, 4).join(', ')}`).join(' | ');
    const inclusionList = INCLUSION_STRATEGIES.join(', ');
    const dimensionsList = DIMENSIONS.join(', ');
    const valuesList = VALUES.join(', ');

    return `Eres Lumi, un asistente experto en diseño pedagógico CLIL para el Colegio CREAR (Colombia). Tu tarea es crear ${sessions} sesión(es) de clase de altísima calidad, ancladas en el currículo oficial.

${langLine}

=== CONTEXTO ACADÉMICO ===
Materia: ${subject} | Grado: ${grade} | Periodo: ${term}
${mallaCtx?.challenge ? `Reto del periodo: ${mallaCtx.challenge}` : ''}

=== DBAs disponibles ===
- ${dbaList || 'No disponibles'}

=== OBJETIVOS OFICIALES DEL TÉRMINO ===
- ${objList || 'No disponibles'}

=== ODS DEL PERIODO (usa uno de estos) ===
- ${sdgList || 'No disponibles'}

=== ESTÁNDARES DEL PERIODO (usa uno de estos) ===
- ${stdList || 'No disponibles'}

=== CONTENIDOS ESPECÍFICOS DEL PERIODO ===
- ${contentList || 'No disponibles'}

=== 8 PASOS INSTITUCIONALES (estructura del Hook) ===
${stepsList || 'Estructura libre en 8 pasos'}

=== MARCO PEDAGÓGICO ===
Recursos: ${syl.resources.join(', ') || 'No especificados'}
Competencias evaluadas: ${syl.competencies.join(' · ') || 'No especificadas'}
Enfoque de inclusión: ${syl.inclusion || 'DUA'}

=== PRINCIPIOS CREAR (usa uno) ===
${principlesList || 'No disponibles'}

${!methodology && syl.methodology ? `=== METODOLOGÍA INSTITUCIONAL ===\n${syl.methodology}` : ''}

=== DIMENSIONES (usa una) ===
${dimensionsList}

=== VALORES (usa uno) ===
${valuesList}

=== METODOLOGÍA SELECCIONADA POR EL DOCENTE ===
${methodology ? `${methodology.name}: ${methodology.desc}` : 'No especificada, usa la metodología institucional'}

=== ESTRATEGIAS DE INCLUSIÓN (usa 3) ===
${inclusionList}

=== SOLICITUD DEL DOCENTE ===
${userRequest}

=== REGLAS DE DISEÑO ===
1. El desarrollo de clase (campo "The Hook") DEBE seguir los 8 pasos institucionales listados arriba, pero cada paso debe contener una ACTIVIDAD CONCRETA Y DETALLADA (qué hace el docente, qué hacen los estudiantes, qué se dice o pregunta), NO solo el título del paso. Cada paso debe tener entre 2 y 4 frases describiendo la acción real en el aula. Escribe cada paso en este formato exacto para que la interfaz lo separe bien: "Paso 1: [Título corto]: [descripción de la actividad]". Solo incluye el método Singapur (Concreto → Pictórico → Abstracto) dentro del paso de aplicación SI la materia es de contenido lógico-matemático o científico; para materias socioemocionales, de lenguaje o sociales, reemplázalo por una secuencia de aplicación coherente con la metodología seleccionada (por ejemplo, vivencia → reflexión → transferencia).
2. NO inventes ni copies enlaces de videos, imágenes o recursos web. Deja "Activity Link" y "Richmond Resources" como cadena vacía "". El docente los agrega manualmente.
3. Ancla cada sesión a un DBA real de la lista, un objetivo oficial, y una dimensión SIEE (Saber y Pensar 45%, Hacer e Innovar 45%, Ser y Sentir 10%). Para "SDG_Connection" usa EXACTAMENTE uno de los ODS listados arriba, copiado literal. No inventes otros ODS.
4. El vocabulario "Vocabulary Big 5" debe tener exactamente 5 palabras clave separadas por comas.
5. Para "Thinking Skill" elige 1 o 2 habilidades EXACTAMENTE de esta lista (cópialas literal, separadas por coma, sin inventar otras): ${skillsList}
6. Elige EXACTAMENTE uno de cada lista para: "Standard" (de los estándares), "Dimension" (de las dimensiones), "Principle" (de los principios, solo el nombre antes de los dos puntos) y "Value" (de los valores). Cópialos literal, sin inventar.
7. Los 8 pasos del "The Hook" DEBEN construirse APLICANDO la metodología seleccionada como principio organizador de cada actividad, no como etiqueta. Ella define QUÉ actividad ocurre en cada paso. Guía: CLIL → andamiaje lingüístico (input/output guiado); Significativo → activar saberes previos; ABP/PBL → investigar, producir, socializar; Cooperativo → roles e interdependencia; Experiencial → experiencia, reflexión, aplicación; Visible Thinking → rutinas guiadas paso a paso; Maker/STEAM → prototipado interdisciplinar; Gamificación → puntos, niveles, retos; Neuropedagogía → pausas activas y consolidación; Socioemocional → identificar/regular emociones, dinámicas vivenciales, role-play, reflexión; Storytelling → hilo narrativo continuo.
7b. La rutina de "Thinking Routine" NO puede quedar solo como nombre: desarróllala dentro del paso donde mejor encaje (activación o desarrollo), escribiendo sus movimientos concretos con las preguntas o consignas que da el docente, conectados al tema de la sesión.
8. Dentro de los pasos incluye, donde sea pertinente, ajustes razonables de inclusión (DUA/PIAR) marcados con el prefijo "[Inclusión]" para estudiantes con necesidades específicas.
9. Para "Learning_Evidence" describe la evidencia concreta y observable del aprendizaje, con esta estructura de fases.

=== FORMATO DE RESPUESTA (OBLIGATORIO) ===
Devuelve ÚNICAMENTE un array JSON válido (sin texto adicional, sin markdown). Cada elemento es una sesión con EXACTAMENTE estas claves:
[
  {
    "Topic": "",
    "Objective": "",
    "The Hook": "",
    "Vocabulary Big 5": "",
    "Thinking Skill": "",
    "Language Frame": "",
    "Thinking Routine": "",
    "Parent Task": "",
    "Weekly Challenge": "",
    "DBA_Reference": "",
    "SDG_Connection": "",
    "Assessment_Dimension": "",
    "Evaluation_Instrument": "",
    "Standard": "",
    "Dimension": "",
    "Principle": "",
    "Value": "",
    "Methodology": "",
    "Inclusion_Adjustments": ["", "", ""],
    "Learning_Evidence": {
      "product": "",
      "phases": [
        { "moment": "", "action": "", "collect": "", "criteria": "" }
      ]
    },
    "Session_Number": "",
    "Feedback_Questions": [
      { "q": "", "opts": ["", "", "", ""], "correct": 0 }
    ]
  }
]
Para "Learning_Evidence": "product" es el producto tangible que entrega el estudiante; "phases" son 3 momentos de la clase donde se recoge evidencia, cada uno con "moment" (inicio/desarrollo/cierre), "action" (qué hace el estudiante), "collect" (cómo lo recoge el docente) y "criteria" (qué indica logro).
Para "Inclusion_Adjustments" lista 3 estrategias tomadas EXACTAMENTE de las disponibles arriba.
Para "Feedback_Questions" genera exactamente 5 objetos de pregunta para jugar al cierre de la clase, en el mismo idioma de la planeación. Cada objeto tiene:
- "q": la pregunta de comprensión sobre el tema de la sesión.
- "opts": exactamente 4 opciones de respuesta cortas (máximo 6 palabras cada una), plausibles y del nivel del grado.
- "correct": el índice (0, 1, 2 o 3) de la opción correcta dentro de "opts". Varía la posición de la correcta entre preguntas.
Genera exactamente ${sessions} objeto(s) en el array.`;
};

/* Prompt COMPACTO exclusivo para PR1ME Math (mínimos tokens de entrada) */
/* Prompt PR1ME: estructura de 8 pasos PR1ME + listas curriculares para que la IA
   elija ODS, estándar, DBA, principio, dimensión y valor (como el prompt genérico) */
const buildPrimePrompt = ({ sessionsContext, sessionsCount, subject, grade, term, methodology, primeCollection, primePart, lessonFlow, problemSteps, mallaCtx, syllabusJson }) => {
    const methodLine = methodology
        ? `Selected methodology: ${methodology.name}.`
        : 'Use the institutional methodology.';

    // Listas curriculares (las mismas fuentes que usa el prompt genérico)
    const dbaList = (mallaCtx?.dbas || []).slice(0, 6).join('\n- ');
    const sdgList = (mallaCtx?.sdgs || []).join('\n- ');
    const stdList = (mallaCtx?.standards || []).join('\n- ');
    const syl = extractFromSyllabus(syllabusJson);
    const principlesList = syl.principleNames.join(', ');
    const dimensionsList = DIMENSIONS.join(', ');
    const valuesList = VALUES.join(', ');

    return `You are Lumi, an expert PR1ME Mathematics lesson designer for Colegio CREAR (bilingual, Colombia). Respond ENTIRELY in ENGLISH. Create ${sessionsCount} distinct high-quality session(s).

Subject: ${subject} | Grade: ${grade} | Term: ${term}
PR1ME collection: "${primeCollection}" (${primePart}). ${methodLine}

=== TERM DBAs (pick a real one for "DBA_Reference") ===
- ${dbaList || 'DBA #1'}

=== TERM SDGs (copy EXACTLY one into "SDG_Connection") ===
- ${sdgList || 'SDG 4: Quality Education'}

=== TERM STANDARDS (copy EXACTLY one into "Standard") ===
- ${stdList || 'NUMERICAL THINKING AND NUMBER SYSTEMS'}

=== CREAR PRINCIPLES (copy EXACTLY one name into "Principle") ===
${principlesList || 'Cuidado, Responsabilidad, Excelencia, Amor por el aprendizaje, Relaciones sanas y armoniosas'}

=== DIMENSIONS (copy EXACTLY one into "Dimension") ===
${dimensionsList}

=== VALUES (copy EXACTLY one into "Value") ===
${valuesList}

=== "The Hook" — MUST follow EXACTLY these 8 PR1ME steps, each as "Paso N: [Short Title]: [2-3 sentence concrete activity adapted to the session topic]" ===
Paso 1: Let's Remember: activate prior knowledge tied to the topic.
Paso 2: EXPLORE: pose a motivating problem to revisit at the end.
Paso 3: Concrete: students use manipulatives (base-ten blocks, counters) hands-on.
Paso 4: Pictorial: students represent with drawings/diagrams (number lines, bar models).
Paso 5: Abstract: students write equations / number sentences / vertical form.
Paso 6: Let's Do: teacher guides worked examples.
Paso 7: Let's Practice: independent practice or a reinforcement game.
Paso 8: Mind Stretcher & Reflection: a non-routine problem (Understand→Plan→Answer→Check→+Plus) + short reflection.

=== RULES (fill EVERY field, none empty except the two noted) ===
- Anchor each session to the official PR1ME objectives provided per block; do NOT invent content outside PR1ME.
- "DBA_Reference", "SDG_Connection", "Standard", "Principle", "Dimension", "Value": choose EXACTLY one from the lists above, copied literally. Never leave them empty.
- "Vocabulary Big 5": exactly 5 comma-separated keywords.
- "Thinking Skill": 1-2 from: applying, evaluating, analyzing, understanding.
- "Assessment_Dimension": one of "Saber y Pensar (45%)", "Hacer e Innovar (45%)", "Ser y Sentir (10%)".
- "Evaluation_Instrument": a concrete formative instrument (e.g. Exit Ticket, Rúbrica, Quiz, Observación directa).
- "Language Frame": 2-3 sentence starters students use, tied to the topic.
- "Thinking Routine": name a routine AND briefly develop it inside a step.
- "Parent Task" and "Weekly Challenge": concrete, tied to the topic.
- "Methodology": ${methodology ? methodology.name : 'the institutional methodology'}.
- "Inclusion_Adjustments": exactly 3 short adjustments (DUA/PIAR).
- Leave ONLY "Activity Link" and "Richmond Resources" as "". The teacher adds them.
- "Feedback_Questions": exactly 5 objects, each { "q", "opts":[4 short options], "correct": index 0-3 }. Vary the correct position.

=== OUTPUT (JSON ONLY, no markdown, no extra text) ===
Return an array of EXACTLY ${sessionsCount} object(s), one per SESSION block below, in order. Each object with these keys:
{"Topic":"","Objective":"","The Hook":"","Vocabulary Big 5":"","Thinking Skill":"","Language Frame":"","Thinking Routine":"","Parent Task":"","Weekly Challenge":"","DBA_Reference":"","SDG_Connection":"","Assessment_Dimension":"","Evaluation_Instrument":"","Standard":"","Dimension":"","Principle":"","Value":"","Methodology":"","Inclusion_Adjustments":["","",""],"Learning_Evidence":{"product":"","phases":[{"moment":"","action":"","collect":"","criteria":""}]},"Session_Number":"","Feedback_Questions":[{"q":"","opts":["","","",""],"correct":0}]}

"Learning_Evidence": "product" = tangible student output; "phases" = 3 moments (inicio/desarrollo/cierre) each with action, collect, criteria.

=== SESSIONS (one object each, keep separate) ===
${sessionsContext}`;
};

/* Extrae y parsea el array JSON de la respuesta cruda de Gemini */
const parseGeminiSessions = (raw) => {
    if (!raw) return null;
    let text = String(raw).trim();
    // quitar fences de markdown si vinieran
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    // intentar parseo directo
    let parsed = null;
    try { parsed = JSON.parse(text); } catch { }
    if (!parsed) {
        // buscar el primer [ ... ] del texto
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        if (start !== -1 && end !== -1 && end > start) {
            try { parsed = JSON.parse(text.slice(start, end + 1)); } catch { }
        }
    }
    if (!parsed) return null;
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
        const arrKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
        return arrKey ? parsed[arrKey] : [parsed];
    } // por si devuelve un solo objeto
    return null;
};

export const PlanningCLIL = ({ userData }) => {
    const [view, setView] = useState('hub');
    const [showGameModal, setShowGameModal] = useState(false);
    const [showSessionsInfoModal, setShowSessionsInfoModal] = useState(false);

    /* ---------- Flujo Lumi ---------- */
    // stages: 'welcome' | 'context' | 'prompt' | 'fields' | 'generating' | 'review'
    const [lumiStage, setLumiStage] = useState('welcome');
    const [selSubject, setSelSubject] = useState('');
    const [selGrade, setSelGrade] = useState('');
    const [selTerm, setSelTerm] = useState('');
    const [messages, setMessages] = useState([]);
    const [lumiTyping, setLumiTyping] = useState(false);
    const chatEndRef = useRef(null);

    /* Lumi: prompt + campos + sesiones + resultado */
    const [selectedPromptId, setSelectedPromptId] = useState('');
    const [previewPrompt, setPreviewPrompt] = useState(null);
    const [promptValues, setPromptValues] = useState({});
    const [numSessions, setNumSessions] = useState(1);
    const [selMethodology, setSelMethodology] = useState('');
    const [lumiCtx, setLumiCtx] = useState(null);       // { ctx, syllabus }
    const [genSessions, setGenSessions] = useState([]); // sesiones generadas (editable)
    const [genError, setGenError] = useState('');

    /* ---------- Datos curriculares ---------- */
    const [curriculumMaps, setCurriculumMaps] = useState([]);
    const [syllabusTemplates, setSyllabusTemplates] = useState([]);
    const [loadingCurriculum, setLoadingCurriculum] = useState(false);
    const [primeMathMaps, setPrimeMathMaps] = useState([]);


    /* ---------- Estado del selector PR1ME Math ---------- */
    const [primeData, setPrimeData] = useState(null);        // JSON parseado del grado+term
    const [primeChapterIdx, setPrimeChapterIdx] = useState(''); // índice del capítulo elegido
    const [primeUnitIdx, setPrimeUnitIdx] = useState('');       // índice de la unidad elegida
    const [primeSelectedSubs, setPrimeSelectedSubs] = useState([]); // ids de subunidades elegidas
    const [primeError, setPrimeError] = useState('');
    const [primeParts, setPrimeParts] = useState([]);

    const [primeSessions, setPrimeSessions] = useState([]);
    const [primeNumSessions, setPrimeNumSessions] = useState(0);

    /* ---------- Planner original ---------- */
    const [plannings, setPlannings] = useState([]);
    const [syncQueue, setSyncQueue] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [summaryTab, setSummaryTab] = useState('resumen');
    const [selectedGame, setSelectedGame] = useState('');
    const [activeGame, setActiveGame] = useState(null);
    const [copiedAgenda, setCopiedAgenda] = useState(false);
    const [planReviews, setPlanReviews] = useState([]);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [savingReview, setSavingReview] = useState(false);
    const [reviewForm, setReviewForm] = useState({ score: 80, feedback: '', areas: '', next: '' });
    const [selectedSummary, setSelectedSummary] = useState(null);
    const [customFrame, setCustomFrame] = useState("");
    const [localCustomFrames, setLocalCustomFrames] = useState([]);
    const [filterGrade, setFilterGrade] = useState("");
    const [filterSubject, setFilterSubject] = useState("");
    const [filterTerm, setFilterTerm] = useState("");

    const isAdmin = String(userData.ROL).trim().toLowerCase() === 'admin';
    const userGrades = userData.Assigned_Grade?.split(',').map(g => g.trim()) || [];
    const userSubjects = userData.Assigned_Subject?.split(',').map(s => s.trim()) || [];
    const teacherFirstName = (userData.Teacher_Name || userData.User_Key || 'profe').split(' ')[0];
    const teacherKeyForAvatar = String(userData.Teacher_Key || userData.User_Key || '').trim();
    const LUMI_AVATAR = buildAvatarUrl(getCachedLumiCfg(teacherKeyForAvatar), 120);

    const gradeOptions = isAdmin ? [...new Set(plannings.map(p => p.Grade))] : userGrades;
    const subjectOptions = isAdmin ? [...new Set(plannings.map(p => p.Subject))] : userSubjects;

    const [selectedGrades, setSelectedGrades] = useState([]);
    const [formsData, setFormsData] = useState({});

    useEffect(() => { fetchData(); fetchCurriculum(); fetchPlanReviews(); }, []);
    useEffect(() => {
        const scrollToEnd = () => {
            const el = chatEndRef.current;
            if (!el) return;
            const container = el.closest('.lumi-chat-stream');
            if (container) {
                container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            } else {
                el.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        };
        const t1 = setTimeout(scrollToEnd, 100);
        const t2 = setTimeout(scrollToEnd, 400);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [messages, lumiTyping, lumiStage]);

    /* Trae las revisiones de planeación hechas por coordinación */
    const fetchPlanReviews = async () => {
        try {
            const resp = await fetch(`${API_URL}?sheet=Class_Observations`);
            const data = await resp.json();
            if (Array.isArray(data)) {
                setPlanReviews(data.filter(r => String(r.ID_Lesson_Ref || '').startsWith('PLAN-')));
            }
        } catch (e) { console.error("Error cargando revisiones:", e); }
    };


    /* ================= CURRÍCULO ================= */
    const fetchCurriculum = async () => {
        setLoadingCurriculum(true);
        try {
            const [mapsResp, syllResp, primeResp] = await Promise.all([
                fetch(`${API_URL}?sheet=Curriculum_Maps`).then(r => r.json()),
                fetch(`${API_URL}?sheet=Syllabus_Templates`).then(r => r.json()),
                fetch(`${API_URL}?sheet=Prime_Math`).then(r => r.json()).catch(() => []),
            ]);
            setCurriculumMaps(Array.isArray(mapsResp) ? mapsResp : []);
            setSyllabusTemplates(Array.isArray(syllResp) ? syllResp : []);
            setPrimeMathMaps(Array.isArray(primeResp) ? primeResp : []);
        } catch (e) { console.error("Error cargando currículo:", e); }
        setLoadingCurriculum(false);
    };

    /* Normaliza grados: acepta "FIRST GRADE", "1", "GRADO 1", "PRIMERO"... y los lleva a un número */
    const gradeToNum = (g) => {
        const s = norm(g);
        const map = {
            'FIRST GRADE': '1', 'GRADE 1': '1', 'GRADO 1': '1', 'PRIMERO': '1', '1': '1', 'FIRST': '1',
            'SECOND GRADE': '2', 'GRADE 2': '2', 'GRADO 2': '2', 'SEGUNDO': '2', '2': '2', 'SECOND': '2',
            'THIRD GRADE': '3', 'GRADE 3': '3', 'GRADO 3': '3', 'TERCERO': '3', '3': '3', 'THIRD': '3',
            'FOURTH GRADE': '4', 'GRADE 4': '4', 'GRADO 4': '4', 'CUARTO': '4', '4': '4', 'FOURTH': '4',
            'FIFTH GRADE': '5', 'GRADE 5': '5', 'GRADO 5': '5', 'QUINTO': '5', '5': '5', 'FIFTH': '5',
        };
        if (map[s]) return map[s];
        // último recurso: extrae el primer dígito que aparezca
        const m = s.match(/\d+/);
        return m ? m[0] : s;
    };

    /* Busca el JSON de PR1ME Math solo por Grade (Subject debe ser MATH). El term NO se usa. */
    const resolvePrimeMath = (subject, grade) => {
        const isMath = /math|matem|geomet|statis|estad|calcul/i.test(String(subject || ''));
        if (!isMath) return { found: false, reason: 'not_math', data: null };

        // Diagnóstico: si la hoja no cargó, avísalo claro
        if (!Array.isArray(primeMathMaps) || primeMathMaps.length === 0) {
            console.warn('[PR1ME] primeMathMaps está vacío. Revisa el GET a la hoja Prime_Math.');
            return { found: false, reason: 'empty_sheet', data: null };
        }

        const gNum = gradeToNum(grade);
        const candidates = primeMathMaps.filter(m => gradeToNum(m.Grade) === gNum);

        console.log('[PR1ME] grado pedido:', grade, '→', gNum,
            '| filas totales:', primeMathMaps.length,
            '| coincidencias de grado:', candidates.length,
            '| grados en tabla:', primeMathMaps.map(m => m.Grade));

        if (!candidates.length) return { found: false, reason: 'no_row', data: null };

        // Devuelve TODAS las filas del grado (para grado 5 hay dos: parte 1 y 2)
        return { found: true, reason: '', rows: candidates };
    };

    /* Parsea una fila concreta de Prime_Math y valida su JSON */
    const loadPrimeRow = (row) => {
        const data = safeParse(row.Content_JSON);
        if (!data || !Array.isArray(data.capitulos)) return { ok: false, data: null };
        return { ok: true, data };
    };

    /* Materias que comparten la malla/plan de área de MATH */
    const mathFamily = (subject) => /math|matem|geomet|statis|estad|calcul/i.test(String(subject || ''));

    const resolveCurriculum = (subject, grade, term) => {
        // Si es GEOMETRY/STATISTICS/etc., también aceptamos filas de MATH como respaldo
        const subjectMatches = (rowSubject) =>
            norm(rowSubject) === norm(subject) ||
            (mathFamily(subject) && mathFamily(rowSubject));

        const malla =
            curriculumMaps.find(m => subjectMatches(m.Subject) && norm(m.Grade) === norm(grade) && norm(m.Term) === norm(term))
            || curriculumMaps.find(m => subjectMatches(m.Subject) && norm(m.Grade) === norm(grade));
        const syllabus =
            syllabusTemplates.find(s => subjectMatches(s.Subject) && norm(s.Grade) === norm(grade))
            || syllabusTemplates.find(s => subjectMatches(s.Subject));
        const ctx = malla ? extractFromMalla(malla.Content_JSON, term) : { dbas: [], standards: [], sdgs: [], objectives: [], contents: [], steps: [], challenge: '', raw: null };
        return { malla, syllabus, ctx };
    };

    /* ================= LUMI ================= */
    const lumiQueue = useRef([]);
    const lumiProcessing = useRef(false);

    const processLumiQueue = () => {
        if (lumiProcessing.current) return;
        const next = lumiQueue.current.shift();
        if (!next) return;
        lumiProcessing.current = true;
        setLumiTyping(true);
        // tiempo de "escribiendo" proporcional a la longitud del mensaje (se siente humano)
        const typingTime = Math.min(1800, Math.max(700, next.text.length * 20));
        setTimeout(() => {
            setLumiTyping(false);
            setMessages(prev => [...prev, { from: 'lumi', text: next.text }]);
            // pequeña pausa entre mensajes antes del siguiente
            setTimeout(() => {
                lumiProcessing.current = false;
                if (next.onDone) next.onDone();
                processLumiQueue();
            }, 450);
        }, typingTime);
    };

    const pushLumi = (text, _delay, onDone) => {
        lumiQueue.current.push({ text, onDone });
        processLumiQueue();
    };
    const pushUser = (text) => setMessages(prev => [...prev, { from: 'user', text }]);

    const openLumi = () => {
        setView('lumi');
        setLumiStage('welcome');
        setMessages([]);
        setSelSubject(''); setSelGrade(''); setSelTerm('');
        setSelectedPromptId(''); setPromptValues({}); setNumSessions(1); setSelMethodology('');
        setGenSessions([]); setGenError(''); setLumiCtx(null);
        setPrimeData(null); setPrimeChapterIdx(''); setPrimeUnitIdx('');
        setPrimeSelectedSubs([]); setPrimeParts([]); setPrimeError('');
        setPrimeSessions([]); setPrimeNumSessions(0);
        pushLumi(`¡Hola, ${teacherFirstName}! 👋 Soy Lumi, tu copiloto de planeaciones.`);
        pushLumi('Diseño tus clases contigo usando tu malla curricular y tu plan de área. Empecemos por elegir qué vas a planear.', null, () => setLumiStage('context'));
    };

    const confirmContext = () => {
        if (!selSubject || !selGrade || !selTerm) return;
        pushUser(`${selSubject} · ${selGrade} · ${selTerm}`);
        setLumiStage('loading');
        pushLumi(`Perfecto. Buscando tu malla y plan de área de ${selSubject} para ${selGrade} (${selTerm})…`);
        const { malla, syllabus, ctx } = resolveCurriculum(selSubject, selGrade, selTerm);
        setLumiCtx({ ctx, syllabus });
        const bits = [];
        if (malla) bits.push(`✅ Malla encontrada (${ctx.dbas.length} DBAs, ${ctx.objectives.length} objetivos)`);
        else bits.push('⚠️ No encontré malla exacta, pero puedo continuar');
        if (syllabus) bits.push('✅ Plan de área encontrado');
        pushLumi(bits.join(' · '));
        pushLumi('Ahora elige una plantilla de prompt para empezar 👇', null, () => setLumiStage('prompt'));
    };

    const selectPrompt = (promptDef) => {
        setSelectedPromptId(promptDef.id);
        setPromptValues({});
        // Reinicia selección PR1ME
        setPrimeData(null); setPrimeChapterIdx(''); setPrimeUnitIdx('');
        setPrimeSelectedSubs([]); setPrimeError(''); setPrimeParts([]);
        setPrimeSessions([]); setPrimeNumSessions(0);
        pushUser(`Plantilla: ${promptDef.label}`);
        setLumiStage('loading');

        // Flujo especial: plantilla PR1ME Math
        // Flujo especial: plantilla PR1ME Math
        if (promptDef.primeMath) {
            const res = resolvePrimeMath(selSubject, selGrade);
            if (!res.found) {
                let msg = '';
                if (res.reason === 'not_math') {
                    msg = `⚠️ La plantilla PR1ME Math solo funciona con materias de matemáticas. Elegiste "${selSubject}". Vuelve y escoge otra plantilla, o cambia de materia.`;
                } else if (res.reason === 'empty_sheet') {
                    msg = `⚠️ No pude cargar la tabla Prime_Math (llegó vacía). Revisa que la hoja exista con ese nombre exacto y que el despliegue esté actualizado. Luego toca 🔄 y reintenta.`;
                } else {
                    msg = `⚠️ No encontré datos de PR1ME Math para ${selGrade}. Verifica que ese grado esté escrito igual en la tabla (ej: "FIRST GRADE").`;
                }
                pushLumi(msg, null, () => setLumiStage('prompt'));
                return;
            }

            // Si el grado tiene varios libros (ej. grado 5), pregunta cuál usar
            if (res.rows.length > 1) {
                setPrimeParts(res.rows);
                pushLumi(`Este grado tiene ${res.rows.length} libros PR1ME Math. Elige con cuál vas a planear 👇`, null, () => setLumiStage('primeParts'));
                return;
            }

            // Un solo libro: cárgalo directo
            // Un solo libro: cárgalo directo
            const loaded = loadPrimeRow(res.rows[0]);
            if (!loaded.ok) {
                pushLumi(`⚠️ Encontré la fila de ${selGrade}, pero el Content_JSON no se pudo leer. Revisa que el JSON de esa celda esté completo.`, null, () => setLumiStage('prompt'));
                return;
            }
            setPrimeData(loaded.data);
            setPrimeNumSessions(0);
            setPrimeSessions([]);
            pushLumi(`Perfecto. Cargué el libro PR1ME Math de ${selGrade}. Primero dime cuántas sesiones quieres planear 👇`, null, () => setLumiStage('primeCount'));
            return;
        }

        pushLumi(`Genial. Completa estos datos y dime cuántas sesiones quieres (máximo ${MAX_SESSIONS}).`, null, () => setLumiStage('fields'));
    };

    /* El profe elige qué libro PR1ME usar cuando el grado tiene varias partes */
    const selectPrimePart = (row) => {
        pushUser(`Libro: ${row.Name}`);
        const loaded = loadPrimeRow(row);
        if (!loaded.ok) {
            pushLumi(`⚠️ Ese libro (${row.Name}) tiene el Content_JSON dañado o incompleto. Revisa esa celda.`, null, () => setLumiStage('prompt'));
            return;
        }
        setPrimeData(loaded.data);
        setPrimeParts([]);
        setPrimeNumSessions(0);
        setPrimeSessions([]);
        setLumiStage('loading');
        pushLumi(`Genial, usaré ${row.Name}. Primero dime cuántas sesiones quieres planear 👇`, null, () => setLumiStage('primeCount'));
    };

    const currentPrompt = PROMPT_BANK.find(p => p.id === selectedPromptId);

    const normalizeGenSession = (s, i) => ({
        Topic: s.Topic || '',
        Objective: s.Objective || '',
        "The Hook": s["The Hook"] || s.Hook || '',
        "Vocabulary Big 5": s["Vocabulary Big 5"] || '',
        "Thinking Skill": s["Thinking Skill"] || '',
        "Language Frame": s["Language Frame"] || '',
        "Thinking Routine": s["Thinking Routine"] || '',
        "Parent Task": s["Parent Task"] || '',
        "Weekly Challenge": s["Weekly Challenge"] || '',
        DBA_Reference: s.DBA_Reference || '',
        SDG_Connection: s.SDG_Connection || '',
        Assessment_Dimension: s.Assessment_Dimension || '',
        Evaluation_Instrument: s.Evaluation_Instrument || '',
        Standard: s.Standard || '',
        Dimension: s.Dimension || '',
        Principle: s.Principle || '',
        Value: s.Value || '',
        Methodology: s.Methodology || (METHODOLOGIES.find(m => m.id === selMethodology)?.name || ''),
        Inclusion_Adjustments: Array.isArray(s.Inclusion_Adjustments) ? s.Inclusion_Adjustments : [],
        Learning_Evidence: s.Learning_Evidence || null,
        Session_Number: s.Session_Number || String(i + 1),
        Feedback_Questions: Array.isArray(s.Feedback_Questions)
            ? s.Feedback_Questions.filter(q => q && (typeof q === 'string' ? q.trim() : q.q))
            : [],
        "Richmond Resources": '',
        "Activity Link": '',
        ClassDojo_Link: '',
        "Start Date": '',
        "Finish Date": '',
    });

    /* El profe elige cuántas sesiones PR1ME quiere; se crean N bloques vacíos */
    const confirmPrimeCount = (n) => {
        const count = Math.min(Math.max(1, n), MAX_SESSIONS);
        setPrimeNumSessions(count);
        setPrimeSessions(Array.from({ length: count }, () => ({
            chapterIdx: '', unitIdx: '', selectedSubs: [], goal: ''
        })));
        setPrimeError('');
        pushUser(`${count} sesión(es) PR1ME`);
        setLumiStage('loading');
        pushLumi(`Perfecto. Llena los datos de cada una de las ${count} sesión(es). Cada bloque es independiente: puedes elegir capítulos y temas distintos 👇`, null, () => setLumiStage('primeFields'));
    };

    /* Actualiza un campo de una sesión PR1ME específica */
    const updatePrimeSession = (idx, patch) => {
        setPrimeSessions(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
    };

    /* Construye los primeValues de UNA sesión a partir de su selección */
    const buildPrimeValuesFor = (sess) => {
        const chap = primeData.capitulos[Number(sess.chapterIdx)];
        const unit = chap?.unidades?.[Number(sess.unitIdx)];
        const subs = (unit?.subunidades || []).filter(su => sess.selectedSubs.includes(su.id));
        const selectedTopics = subs.map((su, i) => `${i + 1}. ${su.titulo}`).join(', ');
        const primeObjectives = subs.flatMap(su => su.objetivos || []).map(o => `- ${o}`).join('\n');
        const primeStages = [...new Set(subs.flatMap(su => su.stages || []))].join(', ');
        const primeConcepts = subs
            .map(su => [su.concepto_clave, (su.vocabulario || []).join(', '), (su.materiales || []).join('; ')].filter(Boolean).join(' | '))
            .filter(Boolean).join('\n- ');

        const ng = primeData.notas_generales || {};
        const sb = ng.stages_pedagogicas?.stages_base || {};

        return {
            chapterTitle: `Cap ${chap.numero}: ${chap.titulo}`,
            unitTitle: `Unidad ${unit.unidad}: ${unit.titulo}`,
            selectedTopics,
            primeObjectives: primeObjectives || 'No especificados',
            primeStages: primeStages || 'C-P-A',
            primeConcepts: primeConcepts || 'No especificados',
            goal: sess.goal || '',
            primeCollection: primeData.coleccion || 'PR1ME Mathematics',
            primePublisher: primeData.editorial || 'Scholastic Education International',
            primePart: primeData.parte || 'N/A',
            primeCPADesc: ng.stages_pedagogicas?.descripcion || 'Enfoque Concreto-Pictórico-Abstracto',
            primeConcreteDesc: sb.concrete || 'Materiales manipulables',
            primePictorialDesc: sb.pictorial || 'Representación con imágenes/diagramas',
            primeAbstractDesc: sb.abstract || 'Representación simbólica',
            primeLessonStructure: Array.isArray(ng.estructura_leccion_tipica) ? ng.estructura_leccion_tipica.join(' → ') : 'Let\'s Remember → EXPLORE → Let\'s Learn → Let\'s Do → Let\'s Practice → Mind Stretcher',
            primeProblemSteps: Array.isArray(ng.pasos_resolucion_problemas) ? ng.pasos_resolucion_problemas.join(', ') : 'Understand, Plan, Answer, Check, +Plus',
        };
    };

    /* Genera las N sesiones PR1ME en UNA sola llamada, con prompt compacto (tokens de entrada mínimos) */
    const submitPrimeFields = async () => {
        // Validar cada sesión
        for (let i = 0; i < primeSessions.length; i++) {
            const s = primeSessions[i];
            if (s.chapterIdx === '' || s.unitIdx === '' || !s.selectedSubs.length || !String(s.goal).trim()) {
                setPrimeError(`Completa capítulo, unidad, temas y objetivo en la sesión ${i + 1}.`);
                return;
            }
        }
        setPrimeError('');
        setLumiStage('generating');
        pushLumi(`🧠 Diseñando tus ${primeSessions.length} sesión(es) PR1ME Math… dame unos segundos.`, 400);

        const methodology = METHODOLOGIES.find(m => m.id === selMethodology);
        const syllabusJson = lumiCtx?.syllabus ? safeParse(lumiCtx.syllabus.Summary_JSON) : null;

        // Contexto por sesión: SOLO lo esencial (tema, unidad, objetivos oficiales, meta del profe)
        const sessionsContext = primeSessions.map((sess, idx) => {
            const pv = buildPrimeValuesFor(sess);
            return `SESSION ${idx + 1} | ${pv.chapterTitle} > ${pv.unitTitle}
Topics: ${pv.selectedTopics}
Official objectives: ${pv.primeObjectives.replace(/\n/g, ' ')}
Teacher goal: ${pv.goal}`;
        }).join('\n\n');

        // Datos raíz PR1ME (colección, parte, flujo) tomados de la primera sesión
        const first = buildPrimeValuesFor(primeSessions[0]);

        // Prompt COMPACTO exclusivo para PR1ME (no usa buildMasterPrompt → mínimos tokens)
        // Prompt PR1ME: estructura PR1ME + listas curriculares (para llenar ODS, estándar, DBA, etc.)
        const fullPrompt = buildPrimePrompt({
            sessionsContext,
            sessionsCount: primeSessions.length,
            subject: selSubject,
            grade: selGrade,
            term: selTerm,
            methodology,
            primeCollection: first.primeCollection,
            primePart: first.primePart,
            lessonFlow: first.primeLessonStructure,
            problemSteps: first.primeProblemSteps,
            mallaCtx: lumiCtx?.ctx,
            syllabusJson,
        });

        try {
            const resp = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'generateWithLumi', prompt: fullPrompt })
            });
            const data = await resp.json();

            console.log('[PR1ME] status:', data?.status, '| raw:', (data?.text || data?.raw || '').slice(0, 200));

            if (data.status !== 'success') {
                pushLumi(`⚠️ Hubo un problema: ${data.message || 'error'}. Intenta de nuevo.`, 300);
                setLumiStage('primeFields');
                return;
            }

            let arr = parseGeminiSessions(data.text || data.raw);
            if (arr && !Array.isArray(arr)) {
                const arrKey = Object.keys(arr).find(k => Array.isArray(arr[k]));
                arr = arrKey ? arr[arrKey] : [arr];
            }

            if (!arr || !arr.length) {
                pushLumi('⚠️ No pude leer la respuesta de la IA. Intenta de nuevo.', 300);
                setLumiStage('primeFields');
                return;
            }

            console.log('[PR1ME] solicitadas:', primeSessions.length, '| generadas:', arr.length);

            const normalized = arr.slice(0, primeSessions.length).map((s, i) => {
                s.Session_Number = String(i + 1);
                return normalizeGenSession(s, i);
            });

            if (normalized.length < primeSessions.length) {
                pushLumi(`⚠️ Pediste ${primeSessions.length} sesiones pero la IA devolvió ${normalized.length}. Se guardarán las generadas.`, 300);
            }

            setGenSessions(normalized);
            pushLumi(`✨ ¡Listo! Diseñé ${normalized.length} sesión(es) PR1ME. Revísalas abajo, edita lo que quieras y guárdalas.`, 500);
            setLumiStage('review');
        } catch (e) {
            console.error('[PR1ME] error:', e);
            pushLumi('⚠️ Error de conexión al generar. Revisa tu red e intenta de nuevo.', 300);
            setLumiStage('primeFields');
        }
    };

    const submitFields = async () => {
        if (!currentPrompt) return;

        // Construye valores extra si es la plantilla PR1ME Math
        // PR1ME Math ahora usa su propio flujo multisesión (submitPrimeFields)
        if (currentPrompt.primeMath) { submitPrimeFields(); return; }

        // Construye valores extra si es la plantilla PR1ME Math
        let primeValues = {};
        if (currentPrompt.primeMath) {
            if (primeChapterIdx === '' || primeUnitIdx === '' || !primeSelectedSubs.length) {
                setGenError('Elige capítulo, unidad y al menos un tema.'); return;
            }
            const chap = primeData.capitulos[Number(primeChapterIdx)];
            const unit = chap?.unidades?.[Number(primeUnitIdx)];
            const subs = (unit?.subunidades || []).filter(su => primeSelectedSubs.includes(su.id));

            // Enumera los temas como espera Lumi: "1. tema, 2. tema..."
            const selectedTopics = subs.map((su, i) => `${i + 1}. ${su.titulo}`).join(', ');
            const primeObjectives = subs.flatMap(su => su.objetivos || []).map(o => `- ${o}`).join('\n');
            const primeStages = [...new Set(subs.flatMap(su => su.stages || []))].join(', ');
            const primeConcepts = subs
                .map(su => [su.concepto_clave, (su.materiales || []).join('; ')].filter(Boolean).join(' | '))
                .filter(Boolean).join('\n- ');

            // Datos de nivel raíz del JSON PR1ME (notas generales fijas de la colección)
            const ng = primeData.notas_generales || {};
            const sb = ng.stages_pedagogicas?.stages_base || {};

            primeValues = {
                chapterTitle: `Cap ${chap.numero}: ${chap.titulo}`,
                unitTitle: `Unidad ${unit.unidad}: ${unit.titulo}`,
                selectedTopics,
                primeObjectives: primeObjectives || 'No especificados',
                primeStages: primeStages || 'C-P-A',
                primeConcepts: primeConcepts || 'No especificados',
                // Notas generales de la colección PR1ME
                primeCollection: primeData.coleccion || 'PR1ME Mathematics',
                primePublisher: primeData.editorial || 'Scholastic Education International',
                primePart: primeData.parte || 'N/A',
                primeCPADesc: ng.stages_pedagogicas?.descripcion || 'Enfoque Concreto-Pictórico-Abstracto',
                primeConcreteDesc: sb.concrete || 'Materiales manipulables',
                primePictorialDesc: sb.pictorial || 'Representación con imágenes/diagramas',
                primeAbstractDesc: sb.abstract || 'Representación simbólica',
                primeLessonStructure: Array.isArray(ng.estructura_leccion_tipica) ? ng.estructura_leccion_tipica.join(' → ') : 'Let\'s Remember → EXPLORE → Let\'s Learn → Let\'s Do → Let\'s Practice → Mind Stretcher',
                primeProblemSteps: Array.isArray(ng.pasos_resolucion_problemas) ? ng.pasos_resolucion_problemas.join(', ') : 'Understand, Plan, Answer, Check, +Plus',
            };
        }

        // Junta los valores del profe con los de PR1ME
        const mergedValues = { ...promptValues, ...primeValues };

        // validar campos requeridos que llena el profe
        const missing = (currentPrompt.fields || []).filter(f => !String(mergedValues[f.key] || '').trim());
        if (missing.length) { setGenError('Completa todos los campos antes de enviar.'); return; }
        setGenError('');

        const sessions = Math.min(Math.max(1, Number(numSessions) || 1), MAX_SESSIONS);
        const summary = currentPrompt.primeMath
            ? `PR1ME · ${primeValues.chapterTitle} · ${primeValues.unitTitle} · Temas: ${primeValues.selectedTopics}`
            : (currentPrompt.fields || []).map(f => `${f.label}: ${mergedValues[f.key]}`).join(' · ');
        pushUser(`${summary} · Sesiones: ${sessions}`);

        setLumiStage('generating');
        pushLumi('🧠 Estoy diseñando tus sesiones con base en tu currículo… dame unos segundos.', 400);

        const syllabusJson = lumiCtx?.syllabus ? safeParse(lumiCtx.syllabus.Summary_JSON) : null;
        const masterPrompt = buildMasterPrompt({
            promptDef: currentPrompt,
            values: mergedValues,
            sessions,
            subject: selSubject,
            grade: selGrade,
            term: selTerm,
            mallaCtx: lumiCtx?.ctx,
            syllabusJson,
            methodology: METHODOLOGIES.find(m => m.id === selMethodology),
        });

        try {
            const resp = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'generateWithLumi', prompt: masterPrompt })
            });
            const data = await resp.json();
            if (data.status !== 'success') {
                pushLumi(`⚠️ Hubo un problema: ${data.message || 'error desconocido'}. Intenta de nuevo.`, 300);
                setLumiStage('fields');
                return;
            }
            let sessionsArr = parseGeminiSessions(data.text || data.raw);
            // Groq con response_format devuelve un OBJETO en la raíz
            if (sessionsArr && !Array.isArray(sessionsArr)) {
                const arrKey = Object.keys(sessionsArr).find(k => Array.isArray(sessionsArr[k]));
                sessionsArr = arrKey ? sessionsArr[arrKey] : [sessionsArr];
            }
            if (!sessionsArr || !sessionsArr.length) {
                pushLumi('⚠️ No pude leer la respuesta de la IA. Intenta de nuevo o ajusta tu solicitud.', 300);
                setLumiStage('fields');
                return;
            }
            // normalizar: asegurar campos y numeración
            // normalizar: asegurar campos y numeración
            const normalized = sessionsArr.slice(0, sessions).map((s, i) => normalizeGenSession(s, i));
            setGenSessions(normalized);
            pushLumi(`✨ ¡Listo! Diseñé ${normalized.length} sesión(es). Revísalas abajo, edita lo que quieras y guárdalas.`, 500);
            setLumiStage('review');
        } catch (e) {
            pushLumi('⚠️ Error de conexión al generar. Revisa tu red e intenta de nuevo.', 300);
            setLumiStage('fields');
        }
    };


    /* Guarda la revisión de coordinación en Class_Observations */
    const savePlanReview = async () => {
        if (!selectedSummary) return;
        if (!reviewForm.feedback.trim()) { alert("Escribe un comentario antes de guardar."); return; }

        const refId = `PLAN-${selectedSummary.ID_Setup}`;
        const existing = planReviews.find(r => r.ID_Lesson_Ref === refId);
        const adminName = userData.Teacher_Name || userData.User_Key;

        const payload = {
            ID_Lesson_Ref: refId,
            Teacher: selectedSummary.Teacher,
            Grade: selectedSummary.Grade,
            Score: Number(reviewForm.score) || 0,
            Feedback: reviewForm.feedback.trim(),
            "Areas for Improvement": reviewForm.areas.trim(),
            "Next Steps": reviewForm.next.trim(),
            Commitment: adminName,
            "Timing Control": 0, "The Hook Check": 0, "Vocabulary Focus": 0,
            "Scaffolding Check": 0, "Student Talk Time": 0, "Thinking Routine": 0,
            "Resource Sync": 0, "Discipline & Flow": 0, "Goal Achievement": 0,
            "Audio/Video URL": ""
        };

        setSavingReview(true);
        // Pinta al instante
        setPlanReviews(prev => existing
            ? prev.map(r => r.ID_Lesson_Ref === refId ? { ...r, ...payload } : r)
            : [...prev, payload]
        );
        setShowReviewForm(false);

        try {
            await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: existing ? 'update' : 'create',
                    sheet: "Class_Observations",
                    idField: "ID_Lesson_Ref",
                    idValue: existing ? refId : null,
                    data: payload
                })
            });
        } catch (e) { console.error("Error guardando revisión:", e); }
        setSavingReview(false);
    };

    /* Abre el formulario con los datos existentes si ya hay revisión */
    const openReviewForm = (plan) => {
        const existing = planReviews.find(r => r.ID_Lesson_Ref === `PLAN-${plan.ID_Setup}`);
        setReviewForm({
            score: existing?.Score ?? 80,
            feedback: existing?.Feedback || existing?.["Feedback"] || '',
            areas: existing?.["Areas for Improvement"] || existing?.Areas_for_Improvement || '',
            next: existing?.["Next Steps"] || existing?.Next_Steps || ''
        });
        setShowReviewForm(true);
    };

    const updateGenSession = (idx, field, value) => {
        setGenSessions(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
    };

    const acceptAndSave = async () => {
        if (!genSessions.length) return;

        const teacherKey = String(userData.Teacher_Key || userData.User_Key || "").trim();

        // A) Mapeamos las nuevas sesiones listas para guardado local e inmediato
        const newSessions = genSessions.map((s, i) => {
            const idSetup = `AI-${Date.now()}-${i}`;
            return {
                ID_Setup: idSetup,
                Grade: selGrade,
                Subject: selSubject,
                Term: selTerm,
                "Start Date": s["Start Date"] || "",
                "Finish Date": s["Finish Date"] || "",
                Session_Number: s.Session_Number || String(i + 1),
                Topic: s.Topic,
                Objective: s.Objective,
                "The Hook": s["The Hook"],
                "Vocabulary Big 5": s["Vocabulary Big 5"],
                "Thinking Skill": s["Thinking Skill"],
                "Language Frame": s["Language Frame"],
                "Thinking Routine": s["Thinking Routine"],
                "Richmond Resources": s["Richmond Resources"] || "",
                "Activity Link": s["Activity Link"] || "",
                "Parent Task": s["Parent Task"],
                "Weekly Challenge": s["Weekly Challenge"],
                "% Status": "0%",
                Teacher: teacherKey,
                Source: "Lumi",
                AI_Content_JSON: JSON.stringify(s),
                ClassDojo_Link: s.ClassDojo_Link || "",
                Interactive_Feedback: (s.Feedback_Questions && s.Feedback_Questions.length) ? "TRUE" : "FALSE",
                Feedback_Questions_JSON: (s.Feedback_Questions && s.Feedback_Questions.length) ? JSON.stringify(s.Feedback_Questions) : "",
                DBA_Reference: s.DBA_Reference,
                SDG_Connection: s.SDG_Connection,
                Assessment_Dimension: s.Assessment_Dimension,
                Evaluation_Instrument: s.Evaluation_Instrument,
                Standard: s.Standard || '',
                Dimension: s.Dimension || '',
                Principle: s.Principle || '',
                Value: s.Value || '',
                Methodology: s.Methodology || '',
                isLocal: true // Marca local de pendiente por sincronizar a Excel
            };
        });

        // B) ACTUAMOS INMEDIATAMENTE (Sin esperar el fetch a Excel)
        setIsSyncing(true); // Activa el estado "Sincronizando..." de tu interfaz

        // 1. Guardar localmente en el estado principal
        setPlannings(prev => [...newSessions, ...prev]);

        // 2. Añadir a la cola de sincronización interna
        setSyncQueue(prev => [...prev, ...newSessions]);

        // 3. Persistir inmediatamente en localStorage para respaldar cambios
        const storedPlannings = JSON.parse(localStorage.getItem('local_plannings') || '[]');
        localStorage.setItem('local_plannings', JSON.stringify([...newSessions, ...storedPlannings]));

        // 4. Feedback inmediato al chat y cambio de vista
        pushLumi('✅ ¡Guardado localmente! Sincronizando con Excel en segundo plano…', 100);
        setTimeout(() => setView('list'), 400);

        // C) SINCRONIZACIÓN EN SEGUNDO PLANO (Push to Excel Asíncrono)
        try {
            for (const data of newSessions) {
                const { isLocal, ...dataToSend } = data;
                await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'create', sheet: "Lesson_Planners", data: dataToSend })
                });
            }

            // Quitar de la marca local tras éxito
            setPlannings(prev => prev.map(p => {
                if (newSessions.some(ns => ns.ID_Setup === p.ID_Setup)) {
                    return { ...p, isLocal: false };
                }
                return p;
            }));
            setSyncQueue(prev => prev.filter(q => !newSessions.some(ns => ns.ID_Setup === q.ID_Setup)));
        } catch (e) {
            console.error("Error al sincronizar con Excel en segundo plano:", e);
        } finally {
            setIsSyncing(false); // Apaga el estado de carga/sincronización
        }
    };

    /* ================= PLANNER ORIGINAL ================= */
    const fetchData = async () => {
        setIsSyncing(true);
        try {
            const resp = await fetch(`${API_URL}?sheet=Lesson_Planners`);
            const data = await resp.json();
            if (Array.isArray(data)) {
                if (isAdmin) setPlannings(data);
                else {
                    const myData = data.filter(p => {
                        const recordKey = String(p.Teacher || p.Teacher_Key || "").trim();
                        const userKey = String(userData.Teacher_Key || userData.User_Key || "").trim();
                        return recordKey === userKey;
                    });
                    setPlannings(myData);
                }
            }
        } catch (e) { console.error("Error fetching data:", e); }
        setIsSyncing(false);
    };

    const formatDate = (dateStr) => { if (!dateStr) return ""; return dateStr.split('T')[0]; };

    const handleDelete = async (plan) => {
        if (!window.confirm("¿Seguro que quieres eliminar esta planeación?")) return;
        if (plan.isLocal) {
            setPlannings(plannings.filter(p => p.ID_Setup !== plan.ID_Setup));
            setSyncQueue(syncQueue.filter(q => q.ID_Setup !== plan.ID_Setup));
        } else {
            setIsSyncing(true);
            try {
                await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'delete', sheet: "Lesson_Planners", rowId: plan.rowId }) });
                fetchData();
            } catch (e) { alert("Error al eliminar"); }
            setIsSyncing(false);
        }
    };

    const handleEdit = (plan) => {
        const grade = plan.Grade;
        setSelectedGrades([grade]);
        const { ctx } = resolveCurriculum(plan.Subject, plan.Grade, plan.Term);
        setFormsData({
            [grade]: {
                ...plan,
                ID_Setup: plan.ID_Setup,
                rowId: plan.rowId,
                Grade: plan.Grade,
                Subject: plan.Subject,
                Term: plan.Term,
                Session_Number: plan.Session_Number,
                Topic: plan.Topic,
                Objective: plan.Objective,
                "The Hook": plan["The Hook"] || plan.The_Hook || "",
                "Vocabulary Big 5": plan["Vocabulary Big 5"] || plan.Vocabulary_Big_5 || "",
                "Thinking Skill": typeof plan["Thinking Skill"] === 'string' ? plan["Thinking Skill"].split(", ").filter(Boolean) : (plan["Thinking Skill"] || []),
                "Language Frame": typeof plan["Language Frame"] === 'string' ? plan["Language Frame"].split(", ").filter(Boolean) : (plan["Language Frame"] || []),
                "Thinking Routine": plan["Thinking Routine"] || plan.Thinking_Routine || "",
                "Richmond Resources": plan["Richmond Resources"] || plan.Richmond_Resources || "",
                "Activity Link": plan["Activity Link"] || plan.Activity_Link || "",
                "Parent Task": plan["Parent Task"] || plan.Parent_Task || "",
                "Weekly Challenge": plan["Weekly Challenge"] || plan.Weekly_Challenge || "",
                "Start Date": formatDate(plan["Start Date"] || plan.Start_Date),
                "Finish Date": formatDate(plan["Finish Date"] || plan.Finish_Date),
                DBA_Reference: plan.DBA_Reference || "",
                SDG_Connection: plan.SDG_Connection || "",
                Assessment_Dimension: plan.Assessment_Dimension || "",
                Evaluation_Instrument: plan.Evaluation_Instrument || "",
                ClassDojo_Link: plan.ClassDojo_Link || "",
                Source: plan.Source || "Manual",
                Interactive_Feedback: String(plan.Interactive_Feedback).toUpperCase() === "TRUE",
                _feedbackQuestions: (safeParse(plan.Feedback_Questions_JSON) || []).concat(["", "", "", "", ""]).slice(0, 5),
                Standard: safeParse(plan.AI_Content_JSON)?.Standard || "",
                Dimension: safeParse(plan.AI_Content_JSON)?.Dimension || "",
                Principle: safeParse(plan.AI_Content_JSON)?.Principle || "",
                Value: safeParse(plan.AI_Content_JSON)?.Value || "",
                Methodology: safeParse(plan.AI_Content_JSON)?.Methodology || "",
                Inclusion_Adjustments: safeParse(plan.AI_Content_JSON)?.Inclusion_Adjustments || [],
                Learning_Evidence_Text: safeParse(plan.AI_Content_JSON)?.Learning_Evidence?.product || "",
                _mallaCtx: ctx
            }
        });
        setShowForm(true);
        setView('manual');
    };

    const handleOpenForm = () => {
        if (showForm) handleCancelForm();
        else { setFormsData({}); setSelectedGrades([]); setLocalCustomFrames([]); setCustomFrame(""); setShowForm(true); }
    };
    const handleCancelForm = () => { setShowForm(false); setSelectedGrades([]); setFormsData({}); setLocalCustomFrames([]); setCustomFrame(""); };

    const toggleGradeSelection = (grade) => {
        if (selectedGrades.includes(grade)) {
            setSelectedGrades(selectedGrades.filter(g => g !== grade));
            const updated = { ...formsData }; delete updated[grade]; setFormsData(updated);
        } else {
            setSelectedGrades([...selectedGrades, grade]);
            setFormsData(prev => ({
                ...prev,
                [grade]: {
                    Grade: grade, Subject: "", Topic: "", Objective: "", Term: "", Session_Number: "",
                    "Start Date": "", "Finish Date": "", "The Hook": "", "Vocabulary Big 5": "",
                    "Thinking Skill": [], "Language Frame": [], "Thinking Routine": "",
                    "Richmond Resources": "", "Activity Link": "", "Parent Task": "",
                    "Weekly Challenge": "", "% Status": "0%", ID_Setup: `ID-${Date.now()}-${grade}`,
                    Teacher: String(userData.Teacher_Key || userData.User_Key || "").trim(),
                    Source: "Manual",
                    DBA_Reference: "", SDG_Connection: "", Assessment_Dimension: "", Evaluation_Instrument: "",
                    ClassDojo_Link: "", Interactive_Feedback: false, Feedback_Questions_JSON: "",
                    Standard: "", Dimension: "", Principle: "", Value: "",
                    Methodology: "", Inclusion_Adjustments: [], Learning_Evidence_Text: "",
                    _feedbackQuestions: ["", "", "", "", ""],
                    _mallaCtx: { dbas: [], sdgs: [], objectives: [] }
                }
            }));
        }
    };

    const handleInputChange = (grade, field, value) => { setFormsData(prev => ({ ...prev, [grade]: { ...prev[grade], [field]: value } })); };

    const refreshMallaFor = (grade, nextSubject, nextTerm) => {
        const subj = nextSubject ?? formsData[grade]?.Subject;
        const term = nextTerm ?? formsData[grade]?.Term;
        if (subj && grade && term) {
            const { ctx } = resolveCurriculum(subj, grade, term);
            setFormsData(prev => ({ ...prev, [grade]: { ...prev[grade], _mallaCtx: ctx } }));
        }
    };
    const handleSubjectChange = (grade, value) => { setFormsData(prev => ({ ...prev, [grade]: { ...prev[grade], Subject: value } })); refreshMallaFor(grade, value, undefined); };
    const handleTermChange = (grade, value) => { setFormsData(prev => ({ ...prev, [grade]: { ...prev[grade], Term: value } })); refreshMallaFor(grade, undefined, value); };

    const handleFeedbackQuestionChange = (grade, idx, value) => {
        setFormsData(prev => {
            const arr = [...(prev[grade]?._feedbackQuestions || ["", "", "", "", ""])];
            arr[idx] = value;
            return { ...prev, [grade]: { ...prev[grade], _feedbackQuestions: arr } };
        });
    };

    const handleMultiSelect = (grade, field, value) => {
        const current = formsData[grade]?.[field] || [];
        const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
        handleInputChange(grade, field, updated);
    };

    const handleAddCustomFrame = (grade) => {
        if (!customFrame.trim()) return;
        if (!localCustomFrames.includes(customFrame)) setLocalCustomFrames([...localCustomFrames, customFrame]);
        handleMultiSelect(grade, "Language Frame", customFrame);
        setCustomFrame("");
    };

    const handleSaveToQueue = async (e) => {
        e.preventDefault();

        // A) Mapeo de entradas creadas por el docente
        const formattedEntries = Object.values(formsData).map(entry => {
            const { _mallaCtx, _feedbackQuestions, Interactive_Feedback, ...rest } = entry;
            const questions = (_feedbackQuestions || []).filter(q => q && q.trim() !== "");
            const base = {
                ...JSON.parse(JSON.stringify(rest)),
                "Thinking Skill": Array.isArray(entry["Thinking Skill"]) ? entry["Thinking Skill"].join(", ") : entry["Thinking Skill"],
                "Language Frame": Array.isArray(entry["Language Frame"]) ? entry["Language Frame"].join(", ") : entry["Language Frame"],
                Interactive_Feedback: Interactive_Feedback ? "TRUE" : "FALSE",
                Feedback_Questions_JSON: Interactive_Feedback && questions.length ? JSON.stringify(questions) : "",
                isLocal: true
            };
            base.AI_Content_JSON = JSON.stringify({
                Standard: entry.Standard || '',
                Dimension: entry.Dimension || '',
                Principle: entry.Principle || '',
                Value: entry.Value || '',
                Methodology: entry.Methodology || '',
                Inclusion_Adjustments: entry.Inclusion_Adjustments || [],
                Learning_Evidence: entry.Learning_Evidence_Text
                    ? { product: entry.Learning_Evidence_Text, phases: [] }
                    : null,
            });
            return base;
        });

        const newIds = formattedEntries.map(f => f.ID_Setup);

        // B) ACTUAMOS INMEDIATAMENTE
        setIsSyncing(true); // Se activa el indicador de carga/sincronización que ya tienes

        // 1. Guardar directo en la vista sin esperar a Excel
        setPlannings(prev => {
            const filtered = prev.filter(p => !newIds.includes(p.ID_Setup));
            return [...formattedEntries, ...filtered];
        });

        // 2. Guardar en localStorage inmediatamente
        const storedPlannings = JSON.parse(localStorage.getItem('local_plannings') || '[]');
        const updatedStorage = [...formattedEntries, ...storedPlannings.filter(p => !newIds.includes(p.ID_Setup))];
        localStorage.setItem('local_plannings', JSON.stringify(updatedStorage));

        // 3. Cerrar formulario y cambiar vista AL INSTANTE
        handleCancelForm();
        setView('list');

        // C) PUSH A EXCEL EN SEGUNDO PLANO
        try {
            for (const item of formattedEntries) {
                const { isLocal, rowId, ...dataToSend } = item;
                await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'create', sheet: "Lesson_Planners", data: dataToSend, rowId: rowId })
                });
            }

            // Marcar como guardado en Excel
            setPlannings(prev => prev.map(p => newIds.includes(p.ID_Setup) ? { ...p, isLocal: false } : p));
        } catch (error) {
            console.error("Error sincronizando planeaciones manuales:", error);
        } finally {
            setIsSyncing(false); // Quita el spinner/badge de sincronizando
        }
    };

    const syncWithExcel = async () => {
        setIsSyncing(true);
        try {
            for (const item of syncQueue) {
                const { isLocal, rowId, ...dataToSend } = item;
                await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'create', sheet: "Lesson_Planners", data: dataToSend, rowId: rowId }) });
            }
            setSyncQueue([]); fetchData(); alert("¡Planeaciones guardadas!");
        } catch (e) { alert("Error al sincronizar"); }
        setIsSyncing(false);
    };

    const renderLinks = (links) => {
        if (!links) return "No links provided";
        return links.split(',').map((link, idx) => (
            <a key={idx} href={link.trim()} target="_blank" rel="noopener noreferrer" className="link-item" style={{ marginRight: '10px', color: '#2563eb', textDecoration: 'underline' }}>🔗 Link {idx + 1}</a>
        ));
    };

    const filteredPlannings = plannings.filter(p =>
        (filterGrade === "" || p.Grade === filterGrade) &&
        (filterSubject === "" || p.Subject === filterSubject) &&
        (filterTerm === "" || p.Term === filterTerm)
    );
    const isFiltered = filterGrade !== "" || filterSubject !== "" || filterTerm !== "";
    // ORDEN: última primero (invertimos)
    const orderedPlannings = [...filteredPlannings].sort((a, b) => {
        // Extrae la marca de tiempo si el ID contiene un timestamp (Ej: AI-1710000000000-0 o ID-1710000000000)
        const getTime = (p) => {
            const match = String(p.ID_Setup || '').match(/\d{13}/);
            return match ? parseInt(match[0], 10) : 0;
        };
        const timeA = getTime(a);
        const timeB = getTime(b);

        if (timeA && timeB) return timeB - timeA;
        // Si no hay timestamp en el ID, usa la fecha de inicio
        return new Date(b["Start Date"] || b.Start_Date || 0) - new Date(a["Start Date"] || a.Start_Date || 0);
    });
    const displayedPlannings = isFiltered ? orderedPlannings : orderedPlannings.slice(0, 15);

    /* ============================================================
       RENDER
       ============================================================ */
    return (
        <div className="lumi-root">
            <div className="lumi-aurora" aria-hidden="true">
                <span className="aurora-blob b1" /><span className="aurora-blob b2" /><span className="aurora-blob b3" />
            </div>

            {/* ===================== HUB ===================== */}
            {view === 'hub' && (
                <div className="lumi-hub">
                    <header className="lumi-hub-head">
                        <div className="lumi-eyebrow">PLANNING STUDIO</div>
                        <h1>Diseña tu clase, <span className="grad">a tu manera</span>.</h1>
                        <p>Crea con Lumi usando tu currículo, o arma tu planeación paso a paso. Tú decides.</p>
                    </header>
                    <div className="lumi-entry-grid">
                        <button className="entry-card create" onClick={openLumi}>
                            <div className="entry-avatar"><img src={LUMI_AVATAR} alt="Lumi" /><span className="pulse-ring" /></div>
                            <div className="entry-body">
                                <span className="entry-tag">CON IA</span>
                                <h3>Crear con Lumi</h3>
                                <p>Tu copiloto diseña la sesión contigo desde tu malla y plan de área.</p>
                            </div>
                            <span className="entry-arrow">→</span>
                        </button>
                        <button className="entry-card browse" onClick={() => setView('list')}>
                            <div className="entry-icon">🗂️</div>
                            <div className="entry-body">
                                <span className="entry-tag alt">HISTORIAL</span>
                                <h3>Mis planeaciones</h3>
                                <p>Consulta, revisa y edita todo lo que has creado, ordenado y a la mano.</p>
                            </div>
                            <span className="entry-arrow">→</span>
                        </button>
                    </div>
                    <button className="manual-link" onClick={() => { setView('manual'); handleOpenForm(); }}>Prefiero planear yo mismo, sin IA →</button>
                </div>
            )}

            {/* ===================== LUMI (chat) ===================== */}
            {view === 'lumi' && (
                <div className="lumi-chat-shell">
                    <div className="lumi-chat-topbar">
                        <button className="lumi-back" onClick={() => setView('hub')}>← Volver</button>
                        <div className="lumi-identity">
                            <img src={LUMI_AVATAR} alt="Lumi" className="lumi-mini-av" />
                            <div><strong>Lumi</strong><span className="lumi-status">{lumiTyping ? 'escribiendo…' : 'en línea'}</span></div>
                        </div>
                        <div className="lumi-ctx-pill">{selSubject ? `${selSubject} · ${selGrade}` : 'Nueva planeación'}</div>
                    </div>

                    <div className="lumi-chat-stream">
                        {messages.map((m, i) => (
                            <div key={i} className={`bubble-row ${m.from}`}>
                                {m.from === 'lumi' && <img src={LUMI_AVATAR} alt="" className="bubble-av" />}
                                <div className={`bubble ${m.from}`}>{m.text}</div>
                            </div>
                        ))}
                        {lumiTyping && (
                            <div className="bubble-row lumi"><img src={LUMI_AVATAR} alt="" className="bubble-av" />
                                <div className="bubble lumi typing"><span></span><span></span><span></span></div>
                            </div>
                        )}

                        {/* PASO: contexto */}
                        {lumiStage === 'context' && (
                            <div className="ctx-panel">
                                <div className="ctx-step">
                                    <label>1 · Selecciona la materia</label>
                                    <div className="chip-row">{userSubjects.map(s => <button key={s} className={`chip ${selSubject === s ? 'on' : ''}`} onClick={() => setSelSubject(s)}>{s}</button>)}</div>
                                </div>
                                <div className={`ctx-step ${!selSubject ? 'locked' : ''}`}>
                                    <label>2 · Selecciona el grado</label>
                                    <div className="chip-row">{userGrades.map(g => <button key={g} className={`chip ${selGrade === g ? 'on' : ''}`} onClick={() => setSelGrade(g)}>{g}</button>)}</div>
                                </div>
                                <div className={`ctx-step ${!selGrade ? 'locked' : ''}`}>
                                    <label>3 · Selecciona el periodo</label>
                                    <div className="chip-row">{TERMS.map(t => <button key={t} className={`chip ${selTerm === t ? 'on' : ''}`} onClick={() => setSelTerm(t)}>{t}</button>)}</div>
                                </div>
                                <button className="ctx-go" disabled={!selSubject || !selGrade || !selTerm || loadingCurriculum} onClick={confirmContext}>
                                    {loadingCurriculum ? "Cargando currículo…" : "Continuar con Lumi →"}
                                </button>
                            </div>
                        )}

                        {/* PASO PR1ME: elegir cantidad de sesiones ANTES de llenar datos */}
                        {lumiStage === 'primeCount' && (
                            <div className="ctx-panel">
                                <div className="ctx-step">
                                    <label>¿Cuántas sesiones PR1ME Math quieres planear? (máximo {MAX_SESSIONS})</label>
                                    <div className="session-picker">
                                        {Array.from({ length: MAX_SESSIONS }, (_, k) => k + 1).map(n => (
                                            <button
                                                type="button"
                                                key={n}
                                                className="session-num"
                                                onClick={() => confirmPrimeCount(n)}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="lumi-hint" style={{ marginTop: '12px' }}>
                                        💡 Cada sesión tendrá su propio bloque: podrás elegir capítulos, unidades y temas distintos para cada una.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PASO PR1ME: N bloques de selección (uno por sesión) */}
                        {lumiStage === 'primeFields' && currentPrompt && primeData && (
                            <div className="ctx-panel">
                                <div className="ctx-step">
                                    <label>Completa cada sesión · {currentPrompt.label}</label>

                                    <div className="lumi-field">
                                        <span>Metodología (aplica a todas las sesiones)</span>
                                        <select value={selMethodology} onChange={e => setSelMethodology(e.target.value)}>
                                            <option value="">Institucional (por defecto)</option>
                                            {METHODOLOGIES.map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </select>
                                        {selMethodology && (
                                            <small style={{ display: 'block', marginTop: '6px', color: '#5a6782', fontSize: '0.78rem' }}>
                                                {METHODOLOGIES.find(m => m.id === selMethodology)?.desc}
                                            </small>
                                        )}
                                    </div>

                                    {primeSessions.map((sess, sIdx) => {
                                        const chap = sess.chapterIdx !== '' ? primeData.capitulos[Number(sess.chapterIdx)] : null;
                                        const unit = (chap && sess.unitIdx !== '') ? chap.unidades?.[Number(sess.unitIdx)] : null;
                                        const subs = unit?.subunidades || [];
                                        return (
                                            <div key={sIdx} className="prime-session-block" style={{ border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', marginBottom: '16px', background: '#fafbff' }}>
                                                <div style={{ fontWeight: 700, marginBottom: '12px', color: '#4338ca' }}>📐 Sesión {sIdx + 1} de {primeSessions.length}</div>

                                                <div className="prime-selector">
                                                    <div className="lumi-field">
                                                        <span>📘 Capítulo del libro</span>
                                                        <select
                                                            value={sess.chapterIdx}
                                                            onChange={e => updatePrimeSession(sIdx, { chapterIdx: e.target.value, unitIdx: '', selectedSubs: [] })}
                                                        >
                                                            <option value="">Selecciona un capítulo…</option>
                                                            {primeData.capitulos.map((c, i) => (
                                                                <option key={i} value={i}>Cap {c.numero} · {c.titulo}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {sess.chapterIdx !== '' && (
                                                        <div className="lumi-field">
                                                            <span>📗 Unidad</span>
                                                            <select
                                                                value={sess.unitIdx}
                                                                onChange={e => updatePrimeSession(sIdx, { unitIdx: e.target.value, selectedSubs: [] })}
                                                            >
                                                                <option value="">Selecciona una unidad…</option>
                                                                {(chap?.unidades || []).map((u, i) => (
                                                                    <option key={i} value={i}>Unidad {u.unidad} · {u.titulo}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}

                                                    {sess.unitIdx !== '' && (
                                                        <div className="lumi-field">
                                                            <span>🎯 Temas a ver (elige uno o varios)</span>
                                                            <div className="prime-topics">
                                                                {subs.map(su => {
                                                                    const on = sess.selectedSubs.includes(su.id);
                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            key={su.id}
                                                                            className={`prime-topic-chip ${on ? 'on' : ''}`}
                                                                            onClick={() => updatePrimeSession(sIdx, {
                                                                                selectedSubs: on
                                                                                    ? sess.selectedSubs.filter(x => x !== su.id)
                                                                                    : [...sess.selectedSubs, su.id]
                                                                            })}
                                                                        >
                                                                            <strong>{su.id}</strong> {su.titulo}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                            {sess.selectedSubs.length > 0 && (
                                                                <small style={{ display: 'block', marginTop: '8px', color: '#5a6782', fontSize: '0.78rem' }}>
                                                                    ✅ {sess.selectedSubs.length} tema(s). Lumi tomará sus objetivos oficiales y su método automáticamente.
                                                                </small>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="lumi-field">
                                                        <span>Tu objetivo de aprendizaje para esta sesión</span>
                                                        <input
                                                            type="text"
                                                            placeholder="Ej: Que los estudiantes sumen sin reagrupar usando bloques base 10"
                                                            value={sess.goal}
                                                            onChange={e => updatePrimeSession(sIdx, { goal: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <div className="lumi-hint">💡 Lumi no copia enlaces de videos — esos los agregas tú al guardar.</div>
                                    {primeError && <div className="lumi-error">{primeError}</div>}
                                    <button className="ctx-go" onClick={submitPrimeFields}>Generar {primeSessions.length} sesión(es) con Lumi ✨</button>
                                </div>
                            </div>
                        )}

                        {/* PASO: elegir parte del libro (grado con varios libros PR1ME) */}
                        {lumiStage === 'primeParts' && (
                            <div className="ctx-panel">
                                <div className="ctx-step">
                                    <label>¿Con cuál libro PR1ME Math vas a planear?</label>
                                    <div className="prime-parts">
                                        {primeParts.map((row, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                className="prime-part-card"
                                                onClick={() => selectPrimePart(row)}
                                            >
                                                <span className="prime-part-icon">📘</span>
                                                <div className="prime-part-body">
                                                    <strong>{row.Name}</strong>
                                                    <small>{row.Grade}</small>
                                                </div>
                                                <span className="prime-part-arrow">→</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PASO: elegir prompt */}
                        {lumiStage === 'prompt' && (
                            <div className="ctx-panel">
                                <div className="ctx-step">
                                    <label>Elige una plantilla de prompt</label>
                                    <div className="prompt-grid">
                                        {PROMPT_BANK.map(p => (
                                            <div key={p.id} className="prompt-card" onClick={() => selectPrompt(p)}>
                                                <span className="prompt-lang">{p.lang === 'en' ? '🇬🇧 EN' : '🇪🇸 ES'}</span>
                                                <strong>{p.label}</strong>
                                                <button className="prompt-eye" title="Leer el prompt" onClick={(e) => { e.stopPropagation(); setPreviewPrompt(p); }}>👁️</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PASO: llenar campos */}
                        {/* PASO: llenar campos */}
                        {lumiStage === 'fields' && currentPrompt && (
                            <div className="ctx-panel">
                                <div className="ctx-step">

                                    {/* 🏷️ CABECERA MODIFICADA: Texto a la izquierda y el botón interactivo EXACTAMENTE en la esquina derecha */}
                                    <label style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        width: '100%',
                                        marginBottom: '16px'
                                    }}>
                                        <span>Completa los datos · {currentPrompt.label}</span>
                                        <button
                                            type="button"
                                            onClick={() => setShowSessionsInfoModal(true)}
                                            style={{
                                                background: '#eff6ff',
                                                border: '1px solid #bfdbfe',
                                                borderRadius: '50%',
                                                width: '24px',
                                                height: '24px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                padding: 0
                                            }}
                                            title="¿Cómo planear varias sesiones?"
                                        >
                                            ❓
                                        </button>
                                    </label>

                                    {/* ===== SELECTOR PR1ME MATH (desactivado: PR1ME usa su flujo multisesión propio) ===== */}
                                    {false && currentPrompt.primeMath && primeData && (
                                        <div className="prime-selector">
                                            <div className="lumi-field">
                                                <span>📘 Capítulo del libro</span>
                                                <select
                                                    value={primeChapterIdx}
                                                    onChange={e => {
                                                        setPrimeChapterIdx(e.target.value);
                                                        setPrimeUnitIdx('');
                                                        setPrimeSelectedSubs([]);
                                                    }}
                                                >
                                                    <option value="">Selecciona un capítulo…</option>
                                                    {primeData.capitulos.map((c, i) => (
                                                        <option key={i} value={i}>Cap {c.numero} · {c.titulo}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {primeChapterIdx !== '' && (
                                                <div className="lumi-field">
                                                    <span>📗 Unidad</span>
                                                    <select
                                                        value={primeUnitIdx}
                                                        onChange={e => {
                                                            setPrimeUnitIdx(e.target.value);
                                                            setPrimeSelectedSubs([]);
                                                        }}
                                                    >
                                                        <option value="">Selecciona una unidad…</option>
                                                        {(primeData.capitulos[Number(primeChapterIdx)]?.unidades || []).map((u, i) => (
                                                            <option key={i} value={i}>Unidad {u.unidad} · {u.titulo}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {primeUnitIdx !== '' && (
                                                <div className="lumi-field">
                                                    <span>🎯 Temas a ver (elige uno o varios)</span>
                                                    <div className="prime-topics">
                                                        {(primeData.capitulos[Number(primeChapterIdx)]?.unidades?.[Number(primeUnitIdx)]?.subunidades || []).map(su => {
                                                            const on = primeSelectedSubs.includes(su.id);
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    key={su.id}
                                                                    className={`prime-topic-chip ${on ? 'on' : ''}`}
                                                                    onClick={() => setPrimeSelectedSubs(prev =>
                                                                        on ? prev.filter(x => x !== su.id) : [...prev, su.id]
                                                                    )}
                                                                >
                                                                    <strong>{su.id}</strong> {su.titulo}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    {primeSelectedSubs.length > 0 && (
                                                        <small style={{ display: 'block', marginTop: '8px', color: '#5a6782', fontSize: '0.78rem' }}>
                                                            ✅ {primeSelectedSubs.length} tema(s) seleccionado(s). Lumi tomará sus objetivos oficiales y su método automáticamente.
                                                        </small>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {currentPrompt.fields.map(f => (
                                        <div key={f.key} className="lumi-field">
                                            <span>{f.label}</span>
                                            {f.type === 'textarea'
                                                ? <textarea placeholder={f.placeholder} value={promptValues[f.key] || ''} onChange={e => setPromptValues(v => ({ ...v, [f.key]: e.target.value }))} />
                                                : <input type={f.type} placeholder={f.placeholder} value={promptValues[f.key] || ''} onChange={e => setPromptValues(v => ({ ...v, [f.key]: e.target.value }))} />}
                                        </div>
                                    ))}

                                    <div className="lumi-field">
                                        <span>Metodología de la clase</span>
                                        <select value={selMethodology} onChange={e => setSelMethodology(e.target.value)}>
                                            <option value="">Institucional (por defecto)</option>
                                            {METHODOLOGIES.map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </select>
                                        {selMethodology && (
                                            <small style={{ display: 'block', marginTop: '6px', color: '#5a6782', fontSize: '0.78rem' }}>
                                                {METHODOLOGIES.find(m => m.id === selMethodology)?.desc}
                                            </small>
                                        )}
                                    </div>

                                    {/* Input de sesiones de vuelta a la normalidad, limpio */}
                                    {/* Selector de sesiones por botones (evita errores de flechas) */}
                                    <div className="lumi-field">
                                        <span>¿Cuántas sesiones quieres generar en total?</span>
                                        <div className="session-picker">
                                            {Array.from({ length: MAX_SESSIONS }, (_, k) => k + 1).map(n => (
                                                <button
                                                    type="button"
                                                    key={n}
                                                    className={`session-num ${Number(numSessions) === n ? 'on' : ''}`}
                                                    onClick={() => setNumSessions(n)}
                                                >
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 💡 BLOQUE INTERROGANTE: Se mantiene intacto tal cual como lo tenías */}
                                    {Number(numSessions) > 1 && (
                                        <div className="lumi-info-box" style={{
                                            backgroundColor: '#f0fdf4',
                                            border: '1px solid #bbf7d0',
                                            borderRadius: '8px',
                                            padding: '12px 16px',
                                            marginTop: '15px',
                                            marginBottom: '15px',
                                            fontSize: '0.9rem',
                                            color: '#166534'
                                        }}>
                                            <strong>❓ ¿Cómo organizará Lumi tus {numSessions} sesiones?</strong>
                                            <p style={{ margin: '6px 0 0 0', lineHeight: '1.4', color: '#1e4620' }}>
                                                ¡Excelente elección! Al solicitar múltiples sesiones, ten en cuenta esto para ayudarme a estructurarlas a la perfección:
                                            </p>
                                            <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', lineHeight: '1.4' }}>
                                                <li><strong>Separa tus subtemas por números</strong> en el primer campo (ej: <i>"1. Concepto, 2. Ejercicios, 3. Taller"</i>). Así sabré exactamente qué va en cada clase.</li>
                                                <li><strong>Dosificaré tus recursos automáticamente</strong> a lo largo de los días en lugar de amontonar todo en un solo bloque.</li>
                                                <li>Las metas y preguntas de juego final se adaptarán al avance específico de cada sesión.</li>
                                            </ul>
                                        </div>
                                    )}

                                    <div className="lumi-hint">💡 Recuerda: máximo {MAX_SESSIONS} sesiones por generación para no saturar la IA. Lumi no copia enlaces de videos — esos los agregas tú al guardar.</div>
                                    {genError && <div className="lumi-error">{genError}</div>}
                                    <button className="ctx-go" onClick={submitFields}>Generar con Lumi ✨</button>
                                </div>
                            </div>
                        )}

                        {/* PASO: generando */}
                        {lumiStage === 'generating' && (
                            <div className="lumi-generating">
                                <div className="gen-spinner" />
                                <span>Diseñando tus sesiones…</span>
                            </div>
                        )}

                        {/* PASO: revisión editable */}
                        {lumiStage === 'review' && genSessions.length > 0 && (
                            <div className="review-panel">
                                {genSessions.map((s, idx) => (
                                    <div key={idx} className="review-card">
                                        <div className="review-card-head">Sesión {s.Session_Number || (idx + 1)}</div>
                                        <div className="review-dates">
                                            <div className="review-field">
                                                <label>Fecha de inicio</label>
                                                <input type="date" value={s["Start Date"] || ''} onChange={e => updateGenSession(idx, "Start Date", e.target.value)} />
                                            </div>
                                            <div className="review-field">
                                                <label>Fecha de fin</label>
                                                <input type="date" value={s["Finish Date"] || ''} onChange={e => updateGenSession(idx, "Finish Date", e.target.value)} />
                                            </div>
                                        </div>
                                        {[
                                            ["Topic", "Tema"], ["Objective", "Objetivo"], ["The Hook", "Desarrollo (8 pasos)"],
                                            ["Vocabulary Big 5", "Vocabulary Big 5"], ["Thinking Skill", "Thinking Skill"],
                                            ["Language Frame", "Language Frame"], ["Thinking Routine", "Thinking Routine"],
                                            ["Parent Task", "Tarea / Parent Task"], ["Weekly Challenge", "Weekly Challenge"],
                                            ["DBA_Reference", "DBA"], ["SDG_Connection", "ODS"],
                                            ["Standard", "Estándar"], ["Dimension", "Dimensión"],
                                            ["Principle", "Principio CREAR"], ["Value", "Valor"],
                                            ["Assessment_Dimension", "Dimensión SIEE"], ["Evaluation_Instrument", "Instrumento"],
                                        ].map(([field, label]) => (
                                            <div key={field} className="review-field">
                                                <label>{label}</label>
                                                {field === "The Hook"
                                                    ? <textarea value={s[field] || ''} onChange={e => updateGenSession(idx, field, e.target.value)} />
                                                    : <input type="text" value={s[field] || ''} onChange={e => updateGenSession(idx, field, e.target.value)} />}
                                            </div>
                                        ))}
                                        <div className="review-field">
                                            <label>Activity Link (tú lo agregas)</label>
                                            <input type="text" placeholder="https://..." value={s["Activity Link"] || ''} onChange={e => updateGenSession(idx, "Activity Link", e.target.value)} />
                                        </div>
                                        <div className="review-field">
                                            <label>Richmond / Recursos (tú lo agregas)</label>
                                            <input type="text" placeholder="Libro, plataforma..." value={s["Richmond Resources"] || ''} onChange={e => updateGenSession(idx, "Richmond Resources", e.target.value)} />
                                        </div>
                                        {s.Feedback_Questions && s.Feedback_Questions.length > 0 && (
                                            <div className="review-field">
                                                <label>🎮 Preguntas de feedback (generadas por Lumi)</label>
                                                {s.Feedback_Questions.map((q, qi) => {
                                                    const isObj = q && typeof q === 'object';
                                                    const updateQ = (fn) => {
                                                        const arr = s.Feedback_Questions.map(x =>
                                                            (x && typeof x === 'object') ? { ...x, opts: [...(x.opts || [])] } : x
                                                        );
                                                        fn(arr[qi]);
                                                        updateGenSession(idx, "Feedback_Questions", arr);
                                                    };
                                                    return (
                                                        <div key={qi} className="rev-q">
                                                            <div className="rev-q-head">
                                                                <span className="rev-q-num">{qi + 1}</span>
                                                                <input
                                                                    type="text"
                                                                    className="rev-q-text"
                                                                    placeholder="Pregunta…"
                                                                    value={isObj ? (q.q || '') : (q || '')}
                                                                    onChange={e => {
                                                                        if (isObj) updateQ(it => { it.q = e.target.value; });
                                                                        else {
                                                                            const arr = [...s.Feedback_Questions];
                                                                            arr[qi] = e.target.value;
                                                                            updateGenSession(idx, "Feedback_Questions", arr);
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                            {isObj && Array.isArray(q.opts) && (
                                                                <div className="rev-q-opts">
                                                                    {[0, 1, 2, 3].map(oi => (
                                                                        <label key={oi} className={`rev-q-opt ${q.correct === oi ? 'is-correct' : ''}`}>
                                                                            <input
                                                                                type="radio"
                                                                                name={`rev-${idx}-${qi}`}
                                                                                checked={q.correct === oi}
                                                                                onChange={() => updateQ(it => { it.correct = oi; })}
                                                                            />
                                                                            <span className="rev-q-letter">{String.fromCharCode(65 + oi)}</span>
                                                                            <input
                                                                                type="text"
                                                                                placeholder={`Opción ${String.fromCharCode(65 + oi)}`}
                                                                                value={q.opts[oi] || ''}
                                                                                onChange={e => updateQ(it => {
                                                                                    if (!Array.isArray(it.opts)) it.opts = ['', '', '', ''];
                                                                                    it.opts[oi] = e.target.value;
                                                                                })}
                                                                            />
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div className="review-actions">
                                    <button className="btn-accept" onClick={acceptAndSave} disabled={isSyncing}>{isSyncing ? "Guardando…" : "✅ Aceptar y guardar"}</button>
                                </div>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>
                </div>
            )}

            {/* ===================== MANUAL ===================== */}
            {view === 'manual' && (
                <div className="lumi-surface">
                    <header className="page-header">
                        <div className="title-section">
                            <button className="lumi-back" onClick={() => { setView('hub'); handleCancelForm(); }}>← Volver</button>
                            <h1>Planeación manual</h1>
                            <p>Sesión iniciada como: <strong>{userData.Teacher_Name || userData.User_Key}</strong><span className={`role-badge ${userData.ROL}`}>{userData.ROL}</span></p>
                        </div>
                        <div className="header-actions">
                            <button className="btn-refresh" onClick={() => { fetchData(); fetchCurriculum(); }} disabled={isSyncing} title="Recargar">{isSyncing ? "..." : "🔄 Refresh"}</button>
                            {syncQueue.length > 0 && <button className="btn-sync" onClick={syncWithExcel} disabled={isSyncing}>{isSyncing ? "..." : `📤 Guardar ${syncQueue.length} en Excel`}</button>}
                            <button className="btn-main" onClick={handleOpenForm}>{showForm ? "✕ Cerrar formulario" : "＋ Nueva planeación"}</button>
                        </div>
                    </header>

                    {showForm && (
                        <div className="form-container">
                            <div className="step-box">
                                <h3>1. Selecciona los grados a planear:</h3>
                                <div className="grade-selector">{userGrades.map(g => <button key={g} type="button" className={`grade-chip ${selectedGrades.includes(g) ? 'active' : ''}`} onClick={() => toggleGradeSelection(g)}>{g}</button>)}</div>
                            </div>
                            <form onSubmit={handleSaveToQueue}>
                                {selectedGrades.map((grade) => {
                                    const fd = formsData[grade] || {};
                                    const ctx = fd._mallaCtx || { dbas: [], sdgs: [], objectives: [] };
                                    const hasMalla = ctx.dbas.length > 0 || ctx.objectives.length > 0;
                                    return (
                                        <div key={grade} className="individual-grade-card">
                                            <div className="card-tag">{grade}</div>
                                            <div className="grid-3">
                                                <div className="input-group"><label>Subject</label>
                                                    <select required value={fd.Subject || ""} onChange={(e) => handleSubjectChange(grade, e.target.value)}>
                                                        <option value="">Select...</option>{userSubjects.map(s => <option key={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                                <div className="input-group"><label>Term</label>
                                                    <select required value={fd.Term || ""} onChange={(e) => handleTermChange(grade, e.target.value)}>
                                                        <option value="">Select Term...</option>{TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                                <div className="input-group">
                                                    <label>Session Number / Range</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="Ej: 3 o 2-5"
                                                        // Acepta solo dígitos O el formato "número-número"
                                                        pattern="^[0-9]+(-[0-9]+)?$"
                                                        title="Ingresa un número (ej: 3) o un rango (ej: 2-5)"
                                                        value={fd.Session_Number || ""}
                                                        onChange={(e) => handleInputChange(grade, "Session_Number", e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            {fd.Subject && fd.Term && (
                                                <div className={`curriculum-banner ${hasMalla ? 'ok' : 'warn'}`}>
                                                    {hasMalla ? `📘 Malla cargada: ${ctx.dbas.length} DBAs y ${ctx.objectives.length} objetivos disponibles abajo.` : '⚠️ No encontré malla para esta combinación. Puedes llenar los campos manualmente.'}
                                                </div>
                                            )}

                                            <div className="grid-2">
                                                <div className="input-group"><label>Start Date</label><input type="date" required value={fd["Start Date"] || ""} onChange={(e) => handleInputChange(grade, "Start Date", e.target.value)} /></div>
                                                <div className="input-group"><label>Finish Date</label><input type="date" required value={fd["Finish Date"] || ""} onChange={(e) => handleInputChange(grade, "Finish Date", e.target.value)} /></div>
                                            </div>

                                            <div className="grid-2">
                                                <div className="input-group"><label>Topic</label><input type="text" required value={fd.Topic || ""} placeholder="Theme" onChange={(e) => handleInputChange(grade, "Topic", e.target.value)} /></div>
                                                <div className="input-group"><label>Objective</label>
                                                    {ctx.objectives.length > 0
                                                        ? <input list={`obj-${grade}`} value={fd.Objective || ""} placeholder="Escribe o elige del currículo" onChange={(e) => handleInputChange(grade, "Objective", e.target.value)} />
                                                        : <input type="text" required value={fd.Objective || ""} placeholder="Learning Goal" onChange={(e) => handleInputChange(grade, "Objective", e.target.value)} />}
                                                    <datalist id={`obj-${grade}`}>{ctx.objectives.map((o, i) => <option key={i} value={o} />)}</datalist>
                                                </div>
                                            </div>

                                            <div className="curriculum-fields">
                                                <div className="grid-2">
                                                    <div className="input-group"><label>DBA de referencia</label>
                                                        <select value={fd.DBA_Reference || ""} onChange={(e) => handleInputChange(grade, "DBA_Reference", e.target.value)}>
                                                            <option value="">{ctx.dbas.length ? "Selecciona un DBA del currículo…" : "Sin malla — escribe abajo"}</option>
                                                            {fd.DBA_Reference && !ctx.dbas.includes(fd.DBA_Reference) && <option value={fd.DBA_Reference}>{fd.DBA_Reference.length > 90 ? fd.DBA_Reference.slice(0, 90) + '…' : fd.DBA_Reference}</option>}
                                                            {ctx.dbas.map((d, i) => <option key={i} value={d}>{d.length > 90 ? d.slice(0, 90) + '…' : d}</option>)}
                                                        </select>
                                                        {!ctx.dbas.length && <input type="text" style={{ marginTop: '8px' }} placeholder="DBA (manual)" value={fd.DBA_Reference || ""} onChange={(e) => handleInputChange(grade, "DBA_Reference", e.target.value)} />}
                                                    </div>
                                                    <div className="input-group"><label>Conexión ODS / SDG</label>
                                                        <select value={fd.SDG_Connection || ""} onChange={(e) => handleInputChange(grade, "SDG_Connection", e.target.value)}>
                                                            <option value="">Selecciona un ODS…</option>
                                                            {fd.SDG_Connection && !ctx.sdgs.includes(fd.SDG_Connection) && <option value={fd.SDG_Connection}>{fd.SDG_Connection}</option>}
                                                            {ctx.sdgs.map((s, i) => <option key={i} value={s}>{s}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="grid-2">
                                                    <div className="input-group"><label>Desempeños</label>
                                                        <select value={fd.Assessment_Dimension || ""} onChange={(e) => handleInputChange(grade, "Assessment_Dimension", e.target.value)}>
                                                            <option value="">Selecciona…</option>
                                                            {fd.Assessment_Dimension && !ASSESSMENT_DIMENSIONS.includes(fd.Assessment_Dimension) && <option value={fd.Assessment_Dimension}>{fd.Assessment_Dimension}</option>}
                                                            {ASSESSMENT_DIMENSIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="input-group"><label>Instrumento de evaluación</label>
                                                        <select value={fd.Evaluation_Instrument || ""} onChange={(e) => handleInputChange(grade, "Evaluation_Instrument", e.target.value)}>
                                                            <option value="">Selecciona…</option>
                                                            {fd.Evaluation_Instrument && !EVALUATION_INSTRUMENTS.includes(fd.Evaluation_Instrument) && <option value={fd.Evaluation_Instrument}>{fd.Evaluation_Instrument}</option>}
                                                            {EVALUATION_INSTRUMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="curriculum-fields">
                                                <div className="grid-2">
                                                    <div className="input-group"><label>Estándar</label>
                                                        <select value={fd.Standard || ""} onChange={(e) => handleInputChange(grade, "Standard", e.target.value)}>
                                                            <option value="">{ctx.standards?.length ? "Selecciona un estándar…" : "Sin malla"}</option>
                                                            {(ctx.standards || []).map((s, i) => <option key={i} value={s}>{s}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="input-group"><label>Dimensión</label>
                                                        <select value={fd.Dimension || ""} onChange={(e) => handleInputChange(grade, "Dimension", e.target.value)}>
                                                            <option value="">Selecciona…</option>
                                                            {DIMENSIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="grid-2">
                                                    <div className="input-group"><label>Principio CREAR</label>
                                                        <select value={fd.Principle || ""} onChange={(e) => handleInputChange(grade, "Principle", e.target.value)}>
                                                            <option value="">Selecciona…</option>
                                                            {["Cuidado", "Responsabilidad", "Excelencia", "Amor por el aprendizaje", "Relaciones sanas y armoniosas"].map(p => <option key={p} value={p}>{p}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="input-group"><label>Valor</label>
                                                        <select value={fd.Value || ""} onChange={(e) => handleInputChange(grade, "Value", e.target.value)}>
                                                            <option value="">Selecciona…</option>
                                                            {VALUES.map(v => <option key={v} value={v}>{v}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="curriculum-fields">
                                                <div className="grid-2">
                                                    <div className="input-group"><label>Metodología</label>
                                                        <select value={fd.Methodology || ""} onChange={(e) => handleInputChange(grade, "Methodology", e.target.value)}>
                                                            <option value="">Selecciona…</option>
                                                            {METHODOLOGIES.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="input-group"><label>Evidencia de aprendizaje</label>
                                                        <input
                                                            type="text"
                                                            placeholder="¿Qué produce el estudiante?"
                                                            value={fd.Learning_Evidence_Text || ""}
                                                            onChange={(e) => handleInputChange(grade, "Learning_Evidence_Text", e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="input-group">
                                                    <label>Ajustes de inclusión (DUA/PIAR)</label>
                                                    <div className="incl-chips">
                                                        {INCLUSION_STRATEGIES.map(s => {
                                                            const active = (fd.Inclusion_Adjustments || []).includes(s);
                                                            return (
                                                                <button
                                                                    key={s}
                                                                    type="button"
                                                                    className={`incl-chip ${active ? 'on' : ''}`}
                                                                    onClick={() => {
                                                                        const cur = fd.Inclusion_Adjustments || [];
                                                                        handleInputChange(grade, "Inclusion_Adjustments",
                                                                            active ? cur.filter(x => x !== s) : [...cur, s]);
                                                                    }}
                                                                >{s}</button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="clil-selector-grid">
                                                <div className="clil-box"><label>Thinking Skills</label>
                                                    <div className="clil-scroll">
                                                        {(() => {
                                                            const allSkills = Object.values(CLIL_RESOURCES.thinkingSkills).flat();
                                                            const extras = (fd["Thinking Skill"] || []).filter(v => v && !allSkills.includes(v));
                                                            return extras.length > 0 && (
                                                                <div className="clil-cat"><strong>✨ GENERADO POR LUMI</strong>
                                                                    {extras.map(v => <div key={v} className="clil-option active" onClick={() => handleMultiSelect(grade, "Thinking Skill", v)}>{v}</div>)}
                                                                </div>
                                                            );
                                                        })()}
                                                        {Object.entries(CLIL_RESOURCES.thinkingSkills).map(([cat, skills]) => (
                                                            <div key={cat} className="clil-cat"><strong>{cat.toUpperCase()}</strong>
                                                                {skills.map(s => <div key={s} className={`clil-option ${fd["Thinking Skill"]?.includes(s) ? 'active' : ''}`} onClick={() => handleMultiSelect(grade, "Thinking Skill", s)}>{s}</div>)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="clil-box"><label>Language Frames</label>
                                                    <div className="clil-custom-add" style={{ padding: '10px', display: 'flex', gap: '5px' }}>
                                                        <input type="text" placeholder="Add custom frame..." value={customFrame} onChange={(e) => setCustomFrame(e.target.value)} style={{ fontSize: '0.8rem', flex: 1 }} />
                                                        <button type="button" onClick={() => handleAddCustomFrame(grade)} className="btn-view" style={{ padding: '5px 10px' }}>+</button>
                                                    </div>
                                                    <div className="clil-scroll">
                                                        {/* 1. Mostrar frames generados por IA (si existen) */}
                                                        {(() => {
                                                            const allFrames = Object.values(CLIL_RESOURCES.languageFrames).flat();
                                                            const extras = (fd["Language Frame"] || []).filter(v => v && !allFrames.includes(v) && !localCustomFrames.includes(v));
                                                            return extras.length > 0 && (
                                                                <div className="clil-cat"><strong>✨ GENERADO POR LUMI</strong>
                                                                    {extras.map(v => <div key={v} className="clil-option active" onClick={() => handleMultiSelect(grade, "Language Frame", v)}>{v}</div>)}
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* 2. Mostrar frames personalizados por el usuario */}
                                                        {localCustomFrames.length > 0 && (
                                                            <div className="clil-cat"><strong>USER CUSTOM</strong>
                                                                {localCustomFrames.map(cf => <div key={cf} className={`clil-option ${fd["Language Frame"]?.includes(cf) ? 'active' : ''}`} onClick={() => handleMultiSelect(grade, "Language Frame", cf)}>{cf}</div>)}
                                                            </div>
                                                        )}

                                                        {/* 3. ¡ESTO ES LO QUE TE FALTA! Mapear las categorías reales */}
                                                        {Object.entries(CLIL_RESOURCES.languageFrames).map(([cat, frames]) => (
                                                            <div key={cat} className="clil-cat">
                                                                <strong>{cat.toUpperCase()}</strong>
                                                                {frames.map(f => (
                                                                    <div
                                                                        key={f}
                                                                        className={`clil-option ${fd["Language Frame"]?.includes(f) ? 'active' : ''}`}
                                                                        onClick={() => handleMultiSelect(grade, "Language Frame", f)}
                                                                    >
                                                                        {f}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid-3">
                                                <div className="input-group"><label>Thinking Routine</label>
                                                    <select value={fd["Thinking Routine"] || ""} onChange={(e) => handleInputChange(grade, "Thinking Routine", e.target.value)}>
                                                        <option value="">Select Routine...</option>
                                                        {fd["Thinking Routine"] && !CLIL_RESOURCES.thinkingRoutines.includes(fd["Thinking Routine"]) && <option value={fd["Thinking Routine"]}>{fd["Thinking Routine"]}</option>}
                                                        {CLIL_RESOURCES.thinkingRoutines.map(r => <option key={r}>{r}</option>)}
                                                    </select>
                                                </div>
                                                <div className="input-group"><label>Vocabulary Big 5</label><input type="text" value={fd["Vocabulary Big 5"] || ""} placeholder="Word1, Word2..." onChange={(e) => handleInputChange(grade, "Vocabulary Big 5", e.target.value)} /></div>
                                                <div className="input-group"><label>Resources</label><input type="text" value={fd["Richmond Resources"] || ""} placeholder="Richmond / Digital" onChange={(e) => handleInputChange(grade, "Richmond Resources", e.target.value)} /></div>
                                            </div>

                                            <div className="links-notice">🔗 Recuerda: los enlaces de videos, imágenes y actividades los agregas tú aquí. Lumi no copia enlaces por seguridad.</div>

                                            <div className="grid-2">
                                                <textarea placeholder="Class Description (Include the Hook)" value={fd["The Hook"] || ""} onChange={(e) => handleInputChange(grade, "The Hook", e.target.value)} />
                                                <div className="grid-vertical">
                                                    <input type="text" placeholder="Activity Links (comma separated)" value={fd["Activity Link"] || ""} onChange={(e) => handleInputChange(grade, "Activity Link", e.target.value)} />
                                                    <input type="text" placeholder="Homework / Parent Task" value={fd["Parent Task"] || ""} onChange={(e) => handleInputChange(grade, "Parent Task", e.target.value)} />
                                                    <input type="text" placeholder="Weekly Challenge" value={fd["Weekly Challenge"] || ""} onChange={(e) => handleInputChange(grade, "Weekly Challenge", e.target.value)} />
                                                </div>
                                            </div>

                                            <div className="grid-2">
                                                <div className="input-group"><label>Link de ClassDojo (opcional)</label><input type="url" placeholder="https://classdojo.com/..." value={fd.ClassDojo_Link || ""} onChange={(e) => handleInputChange(grade, "ClassDojo_Link", e.target.value)} /></div>
                                            </div>

                                            <div className="feedback-block">
                                                <label className="feedback-toggle">
                                                    <input type="checkbox" checked={!!fd.Interactive_Feedback} onChange={(e) => handleInputChange(grade, "Interactive_Feedback", e.target.checked)} />
                                                    <span>🎮 Activar feedback interactivo (5 preguntas de cierre para jugar en clase)</span>
                                                </label>
                                                {fd.Interactive_Feedback && (
                                                    <div className="fq-editor">
                                                        <div className="fq-head">
                                                            <label>Preguntas de cierre (para los juegos)</label>
                                                            <button
                                                                type="button"
                                                                className="fq-add"
                                                                onClick={() => {
                                                                    const list = safeParse(fd.Feedback_Questions_JSON) || [];
                                                                    list.push({ q: "", opts: ["", "", "", ""], correct: 0 });
                                                                    handleInputChange(grade, "Feedback_Questions_JSON", JSON.stringify(list));
                                                                }}
                                                            >+ Agregar pregunta</button>
                                                        </div>

                                                        {(safeParse(fd.Feedback_Questions_JSON) || []).map((item, qi) => {
                                                            const list = safeParse(fd.Feedback_Questions_JSON) || [];
                                                            const update = (fn) => {
                                                                fn(list[qi]);
                                                                handleInputChange(grade, "Feedback_Questions_JSON", JSON.stringify(list));
                                                            };
                                                            return (
                                                                <div key={qi} className="fq-item">
                                                                    <div className="fq-item-head">
                                                                        <span className="fq-num">{qi + 1}</span>
                                                                        <input
                                                                            type="text"
                                                                            className="fq-question"
                                                                            placeholder="Escribe la pregunta…"
                                                                            value={item.q || ""}
                                                                            onChange={(e) => update(it => { it.q = e.target.value; })}
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            className="fq-del"
                                                                            onClick={() => {
                                                                                list.splice(qi, 1);
                                                                                handleInputChange(grade, "Feedback_Questions_JSON", JSON.stringify(list));
                                                                            }}
                                                                        >×</button>
                                                                    </div>

                                                                    <div className="fq-opts">
                                                                        {[0, 1, 2, 3].map(oi => (
                                                                            <label key={oi} className={`fq-opt ${item.correct === oi ? 'is-correct' : ''}`}>
                                                                                <input
                                                                                    type="radio"
                                                                                    name={`correct-${grade}-${qi}`}
                                                                                    checked={item.correct === oi}
                                                                                    onChange={() => update(it => { it.correct = oi; })}
                                                                                />
                                                                                <span className="fq-letter">{String.fromCharCode(65 + oi)}</span>
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder={`Opción ${String.fromCharCode(65 + oi)}`}
                                                                                    value={(item.opts && item.opts[oi]) || ""}
                                                                                    onChange={(e) => update(it => {
                                                                                        if (!Array.isArray(it.opts)) it.opts = ["", "", "", ""];
                                                                                        it.opts[oi] = e.target.value;
                                                                                    })}
                                                                                />
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                    <p className="fq-hint">Marca el círculo de la opción correcta.</p>
                                                                </div>
                                                            );
                                                        })}

                                                        {(safeParse(fd.Feedback_Questions_JSON) || []).length === 0 && (
                                                            <p className="fq-empty">Agrega hasta 5 preguntas con sus 4 opciones para jugar al cierre de la clase.</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="form-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                    {selectedGrades.length > 0 && <button type="submit" className="btn-save-all">Guardar</button>}
                                    <button type="button" className="btn-cancel" onClick={handleCancelForm}>Cancelar</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}

            {/* ===================== LISTA ===================== */}

            {view === 'list' && (
                <div className="lumi-surface">
                    <header className="page-header">
                        <div className="title-section">
                            <button className="lumi-back" onClick={() => setView('hub')}>← Volver</button>
                            <h1>Mis planeaciones</h1>
                            <p>Sesión iniciada como: <strong>{userData.Teacher_Name || userData.User_Key}</strong></p>
                        </div>
                        <div className="header-actions">
                            <button className="btn-refresh" onClick={fetchData} disabled={isSyncing}>
                                {isSyncing ? "Cargando…" : "Actualizar"}
                            </button>
                            {syncQueue.length > 0 && (
                                <button className="btn-sync" onClick={syncWithExcel} disabled={isSyncing}>
                                    {isSyncing ? "Guardando…" : `Guardar ${syncQueue.length} en Excel`}
                                </button>
                            )}
                        </div>
                    </header>

                    <div className="plan-list-wrap">
                        {/* Barra: contador + filtros */}
                        <div className="pl-toolbar">
                            <div className="pl-count">
                                <strong>{displayedPlannings.length}</strong> {displayedPlannings.length === 1 ? 'planeación' : 'planeaciones'}
                                {!isFiltered && orderedPlannings.length > displayedPlannings.length && ` de ${orderedPlannings.length}`}
                            </div>
                            <div className="pl-filters">
                                <select className="pl-select" value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
                                    <option value="">Todos los grados</option>
                                    {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                                <select className="pl-select" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                                    <option value="">Todas las materias</option>
                                    {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <select className="pl-select" value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)}>
                                    <option value="">Todos los periodos</option>
                                    {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                {isFiltered && (
                                    <button className="pl-clear" onClick={() => { setFilterGrade(""); setFilterSubject(""); setFilterTerm(""); }}>
                                        Limpiar
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Tarjetas */}
                        {displayedPlannings.length > 0 ? (
                            <div className="pl-grid">
                                {displayedPlannings.map((plan, i) => {
                                    const isAI = plan.Source === 'Lumi';
                                    return (
                                        <article key={i} className="pl-card" data-tone={subjectTone(plan.Subject)}>
                                            <div className="pl-main">
                                                <div className="pl-tags">
                                                    <span className="pl-tag subject">{plan.Subject}</span>
                                                    <span className="pl-tag grade">{plan.Grade} · {plan.Term}</span>
                                                    {plan.Session_Number && <span className="pl-tag session">Sesión {plan.Session_Number}</span>}
                                                    <span className={`pl-tag source ${isAI ? 'ai' : 'manual'}`}>
                                                        {isAI ? Icon.spark : Icon.pencil}
                                                        {isAI ? 'Lumi' : 'Manual'}
                                                    </span>
                                                </div>

                                                <h3 className="pl-title">{plan.Topic || 'Sin tema'}</h3>
                                                {plan.Objective && <p className="pl-objective">{plan.Objective}</p>}

                                                <div className="pl-meta">
                                                    <span>{Icon.calendar}{dateRange(plan["Start Date"] || plan.Start_Date, plan["Finish Date"] || plan.Finish_Date)}</span>
                                                    {isAdmin && <span className="pl-owner">{Icon.user}{plan.Teacher}</span>}
                                                    {plan.isLocal && <span className="pl-pending">{Icon.clock}Sin guardar</span>}
                                                </div>
                                            </div>

                                            <div className="pl-actions">
                                                <button className="pl-icon-btn view" title="Ver resumen" onClick={() => setSelectedSummary(plan)}>{Icon.eye}</button>
                                                <button className="pl-icon-btn edit" title="Editar" onClick={() => handleEdit(plan)}>{Icon.pencil}</button>
                                                <button className="pl-icon-btn delete" title="Eliminar" onClick={() => handleDelete(plan)}>{Icon.trash}</button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className={isSyncing ? "pl-loading" : "pl-empty"}>
                                {isSyncing && (
                                    <div className="pl-orbit">
                                        <span className="pl-orbit-ring" />
                                        <span className="pl-orbit-dot" />
                                        <span className="pl-orbit-core" />
                                    </div>
                                )}
                                {!isSyncing && <div className="pl-empty-art">{Icon.empty}</div>}
                                <h3>{isSyncing ? 'Cargando tus planeaciones' : 'Aún no hay planeaciones'}</h3>
                                <p>{isSyncing ? 'Un momento, estamos trayendo todo desde la nube.' : 'Crea tu primera sesión con Lumi o planea tú mismo.'}</p>
                                {isSyncing && (
                                    <div className="pl-skeletons">
                                        <span className="pl-skeleton" />
                                        <span className="pl-skeleton" />
                                        <span className="pl-skeleton" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* ===================== MODAL RESUMEN ===================== */}

            {selectedSummary && (() => {
                const p = selectedSummary;
                const steps = parseHookSteps(p['The Hook'] || p.The_Hook);
                const vocab = toChips(p['Vocabulary Big 5'] || p.Vocabulary_Big_5);
                const skills = toChips(p['Thinking Skill'] || p.Thinking_Skill);
                const frames = toChips(p['Language Frame'] || p.Language_Frame);
                const isAI = p.Source === 'Lumi';
                const hasFeedback = String(p.Interactive_Feedback).toUpperCase() === 'TRUE';
                const questions = safeParse(p.Feedback_Questions_JSON) || [];
                const agendaMsg = buildAgendaMessage(p);
                const aiData = safeParse(p.AI_Content_JSON) || {};
                const sylCtx = extractFromSyllabus(
                    syllabusTemplates.find(s => norm(s.Subject) === norm(p.Subject))?.Summary_JSON
                );

                const copyAgenda = () => {
                    navigator.clipboard?.writeText(agendaMsg).then(() => {
                        setCopiedAgenda(true);
                        setTimeout(() => setCopiedAgenda(false), 2000);
                    });
                };

                return (
                    <div className="modal-overlay" onClick={() => { setSelectedSummary(null); setSummaryTab('resumen'); setActiveGame(null); setSelectedGame(''); setShowReviewForm(false); }}>
                        <div className="lesson-modal" onClick={e => e.stopPropagation()}>

                            {/* ===== CABECERA ===== */}
                            <div className="lm-head">
                                <div className="lm-head-top">
                                    <div className="lm-badges">
                                        <span className={`lm-badge ${isAI ? 'ai' : 'manual'}`}>{isAI ? '✨ Diseñada con Lumi' : '✍️ Diseño del docente'}</span>
                                        {hasFeedback && <span className="lm-badge game">🎮 Feedback interactivo</span>}
                                    </div>
                                    <button className="lm-close" onClick={() => { setSelectedSummary(null); setSummaryTab('resumen'); setActiveGame(null); setSelectedGame(''); setShowReviewForm(false); }}>×</button>
                                </div>
                                <h2 className="lm-title">{p.Topic || 'Sin tema'}</h2>
                                <div className="lm-meta">
                                    <span>{p.Subject}</span>
                                    <i>·</i>
                                    <span>{p.Grade}</span>
                                    <i>·</i>
                                    <span>{p.Term}</span>
                                    <i>·</i>
                                    <span>Sesión {p.Session_Number || '—'}</span>
                                </div>
                                <div className="lm-dates">
                                    📅 {formatDate(p['Start Date'] || p.Start_Date) || 'Sin fecha'} → {formatDate(p['Finish Date'] || p.Finish_Date) || 'Sin fecha'}
                                    <span className="lm-teacher">👤 {p.Teacher}</span>
                                </div>

                                {/* Pestañas */}
                                <div className="lm-tabs">
                                    {[
                                        ['resumen', '📋 Resumen'],
                                        ['desarrollo', '🔄 Desarrollo'],
                                        ['recursos', '🎒 Recursos'],
                                        ['juego', '🎮 Warm-up Game'],
                                        ...(isAdmin || planReviews.some(r => r.ID_Lesson_Ref === `PLAN-${p.ID_Setup}`)
                                            ? [['revision', '✅ Revisión']] : [])
                                    ].map(([id, label]) => (
                                        <button key={id} className={`lm-tab ${summaryTab === id ? 'on' : ''}`} onClick={() => setSummaryTab(id)}>{label}</button>
                                    ))}
                                </div>
                            </div>

                            {/* ===== CUERPO ===== */}
                            <div className="lm-body">

                                {/* ---------- TAB RESUMEN ---------- */}
                                {summaryTab === 'resumen' && (
                                    <div className="lm-pane">
                                        <div className="lm-objective">
                                            <span className="lm-label">Objetivo de aprendizaje</span>
                                            <p>{p.Objective || 'Sin objetivo registrado'}</p>
                                        </div>

                                        <span className="lm-section-title">Trazabilidad curricular</span>
                                        <div className="lm-trace-grid">
                                            <div className="lm-trace-card dba">
                                                <span className="lm-trace-tag">DBA</span>
                                                <p>{p.DBA_Reference || 'No asignado'}</p>
                                            </div>
                                            <div className="lm-trace-card sdg">
                                                <span className="lm-trace-tag">ODS</span>
                                                <p>{p.SDG_Connection || 'No asignado'}</p>
                                            </div>
                                            <div className="lm-trace-card siee">
                                                <span className="lm-trace-tag">Desempeño</span>
                                                <p>{p.Assessment_Dimension || 'No asignada'}</p>
                                            </div>
                                            <div className="lm-trace-card instr">
                                                <span className="lm-trace-tag">Instrumento</span>
                                                <p>{p.Evaluation_Instrument || 'No asignado'}</p>
                                            </div>
                                        </div>
                                        {(aiData.Methodology || aiData.Learning_Evidence) && (
                                            <>
                                                <span className="lm-section-title">Metodología y evidencia</span>
                                                {aiData.Methodology && (
                                                    <div className="lm-objective">
                                                        <span className="lm-label">Metodología aplicada</span>
                                                        <p>{aiData.Methodology}</p>
                                                    </div>
                                                )}
                                                {aiData.Learning_Evidence?.product && (
                                                    <div className="lm-objective">
                                                        <span className="lm-label">Evidencia de aprendizaje</span>
                                                        <p>{aiData.Learning_Evidence.product}</p>
                                                    </div>
                                                )}
                                                {Array.isArray(aiData.Learning_Evidence?.phases) && aiData.Learning_Evidence.phases.length > 0 && (
                                                    <div className="ev-phases">
                                                        {aiData.Learning_Evidence.phases.map((ph, i) => (
                                                            <div key={i} className="ev-phase">
                                                                <span className="ev-moment">{ph.moment}</span>
                                                                <div className="ev-body">
                                                                    <p><strong>Acción:</strong> {ph.action}</p>
                                                                    <p><strong>Se recoge:</strong> {ph.collect}</p>
                                                                    <p><strong>Logro:</strong> {ph.criteria}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {Array.isArray(aiData.Inclusion_Adjustments) && aiData.Inclusion_Adjustments.length > 0 && (
                                            <>
                                                <span className="lm-section-title">Ajustes de inclusión</span>
                                                <div className="lm-chips">
                                                    {aiData.Inclusion_Adjustments.map((a, i) => (
                                                        <span key={i} className="lm-chip incl">{a}</span>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                        <span className="lm-section-title">Marco institucional</span>
                                        <div className="lm-trace-grid">
                                            <div className="lm-trace-card dba">
                                                <span className="lm-trace-tag">Estándar</span>
                                                <p>{aiData.Standard || p.Standard || 'No asignado'}</p>
                                            </div>
                                            <div className="lm-trace-card sdg">
                                                <span className="lm-trace-tag">Dimensión</span>
                                                <p>{aiData.Dimension || p.Dimension || 'No asignada'}</p>
                                            </div>
                                            <div className="lm-trace-card siee">
                                                <span className="lm-trace-tag">Principio CREAR</span>
                                                <p>{aiData.Principle || p.Principle || 'No asignado'}</p>
                                            </div>
                                            <div className="lm-trace-card instr">
                                                <span className="lm-trace-tag">Valor</span>
                                                <p>{aiData.Value || p.Value || 'No asignado'}</p>
                                            </div>
                                        </div>

                                        {sylCtx.methodology && (
                                            <>
                                                <span className="lm-section-title">Metodología del área</span>
                                                <div className="lm-objective">
                                                    <p>{sylCtx.methodology}</p>
                                                </div>
                                            </>
                                        )}

                                        <span className="lm-section-title">Andamiaje CLIL</span>
                                        <div className="lm-scaffold">
                                            <div className="lm-scaffold-row">
                                                <span className="lm-label">Vocabulary Big 5</span>
                                                <div className="lm-chips">
                                                    {vocab.length ? vocab.map((v, i) => <span key={i} className="lm-chip vocab">{v}</span>) : <em className="lm-empty">Sin vocabulario</em>}
                                                </div>
                                            </div>
                                            <div className="lm-scaffold-row">
                                                <span className="lm-label">Thinking Skills</span>
                                                <div className="lm-chips">
                                                    {skills.length ? skills.map((v, i) => <span key={i} className="lm-chip skill">{v}</span>) : <em className="lm-empty">Sin habilidades</em>}
                                                </div>
                                            </div>
                                            <div className="lm-scaffold-row">
                                                <span className="lm-label">Thinking Routine</span>
                                                <div className="lm-chips">
                                                    {(p['Thinking Routine'] || p.Thinking_Routine)
                                                        ? <span className="lm-chip routine">{p['Thinking Routine'] || p.Thinking_Routine}</span>
                                                        : <em className="lm-empty">Sin rutina</em>}
                                                </div>
                                            </div>
                                            <div className="lm-scaffold-row">
                                                <span className="lm-label">Language Frames</span>
                                                <div className="lm-frames">
                                                    {frames.length ? frames.map((v, i) => <div key={i} className="lm-frame">“{v}”</div>) : <em className="lm-empty">Sin frames</em>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ---------- TAB DESARROLLO ---------- */}
                                {summaryTab === 'desarrollo' && (
                                    <div className="lm-pane">
                                        <span className="lm-section-title">Ruta de la clase</span>
                                        {steps.length > 0 ? (
                                            <ol className="lm-steps">
                                                {steps.map((s, i) => (
                                                    <li key={i} className="lm-step">
                                                        <div className="lm-step-marker">
                                                            <span className="lm-step-icon">{s.icon}</span>
                                                            <span className="lm-step-num">{i + 1}</span>
                                                        </div>
                                                        <div className="lm-step-body">
                                                            {s.title && <strong>{s.title}</strong>}
                                                            <p>{s.content}</p>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ol>
                                        ) : (
                                            <p className="lm-empty">No hay desarrollo registrado para esta sesión.</p>
                                        )}

                                        {(p['Weekly Challenge'] || p.Weekly_Challenge) && (
                                            <div className="lm-challenge">
                                                <span className="lm-trace-tag">🏆 Weekly Challenge</span>
                                                <p>{p['Weekly Challenge'] || p.Weekly_Challenge}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ---------- TAB RECURSOS ---------- */}
                                {summaryTab === 'recursos' && (
                                    <div className="lm-pane">
                                        <span className="lm-section-title">Materiales y enlaces</span>
                                        <div className="lm-resource-row">
                                            <span className="lm-label">Recursos</span>
                                            <p>{p['Richmond Resources'] || p.Richmond_Resources || <em className="lm-empty">Sin recursos registrados</em>}</p>
                                        </div>
                                        <div className="lm-resource-row">
                                            <span className="lm-label">Enlaces de actividad</span>
                                            <div className="lm-links">{renderLinks(p['Activity Link'] || p.Activity_Link)}</div>
                                        </div>
                                        {p.ClassDojo_Link && (
                                            <div className="lm-resource-row">
                                                <span className="lm-label">ClassDojo</span>
                                                <a className="lm-dojo" href={p.ClassDojo_Link} target="_blank" rel="noreferrer">Abrir ClassDojo ↗</a>
                                            </div>
                                        )}

                                        <span className="lm-section-title">Tarea para casa</span>
                                        {agendaMsg ? (
                                            <div className="lm-agenda">
                                                <pre>{agendaMsg}</pre>
                                                <button className={`lm-copy ${copiedAgenda ? 'done' : ''}`} onClick={copyAgenda}>
                                                    {copiedAgenda ? '✅ ¡Copiado!' : '📋 Copiar para la agenda'}
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="lm-empty">No hay tarea asignada.</p>
                                        )}

                                        {hasFeedback && (() => {
                                            const gameQs = normalizeQuestions(p.Feedback_Questions_JSON);
                                            const playable = gameQs.length > 0 && gameQs.every(q => q.interactive);

                                            return (
                                                <>
                                                    <span className="lm-section-title">🎮 Feedback interactivo</span>

                                                    {gameQs.length === 0 ? (
                                                        <p className="lm-empty">No hay preguntas de cierre configuradas.</p>
                                                    ) : (
                                                        <>
                                                            <div className="fb-launcher">
                                                                <div className="fb-launcher-info">
                                                                    <strong>{gameQs.length} preguntas listas</strong>
                                                                    <span>
                                                                        {playable
                                                                            ? 'Elige un juego para cerrar la clase jugando.'
                                                                            : 'Estas preguntas no tienen opciones, solo se pueden leer en clase.'}
                                                                    </span>
                                                                </div>

                                                                {playable && (
                                                                    <div className="fb-launcher-controls">
                                                                        <select
                                                                            className="fb-select"
                                                                            value={selectedGame}
                                                                            onChange={(e) => setSelectedGame(e.target.value)}
                                                                        >
                                                                            <option value="">Selecciona un juego…</option>
                                                                            {GAME_CATALOG.map(g => (
                                                                                <option key={g.id} value={g.id}>{g.icon} {g.name}</option>
                                                                            ))}
                                                                        </select>
                                                                        <button
                                                                            className="fb-play"
                                                                            disabled={!selectedGame}
                                                                            onClick={() => setActiveGame(selectedGame)}
                                                                        >
                                                                            ▶ Jugar
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {playable && selectedGame && (
                                                                <p className="fb-game-desc">
                                                                    {GAME_CATALOG.find(g => g.id === selectedGame)?.desc}
                                                                </p>
                                                            )}

                                                            <span className="lm-section-title">Preguntas</span>
                                                            <ol className="lm-questions">
                                                                {gameQs.map((q, i) => (
                                                                    <li key={i}>
                                                                        {q.q}

                                                                    </li>
                                                                ))}
                                                            </ol>
                                                        </>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}
                                {summaryTab === 'revision' && (() => {
                                    const rev = planReviews.find(r => r.ID_Lesson_Ref === `PLAN-${p.ID_Setup}`);
                                    const scoreVal = Number(rev?.Score) || 0;
                                    const scoreTone = scoreVal >= 85 ? 'ok' : scoreVal >= 70 ? 'mid' : 'low';

                                    return (
                                        <div className="lm-pane">
                                            {rev && !showReviewForm && (
                                                <>
                                                    <div className={`pr-score ${scoreTone}`}>
                                                        <div className="pr-score-num">
                                                            <strong>{scoreVal}</strong><em>/ 100</em>
                                                        </div>
                                                        <div className="pr-score-meta">
                                                            <span className="lm-label">Revisado por</span>
                                                            <p>{rev.Commitment || 'Coordinación'}</p>
                                                        </div>
                                                    </div>

                                                    <span className="lm-section-title">Comentario general</span>
                                                    <div className="lm-objective"><p>{rev.Feedback || 'Sin comentario'}</p></div>

                                                    {(rev["Areas for Improvement"] || rev.Areas_for_Improvement) && (
                                                        <>
                                                            <span className="lm-section-title">Áreas de mejora</span>
                                                            <div className="pr-box warn">
                                                                <p>{rev["Areas for Improvement"] || rev.Areas_for_Improvement}</p>
                                                            </div>
                                                        </>
                                                    )}

                                                    {(rev["Next Steps"] || rev.Next_Steps) && (
                                                        <>
                                                            <span className="lm-section-title">Recomendaciones</span>
                                                            <div className="pr-box ok">
                                                                <p>{rev["Next Steps"] || rev.Next_Steps}</p>
                                                            </div>
                                                        </>
                                                    )}

                                                    {isAdmin && (
                                                        <div className="game-actions" style={{ marginTop: '20px' }}>
                                                            <button className="lm-copy" onClick={() => openReviewForm(p)}>
                                                                ✏️ Editar revisión
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {!rev && !showReviewForm && (
                                                <div className="pr-empty">
                                                    <span className="pr-empty-icon">📋</span>
                                                    <h3>Sin revisar aún</h3>
                                                    <p>{isAdmin
                                                        ? 'Registra tu valoración de esta planeación.'
                                                        : 'Coordinación aún no ha revisado esta planeación.'}</p>
                                                    {isAdmin && (
                                                        <button className="lm-copy" onClick={() => openReviewForm(p)}>
                                                            ✅ Revisar planeación
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {showReviewForm && isAdmin && (
                                                <div className="pr-form">
                                                    <div className="pr-field">
                                                        <label>Nota de la planeación</label>
                                                        <div className="pr-range">
                                                            <input
                                                                type="range" min="0" max="100" step="5"
                                                                value={reviewForm.score}
                                                                onChange={e => setReviewForm(f => ({ ...f, score: e.target.value }))}
                                                            />
                                                            <span className={`pr-range-val ${Number(reviewForm.score) >= 85 ? 'ok' : Number(reviewForm.score) >= 70 ? 'mid' : 'low'}`}>
                                                                {reviewForm.score}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="pr-field">
                                                        <label>Comentario general</label>
                                                        <textarea
                                                            rows={3}
                                                            placeholder="¿La planeación cumple con los 8 pasos? ¿Las páginas del libro son correctas?"
                                                            value={reviewForm.feedback}
                                                            onChange={e => setReviewForm(f => ({ ...f, feedback: e.target.value }))}
                                                        />
                                                    </div>

                                                    <div className="pr-field">
                                                        <label>Áreas de mejora</label>
                                                        <textarea
                                                            rows={2}
                                                            placeholder="Qué debe ajustarse…"
                                                            value={reviewForm.areas}
                                                            onChange={e => setReviewForm(f => ({ ...f, areas: e.target.value }))}
                                                        />
                                                    </div>

                                                    <div className="pr-field">
                                                        <label>Recomendaciones</label>
                                                        <textarea
                                                            rows={2}
                                                            placeholder="Sugerencias concretas para la próxima sesión…"
                                                            value={reviewForm.next}
                                                            onChange={e => setReviewForm(f => ({ ...f, next: e.target.value }))}
                                                        />
                                                    </div>

                                                    <div className="game-actions">
                                                        <button className="lm-btn" onClick={() => setShowReviewForm(false)}>Cancelar</button>
                                                        <button className="lm-copy" onClick={savePlanReview} disabled={savingReview}>
                                                            {savingReview ? 'Guardando…' : '💾 Guardar revisión'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                {summaryTab === 'juego' && (
                                    <div className="lm-pane lm-pane-game-intro">
                                        <div className="ftw-intro-card">
                                            <span className="ftw-intro-icon">🎯</span>
                                            <h3 className="ftw-intro-title">Find the Word! · Warm-up</h3>
                                            <p className="ftw-intro-text">
                                                Proyecta la pantalla y practica spelling con tus estudiantes usando el vocabulario clave de la sesión.
                                            </p>
                                            <button
                                                type="button"
                                                className="btn-main btn-game-start"
                                                onClick={() => setShowGameModal(true)}
                                            >
                                                🚀 ¡Iniciar Juego en Pantalla Completa!
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ===== PIE ===== */}
                            <div className="lm-foot">
                                <span className="lm-foot-note">{isAI ? 'Diseñada con Lumi · revisada por el docente' : 'Diseño del docente'}</span>
                                <button className="lm-btn" onClick={() => { setSelectedSummary(null); setSummaryTab('resumen'); setActiveGame(null); setSelectedGame(''); setShowReviewForm(false); }}>Cerrar</button>
                            </div>
                        </div>
                    </div>
                );
            })()}
            {/* ===================== MODAL DE JUEGO ===================== */}
            {activeGame && selectedSummary && (
                <div className="game-overlay" onClick={() => setActiveGame(null)}>
                    <div onClick={e => e.stopPropagation()}>
                        {activeGame === 'memory' && (
                            <MemoryFlash questionsJson={selectedSummary.Feedback_Questions_JSON} onExit={() => setActiveGame(null)} />
                        )}
                        {activeGame === 'gravity' && (
                            <GravityCatch questionsJson={selectedSummary.Feedback_Questions_JSON} onExit={() => setActiveGame(null)} />
                        )}
                        {activeGame === 'shoot' && (
                            <SpaceBlast questionsJson={selectedSummary.Feedback_Questions_JSON} onExit={() => setActiveGame(null)} />
                        )}
                        {activeGame === 'atom' && (
                            <BohrOrbit questionsJson={selectedSummary.Feedback_Questions_JSON} onExit={() => setActiveGame(null)} />
                        )}
                        {activeGame === 'dash' && (
                            <LumiDash questionsJson={selectedSummary.Feedback_Questions_JSON} onExit={() => setActiveGame(null)} />
                        )}
                    </div>
                </div>
            )}

            {/* Modal preview de prompt */}
            {previewPrompt && (
                <div className="modal-overlay" onClick={() => setPreviewPrompt(null)}>
                    <div className="prompt-preview-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{previewPrompt.label}</h2>
                            <button className="close-x" onClick={() => setPreviewPrompt(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p className="preview-lang-note">{previewPrompt.lang === 'en' ? '🇬🇧 Lumi responderá en inglés' : '🇪🇸 Lumi responderá en español'}</p>
                            <p className="preview-template">{previewPrompt.template}</p>
                            <p className="preview-fields-title">Campos que llenarás:</p>
                            <ul className="preview-fields">
                                {previewPrompt.fields.map(f => <li key={f.key}>{f.label}</li>)}
                            </ul>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setPreviewPrompt(null)}>Cerrar</button>
                            <button className="btn-main" onClick={() => { selectPrompt(previewPrompt); setPreviewPrompt(null); }}>Usar esta plantilla</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================== MODAL GIGANTE DEL JUEGO ===================== */}
            {showGameModal && selectedSummary && (
                <div className="modal-overlay game-modal-overlay" onClick={() => setShowGameModal(false)} style={{ zIndex: 2000 }}>
                    <div className="game-projector-modal" onClick={e => e.stopPropagation()}>

                        {/* Cabecera del proyector */}
                        <div className="gpm-header">
                            <div className="gpm-title-group">
                                <span className="gpm-badge">👾 WARM-UP GAME</span>
                                <h2>{selectedSummary.Topic || 'Spelling Challenge'}</h2>
                            </div>
                            <button className="gpm-close" onClick={() => setShowGameModal(false)}>✕ Cerrar Juego</button>
                        </div>

                        {/* Cuerpo expandido para el juego */}
                        <div className="gpm-body">
                            <FindTheWordGame vocabularyString={selectedSummary['Vocabulary Big 5'] || selectedSummary.Vocabulary_Big_5} />
                        </div>

                    </div>
                </div>
            )}

            {/* ===================== MODAL EXPLICATIVO: MULTISESIONES DE LUMI (ESTILO GLASS COMPACTO) ===================== */}
            {showSessionsInfoModal && (
                <div className="modal-overlay" onClick={() => setShowSessionsInfoModal(false)} style={{ zIndex: 3000 }}>
                    {/* Agregamos maxWidth y reducimos el padding para que no se coma el chat */}
                    <div className="lesson-modal" onClick={e => e.stopPropagation()} style={{ width: 'min(480px, 95vw)', maxHeight: '80vh' }}>

                        {/* CABECERA REDUCIDA */}
                        <div className="lm-head" style={{ padding: '16px 20px 0' }}>
                            <div className="lm-head-top">
                                <div className="lm-badges">
                                    <span className="lm-badge ai" style={{ padding: '4px 10px' }}>🤖 LUMI INFO</span>
                                </div>
                                <button className="lm-close" style={{ width: '28px', height: '28px', fontSize: '1rem' }} onClick={() => setShowSessionsInfoModal(false)}>×</button>
                            </div>
                            <h3 className="lm-title" style={{ fontSize: '1.35rem', margin: '10px 0 6px' }}>Planear Múltiples Sesiones</h3>
                        </div>

                        {/* CUERPO AJUSTADO */}
                        <div className="lm-body" style={{ padding: '16px 20px 20px', fontSize: '0.88rem' }}>
                            <div className="lm-objective" style={{ padding: '14px 18px', marginBottom: '14px', borderRadius: '14px' }}>
                                <p style={{ fontSize: '0.9rem' }}>
                                    Si le pides a <strong>Lumi</strong> que diseñe más de una sesión a la vez (máximo {MAX_SESSIONS}), la IA dosificará de manera inteligente los contenidos a lo largo de las clases.
                                </p>
                            </div>

                            <span className="lm-section-title" style={{ margin: '16px 0 8px', fontSize: '0.65rem' }}>💡 Tips de organización</span>

                            <ul className="lm-questions" style={{ paddingLeft: '24px' }}>
                                <li style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                                    <strong>Usa números:</strong> En <i>"Lesson Topic"</i> separa tus temas con números (ej: 1, 2, 3) para que Lumi sepa exactamente el orden.
                                </li>
                                <li style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                                    <strong>Materiales:</strong> Las páginas de libros y recursos extras se distribuirán secuencialmente entre cada sesión.
                                </li>
                                <li style={{ fontSize: '0.85rem', marginBottom: '0' }}>
                                    <strong>Evaluación:</strong> El juego de preguntas y metas se generarán adaptados al avance específico de cada día.
                                </li>
                            </ul>
                        </div>

                        {/* PIE REDUCIDO */}
                        <div className="lm-foot" style={{ padding: '12px 20px' }}>
                            <span className="lm-foot-note" style={{ fontSize: '0.7rem' }}>Organiza bloques y ahorra tiempo.</span>
                            <button className="lm-btn" style={{ padding: '8px 20px', borderRadius: '20px', fontSize: '0.8rem' }} onClick={() => setShowSessionsInfoModal(false)}>
                                ¡Entendido!
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};