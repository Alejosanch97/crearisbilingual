import React, { useState, useEffect } from "react";
import "../Styles/home.css";
import { useNavigate } from "react-router-dom";

const API_URL = 'https://script.google.com/macros/s/AKfycbxIgwbIuGymDkRREiidM0lJYZRi5KdKS217_inoU751zp_x3EAzzxcljjNHSxZc34zBxQ/exec';

const TAGLINES = [
    "Diseña tus clases con inteligencia artificial avanzada.",
    "Tu malla curricular e itinerario, siempre sincronizados.",
    "Planeaciones alineadas a DBAs y ODS en tiempo real.",
    "Transforma el cierre de tus clases con experiencias interactivas.",
];

export const Home = ({ onLoginSuccess }) => {
    const [credentials, setCredentials] = useState({ user: '', pass: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [taglineIndex, setTaglineIndex] = useState(0);
    const [showPass, setShowPass] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const t = setInterval(() => {
            setTaglineIndex(i => (i + 1) % TAGLINES.length);
        }, 3800);
        return () => clearInterval(t);
    }, []);

    const handleInputChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'login',
                    user_key: credentials.user,
                    password: credentials.pass
                })
            });
            const result = await response.json();

            if (result.status === 'success') {
                localStorage.setItem("userBilingual", JSON.stringify(result));
                if (onLoginSuccess) onLoginSuccess(result);
                navigate("/dashboard");
            } else {
                setError("Credenciales inválidas. Intenta de nuevo.");
            }
        } catch (err) {
            console.error("Error:", err);
            setError("Error de conexión con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="lg-page">
            {/* FONDO ESTELAR */}
            <div className="stars" aria-hidden="true"></div>
            <div className="shooting-star" aria-hidden="true"></div>
            <div className="shooting-star" aria-hidden="true"></div>
            <div className="shooting-star" aria-hidden="true"></div>
            <div className="shooting-star" aria-hidden="true"></div>

            <div className="lg-space-glow glow-1" aria-hidden="true" />
            <div className="lg-space-glow glow-2" aria-hidden="true" />

            <div className="lg-shell">

                {/* ============ LADO IZQUIERDO (MINIMALISTA) ============ */}
                <section className="lg-intro">
                    <div className="lg-brand">
                        <div className="lg-logo">
                            <img
                                src="https://i.pinimg.com/736x/1c/fc/8b/1cfc8b1ab0460021e731dd82d17abb72.jpg"
                                alt="Crear School Logo"
                            />
                        </div>
                        <div className="lg-brand-text">
                            <strong>Crear School</strong>
                            <span>Instituto Pedagógico</span>
                        </div>
                    </div>

                    <div className="lg-hero">
                        <span className="lg-badge">
                            <span className="lg-badge-dot" />
                            Impulsado por Lumi IA
                        </span>

                        <h1 className="lg-title">
                            <span className="lg-title-main">ORBIT HORIZON</span>
                        </h1>

                        <div className="lg-slogan-pills">
                            <span>Explora</span>
                            <span className="lg-pill-dot">•</span>
                            <span className="accent">Conecta</span>
                            <span className="lg-pill-dot">•</span>
                            <span>Evoluciona</span>
                        </div>

                        <div className="lg-tagline">
                            {TAGLINES.map((t, i) => (
                                <p key={i} className={i === taglineIndex ? 'on' : ''}>{t}</p>
                            ))}
                        </div>
                    </div>

                    {/* LÍNEA DE ETIQUETAS ELEGANTES (Sustituye a las 3 tarjetas pesadas) */}
                    <div className="lg-chips">
                        <span className="lg-chip">✦ Planeación IA</span>
                        <span className="lg-chip">◈ Alineación Curricular</span>
                        <span className="lg-chip">◉ Cierres Dinámicos</span>
                    </div>
                </section>

                {/* ============ LADO DERECHO (CARD DE LOGIN) ============ */}
                <section className="lg-panel">
                    <div className="lg-card">
                        <div className="lg-card-head">
                            <span className="lg-eyebrow">Acceso al Sistema</span>
                            <h2>Inicia tu Sesión</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="lg-form">
                            <div className="lg-field">
                                <label htmlFor="lg-user">Usuario o Clave</label>
                                <div className="lg-input-wrap">
                                    <span className="lg-input-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                            <circle cx="12" cy="8" r="4" />
                                            <path d="M4 21a8 8 0 0116 0" />
                                        </svg>
                                    </span>
                                    <input
                                        id="lg-user"
                                        type="text"
                                        name="user"
                                        placeholder="Ingresa tu clave de acceso"
                                        value={credentials.user}
                                        onChange={handleInputChange}
                                        autoComplete="username"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="lg-field">
                                <label htmlFor="lg-pass">Contraseña</label>
                                <div className="lg-input-wrap">
                                    <span className="lg-input-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                            <rect x="4" y="10" width="16" height="11" rx="2" />
                                            <path d="M8 10V7a4 4 0 018 0v3" />
                                        </svg>
                                    </span>
                                    <input
                                        id="lg-pass"
                                        type={showPass ? "text" : "password"}
                                        name="pass"
                                        placeholder="••••••••"
                                        value={credentials.pass}
                                        onChange={handleInputChange}
                                        autoComplete="current-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="lg-eye"
                                        onClick={() => setShowPass(v => !v)}
                                        aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                                    >
                                        {showPass ? (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                <path d="M3 3l18 18M10.6 10.6a3 3 0 004.2 4.2" />
                                                <path d="M9.4 5.2A9.5 9.5 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4.1M6.2 6.6A17 17 0 002 12s3.6 7 10 7a9.6 9.6 0 003.3-.6" />
                                            </svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="lg-error">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <circle cx="12" cy="12" r="9" />
                                        <path d="M12 8v5M12 16.5v.01" />
                                    </svg>
                                    {error}
                                </div>
                            )}

                            <button type="submit" className={`lg-submit ${loading ? 'loading' : ''}`} disabled={loading}>
                                <span className="lg-submit-text">
                                    {loading ? "Sincronizando…" : "Ingresar a Orbit"}
                                </span>
                                {!loading && (
                                    <svg className="lg-submit-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14M13 6l6 6-6 6" />
                                    </svg>
                                )}
                            </button>
                        </form>

                        <p className="lg-foot">
                            ¿Requiere asistencia? Contacte a soporte o coordinación.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
};