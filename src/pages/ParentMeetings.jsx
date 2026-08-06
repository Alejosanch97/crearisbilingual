import React, { useState, useEffect, useMemo } from 'react';
import '../Styles/parentMeetings.css';
import { AlertTriangle, CalendarClock, Check, X, Plus, RefreshCw, FileText } from 'lucide-react';

const API_URL = 'https://script.google.com/macros/s/AKfycbxIgwbIuGymDkRREiidM0lJYZRi5KdKS217_inoU751zp_x3EAzzxcljjNHSxZc34zBxQ/exec';
const CURRENT_TERM = "Third Term";

const fmtDate = (iso) => { if (!iso) return '—'; const d = String(iso).split('T')[0].split('-'); return d.length === 3 ? `${+d[2]}/${+d[1]}/${d[0]}` : iso; };

export const ParentMeetings = ({ userData }) => {
    const adminName = String(userData.Teacher_Name || userData.User_Key || '').trim();

    const [students, setStudents] = useState([]);
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [target, setTarget] = useState(null); // estudiante para citar
    const [viewMeeting, setViewMeeting] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const resp = await fetch(`${API_URL}?sheets=Students_Alert,Parent_Meetings&term=${encodeURIComponent(CURRENT_TERM)}`);
            const batch = await resp.json();
            setStudents(Array.isArray(batch.Students_Alert) ? batch.Students_Alert : []);
            setMeetings(Array.isArray(batch.Parent_Meetings) ? batch.Parent_Meetings : []);
        } catch (e) { console.error('Error cargando citaciones:', e); }
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, []);

    // Reprobados que aún NO tienen citación
    const pending = useMemo(() => {
        const citedIds = new Set(meetings.map(m => String(m.ID_Student).trim()));
        return students.filter(s => String(s.Verdict).trim() === 'Reprobó' && !citedIds.has(String(s.ID_Student).trim()));
    }, [students, meetings]);

    const createMeeting = async (form) => {
        const id = 'MTG-' + Date.now();
        const meeting = {
            ID_Meeting: id, ID_Student: target.ID_Student, Student_Name: target.Student_Name,
            Grade: target.Grade, Meeting_Reason: form.reason, Meeting_Date: form.date,
            Attended: form.attended, Commitment_Signed: form.signed, Commitments: form.commitments,
            Next_Followup: form.followup, Responsible: adminName, Term: CURRENT_TERM
        };
        // Optimista
        setMeetings(prev => [meeting, ...prev]);
        setTarget(null);
        try {
            await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'createMeeting', data: meeting }) });
            showToast('Citación registrada');
        } catch (e) { showToast('No se pudo guardar', 'error'); fetchAll(); }
    };

    return (
        <div className="pm-root">
            <div className="pm-head">
                <button className="pm-btn ghost" onClick={fetchAll} disabled={loading}>
                    <RefreshCw size={15} /> {loading ? 'Cargando…' : 'Actualizar'}
                </button>
            </div>

            {/* Alertas pendientes */}
            <section className="pm-section">
                <div className="pm-section-head">
                    <h3><AlertTriangle size={16} /> Requieren citación <span className="pm-badge">{pending.length}</span></h3>
                </div>
                {loading ? (
                    <div className="pm-loading">Cargando…</div>
                ) : pending.length === 0 ? (
                    <p className="pm-empty">No hay reprobados pendientes de citación. Todo al día.</p>
                ) : (
                    <div className="pm-alert-grid">
                        {pending.map(s => (
                            <div key={s.ID_Student} className="pm-alert-card">
                                <div className="pm-alert-top">
                                    <span className="pm-grade">{s.Grade}</span>
                                    <span className="pm-reprobo">Reprobó</span>
                                </div>
                                <h4>{s.Student_Name}</h4>
                                <span className="pm-mcer">MCER esperado: {s.Expected_MCER || '—'}</span>
                                <button className="pm-cite-btn" onClick={() => setTarget(s)}>
                                    <Plus size={14} /> Citar acudiente
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Citaciones registradas */}
            <section className="pm-section">
                <div className="pm-section-head">
                    <h3><FileText size={16} /> Citaciones registradas <span className="pm-badge alt">{meetings.length}</span></h3>
                </div>
                {meetings.length === 0 ? (
                    <p className="pm-empty">Aún no hay citaciones registradas este periodo.</p>
                ) : (
                    <div className="pm-table">
                        <div className="pm-tr pm-th">
                            <span>Estudiante</span><span>Grado</span><span>Fecha</span><span>Asistió</span><span>Firmó</span><span></span>
                        </div>
                        {meetings.map(m => (
                            <div key={m.ID_Meeting} className="pm-tr">
                                <span className="pm-td-name">{m.Student_Name}</span>
                                <span>{m.Grade}</span>
                                <span>{fmtDate(m.Meeting_Date)}</span>
                                <span className={`pm-yn ${String(m.Attended).toLowerCase() === 'sí' || String(m.Attended).toLowerCase() === 'si' ? 'yes' : 'no'}`}>{m.Attended}</span>
                                <span className={`pm-yn ${String(m.Commitment_Signed).toLowerCase() === 'sí' || String(m.Commitment_Signed).toLowerCase() === 'si' ? 'yes' : 'no'}`}>{m.Commitment_Signed}</span>
                                <button className="pm-view" onClick={() => setViewMeeting(m)}>Ver</button>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {target && <MeetingForm student={target} onClose={() => setTarget(null)} onSave={createMeeting} />}
            {viewMeeting && <MeetingView meeting={viewMeeting} onClose={() => setViewMeeting(null)} />}
            {toast && <div className={`pm-toast ${toast.type}`}><span className="pm-toast-dot" />{toast.message}</div>}
        </div>
    );
};

/* ============ FORMULARIO DE CITACIÓN ============ */
const MeetingForm = ({ student, onClose, onSave }) => {
    const [form, setForm] = useState({
        reason: `Bajo desempeño en nivelación de inglés. Estudiante por debajo del nivel del grupo (MCER esperado: ${student.Expected_MCER || '—'}).`,
        date: new Date().toISOString().split('T')[0],
        attended: 'No', signed: 'No', commitments: '', followup: ''
    });
    const [saving, setSaving] = useState(false);

    const submit = () => { setSaving(true); onSave(form); };

    return (
        <div className="pm-overlay" onClick={onClose}>
            <div className="pm-modal" onClick={e => e.stopPropagation()}>
                <div className="pm-modal-head">
                    <div>
                        <span className="pm-modal-grade">{student.Grade}</span>
                        <h3>Citar acudiente · {student.Student_Name}</h3>
                    </div>
                    <button className="pm-close" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="pm-modal-body">
                    <div className="pm-field">
                        <label>Motivo de la citación</label>
                        <textarea rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
                    </div>
                    <div className="pm-field-row">
                        <div className="pm-field">
                            <label>Fecha de citación</label>
                            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                        </div>
                        <div className="pm-field">
                            <label>Próximo seguimiento</label>
                            <input type="date" value={form.followup} onChange={e => setForm(f => ({ ...f, followup: e.target.value }))} />
                        </div>
                    </div>
                    <div className="pm-field-row">
                        <div className="pm-field">
                            <label>¿Asistió?</label>
                            <div className="pm-yn-picker">
                                <button className={form.attended === 'Sí' ? 'on' : ''} onClick={() => setForm(f => ({ ...f, attended: 'Sí' }))}>Sí</button>
                                <button className={form.attended === 'No' ? 'on' : ''} onClick={() => setForm(f => ({ ...f, attended: 'No' }))}>No</button>
                            </div>
                        </div>
                        <div className="pm-field">
                            <label>¿Firmó compromiso?</label>
                            <div className="pm-yn-picker">
                                <button className={form.signed === 'Sí' ? 'on' : ''} onClick={() => setForm(f => ({ ...f, signed: 'Sí' }))}>Sí</button>
                                <button className={form.signed === 'No' ? 'on' : ''} onClick={() => setForm(f => ({ ...f, signed: 'No' }))}>No</button>
                            </div>
                        </div>
                    </div>
                    <div className="pm-field">
                        <label>Compromisos establecidos</label>
                        <textarea rows={3} placeholder="¿A qué se comprometió el acudiente y el estudiante?" value={form.commitments} onChange={e => setForm(f => ({ ...f, commitments: e.target.value }))} />
                    </div>
                </div>
                <div className="pm-modal-foot">
                    <button className="pm-btn ghost" onClick={onClose}>Cancelar</button>
                    <button className="pm-btn primary" onClick={submit} disabled={saving}>
                        {saving ? 'Guardando…' : 'Registrar citación'}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ============ VER CITACIÓN ============ */
const MeetingView = ({ meeting, onClose }) => (
    <div className="pm-overlay" onClick={onClose}>
        <div className="pm-modal" onClick={e => e.stopPropagation()}>
            <div className="pm-modal-head">
                <div>
                    <span className="pm-modal-grade">{meeting.Grade}</span>
                    <h3>{meeting.Student_Name}</h3>
                </div>
                <button className="pm-close" onClick={onClose}><X size={18} /></button>
            </div>
            <div className="pm-modal-body">
                <div className="pm-view-row"><span>Motivo</span><p>{meeting.Meeting_Reason || '—'}</p></div>
                <div className="pm-view-grid">
                    <div className="pm-view-row"><span>Fecha citación</span><p>{fmtDate(meeting.Meeting_Date)}</p></div>
                    <div className="pm-view-row"><span>Próximo seguimiento</span><p>{fmtDate(meeting.Next_Followup)}</p></div>
                    <div className="pm-view-row"><span>Asistió</span><p>{meeting.Attended}</p></div>
                    <div className="pm-view-row"><span>Firmó compromiso</span><p>{meeting.Commitment_Signed}</p></div>
                </div>
                <div className="pm-view-row"><span>Compromisos</span><p>{meeting.Commitments || 'Sin registrar'}</p></div>
                <div className="pm-view-row"><span>Responsable</span><p>{meeting.Responsible || '—'}</p></div>
            </div>
            <div className="pm-modal-foot">
                <button className="pm-btn ghost" onClick={onClose}>Cerrar</button>
            </div>
        </div>
    </div>
);

export default ParentMeetings;