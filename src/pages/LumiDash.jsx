import React, { useState, useEffect, useRef, useCallback } from 'react';
import { normalizeQuestions, shuffle } from './gameUtils';
import '../Styles/game3.css';
import '../Styles/gamespar.css';
import '../Styles/gamespar2.css';

const MAX_LIVES = 3;

/* --- Física --- */
const GRAVITY = 0.92;          // px por frame²
const JUMP_POWER = 17.5;       // impulso inicial
const GROUND = 0;              // altura del suelo
const PLAYER_X = 14;           // % desde la izquierda
const PLAYER_W = 5;            // ancho del jugador en %
const AIR_LOW = 34;            // borde inferior del obstáculo aéreo (px)
const AIR_HIGH = 86;           // borde superior del obstáculo aéreo (px)
const FLOOR_TOP = 30;          // altura del obstáculo de suelo (px)

export const LumiDash = ({ questionsJson, onExit }) => {
    const questions = normalizeQuestions(questionsJson);

    const [stage, setStage] = useState('intro');
    const [index, setIndex] = useState(0);
    const [lives, setLives] = useState(MAX_LIVES);
    const [hits, setHits] = useState(0);

    const [playerY, setPlayerY] = useState(GROUND);
    const [obstacles, setObstacles] = useState([]);
    const [portal, setPortal] = useState(null);     // {x} | null
    const [options, setOptions] = useState([]);
    const [quizData, setQuizData] = useState(null);
    const [answered, setAnswered] = useState(null);
    const [flash, setFlash] = useState(null);
    const [hurt, setHurt] = useState(false);

    const rafRef = useRef(null);
    const spawnRef = useRef(null);

    /* Todo el estado del bucle vive aquí (evita closures obsoletos) */
    const g = useRef({
        active: false,
        y: GROUND,
        vy: 0,
        onGround: true,
        obstacles: [],
        portal: null,
        grace: 0,
        spawned: 0,
        speed: 0.62,
        index: 0,
        last: 0,
    });

    const current = questions[index];

    /* ---------- Bucle de física ---------- */
    const loop = useCallback((now) => {
        if (!g.current.active) return;
        const s = g.current;

        // Delta normalizado a 60fps (1.0 = un frame ideal)
        if (!s.last) s.last = now;
        const dt = Math.min((now - s.last) / 16.67, 2.5);
        s.last = now;
        /* 1. Física del jugador */
        if (!s.onGround) {
            s.vy -= GRAVITY * dt;
            s.y += s.vy * dt;
            if (s.y <= GROUND) {
                s.y = GROUND;
                s.vy = 0;
                s.onGround = true;
            }
        }
        setPlayerY(s.y);

        /* 2. Mover obstáculos y detectar colisión */
        const alive = [];
        for (const o of s.obstacles) {
            const x = o.x - s.speed * dt;
            if (x < -10) continue;

            const overlapX = Math.abs(x - PLAYER_X) < PLAYER_W;
            if (overlapX && !o.hit && s.grace <= 0) {
                // Rojo (suelo): choca si el jugador está bajo
                // Amarillo (aire): choca si el jugador está alto
                const crash = o.kind === 'floor'
                    ? s.y < FLOOR_TOP
                    : (s.y > AIR_LOW && s.y < AIR_HIGH);
                if (crash) {
                    o.hit = true;
                    hurtPlayer();
                }
            }
            alive.push({ ...o, x });
        }
        s.obstacles = alive;
        setObstacles(alive);

        /* 3. Mover el portal (viaja como un obstáculo) */
        if (s.portal) {
            const px = s.portal.x - s.speed * dt;
            if (px <= PLAYER_X + 2) {
                // El portal LLEGÓ al jugador → abrir pregunta
                s.active = false;
                s.portal = null;
                setPortal(null);
                cancelAnimationFrame(rafRef.current);
                clearInterval(spawnRef.current);
                openQuiz();
                return;
            }
            s.portal = { x: px };
            setPortal({ x: px });
        }

       if (s.grace > 0) s.grace -= dt;

        rafRef.current = requestAnimationFrame(loop);
    }, []);

    const hurtPlayer = () => {
        const s = g.current;
        s.grace = 70;                     // ~1.2s de invulnerabilidad
        setHurt(true);
        setTimeout(() => setHurt(false), 900);

        setLives(l => {
            const next = l - 1;
            if (next <= 0) {
                s.active = false;
                cancelAnimationFrame(rafRef.current);
                clearInterval(spawnRef.current);
                setStage('over');
                return 0;
            }
            return next;
        });
    };

    const openQuiz = () => {
        const q = questions[g.current.index];
        if (!q) { setStage('done'); return; }
        // Guardamos la pregunta completa junto con sus opciones barajadas
        setQuizData({
            q: q.q,
            correct: q.correct,
            options: shuffle(q.opts.map((label, optIdx) => ({ label, optIdx }))),
        });
        setAnswered(null);
        setStage('quiz');
    };

    /* ---------- Iniciar un tramo ---------- */
    const startRun = (qIndex) => {
        const s = g.current;
        s.active = true;
        s.y = GROUND; s.vy = 0; s.onGround = true;
        s.obstacles = [];
        s.portal = null;
        s.grace = 40;                     // margen al arrancar
        s.spawned = 0;
        s.speed = 0.62 + qIndex * 0.07;
        s.index = qIndex;
        s.last = 0;

        setPlayerY(GROUND);
        setObstacles([]);
        setPortal(null);
        setStage('running');

        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        rafRef.current = requestAnimationFrame(loop);

        /* Genera obstáculos; tras 6, envía el portal */
        const gap = Math.max(1500, 2200 - qIndex * 130);
        clearInterval(spawnRef.current);
        spawnRef.current = setInterval(() => {
            const st = g.current;
            if (!st.active) return;

            if (st.spawned >= 4) {
                // Suelta el portal y deja de generar obstáculos
                clearInterval(spawnRef.current);
                st.portal = { x: 112 };
                setPortal({ x: 112 });
                return;
            }
            st.spawned++;
            const ob = {
                id: Date.now() + Math.random(),
                kind: Math.random() > 0.42 ? 'floor' : 'air',
                x: 108,
                hit: false,
            };
            st.obstacles = [...st.obstacles, ob];
        }, gap);
    };

    /* ---------- Salto ---------- */
    const jump = () => {
        const s = g.current;
        if (stage !== 'running' || !s.active) return;
        if (!s.onGround) return;          // sin doble salto
        s.vy = JUMP_POWER;
        s.onGround = false;
    };

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
                e.preventDefault();
                jump();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [stage]);

    /* ---------- Responder ---------- */
    const answer = (optIdx) => {
        if (answered !== null) return;
        setAnswered(optIdx);

        if (optIdx === quizData.correct) {
            setHits(h => h + 1);
            setFlash('ok');
            setTimeout(() => {
                setFlash(null);
                const nextIdx = index + 1;
                if (nextIdx < questions.length) {
                    setIndex(nextIdx);
                    startRun(nextIdx);
                } else {
                    setStage('done');
                }
            }, 1100);
        } else {
            setFlash('bad');
            setLives(l => {
                const next = l - 1;
                if (next <= 0) { setTimeout(() => setStage('over'), 900); return 0; }
                return next;
            });
            setTimeout(() => { setFlash(null); setAnswered(null); }, 1100);
        }
    };

    const startGame = () => {
        setIndex(0); setLives(MAX_LIVES); setHits(0);
        startRun(0);
    };

    const skipPhase = () => {
        g.current.active = false;
        cancelAnimationFrame(rafRef.current);
        clearInterval(spawnRef.current);
        setFlash(null);
        const nextIdx = index + 1;
        if (nextIdx < questions.length) { setIndex(nextIdx); startRun(nextIdx); }
        else setStage('done');
    };

    useEffect(() => () => {
        g.current.active = false;
        cancelAnimationFrame(rafRef.current);
        clearInterval(spawnRef.current);
    }, []);

    if (!questions.length) {
        return (
            <div className="game-shell">
                <div className="game-empty">
                    <h3>Sin preguntas disponibles</h3>
                    <p>Esta planeación no tiene preguntas de cierre configuradas.</p>
                    <button className="game-btn" onClick={onExit}>Cerrar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="game-shell" data-game="dash">
            <div className="game-head">
                <div className="game-id">
                    <span className="game-badge">LUMI DASH</span>
                    <h3 className="game-title">Corre, esquiva y responde</h3>
                </div>
                <button className="game-close" onClick={onExit} aria-label="Cerrar">×</button>
            </div>

            {stage === 'intro' && (
                <div className="game-intro">
                    <div className="game-intro-icon">🏃</div>
                    <h4>¿Cómo se juega?</h4>
                    <ul className="game-rules">
                        <li>Toca la pista o presiona <strong>espacio</strong> para saltar.</li>
                        <li>Bloques <strong className="dash-red">rojos</strong> en el suelo: <strong>salta</strong> sobre ellos.</li>
                        <li>Bloques <strong className="dash-yellow">amarillos</strong> en el aire: <strong>no saltes</strong>, pasa por debajo.</li>
                        <li>Al final del tramo llega el <strong>portal</strong>: ahí respondes la pregunta.</li>
                        <li>Tienes <strong>{MAX_LIVES} escudos</strong> y {questions.length} preguntas.</li>
                    </ul>
                    <button className="game-btn primary" onClick={startGame}>Iniciar carrera</button>
                </div>
            )}

            {stage === 'running' && (
                <>
                    <div className="game-hud">
                        <span className="hud-item">Tramo <strong>{index + 1}</strong> / {questions.length}</span>
                        <span className="hud-item">Escudos: <strong>{'🛡️'.repeat(lives)}</strong></span>
                        <span className="hud-item legend">
                            <em className="dash-red">■</em> saltar · <em className="dash-yellow">■</em> agacharse
                        </span>
                    </div>

                    <div className="dash-zone" onPointerDown={jump}>
                        <div className="dash-grid" />

                        {obstacles.map(o => (
                            <div key={o.id} className={`dash-obstacle ${o.kind}`} style={{ left: `${o.x}%` }} />
                        ))}

                        {portal && (
                            <div className="dash-portal live" style={{ left: `${portal.x}%` }} />
                        )}

                        <div
                            className={`dash-player ${hurt ? 'hurt' : ''} ${playerY > 2 ? 'airborne' : ''}`}
                            style={{ left: `${PLAYER_X}%`, bottom: `${26 + playerY}px` }}
                        />
                        <div className="dash-floor" />
                    </div>

                    <div className="dash-controls">
                        <button className="game-btn fire wide" onPointerDown={jump}>Saltar</button>
                        <button className="game-btn ghost" onClick={skipPhase}>Saltar tramo →</button>
                    </div>
                </>
            )}

             {stage === 'quiz' && quizData && (
                <div className={`dash-quiz ${flash ? `flash-${flash}` : ''}`}>
                    <div className="game-hud">
                        <span className="hud-item">Pregunta <strong>{index + 1}</strong> / {questions.length}</span>
                        <span className="hud-item">Escudos: <strong>{'🛡️'.repeat(lives)}</strong></span>
                        <span className="hud-item">Aciertos: <strong>{hits}</strong></span>
                    </div>

                    <div className="game-question portal">
                        <span className="game-question-label">Portal de conocimiento</span>
                        <p>{quizData.q}</p>
                    </div>

                    <div className="dash-options">
                         {quizData.options.map(({ label, optIdx }) => {
                            let state = '';
                            if (answered !== null) {
                                if (optIdx === quizData.correct) state = 'right';
                                else if (optIdx === answered) state = 'wrong';
                            }
                            return (
                                <button
                                    key={optIdx}
                                    className={`dash-option ${state}`}
                                    onClick={() => answer(optIdx)}
                                    disabled={answered !== null}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {answered !== null && (
                        <p className="dash-feedback">
                           {answered === quizData.correct ? '¡Correcto! Sigue corriendo…' : 'Esa no era. Intenta de nuevo.'}
                        </p>
                    )}
                </div>
            )}

            {stage === 'over' && (
                <div className="game-result">
                    <div className="game-result-icon">💥</div>
                    <h4>Escudos agotados</h4>
                    <p className="game-result-note">Llegaste al tramo {index + 1} de {questions.length}.</p>
                    <div className="game-actions">
                        <button className="game-btn primary" onClick={startGame}>Reintentar</button>
                        <button className="game-btn ghost" onClick={onExit}>Salir</button>
                    </div>
                </div>
            )}

            {stage === 'done' && (
                <div className="game-result">
                    <div className="game-result-icon">🏁</div>
                    <h4>¡Carrera completada!</h4>
                    <div className="game-score">
                        <div className="score-block"><strong>{hits}</strong><span>de {questions.length} respuestas</span></div>
                        <div className="score-block"><strong>{lives}</strong><span>escudos restantes</span></div>
                    </div>
                    <div className="game-actions">
                        <button className="game-btn ghost" onClick={startGame}>Jugar de nuevo</button>
                        <button className="game-btn primary" onClick={onExit}>Terminar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LumiDash;