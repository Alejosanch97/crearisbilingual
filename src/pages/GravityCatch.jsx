import React, { useState, useEffect, useRef, useCallback } from 'react';
import { normalizeQuestions, shuffle } from './gameUtils';
import '../Styles/game3.css';
import '../Styles/gamespar.css';
import '../Styles/gamespar2.css';

const ZONE_W = 100;   // ancho lógico en %
const PLATFORM_W = 20;
const FALL_BASE = 0.22;
const MOVE_STEP = 3.2;

export const GravityCatch = ({ questionsJson, onExit }) => {
    const questions = normalizeQuestions(questionsJson);
    const [stage, setStage] = useState('intro');
    const [index, setIndex] = useState(0);
    const [platformX, setPlatformX] = useState(50);
    const [drops, setDrops] = useState([]);       // {id, label, optIdx, x, y, speed}
    const [hits, setHits] = useState(0);
    const [misses, setMisses] = useState(0);
    const [flash, setFlash] = useState(null);
    const rafRef = useRef(null);
    const lastRef = useRef(0);
    const resolvedRef = useRef(false);
    const keysRef = useRef({ left: false, right: false });
    const stateRef = useRef({ platformX: 50, drops: [], active: false });

    const current = questions[index];

    /* Mantiene el ref sincronizado (el bucle lee de aquí) */
    useEffect(() => { stateRef.current.platformX = platformX; }, [platformX]);
    useEffect(() => { stateRef.current.drops = drops; }, [drops]);

    /* Genera las cápsulas de la fase */
    const spawnPhase = (qIndex) => {
        const q = questions[qIndex];
        if (!q) return;
        resolvedRef.current = false;
        const lanes = shuffle([12, 36, 60, 84]).slice(0, q.opts.length);
        const newDrops = q.opts.map((label, optIdx) => ({
            id: `${qIndex}-${optIdx}`,
            label,
            optIdx,
            x: lanes[optIdx],
            y: -10 - (optIdx * 22),          // escalonadas
            speed: 0.32 + qIndex * 0.04 + Math.random() * 0.12,
        }));
        setDrops(newDrops);
        stateRef.current.drops = newDrops;
    };

    /* Bucle de caída */
    const tick = useCallback((now) => {
        if (!stateRef.current.active) return;

        // Delta normalizado a 60fps
        if (!lastRef.current) lastRef.current = now;
        const dt = Math.min((now - lastRef.current) / 16.67, 2.5);
        lastRef.current = now;

        // Movimiento continuo de la plataforma (mientras la tecla está presionada)
        if (keysRef.current.left || keysRef.current.right) {
            const dir = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
            setPlatformX(x => {
                const next = Math.max(PLATFORM_W / 2, Math.min(ZONE_W - PLATFORM_W / 2, x + dir * MOVE_STEP * dt));
                stateRef.current.platformX = next;
                return next;
            });
        }

        const px = stateRef.current.platformX;

        setDrops(prev => {
            let caughtCorrect = false;
            let caughtWrong = false;

            const next = prev.map(d => {
                const y = d.y + d.speed * dt;
                if (y >= 88 && y <= 97) {
                    const dist = Math.abs(d.x - px);
                    if (dist < PLATFORM_W / 2 + 4) {
                        if (d.optIdx === questions[index]?.correct) {
                            if (!resolvedRef.current) caughtCorrect = true;
                        } else {
                            caughtWrong = true;
                        }
                        return { ...d, y: -12, x: 8 + Math.random() * 84 };
                    }
                }
                if (y > 108) return { ...d, y: -12, x: 8 + Math.random() * 84 };
                return { ...d, y };
            });

            if (caughtCorrect) {
                resolvedRef.current = true;
                setHits(h => h + 1);
                setFlash('ok');
                setTimeout(() => { setFlash(null); advance(); }, 700);
            } else if (caughtWrong) {
                setMisses(m => m + 1);
                setFlash('bad');
                setTimeout(() => setFlash(null), 500);
            }
            return next;
        });

        rafRef.current = requestAnimationFrame(tick);
    }, [index, questions]);

    const advance = () => {
        const nextIdx = index + 1;
        if (nextIdx < questions.length) {
            setIndex(nextIdx);
            spawnPhase(nextIdx);
        } else {
            stateRef.current.active = false;
            cancelAnimationFrame(rafRef.current);
            setStage('done');
        }
    };

    const startGame = () => {
        setIndex(0); setHits(0); setMisses(0); setPlatformX(50);
        spawnPhase(0);
        setStage('playing');
        stateRef.current.active = true;
        lastRef.current = 0;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);
    };

    /* Reinicia el bucle cuando cambia la fase (para leer el correct actualizado) */
    useEffect(() => {
        if (stage !== 'playing') return;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [stage, tick]);

    /* Teclado */
    useEffect(() => {
        const down = (e) => {
            if (stage !== 'playing') return;
            if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); keysRef.current.left = true; }
            if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); keysRef.current.right = true; }
        };
        const up = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = false;
        };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
            keysRef.current.left = false;
            keysRef.current.right = false;
        };
    }, [stage]);

    useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

    const movePlatform = (delta) => {
        setPlatformX(x => Math.max(PLATFORM_W / 2, Math.min(ZONE_W - PLATFORM_W / 2, x + delta)));
    };

    const skipPhase = () => { setFlash(null); advance(); };

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
        <div className="game-shell" data-game="gravity">
            <div className="game-head">
                <div className="game-id">
                    <span className="game-badge">GRAVITY CATCH</span>
                    <h3 className="game-title">Atrapa la respuesta correcta</h3>
                </div>
                <button className="game-close" onClick={onExit} aria-label="Cerrar">×</button>
            </div>

            {/* ---------- INTRO ---------- */}
            {stage === 'intro' && (
                <div className="game-intro">
                    <div className="game-intro-icon">🎯</div>
                    <h4>¿Cómo se juega?</h4>
                    <ul className="game-rules">
                        <li>Caen cápsulas con las opciones de respuesta.</li>
                        <li>Mueve la plataforma con las <strong>flechas</strong> o los botones.</li>
                        <li>Atrapa la cápsula con la <strong>respuesta correcta</strong> para avanzar.</li>
                        <li>Si atrapas una incorrecta, sigue intentando.</li>
                    </ul>
                    <button className="game-btn primary" onClick={startGame}>Iniciar juego</button>
                </div>
            )}

            {/* ---------- JUGANDO ---------- */}
            {stage === 'playing' && current && (
                <>
                    <div className="game-hud">
                        <span className="hud-item">Pregunta <strong>{index + 1}</strong> / {questions.length}</span>
                        <span className="hud-item">Aciertos: <strong>{hits}</strong></span>
                        <span className="hud-item">Fallos: <strong>{misses}</strong></span>
                    </div>

                    <div className={`gravity-zone ${flash ? `flash-${flash}` : ''}`}>
                        {drops.map(d => {
                            const useLetter = current.opts.some(o => String(o).length > 10);
                            return (
                                <div
                                    key={d.id}
                                    className={`gravity-drop ${useLetter ? 'letter' : ''}`}
                                    style={{ left: `${d.x}%`, top: `${d.y}%` }}
                                >
                                    {useLetter ? String.fromCharCode(65 + d.optIdx) : d.label}
                                </div>
                            );
                        })}
                        <div
                            className="gravity-platform"
                            style={{ left: `${platformX}%` }}
                        />
                    </div>

                    <div className="game-question">
                        <span className="game-question-label">Pregunta</span>
                        <p>{current.q}</p>

                        {current.opts.some(o => String(o).length > 10) && (
                            <div className="grav-legend">
                                {current.opts.map((opt, i) => (
                                    <div key={i} className="grav-legend-item">
                                        <span className="grav-legend-key">{String.fromCharCode(65 + i)}</span>
                                        <p>{opt}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="gravity-controls">
                       <button
                            className="game-btn ctrl"
                            onPointerDown={() => { keysRef.current.left = true; }}
                            onPointerUp={() => { keysRef.current.left = false; }}
                            onPointerLeave={() => { keysRef.current.left = false; }}
                        >← Izquierda</button>
                        <button className="game-btn ghost" onClick={skipPhase}>Saltar →</button>
                        <button
                            className="game-btn ctrl"
                            onPointerDown={() => { keysRef.current.right = true; }}
                            onPointerUp={() => { keysRef.current.right = false; }}
                            onPointerLeave={() => { keysRef.current.right = false; }}
                        >Derecha →</button>
                    </div>
                </>
            )}

            {/* ---------- RESULTADOS ---------- */}
            {stage === 'done' && (
                <div className="game-result">
                    <div className="game-result-icon">🏆</div>
                    <h4>¡Juego completado!</h4>
                    <div className="game-score">
                        <div className="score-block">
                            <strong>{hits}</strong>
                            <span>de {questions.length} respuestas</span>
                        </div>
                        <div className="score-block">
                            <strong>{misses}</strong>
                            <span>intentos fallidos</span>
                        </div>
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

export default GravityCatch;