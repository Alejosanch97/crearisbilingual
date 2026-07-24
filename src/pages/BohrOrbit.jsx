import React, { useState, useEffect, useRef, useCallback } from 'react';
import { normalizeQuestions, shuffle } from './gameUtils';
import '../Styles/gamespar2.css';

const R = 38;              // radio de la órbita en % del contenedor
const MAX_LIVES = 3;

export const BohrOrbit = ({ questionsJson, onExit }) => {
    const questions = normalizeQuestions(questionsJson);
    const [stage, setStage] = useState('intro');
    const [index, setIndex] = useState(0);
    const [angle, setAngle] = useState(-Math.PI / 2);
    const [nodes, setNodes] = useState([]);       // {optIdx, label, a} posiciones angulares
    const [beams, setBeams] = useState([]);       // {id, a, r}
    const [lives, setLives] = useState(MAX_LIVES);
    const [hits, setHits] = useState(0);
    const [flash, setFlash] = useState(null);
    const [spin, setSpin] = useState(0.006);

    const rafRef = useRef(null);
    const runRef = useRef({ active: false, angle: -Math.PI / 2, correct: 0, nodes: [] });
    const resolvedRef = useRef(false);

    const current = questions[index];

    useEffect(() => { runRef.current.angle = angle; }, [angle]);
    useEffect(() => { runRef.current.correct = current?.correct ?? 0; }, [current]);
    useEffect(() => { runRef.current.nodes = nodes; }, [nodes]);

    /* ---------- Preparar fase ---------- */
    const setupPhase = (qIndex) => {
        const q = questions[qIndex];
        if (!q) return;
        resolvedRef.current = false;
        const slots = shuffle([0, 1, 2, 3]).slice(0, q.opts.length);
        setNodes(q.opts.map((label, optIdx) => ({
            optIdx,
            label,
            a: (slots[optIdx] * (Math.PI * 2)) / q.opts.length,
        })));
        setBeams([]);
        setSpin(0.006 + qIndex * 0.0015);   // se acelera con las fases
    };

    /* ---------- Bucle: rota nodos y mueve rayos ---------- */
    const tick = useCallback(() => {
        if (!runRef.current.active) return;

        setNodes(prev => prev.map(n => ({ ...n, a: n.a + spin })));

        setBeams(prev => {
            const moved = [];
            prev.forEach(b => {
                const r = b.r + 2.4;
                if (r >= R - 4 && r <= R + 6) {
                    // ¿Coincide con algún nodo?
                    const target = runRef.current.nodes.find(n => {
                        const diff = Math.abs(normalizeAngle(n.a) - normalizeAngle(b.a));
                        const d = Math.min(diff, Math.PI * 2 - diff);
                        return d < 0.38;
                    });
                    if (target) { resolveHit(target); return; }
                }
                if (r < 52) moved.push({ ...b, r });
            });
            return moved;
        });

        rafRef.current = requestAnimationFrame(tick);
    }, [spin]);

    const normalizeAngle = (a) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    const resolveHit = (target) => {
        if (target.optIdx === runRef.current.correct) {
            if (resolvedRef.current) return;      // ya se resolvió esta fase
            resolvedRef.current = true;
            setHits(h => h + 1);
            setFlash('ok');
            setTimeout(() => { setFlash(null); advance(); }, 800);
        } else {
            setFlash('bad');
            setLives(l => {
                const next = l - 1;
                if (next <= 0) {
                    runRef.current.active = false;
                    cancelAnimationFrame(rafRef.current);
                    setStage('over');
                    return 0;
                }
                return next;
            });
            setTimeout(() => setFlash(null), 600);
        }
    };

    const advance = () => {
        const nextIdx = index + 1;
        if (nextIdx < questions.length) {
            setIndex(nextIdx);
            setupPhase(nextIdx);
        } else {
            runRef.current.active = false;
            cancelAnimationFrame(rafRef.current);
            setStage('done');
        }
    };

    /* ---------- Controles ---------- */
    const rotate = (delta) => setAngle(a => a + delta);
    const shoot = () => {
        if (stage !== 'playing') return;
        setBeams(b => [...b, { id: Date.now() + Math.random(), a: runRef.current.angle, r: 6 }]);
    };

    useEffect(() => {
        const onKey = (e) => {
            if (stage !== 'playing') return;
            if (e.key === 'ArrowLeft') rotate(-0.16);
            if (e.key === 'ArrowRight') rotate(0.16);
            if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); shoot(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [stage]);

    useEffect(() => {
        if (stage !== 'playing') return;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [stage, tick]);

    useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

    const startGame = () => {
        setIndex(0); setLives(MAX_LIVES); setHits(0); setAngle(-Math.PI / 2);
        setupPhase(0);
        setStage('playing');
        runRef.current.active = true;
    };

    const skipPhase = () => { setFlash(null); advance(); };

    /* Convierte ángulo+radio a coordenadas % */
    const pos = (a, r) => ({
        left: `${50 + r * Math.cos(a)}%`,
        top: `${50 + r * Math.sin(a)}%`,
    });

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
        <div className="game-shell" data-game="atom">
            <div className="game-head">
                <div className="game-id">
                    <span className="game-badge">BOHR ORBIT</span>
                    <h3 className="game-title">Apunta y dispara a la órbita correcta</h3>
                </div>
                <button className="game-close" onClick={onExit} aria-label="Cerrar">×</button>
            </div>

            {stage === 'intro' && (
                <div className="game-intro">
                    <div className="game-intro-icon">⚛️</div>
                    <h4>¿Cómo se juega?</h4>
                    <ul className="game-rules">
                        <li>Las opciones orbitan alrededor del núcleo.</li>
                        <li>Gira el cañón con las <strong>flechas</strong> y dispara con <strong>espacio</strong>.</li>
                        <li>Impacta la órbita con la <strong>respuesta correcta</strong>.</li>
                        <li>Cada error cuesta un electrón: tienes <strong>{MAX_LIVES}</strong>.</li>
                    </ul>
                    <button className="game-btn primary" onClick={startGame}>Iniciar juego</button>
                </div>
            )}

            {stage === 'playing' && current && (
                <>
                    <div className="game-hud">
                        <span className="hud-item">Pregunta <strong>{index + 1}</strong> / {questions.length}</span>
                        <span className="hud-item">Electrones: <strong>{'⚡'.repeat(lives)}</strong></span>
                        <span className="hud-item">Aciertos: <strong>{hits}</strong></span>
                    </div>

                    <div className={`orbit-zone ${flash ? `flash-${flash}` : ''}`}>
                        <div className="orbit-ring" />
                        <div className="orbit-core">Lumi</div>

                        {nodes.map(n => {
                            const useLetter = current.opts.some(o => String(o).length > 10);
                            return (
                                <div
                                    key={n.optIdx}
                                    className={`orbit-node ${useLetter ? 'letter' : ''}`}
                                    style={pos(n.a, R)}
                                >
                                    {useLetter ? String.fromCharCode(65 + n.optIdx) : n.label}
                                </div>
                            );
                        })}

                        {beams.map(b => (
                            <div key={b.id} className="orbit-beam" style={pos(b.a, b.r)} />
                        ))}

                       <div
                            className="orbit-cannon"
                            style={{ transform: `translate(-50%, -100%) rotate(${angle + Math.PI / 2}rad)` }}
                        />
                    </div>

                    <div className="game-question">
                        <span className="game-question-label">Pregunta</span>
                        <p>{current.q}</p>

                        {current.opts.some(o => String(o).length > 10) && (
                            <div className="orbit-legend">
                                {current.opts.map((opt, i) => (
                                    <div key={i} className="orbit-legend-item">
                                        <span className="orbit-legend-key">{String.fromCharCode(65 + i)}</span>
                                        <p>{opt}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="orbit-controls">
                        <button className="game-btn ctrl" onPointerDown={() => rotate(-0.16)}>↺ Girar</button>
                        <button className="game-btn fire" onPointerDown={shoot}>Disparar</button>
                        <button className="game-btn ctrl" onPointerDown={() => rotate(0.16)}>Girar ↻</button>
                        <button className="game-btn ghost" onClick={skipPhase}>Saltar</button>
                    </div>
                </>
            )}

            {stage === 'over' && (
                <div className="game-result">
                    <div className="game-result-icon">⚡</div>
                    <h4>Electrones agotados</h4>
                    <p className="game-result-note">Llegaste hasta la pregunta {index + 1} de {questions.length}.</p>
                    <div className="game-actions">
                        <button className="game-btn primary" onClick={startGame}>Reintentar</button>
                        <button className="game-btn ghost" onClick={onExit}>Salir</button>
                    </div>
                </div>
            )}

            {stage === 'done' && (
                <div className="game-result">
                    <div className="game-result-icon">🎉</div>
                    <h4>¡Órbitas estabilizadas!</h4>
                    <div className="game-score">
                        <div className="score-block"><strong>{hits}</strong><span>de {questions.length} respuestas</span></div>
                        <div className="score-block"><strong>{lives}</strong><span>electrones restantes</span></div>
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

export default BohrOrbit;