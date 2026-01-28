import React, { useState, useEffect } from 'react';
import '../Styles/planning.css';

const API_URL = 'https://script.google.com/macros/s/AKfycbxIgwbIuGymDkRREiidM0lJYZRi5KdKS217_inoU751zp_x3EAzzxcljjNHSxZc34zBxQ/exec';

const EVALUATION_OPTIONS = [
    { label: "🟢 Good", value: 10 },
    { label: "🟡 Regular", value: 5 },
    { label: "🔴 Poor", value: 0 }
];

export const ClassReview = ({ userData, teacherList = [] }) => {
    const [reviews, setReviews] = useState([]);
    const [syncQueue, setSyncQueue] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [selectedSummary, setSelectedSummary] = useState(null);
    
    // Estados para Filtros
    const [filterGrade, setFilterGrade] = useState("");
    const [filterTeacher, setFilterTeacher] = useState("");
    const [filterSubject, setFilterSubject] = useState("");

    const [formData, setFormData] = useState({
        Teacher_Name: "", Grade: "", Subject: "",
        Timing_Control: 0, The_Hook_Check: 0, Vocabulary_Focus: 0,
        Scaffolding_Check: 0, Student_Talk_Time: 0, Thinking_Routine: 0,
        Resource_Sync: 0, Discipline_Flow: 0, Goal_Achievement: 0,
        Audio_Video_URL: "", Feedback_Action: ""
    });

    const [availableGrades, setAvailableGrades] = useState([]);
    const [availableSubjects, setAvailableSubjects] = useState([]);

    useEffect(() => { fetchReviews(); }, []);

    const fetchReviews = async () => {
        setIsSyncing(true);
        try {
            const resp = await fetch(`${API_URL}?sheet=Class_Observations`);
            const data = await resp.json();
            if (Array.isArray(data)) setReviews(data);
        } catch (e) { console.error("Error fetching reviews:", e); }
        setIsSyncing(false);
    };

    const getSafeValue = (obj, key) => {
        if (!obj) return 0;
        if (obj[key] !== undefined) return obj[key];
        const excelKey = key.replace(/_/g, ' ');
        if (obj[excelKey] !== undefined) return obj[excelKey];
        if (key === "Discipline_Flow" && obj["Discipline & Flow"] !== undefined) return obj["Discipline & Flow"];
        return 0;
    };

    const handleTeacherChange = (teacherName) => {
        const teacherInfo = teacherList.find(t => t.Teacher_Name === teacherName);
        if (teacherInfo) {
            setAvailableGrades(teacherInfo.Assigned_Grade?.split(',').map(g => g.trim()) || []);
            setAvailableSubjects(teacherInfo.Assigned_Subject?.split(',').map(s => s.trim()) || []);
            setFormData({ ...formData, Teacher_Name: teacherName, Grade: "", Subject: "" });
        }
    };

    const handleInputChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
    };

    const calculateTotalScore = (data) => {
        const fields = ['Timing_Control', 'The_Hook_Check', 'Vocabulary_Focus', 'Scaffolding_Check', 'Student_Talk_Time', 'Thinking_Routine', 'Resource_Sync', 'Discipline_Flow', 'Goal_Achievement'];
        const total = fields.reduce((acc, field) => acc + (Number(data[field]) || 0), 0);
        return Math.round((total / (fields.length * 10)) * 100);
    };

    const handleSaveLocal = (e) => {
        e.preventDefault();
        const finalScore = calculateTotalScore(formData);
        const newReview = {
            ...formData,
            Teacher: formData.Teacher_Name, 
            Score: finalScore,
            Global_Score: finalScore,
            ID_Lesson_Ref: `REV-${Date.now()}`,
            isLocal: true
        };
        setReviews([newReview, ...reviews]);
        setSyncQueue([...syncQueue, newReview]);
        setShowForm(false);
    };

    const syncWithExcel = async () => {
        setIsSyncing(true);
        try {
            for (const item of syncQueue) {
                const { isLocal, ...dataToSend } = item;
                await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'create', sheet: "Class_Observations", data: dataToSend })
                });
            }
            setSyncQueue([]);
            fetchReviews();
            alert("🚀 Success!");
        } catch (e) { alert("Error sync"); }
        setIsSyncing(false);
    };

    const getAutomaticSummary = (score) => {
        const s = Number(score) || 0;
        if (s >= 90) return { title: "🟢 EXCELLENT PERFORMANCE (90–100%)", text: "The lesson demonstrated a high level of instructional effectiveness. Timing and classroom flow were well managed, allowing activities to progress smoothly and keeping students engaged throughout the session. The hook was purposeful and successfully activated prior knowledge, while vocabulary instruction was clear and consistently reinforced. Scaffolding strategies were evident, supporting learners in both content understanding and language production. Student Talk Time was strong, with meaningful participation guided by an appropriate thinking routine. Resources and media were well integrated, discipline was maintained naturally, and the learning goal was fully achieved. Overall, this lesson reflects strong pedagogical practice and effective CLIL-oriented instruction." };
        if (s >= 75) return { title: "🟡 GOOD PERFORMANCE (75–89%)", text: "The lesson met most instructional expectations and showed solid planning and execution. Timing and transitions were generally effective, although some moments could be streamlined. The hook supported student engagement, and key vocabulary was addressed appropriately. Scaffolding strategies were present but could be strengthened to further support independent language use. Student Talk Time was adequate, with opportunities for participation supported by the thinking routine. Resources were aligned with the lesson objectives, classroom management was stable, and learning goals were mostly achieved. With minor adjustments, this lesson can reach an excellent level." };
        if (s >= 60) return { title: "🟠 BASIC PERFORMANCE (60–74%)", text: "The lesson showed partial achievement of instructional goals. While the lesson structure was evident, timing and flow affected overall pacing. The hook and vocabulary focus were present but could be more intentional to better engage students. Scaffolding strategies were limited, which reduced student confidence in using language independently. Student Talk Time was inconsistent, and the thinking routine was applied at a basic level. Resources supported the lesson to some extent, discipline required occasional redirection, and learning goals were partially achieved. Targeted improvements in scaffolding, interaction, and pacing are recommended." };
        return { title: "🔴 LOW PERFORMANCE (Below 60%)", text: "The lesson requires significant improvement to meet instructional standards. Timing and classroom flow impacted lesson coherence, and the hook did not effectively engage students. Vocabulary instruction and scaffolding were minimal, limiting student comprehension and participation. Student Talk Time was low, with limited use of thinking routines to guide learning. Resources were not fully aligned with lesson objectives, classroom management affected learning time, and the intended learning goal was not achieved. Focused support in lesson planning, scaffolding strategies, and student engagement is strongly recommended." };
    };

    // Lógica de Filtrado Corregida
    const filteredReviews = reviews.filter(r => {
        const tName = (r.Teacher || r.Teacher_Name || "").toString().toLowerCase();
        const rGrade = (r.Grade || "").toString();
        const rSubject = (r.Subject || "").toString();
        
        return (filterTeacher === "" || tName.includes(filterTeacher.toLowerCase())) &&
               (filterGrade === "" || rGrade === filterGrade) &&
               (filterSubject === "" || rSubject === filterSubject);
    });

    return (
        <div className="planning-wrapper">
            <header className="page-header">
                <div className="title-section">
                    <h1>Class Observation Review</h1>
                    <p>Monitoring and feedback sync.</p>
                </div>
                <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {isSyncing && (
                        <div className="sync-loader" style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: '#3b82f6', fontWeight: '600' }}>
                            <span className="spinner" style={{ marginRight: '8px' }}>⏳</span> Syncing Data...
                        </div>
                    )}
                    {syncQueue.length > 0 && (
                        <button className="btn-sync" onClick={syncWithExcel} disabled={isSyncing}>
                            {isSyncing ? "..." : `🔄 Push ${syncQueue.length} to Excel`}
                        </button>
                    )}
                    <button className="btn-main" onClick={() => setShowForm(!showForm)}>
                        {showForm ? "✕ Cancel" : "＋ New Review"}
                    </button>
                </div>
            </header>

            {/* SECCIÓN DE FILTROS */}
            <div className="filters-bar" style={{ 
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', 
                backgroundColor: '#fff', padding: '15px', borderRadius: '12px', 
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px' 
            }}>
                <div className="filter-group">
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '5px' }}>DOCENTE</label>
                    <input 
                        type="text" placeholder="Search by name..." 
                        value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    />
                </div>
                <div className="filter-group">
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '5px' }}>GRADO</label>
                    <select 
                        value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    >
                        <option value="">Todos los Grados</option>
                        {[...new Set(reviews.map(r => r.Grade))].filter(Boolean).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '5px' }}>ASIGNATURA</label>
                    <select 
                        value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    >
                        <option value="">Todas las Asignaturas</option>
                        {[...new Set(reviews.map(r => r.Subject))].filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* TABLA DE RESULTADOS */}
            <div className="table-card">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>Teacher</th>
                            <th>Grade / Subject</th>
                            <th>Score</th>
                            <th>Actions</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredReviews.length > 0 ? filteredReviews.slice(0, 20).map((rev, i) => (
                            <tr key={i} className={rev.isLocal ? "row-local" : ""}>
                                <td><strong>{rev.Teacher || rev.Teacher_Name}</strong></td>
                                <td><span className="grade-tag">{rev.Grade}</span> - <small>{rev.Subject}</small></td>
                                <td style={{ fontWeight: 'bold', color: (rev.Score || rev.Global_Score) >= 75 ? '#10b981' : '#f59e0b' }}>
                                    {Math.round(rev.Score || rev.Global_Score || 0)}%
                                </td>
                                <td><button className="btn-view" onClick={() => setSelectedSummary(rev)}>👁️ View</button></td>
                                <td>{rev.isLocal ? "⏳" : "✅"}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No observations found with these filters.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* FORMULARIO (Se mantiene igual) */}
            {showForm && (
                <div className="form-container" style={{ marginTop: '20px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px' }}>
                    <form onSubmit={handleSaveLocal}>
                        <div className="grid-3">
                            <div className="input-group">
                                <label>Teacher Name</label>
                                <select required value={formData.Teacher_Name} onChange={(e) => handleTeacherChange(e.target.value)}>
                                    <option value="">Select...</option>
                                    {teacherList.map((t, i) => <option key={i} value={t.Teacher_Name}>{t.Teacher_Name}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Grade</label>
                                <select required value={formData.Grade} onChange={(e) => handleInputChange("Grade", e.target.value)}>
                                    <option value="">Select...</option>
                                    {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Subject</label>
                                <select required value={formData.Subject} onChange={(e) => handleInputChange("Subject", e.target.value)}>
                                    <option value="">Select...</option>
                                    {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid-3" style={{marginTop: '20px'}}>
                            {/* ... selectores de indicadores ... */}
                            {[
                                {id: "Timing_Control", label: "Timing Control"},
                                {id: "The_Hook_Check", label: "The Hook Check"},
                                {id: "Vocabulary_Focus", label: "Vocabulary Focus"},
                                {id: "Scaffolding_Check", label: "Scaffolding Check"},
                                {id: "Student_Talk_Time", label: "Student Talk Time"},
                                {id: "Thinking_Routine", label: "Thinking Routine"},
                                {id: "Resource_Sync", label: "Resource Sync"},
                                {id: "Discipline_Flow", label: "Discipline & Flow"},
                                {id: "Goal_Achievement", label: "Goal Achievement"}
                            ].map(item => (
                                <div key={item.id} className="input-group">
                                    <label>{item.label}</label>
                                    <select required value={formData[item.id]} onChange={(e) => handleInputChange(item.id, e.target.value)}>
                                        <option value="">Select...</option>
                                        {EVALUATION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                        <button type="submit" className="btn-save-all" style={{ width: '100%', marginTop: '20px' }}>💾 Save Locally</button>
                    </form>
                </div>
            )}

            {/* POPUP DE RESUMEN (MODAL) */}
            {selectedSummary && (
                <div className="modal-overlay" onClick={() => setSelectedSummary(null)}>
                    <div className="scaffolding-modal" style={{ maxWidth: '750px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📊 Lesson Observation Snapshot</h2>
                            <button className="close-x" onClick={() => setSelectedSummary(null)}>×</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                            <div className="summary-banner" style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', marginBottom: '20px', borderLeft: '5px solid #3b82f6' }}>
                                <p><strong>Lesson ID:</strong> {selectedSummary.ID_Lesson_Ref || 'N/A'}</p>
                                <p><strong>Teacher:</strong> {selectedSummary.Teacher || selectedSummary.Teacher_Name}</p>
                                <p><strong>Overall Performance:</strong> <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{Math.round(selectedSummary.Score || selectedSummary.Global_Score || 0)}%</span></p>
                            </div>
                            <h4 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '5px' }}>Key Indicators</h4>
                            <div className="indicators-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '15px 0' }}>
                                <div>⏱️ <strong>Timing:</strong> {getSafeValue(selectedSummary, 'Timing_Control')}/10</div>
                                <div>🪝 <strong>Hook:</strong> {getSafeValue(selectedSummary, 'The_Hook_Check')}/10</div>
                                <div>📚 <strong>Vocabulary:</strong> {getSafeValue(selectedSummary, 'Vocabulary_Focus')}/10</div>
                                <div>🧱 <strong>Scaffolding:</strong> {getSafeValue(selectedSummary, 'Scaffolding_Check')}/10</div>
                                <div>🗣️ <strong>STT:</strong> {getSafeValue(selectedSummary, 'Student_Talk_Time')}/10</div>
                                <div>🧠 <strong>Routine:</strong> {getSafeValue(selectedSummary, 'Thinking_Routine')}/10</div>
                                <div>📦 <strong>Resources:</strong> {getSafeValue(selectedSummary, 'Resource_Sync')}/10</div>
                                <div>⚖️ <strong>Discipline:</strong> {getSafeValue(selectedSummary, 'Discipline_Flow')}/10</div>
                                <div>🎯 <strong>Goal:</strong> {getSafeValue(selectedSummary, 'Goal_Achievement')}/10</div>
                            </div>
                            <div className="narrative-section" style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f1f5f9', borderRadius: '12px' }}>
                                <h3>{getAutomaticSummary(selectedSummary.Score || selectedSummary.Global_Score).title}</h3>
                                <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#334155' }}>
                                    {getAutomaticSummary(selectedSummary.Score || selectedSummary.Global_Score).text}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};