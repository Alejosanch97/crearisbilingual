import React, { useState, useEffect, useMemo } from 'react';
import '../Styles/accompaniment.css';
import { GraduationCap, UserPlus, Search, ClipboardList, CheckCircle2, XCircle, Plus, LogOut, X, RefreshCw } from 'lucide-react';

const API_URL = 'https://script.google.com/macros/s/AKfycbxIgwbIuGymDkRREiidM0lJYZRi5KdKS217_inoU751zp_x3EAzzxcljjNHSxZc34zBxQ/exec';
const CURRENT_TERM = "Third Term";

const ALL_GRADES = [
    "PJ", "JA", "TR", "FIRST GRADE", "SECOND GRADE", "THIRD GRADE", "FOURTH GRADE",
    "FIFTH GRADE", "SIXTH GRADE", "SEVENTH GRADE", "EIGHTH GRADE", "NINTH GRADE",
    "TENTH GRADE", "ELEVENTH GRADE"
];

const norm = (v) => String(v || '').trim().toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
const safeParse = (v) => { try { const p = JSON.parse(v || '[]'); return Array.isArray(p) ? p : []; } catch { return []; } };
const fmtDate = (iso) => { if (!iso) return ''; const d = String(iso).split('T')[0].split('-'); return d.length === 3 ? `${+d[2]}/${+d[1]}` : iso; };

export const Accompaniment = ({ userData }) => {
    const isAdmin = norm(userData.ROL) === 'ADMIN';
    const myGrades = (userData.Assigned_Grade || '').split(',').map(g => g.trim()).filter(Boolean);
    const teacherKey = String(userData.User_Key || userData.Teacher_Key || '').trim();
    const teacherName = String(userData.Teacher_Name || userData.User_Key || '').trim();

    // Grados que este usuario puede ver
    const visibleGrades = isAdmin ? ALL_GRADES : myGrades.filter(g => ALL_GRADES.includes(norm(g)) || ALL_GRADES.includes(g));

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [filterGrade, setFilterGrade] = useState('');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null); // estudiante abierto en el panel
    const [showNew, setShowNew] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    /* ------- Carga inicial (solo Term actual, filtrado en servidor) ------- */
    const fetchStudents = async () => {
        setLoading(true);
        try {
            const resp = await fetch(`${API_URL}?sheet=Students_Alert&term=${encodeURIComponent(CURRENT_TERM)}`);
            const data = await resp.json();
            if (Array.isArray(data)) {
                // Solo activos y solo de grados visibles
                const visible = data.filter(s =>
                    String(s.Active).toUpperCase() !== 'FALSE' &&
                    (isAdmin || visibleGrades.some(g => norm(g) === norm(s.Grade)))
                );
                setStudents(visible);
            }
        } catch (e) { console.error('Error cargando estudiantes:', e); }
        setLoading(false);
    };

    useEffect(() => { fetchStudents(); }, []);

    const filtered = useMemo(() => {
    console.log('filterGrade:', JSON.stringify(filterGrade), '→ norm:', norm(filterGrade));
    console.log('grados en datos:', [...new Set(students.map(s => JSON.stringify(s.Grade) + ' → ' + norm(s.Grade)))]);
    return students.filter(s =>
        (!filterGrade || norm(s.Grade) === norm(filterGrade)) &&
        (!search || norm(s.Student_Name).includes(norm(search)))
    );
}, [students, filterGrade, search]);

    /* ------- Actualiza un estudiante en el estado local ------- */
    const patchStudent = (id, patch) => {
        setStudents(prev => prev.map(s => s.ID_Student === id ? { ...s, ...patch } : s));
        setSelected(prev => prev && prev.ID_Student === id ? { ...prev, ...patch } : prev);
    };

    /* ------- Acciones (UI optimista) ------- */
    const addAssignment = async (student, text) => {
        if (!text.trim()) return;
        const arr = safeParse(student.Assignments);
        const nuevo = { id: 'ASG-' + Date.now(), date: new Date().toISOString(), text: text.trim() };
        const updated = JSON.stringify([...arr, nuevo]);
        patchStudent(student.ID_Student, { Assignments: updated });
        try {
            await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'addAssignment', idValue: student.ID_Student, text: text.trim() }) });
        } catch (e) { showToast('No se pudo guardar la asignación', 'error'); }
    };

    const addObservation = async (student, text) => {
        if (!text.trim()) return;
        const arr = safeParse(student.Observations);
        const nuevo = { id: 'OBS-' + Date.now(), date: new Date().toISOString(), text: text.trim(), author: teacherName };
        const updated = JSON.stringify([...arr, nuevo]);
        patchStudent(student.ID_Student, { Observations: updated });
        try {
            await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'addObservation', idValue: student.ID_Student, text: text.trim(), author: teacherName }) });
        } catch (e) { showToast('No se pudo guardar la observación', 'error'); }
    };

    const setVerdict = async (student, verdict) => {
        patchStudent(student.ID_Student, { Verdict: verdict });
        try {
            await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'setVerdict', idValue: student.ID_Student, verdict }) });
            if (verdict === 'Reprobó') showToast('Marcado como Reprobó — alerta enviada a coordinación', 'success');
        } catch (e) { showToast('No se pudo guardar el veredicto', 'error'); }
    };

    const removeFromList = async (student) => {
        // Optimista: lo quitamos de la lista
        setStudents(prev => prev.filter(s => s.ID_Student !== student.ID_Student));
        setSelected(null);
        try {
            await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'toggleStudentActive', idValue: student.ID_Student, active: false }) });
            showToast(`${student.Student_Name} salió de la lista de nivelación`);
        } catch (e) {
            showToast('No se pudo actualizar', 'error');
            fetchStudents();
        }
    };

    return (
        <div className="acc-root">
            {/* Cabecera */}
            <div className="acc-head">
                <div className="acc-head-actions">
                    <button className="acc-btn ghost" onClick={fetchStudents} disabled={loading}>
                        <RefreshCw size={15} /> {loading ? 'Cargando…' : 'Actualizar'}
                    </button>
                    <button className="acc-btn primary" onClick={() => setShowNew(true)}>
                        <UserPlus size={16} /> Nuevo estudiante
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="acc-toolbar">
                <div className="acc-search">
                    <Search size={15} />
                    <input placeholder="Buscar por nombre…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select
                    value={filterGrade}
                    onChange={e => setFilterGrade(e.target.value)}
                    autoComplete="off"
                >
                    <option value="">Todos los grados</option>
                    {visibleGrades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <span className="acc-count"><strong>{filtered.length}</strong> {filtered.length === 1 ? 'estudiante' : 'estudiantes'}</span>
            </div>

            {/* Lista */}
            {loading ? (
                <div className="acc-loading">Cargando estudiantes…</div>
            ) : filtered.length === 0 ? (
                <div className="acc-empty">
                    <GraduationCap size={40} />
                    <h3>Sin estudiantes en alerta</h3>
                    <p>No hay estudiantes activos para estos filtros. Crea uno con “Nuevo estudiante”.</p>
                </div>
            ) : (
                <div className="acc-grid">
                    {console.log('RENDER CARDS →', filtered.length, filtered.map(s => s.Grade))}
                    {filtered.map(s => {
                        const asgs = safeParse(s.Assignments);
                        const obs = safeParse(s.Observations);
                        const verdictClass = s.Verdict === 'Aprobó' ? 'ok' : s.Verdict === 'Reprobó' ? 'bad' : 'pending';
                        return (
                            <article key={s.ID_Student} className="acc-card" onClick={() => setSelected(s)}>
                                <div className="acc-card-top">
                                    <span className="acc-grade-tag">{s.Grade}</span>
                                    <span className={`acc-verdict ${verdictClass}`}>{s.Verdict || 'Pendiente'}</span>
                                </div>
                                <h3 className="acc-name">{s.Student_Name}</h3>
                                <div className="acc-mcer">
                                    <span>MCER esperado: <strong>{s.Expected_MCER || '—'}</strong></span>
                                </div>
                                <div className="acc-mini-stats">
                                    <span><ClipboardList size={13} /> {asgs.length} asignaciones</span>
                                    <span>{obs.length} observaciones</span>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* Panel de detalle */}
            {selected && (
                <StudentPanel
                    student={selected}
                    isAdmin={isAdmin}
                    onClose={() => setSelected(null)}
                    onAddAssignment={addAssignment}
                    onAddObservation={addObservation}
                    onSetVerdict={setVerdict}
                    onRemove={removeFromList}
                />
            )}

            {/* Modal nuevo estudiante */}
            {showNew && (
                <NewStudentModal
                    grades={visibleGrades}
                    teacherKey={teacherKey}
                    isAdmin={isAdmin}
                    onClose={() => setShowNew(false)}
                    onCreated={(student) => { setStudents(prev => [student, ...prev]); setShowNew(false); showToast('Estudiante agregado'); }}
                />
            )}

            {toast && <div className={`acc-toast ${toast.type}`}><span className="acc-toast-dot" />{toast.message}</div>}
        </div>
    );
};

/* ============================================================
   PANEL DE DETALLE DEL ESTUDIANTE
   ============================================================ */
const StudentPanel = ({ student, isAdmin, onClose, onAddAssignment, onAddObservation, onSetVerdict, onRemove }) => {
    const [tab, setTab] = useState('plan');
    const [newAsg, setNewAsg] = useState('');
    const [newObs, setNewObs] = useState('');
    const assignments = safeParse(student.Assignments);
    const observations = safeParse(student.Observations);

    return (
        <div className="acc-overlay" onClick={onClose}>
            <div className="acc-panel" onClick={e => e.stopPropagation()}>
                <div className="acc-panel-head">
                    <div>
                        <span className="acc-panel-grade">{student.Grade}</span>
                        <h2>{student.Student_Name}</h2>
                        <div className="acc-panel-meta">
                            <span>Ingreso: {fmtDate(student.Entry_Date) || '—'}</span>
                            <span>MCER: {student.Expected_MCER || '—'}</span>
                        </div>
                    </div>
                    <button className="acc-close" onClick={onClose}><X size={18} /></button>
                </div>

                {/* Datos de diagnóstico (solo lectura) */}
                <div className="acc-diag">
                    <div className="acc-diag-item">
                        <span>Diagnóstico de ingreso</span>
                        <p>{student.Diagnostic_Result || 'Sin registrar'}</p>
                    </div>
                    <div className="acc-diag-item">
                        <span>Entry Test Richmond</span>
                        <p>{student.Entry_Test_Richmond || 'Sin registrar'}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="acc-tabs">
                    <button className={tab === 'plan' ? 'on' : ''} onClick={() => setTab('plan')}>Plan de trabajo</button>
                    <button className={tab === 'obs' ? 'on' : ''} onClick={() => setTab('obs')}>Observaciones</button>
                </div>

                <div className="acc-panel-body">
                    {tab === 'plan' && (
                        <>
                            <div className="acc-add-row">
                                <input
                                    placeholder="Nueva asignación (ej: Richmond Unit 3 Reading + iRead 20 min)"
                                    value={newAsg}
                                    onChange={e => setNewAsg(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { onAddAssignment(student, newAsg); setNewAsg(''); } }}
                                />
                                <button onClick={() => { onAddAssignment(student, newAsg); setNewAsg(''); }} disabled={!newAsg.trim()}>
                                    <Plus size={16} />
                                </button>
                            </div>
                            {assignments.length === 0 ? (
                                <p className="acc-list-empty">Aún no has creado asignaciones para este estudiante.</p>
                            ) : (
                                <div className="acc-timeline">
                                    {[...assignments].reverse().map(a => (
                                        <div key={a.id} className="acc-tl-item">
                                            <span className="acc-tl-dot" />
                                            <div className="acc-tl-body">
                                                <p>{a.text}</p>
                                                <small>{fmtDate(a.date)}</small>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {tab === 'obs' && (
                        <>
                            <div className="acc-add-row">
                                <input
                                    placeholder="Nueva observación (¿cumplió? ¿avanzó?)"
                                    value={newObs}
                                    onChange={e => setNewObs(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { onAddObservation(student, newObs); setNewObs(''); } }}
                                />
                                <button onClick={() => { onAddObservation(student, newObs); setNewObs(''); }} disabled={!newObs.trim()}>
                                    <Plus size={16} />
                                </button>
                            </div>
                            {observations.length === 0 ? (
                                <p className="acc-list-empty">Sin observaciones registradas.</p>
                            ) : (
                                <div className="acc-timeline">
                                    {[...observations].reverse().map(o => (
                                        <div key={o.id} className="acc-tl-item">
                                            <span className="acc-tl-dot obs" />
                                            <div className="acc-tl-body">
                                                <p>{o.text}</p>
                                                <small>{fmtDate(o.date)}{o.author ? ` · ${o.author}` : ''}</small>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Veredicto + salir */}
                <div className="acc-panel-foot">
                    <div className="acc-verdict-picker">
                        <span>Veredicto:</span>
                        <button
                            className={`acc-vbtn ok ${student.Verdict === 'Aprobó' ? 'on' : ''}`}
                            onClick={() => onSetVerdict(student, 'Aprobó')}
                        ><CheckCircle2 size={15} /> Aprobó</button>
                        <button
                            className={`acc-vbtn bad ${student.Verdict === 'Reprobó' ? 'on' : ''}`}
                            onClick={() => onSetVerdict(student, 'Reprobó')}
                        ><XCircle size={15} /> Reprobó</button>
                    </div>
                    <button className="acc-exit-btn" onClick={() => onRemove(student)}>
                        <LogOut size={15} /> Ya está al nivel · Sacar de la lista
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ============================================================
   MODAL NUEVO ESTUDIANTE
   ============================================================ */
const NewStudentModal = ({ grades, teacherKey, isAdmin, onClose, onCreated }) => {
    const [form, setForm] = useState({
        Student_Name: '', Grade: grades[0] || '', Entry_Date: '', Expected_MCER: '',
        Diagnostic_Result: '', Entry_Test_Richmond: ''
    });
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!form.Student_Name.trim() || !form.Grade) return;
        setSaving(true);
        const id = 'STU-' + Date.now();
        const student = {
            ID_Student: id,
            ...form,
            Assignments: '[]', Observations: '[]', Verdict: '',
            Term: CURRENT_TERM, Teacher_Key: teacherKey,
            Created_By: isAdmin ? 'admin' : 'teacher',
            Last_Updated: new Date().toISOString(), Active: 'TRUE',
            rowId: null
        };
        // Optimista
        onCreated(student);
        try {
            await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'createStudent', data: student }) });
        } catch (e) { console.error(e); }
        setSaving(false);
    };

    return (
        <div className="acc-overlay" onClick={onClose}>
            <div className="acc-modal" onClick={e => e.stopPropagation()}>
                <div className="acc-modal-head">
                    <div><span className="acc-eyebrow">Nuevo</span><h3>Estudiante en alerta</h3></div>
                    <button className="acc-close" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="acc-modal-body">
                    <div className="acc-field">
                        <label>Nombre del estudiante</label>
                        <input value={form.Student_Name} onChange={e => setForm(f => ({ ...f, Student_Name: e.target.value }))} autoFocus />
                    </div>
                    <div className="acc-field-row">
                        <div className="acc-field">
                            <label>Grado</label>
                            <select value={form.Grade} onChange={e => setForm(f => ({ ...f, Grade: e.target.value }))}>
                                {grades.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div className="acc-field">
                            <label>Nivel MCER esperado</label>
                            <input placeholder="Ej: A2" value={form.Expected_MCER} onChange={e => setForm(f => ({ ...f, Expected_MCER: e.target.value }))} />
                        </div>
                    </div>
                    <div className="acc-field-row">
                        <div className="acc-field">
                            <label>Fecha de ingreso</label>
                            <input type="date" value={form.Entry_Date} onChange={e => setForm(f => ({ ...f, Entry_Date: e.target.value }))} />
                        </div>
                        <div className="acc-field">
                            <label>Entry Test Richmond</label>
                            <input value={form.Entry_Test_Richmond} onChange={e => setForm(f => ({ ...f, Entry_Test_Richmond: e.target.value }))} />
                        </div>
                    </div>
                    <div className="acc-field">
                        <label>Resultado diagnóstico de ingreso</label>
                        <input value={form.Diagnostic_Result} onChange={e => setForm(f => ({ ...f, Diagnostic_Result: e.target.value }))} />
                    </div>
                </div>
                <div className="acc-modal-foot">
                    <button className="acc-btn ghost" onClick={onClose}>Cancelar</button>
                    <button className="acc-btn primary" onClick={submit} disabled={saving || !form.Student_Name.trim()}>
                        {saving ? 'Guardando…' : 'Crear estudiante'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Accompaniment;