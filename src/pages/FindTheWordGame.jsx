import React, { useState, useEffect } from 'react';
import "../Styles/FindTheWordGame.css";

export const FindTheWordGame = ({ vocabularyString }) => {
    const [wordToGuess, setWordToGuess] = useState('');
    const [wordLength, setWordLength] = useState(0);
    const [guesses, setGuesses] = useState([]); 
    const [currentGuess, setCurrentGuess] = useState('');
    const [gameStatus, setGameStatus] = useState('playing'); 

    const MAX_ATTEMPTS = 6;
    const KEYBOARD_ROWS = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
        ['🎯 Enter', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
    ];

    useEffect(() => {
        if (vocabularyString) {
            const words = vocabularyString.split(',')
                .map(w => w.trim().toUpperCase())
                .filter(w => w.length > 0);
            
            if (words.length > 0) {
                const randomWord = words[Math.floor(Math.random() * words.length)];
                setWordToGuess(randomWord);
                setWordLength(randomWord.length);
                resetGame(randomWord);
            }
        }
    }, [vocabularyString]);

    const resetGame = (word) => {
        setGuesses([]);
        setCurrentGuess('');
        setGameStatus('playing');
    };

    const getLetterStatuses = (guess) => {
        const statuses = Array(wordLength).fill('absent'); 
        const targetLetters = wordToGuess.split('');
        const guessLetters = guess.split('');

        for (let i = 0; i < wordLength; i++) {
            if (guessLetters[i] === targetLetters[i]) {
                statuses[i] = 'correct';
                targetLetters[i] = null;
                guessLetters[i] = null;
            }
        }

        for (let i = 0; i < wordLength; i++) {
            if (guessLetters[i] !== null) {
                const targetIndex = targetLetters.indexOf(guessLetters[i]);
                if (targetIndex !== -1) {
                    statuses[i] = 'present';
                    targetLetters[targetIndex] = null;
                }
            }
        }

        return statuses;
    };

    const handleKeyPress = (letter) => {
        if (gameStatus !== 'playing') return;

        if (letter === '⌫') {
            setCurrentGuess(prev => prev.slice(0, -1));
        } else if (letter === '🎯 Enter') {
            if (currentGuess.length === wordLength) {
                const newGuesses = [...guesses, currentGuess];
                setGuesses(newGuesses);

                if (currentGuess === wordToGuess) {
                    setGameStatus('won');
                } else if (newGuesses.length >= MAX_ATTEMPTS) {
                    setGameStatus('lost');
                }
                setCurrentGuess('');
            }
        } else {
            if (currentGuess.length < wordLength) {
                setCurrentGuess(prev => prev + letter.toUpperCase());
            }
        }
    };

    useEffect(() => {
        const handlePhysicalKeyDown = (e) => {
            const key = e.key.toUpperCase();
            if (key === 'ENTER') {
                handleKeyPress('🎯 Enter');
            } else if (key === 'BACKSPACE') {
                handleKeyPress('⌫');
            } else if (/^[A-ZÑ]$/.test(key)) {
                handleKeyPress(key);
            }
        };

        window.addEventListener('keydown', handlePhysicalKeyDown);
        return () => window.removeEventListener('keydown', handlePhysicalKeyDown);
    }, [currentGuess, gameStatus, wordLength, guesses]);

    // Función auxiliar para forzar el color inline exacto evitando conflictos con el CSS global
    const getInlineStyleForStatus = (status) => {
        if (status === 'correct') {
            return {
                backgroundColor: '#52b596', // --t-mint
                background: '#52b596',
                borderColor: '#439b80',
                color: '#ffffff',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none'
            };
        }
        if (status === 'present') {
            return {
                backgroundColor: '#d9a250', // --t-amber
                background: '#d9a250',
                borderColor: '#be8c41',
                color: '#ffffff',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none'
            };
        }
        if (status === 'absent') {
            return {
                backgroundColor: '#5b6883', // --g-ink-soft
                background: '#5b6883',
                borderColor: '#475269',
                color: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
                opacity: 0.85
            };
        }
        return {}; // Sin estilos extra si no ha sido enviado
    };

    if (!wordToGuess) return <p className="lm-empty">Cargando vocabulario del juego...</p>;

    return (
        <div className="ftw-game-container">
            <div className="ftw-header">
                <h3>Find the Word! 🎯</h3>
                <p>Descubre la palabra misteriosa del vocabulario de hoy ({wordLength} letras).</p>
            </div>

            <div className="ftw-grid" style={{ '--word-len': wordLength }}>
                {Array.from({ length: MAX_ATTEMPTS }).map((_, rowIndex) => {
                    const isSubmitted = rowIndex < guesses.length;
                    const guessWord = isSubmitted ? guesses[rowIndex] : (rowIndex === guesses.length ? currentGuess : '');
                    const rowStatuses = isSubmitted ? getLetterStatuses(guessWord) : [];

                    return (
                        <div key={rowIndex} className="ftw-row">
                            {Array.from({ length: wordLength }).map((_, colIndex) => {
                                const char = guessWord[colIndex] || '';
                                const status = isSubmitted ? rowStatuses[colIndex] : '';
                                const inlineStyles = isSubmitted ? getInlineStyleForStatus(status) : {};

                                return (
                                    <span 
                                        key={colIndex} 
                                        className={`ftw-letter-box field-isolated-${status} ${char ? 'box-has-char' : ''}`}
                                        style={inlineStyles}
                                    >
                                        {char}
                                    </span>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {gameStatus !== 'playing' && (
                <div className={`ftw-alert ${gameStatus}`}>
                    {gameStatus === 'won' ? (
                        <p>🎉 ¡Excelente spelling! Encontraron la palabra <strong>{wordToGuess}</strong>.</p>
                    ) : (
                        <p>😢 Oh no, se agotaron los intentos. La palabra era <strong>{wordToGuess}</strong>.</p>
                    )}
                    <button type="button" className="lm-copy" onClick={() => resetGame()}>Volver a jugar 🔄</button>
                </div>
            )}

            <div className="ftw-keyboard">
                {KEYBOARD_ROWS.map((row, rIdx) => (
                    <div key={rIdx} className="ftw-key-row">
                        {row.map((key) => (
                            <button
                                key={key}
                                type="button"
                                className={`ftw-key ${key.length > 2 ? 'wide' : ''}`}
                                onClick={() => handleKeyPress(key)}
                            >
                                {key}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};