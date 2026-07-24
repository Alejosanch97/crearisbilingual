import React, { useState, useEffect, useRef, useCallback } from 'react';
import { normalizeQuestions, shuffle } from './gameUtils';
import '../Styles/game3.css';
import '../Styles/gamespar.css';
import '../Styles/gamespar2.css';

const LANES = [16, 38, 62, 84];   // posiciones % de las cápsulas
const MAX_LIVES = 3;

export const SpaceBlast = ({ questionsJson, onExit }) => {
    const questions = normalizeQuestions(questionsJson);
    const [stage, setStage] = useState('intro');
    const [index, setIndex] = useState(0);
    const [lane, setLane] = useState(1);           // carril del jugador (0..3)
    const [capsules, setCapsules] = useState([]);  // {optIdx, label, lane, dead}
    const [shots, setShots] = useState([]);        // {id, lane, y}
    const [enemyFire, setEnemyFire] = useState([]);// {id, lane, y}
    const [lives, setLives] = useState(MAX_LIVES);
    const [hits, setHits] = useState(0);
    const [flash, setFlash] = useState(null);
    const [shake, setShake] = useState(false);

    const rafRef = useRef(null);
    const fireRef = useRef(null);
    const runRef = useRef({ active: false, lane: 1, correct: 0 });
    const resolvedRef = useRef(false);

    const current = questions[index];

    useEffect(() => { runRef.current.lane = lane; }, [lane]);
    useEffect(() => { runRef.current.correct = current?.correct ?? 0; }, [current]);

    /* ---------- Preparar fase ---------- */
    const setupPhase = (qIndex) => {
        const q = questions[qIndex];
        if (!q) return;
        resolvedRef.current = false;
        const order = shuffle(q.opts.map((_, i) => i));
        setCapsules(q.opts.map((label, optIdx) => ({
            optIdx,
            label,
            lane: order.indexOf(optIdx),
            dead: false,
        })));
        setShots([]);
        setEnemyFire([]);
    };

    /* ---------- Bucle principal ---------- */
    const tick = useCallback(() => {
        if (!runRef.current.active) return;

        // Mover disparos del jugador
        setShots(prev => {
            const moved = prev.map(s => ({ ...s, y: s.y - 3.2 })).filter(s => s.y > 4);
            return moved;
        });

        // Mover fuego enemigo y detectar impacto en el jugador
        setEnemyFire(prev => {
            let hitPlayer = false;
            const moved = prev.map(f => ({ ...f, y: f.y + 1.6 })).filter(f => {
                if (f.y >= 84 && f.lane === runRef.current.lane) { hitPlayer = true; return false; }
                return f.y < 100;
            });
            if (hitPlayer) damage();
            return moved;
        });

        rafRef.current = requestAnimationFrame(tick);
    }, []);

    /* ---------- Colisiones disparo → cápsula ---------- */
    useEffect(() => {
        if (stage !== 'playing' || !shots.length) return;
        setShots(prevShots => {
            let remaining = [...prevShots];
            prevShots.forEach(shot => {
                if (shot.y > 26) return;
                const target = capsules.find(c => !c.dead && c.lane === shot.lane);
                if (!target) return;
                remaining = remaining.filter(s => s.id !== shot.id);

                if (target.optIdx === runRef.current.correct) {
                    if (resolvedRef.current) return;      // ya se resolvió esta fase
                    resolvedRef.current = true;
                    setCapsules(cs => cs.map(c => c.optIdx === target.optIdx ? { ...c, dead: true } : c));
                    setHits(h => h + 1);
                    setFlash('ok');
                    setTimeout(() => { setFlash(null); advance(); }, 800);
                } else {
                    setCapsules(cs => cs.map(c => c.optIdx === target.optIdx ? { ...c, dead: true } : c));
                    setFlash('bad');
                    damage();
                    setTimeout(() => {
                        setFlash(null);
                        // Reaparece Y se rebarajan TODAS las posiciones
                        setCapsules(cs => {
                            const revived = cs.map(c => ({ ...c, dead: false }));
                            const newLanes = shuffle(revived.map((_, i) => i));
                            return revived.map((c, i) => ({ ...c, lane: newLanes[i] }));
                        });
                    }, 700);
                }
            });
            return remaining;
        });
    }, [shots, capsules, stage]);

    const damage = () => {
        setShake(true);
        setTimeout(() => setShake(false), 300);
        setLives(l => {
            const next = l - 1;
            if (next <= 0) {
                runRef.current.active = false;
                cancelAnimationFrame(rafRef.current);
                clearInterval(fireRef.current);
                setStage('over');
                return 0;
            }
            return next;
        });
    };

    const advance = () => {
        const nextIdx = index + 1;
        if (nextIdx < questions.length) {
            setIndex(nextIdx);
            setupPhase(nextIdx);
        } else {
            runRef.current.active = false;
            cancelAnimationFrame(rafRef.current);
            clearInterval(fireRef.current);
            setStage('done');
        }
    };

    /* ---------- Controles ---------- */
    const move = (dir) => setLane(l => Math.max(0, Math.min(LANES.length - 1, l + dir)));
    const fire = () => {
        if (stage !== 'playing') return;
        setShots(s => [...s, { id: Date.now() + Math.random(), lane: runRef.current.lane, y: 82 }]);
    };

    useEffect(() => {
        const onKey = (e) => {
            if (stage !== 'playing') return;
            if (e.key === 'ArrowLeft') move(-1);
            if (e.key === 'ArrowRight') move(1);
            if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); fire(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [stage]);

    /* ---------- Arranque ---------- */
    const startGame = () => {
        setIndex(0); setLives(MAX_LIVES); setHits(0); setLane(1);
        setupPhase(0);
        setStage('playing');
        runRef.current.active = true;

        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);

        clearInterval(fireRef.current);
        fireRef.current = setInterval(() => {
            if (!runRef.current.active) return;
            setEnemyFire(f => [...f, {
                id: Date.now() + Math.random(),
                lane: Math.floor(Math.random() * LANES.length),
                y: 24,
            }]);
        }, 1900);
    };

    useEffect(() => () => {
        cancelAnimationFrame(rafRef.current);
        clearInterval(fireRef.current);
    }, []);

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
        <div className="game-shell" data-game="shoot">
            <div className="game-head">
                <div className="game-id">
                    <span className="game-badge">SPACE BLAST</span>
                    <h3 className="game-title">Dispara a la respuesta correcta</h3>
                </div>
                <button className="game-close" onClick={onExit} aria-label="Cerrar">×</button>
            </div>

            {stage === 'intro' && (
                <div className="game-intro">
                    <div className="game-intro-icon">🚀</div>
                    <h4>¿Cómo se juega?</h4>
                    <ul className="game-rules">
                        <li>Cada cápsula de arriba es una opción de respuesta.</li>
                        <li>Muévete con las <strong>flechas</strong> y dispara con <strong>espacio</strong> (o los botones).</li>
                        <li>Destruye la cápsula con la <strong>respuesta correcta</strong> para avanzar.</li>
                        <li>Cuidado con el fuego enemigo: tienes <strong>{MAX_LIVES} escudos</strong>.</li>
                    </ul>
                    <button className="game-btn primary" onClick={startGame}>Iniciar juego</button>
                </div>
            )}

            {stage === 'playing' && current && (
                <>
                    <div className="game-hud">
                        <span className="hud-item">Pregunta <strong>{index + 1}</strong> / {questions.length}</span>
                        <span className="hud-item">Escudos: <strong>{'🛡️'.repeat(lives)}</strong></span>
                        <span className="hud-item">Aciertos: <strong>{hits}</strong></span>
                    </div>

                    <div className={`space-zone ${flash ? `flash-${flash}` : ''} ${shake ? 'shake' : ''}`}>
                        <div className="space-stars" />

                        {capsules.filter(c => !c.dead).map(c => {
                            const useLetter = current.opts.some(o => String(o).length > 10);
                            return (
                                <div
                                    key={c.optIdx}
                                    className={`space-capsule ${useLetter ? 'letter' : ''}`}
                                    style={{ left: `${LANES[c.lane]}%` }}
                                >
                                    {useLetter ? String.fromCharCode(65 + c.optIdx) : c.label}
                                </div>
                            );
                        })}

                        {shots.map(s => (
                            <div key={s.id} className="space-shot player" style={{ left: `${LANES[s.lane]}%`, top: `${s.y}%` }} />
                        ))}
                        {enemyFire.map(f => (
                            <div key={f.id} className="space-shot enemy" style={{ left: `${LANES[f.lane]}%`, top: `${f.y}%` }} />
                        ))}

                        <div className="space-ship" style={{ left: `${LANES[lane]}%` }} />
                    </div>

                    <div className="game-question">
                        <span className="game-question-label">Pregunta</span>
                        <p>{current.q}</p>

                        {current.opts.some(o => String(o).length > 10) && (
                            <div className="space-legend">
                                {current.opts.map((opt, i) => (
                                    <div key={i} className="space-legend-item">
                                        <span className="space-legend-key">{String.fromCharCode(65 + i)}</span>
                                        <p>{opt}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-controls">
                        <button className="game-btn ctrl" onPointerDown={() => move(-1)}>←</button>
                        <button className="game-btn fire" onPointerDown={fire}>Disparar</button>
                        <button className="game-btn ctrl" onPointerDown={() => move(1)}>→</button>
                        <button className="game-btn ghost" onClick={skipPhase}>Saltar</button>
                    </div>
                </>
            )}

            {stage === 'over' && (
                <div className="game-result">
                    <div className="game-result-icon">💥</div>
                    <h4>Escudos agotados</h4>
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
                    <h4>¡Misión completada!</h4>
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

export default SpaceBlast;