import React, { useState, useEffect, useRef } from 'react';
import { normalizeQuestions, shuffle } from './gameUtils';
import '../Styles/game3.css';
import '../Styles/gamespar.css';
import '../Styles/gamespar2.css';

export const MemoryFlash = ({ questionsJson, onExit }) => {
    const questions = normalizeQuestions(questionsJson);
    const [stage, setStage] = useState('intro');   // intro | playing | done
    const [index, setIndex] = useState(0);
    const [cards, setCards] = useState([]);
    const [flipped, setFlipped] = useState([]);    // ids de cartas volteadas
    const [matched, setMatched] = useState([]);    // ids ya emparejados
    const [locked, setLocked] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [hits, setHits] = useState(0);
    const [flash, setFlash] = useState(null);      // 'ok' | 'bad' | null
    const timers = useRef([]);

    const current = questions[index];

    /* Limpia timers al desmontar */
    useEffect(() => () => timers.current.forEach(clearTimeout), []);
    const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t; };

    /* Construye el tablero de la fase actual */
    const buildBoard = (qIndex) => {
        const q = questions[qIndex];
        if (!q) return;
        // Cada opción aparece dos veces (pares)
        const deck = [];
        q.opts.forEach((text, optIdx) => {
            deck.push({ id: `${optIdx}-a`, text, optIdx });
            deck.push({ id: `${optIdx}-b`, text, optIdx });
        });
        setCards(shuffle(deck));
        setFlipped([]);
        setMatched([]);
        setLocked(false);
    };

    const startGame = () => {
        setIndex(0); setHits(0); setAttempts(0);
        buildBoard(0);
        setStage('playing');
    };

    const flipCard = (card) => {
        if (locked) return;
        if (flipped.includes(card.id) || matched.includes(card.id)) return;

        const next = [...flipped, card.id];
        setFlipped(next);

        if (next.length === 2) {
            setLocked(true);
            setAttempts(a => a + 1);
            const [c1, c2] = next.map(id => cards.find(c => c.id === id));

            if (c1.optIdx === c2.optIdx) {
                // Par encontrado
                later(() => {
                    setMatched(m => [...m, c1.id, c2.id]);
                    setFlipped([]);
                    setLocked(false);

                    // ¿Es el par de la respuesta CORRECTA? → avanza de fase
                    if (c1.optIdx === current.correct) {
                        setHits(h => h + 1);
                        setFlash('ok');
                        later(() => { setFlash(null); nextPhase(); }, 900);
                    }
                }, 500);
            } else {
                // No coinciden
                setFlash('bad');
                later(() => {
                    setFlipped([]);
                    setLocked(false);
                    setFlash(null);
                }, 900);
            }
        }
    };

    const nextPhase = () => {
        const nextIdx = index + 1;
        if (nextIdx < questions.length) {
            setIndex(nextIdx);
            buildBoard(nextIdx);
        } else {
            setStage('done');
        }
    };

    const skipPhase = () => {
        setFlash(null);
        nextPhase();
    };

    /* ---------- Sin preguntas jugables ---------- */
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
        <div className="game-shell" data-game="memory">
            <div className="game-head">
                <div className="game-id">
                    <span className="game-badge">MEMORY FLASH</span>
                    <h3 className="game-title">Encuentra la pareja correcta</h3>
                </div>
                <button className="game-close" onClick={onExit} aria-label="Cerrar">×</button>
            </div>

            {/* ---------- INTRO ---------- */}
            {stage === 'intro' && (
                <div className="game-intro">
                    <div className="game-intro-icon">🃏</div>
                    <h4>¿Cómo se juega?</h4>
                    <ul className="game-rules">
                        <li>Lee la pregunta que aparece abajo del tablero.</li>
                        <li>Voltea las cartas de a dos para encontrar parejas.</li>
                        <li>Cuando encuentres la pareja de la <strong>respuesta correcta</strong>, avanzas a la siguiente pregunta.</li>
                        <li>Hay <strong>{questions.length} preguntas</strong> en total.</li>
                    </ul>
                    <button className="game-btn primary" onClick={startGame}>Iniciar juego</button>
                </div>
            )}

            {/* ---------- JUGANDO ---------- */}
            {stage === 'playing' && current && (
                <>
                    <div className="game-hud">
                        <span className="hud-item">Pregunta <strong>{index + 1}</strong> / {questions.length}</span>
                        <span className="hud-item">Intentos: <strong>{attempts}</strong></span>
                        <span className="hud-item">Aciertos: <strong>{hits}</strong></span>
                    </div>

                    <div className={`memory-grid ${flash ? `flash-${flash}` : ''}`}>
                        {cards.map(card => {
                            const isOpen = flipped.includes(card.id) || matched.includes(card.id);
                            const isMatched = matched.includes(card.id);
                            const useLetter = current.opts.some(o => String(o).length > 10);
                            return (
                                <button
                                    key={card.id}
                                    className={`memory-card ${isOpen ? 'open' : ''} ${isMatched ? 'matched' : ''}`}
                                    onClick={() => flipCard(card)}
                                    disabled={locked && !isOpen}
                                >
                                    <span className="memory-face front">?</span>
                                    <span className={`memory-face back ${useLetter ? 'letter' : ''}`}>
                                        {useLetter ? String.fromCharCode(65 + card.optIdx) : card.text}
                                    </span>
                                </button>
                            );
                        })}C
                    </div>

                    <div className="game-question">
                        <span className="game-question-label">Pregunta</span>
                        <p>{current.q}</p>

                        {current.opts.some(o => String(o).length > 10) && (
                            <div className="mem-legend">
                                {current.opts.map((opt, i) => (
                                    <div key={i} className="mem-legend-item">
                                        <span className="mem-legend-key">{String.fromCharCode(65 + i)}</span>
                                        <p>{opt}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="game-actions">
                        <button className="game-btn ghost" onClick={skipPhase}>Saltar pregunta →</button>
                    </div>
                </>
            )}

            {/* ---------- RESULTADOS ---------- */}
            {stage === 'done' && (
                <div className="game-result">
                    <div className="game-result-icon">🎉</div>
                    <h4>¡Juego completado!</h4>
                    <div className="game-score">
                        <div className="score-block">
                            <strong>{hits}</strong>
                            <span>de {questions.length} respuestas</span>
                        </div>
                        <div className="score-block">
                            <strong>{attempts}</strong>
                            <span>intentos totales</span>
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

export default MemoryFlash;