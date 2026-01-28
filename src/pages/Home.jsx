import React, { useState } from "react";
import "../Styles/home.css"; 
import { useNavigate } from "react-router-dom"; // 1. Importar el hook

const API_URL = 'https://script.google.com/macros/s/AKfycbxIgwbIuGymDkRREiidM0lJYZRi5KdKS217_inoU751zp_x3EAzzxcljjNHSxZc34zBxQ/exec';

export const Home = ({ onLoginSuccess }) => {
    const [credentials, setCredentials] = useState({ user: '', pass: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    const navigate = useNavigate(); // 2. Inicializar el navigate

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
                // Importante: No uses mode: 'no-cors' aquí porque necesitas leer la respuesta JSON
                body: JSON.stringify({
                    action: 'login',
                    user_key: credentials.user,
                    password: credentials.pass
                })
            });
            const result = await response.json();

            if (result.status === 'success') {
                // 3. Guardamos en localStorage para persistencia (opcional pero recomendado)
                localStorage.setItem("userBilingual", JSON.stringify(result));
                
                // 4. Ejecutamos la función que viene por props si existe
                if (onLoginSuccess) onLoginSuccess(result);
                
                // 5. Redireccionamos al Dashboard
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
        <div className="login-container">
            <div className="login-info-side">
                <div className="brand">
					<div className="logo-icon">
						<img
							src="/crear.ico"
							alt="Logo Crear School"
						/>
					</div>
                    <span>Crear School</span>
                </div>
                <div className="info-content">
                    <h1>Bilingual Portal</h1>
                    <p className="subtitle">Academic Excellence Management</p>
                    <p className="description">Log in to plan, review, and transform bilingual learning.</p>
                </div>
            </div>

            <div className="login-form-side">
                <div className="login-card">
                    <h2>Acceso al Sistema</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="user-fixed" style={{marginBottom: '15px'}}>
                            <label>Usuario (User Key)</label>
                            <input 
                                type="text" 
                                name="user"
                                className="fixed-input" 
                                placeholder="Ingresa tu clave de usuario"
                                value={credentials.user}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="user-fixed">
                            <label>Contraseña</label>
                            <input 
                                type="password" 
                                name="pass"
                                className="fixed-input" 
                                placeholder="••••••••"
                                value={credentials.pass}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        {error && <p className="error-text" style={{color: '#ff4d4d', marginTop: '10px'}}>{error}</p>}
                        <button type="submit" className="btn-login" disabled={loading}>
                            {loading ? "Verificando..." : "Entrar al Portal"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};