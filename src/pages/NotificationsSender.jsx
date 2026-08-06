import React, { useState, useEffect, useMemo } from 'react';
import '../Styles/notificationsSender.css';
import { Send, X, Search, Check, Users, History } from 'lucide-react';

const API_URL = 'https://script.google.com/macros/s/AKfycbxIgwbIuGymDkRREiidM0lJYZRi5KdKS217_inoU751zp_x3EAzzxcljjNHSxZc34zBxQ/exec';

const norm = (v) => String(v || '').trim().toUpperCase();
const fmtDate = (iso) => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };

const QUICK = [
    "Profe, aún no has subido los datos de la actividad. ¿Puedes revisarlo?",
    "Profe, no me has reportado si los estudiantes avanzaron o no en nivelación.",
    "Recuerda registrar las asignaciones de tus estudiantes en alerta esta semana.",
    "Por favor actualiza el veredicto de tus estudiantes de acompañamiento.",
];

export const NotificationsSender = ({ userData, onClose, onNotificationSent }) => {
    const senderName = String(userData.Teacher_Name || userData.User_Key || '').trim();

    const [teachers, setTeachers] = useState([]);
    const [sent, setSent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedKeys, setSelectedKeys] = useState([]); // User_Keys destino
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [tab, setTab] = useState('send');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const resp = await fetch(`${API_URL}?sheets=Teachers_Users,Teacher_Notifications`);
                const batch = await resp.json();
                const allTeachers = Array.isArray(batch.Teachers_Users) ? batch.Teachers_Users : [];
                // Solo profes con ENGLISH en Assigned_Subject
                const english = allTeachers.filter(t => norm(t.Assigned_Subject).includes('ENGLISH'));
                setTeachers(english);
                setSent(Array.isArray(batch.Teacher_Notifications) ? batch.Teacher_Notifications : []);
            } catch (e) { console.error('Error cargando docentes:', e); }
            setLoading(false);
        };
        load();
    }, []);

    const filtered = useMemo(() => {
        if (!search) return teachers;
        return teachers.filter(t => norm(t.Teacher_Name).includes(norm(search)) || norm(t.User_Key).includes(norm(search)));
    }, [teachers, search]);

    const toggleTeacher = (userKey) => {
        setSelectedKeys(prev => prev.includes(userKey) ? prev.filter(k => k !== userKey) : [...prev, userKey]);
    };

    const send = async () => {
        if (!message.trim() || selectedKeys.length === 0) return;
        setSending(true);
        const targets = teachers.filter(t => selectedKeys.includes(String(t.User_Key).trim()));
        // Optimista: agregamos al historial local
        const optimistic = targets.map(t => ({
            ID_Notification: 'NOT-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            Target_User_Key: t.User_Key, Target_Teacher_Name: t.Teacher_Name,
            Message: message.trim(), Sender: senderName, Status: 'unread', Created_At: new Date().toISOString()
        }));
        setSent(prev => [...optimistic, ...prev]);

        try {
            await Promise.all(targets.map(t => fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'sendNotification',
                    data: {
                        Target_User_Key: String(t.User_Key).trim(),
                        Target_Teacher_Name: t.Teacher_Name,
                        Message: message.trim(),
                        Sender: senderName
                    }
                })
            })));

            // ✅ NOTIFICAR AL DASHBOARD QUE SE ENVIÓ
            if (onNotificationSent) {
                await onNotificationSent();
            }

        } catch (e) { console.error('Error enviando notificaciones:', e); }

        setMessage('');
        setSelectedKeys([]);
        setSending(false);
        setTab('history');
    };

    return (
        <div className="ns-overlay" onClick={onClose}>
            <div className="ns-modal" onClick={e => e.stopPropagation()}>
                <div className="ns-head">
                    <div>
                        <span className="ns-eyebrow">COORDINACIÓN → DOCENTES</span>
                        <h3>Enviar notificación</h3>
                    </div>
                    <button className="ns-close" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="ns-tabs">
                    <button className={tab === 'send' ? 'on' : ''} onClick={() => setTab('send')}><Send size={14} /> Enviar</button>
                    <button className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}><History size={14} /> Historial</button>
                </div>

                {tab === 'send' && (
                    <div className="ns-body">
                        {/* Selección de docentes */}
                        <div className="ns-block">
                            <label><Users size={14} /> Docentes de inglés {selectedKeys.length > 0 && <span className="ns-sel-count">{selectedKeys.length} seleccionados</span>}</label>
                            <div className="ns-search">
                                <Search size={14} />
                                <input placeholder="Buscar docente…" value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                            <div className="ns-teacher-list">
                                {loading ? <p className="ns-mini-empty">Cargando…</p> : filtered.length === 0 ? <p className="ns-mini-empty">Sin docentes de inglés.</p> : filtered.map(t => {
                                    const key = String(t.User_Key).trim();
                                    const on = selectedKeys.includes(key);
                                    return (
                                        <button key={key} className={`ns-teacher ${on ? 'on' : ''}`} onClick={() => toggleTeacher(key)}>
                                            <span className="ns-check">{on && <Check size={13} />}</span>
                                            <span className="ns-teacher-name">{t.Teacher_Name}</span>
                                            <span className="ns-teacher-key">{t.User_Key}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Mensaje */}
                        <div className="ns-block">
                            <label>Mensaje</label>
                            <textarea rows={3} placeholder="Escribe tu notificación…" value={message} onChange={e => setMessage(e.target.value)} />
                            <div className="ns-quick">
                                {QUICK.map((q, i) => (
                                    <button key={i} onClick={() => setMessage(q)}>{q.length > 42 ? q.slice(0, 42) + '…' : q}</button>
                                ))}
                            </div>
                        </div>

                        <button className="ns-send" onClick={send} disabled={sending || !message.trim() || selectedKeys.length === 0}>
                            <Send size={16} /> {sending ? 'Enviando…' : `Enviar a ${selectedKeys.length || ''} docente(s)`}
                        </button>
                    </div>
                )}

                {tab === 'history' && (
                    <div className="ns-body">
                        {sent.length === 0 ? (
                            <p className="ns-mini-empty">Aún no has enviado notificaciones.</p>
                        ) : (
                            <div className="ns-history">
                                {[...sent].sort((a, b) => new Date(b.Created_At) - new Date(a.Created_At)).map(n => (
                                    <div key={n.ID_Notification} className="ns-hist-item">
                                        <div className="ns-hist-top">
                                            <strong>{n.Target_Teacher_Name}</strong>
                                            <span className={`ns-status ${n.Status === 'read' ? 'read' : 'unread'}`}>{n.Status === 'read' ? 'Leída' : 'No leída'}</span>
                                        </div>
                                        <p>{n.Message}</p>
                                        <small>{fmtDate(n.Created_At)}</small>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsSender;