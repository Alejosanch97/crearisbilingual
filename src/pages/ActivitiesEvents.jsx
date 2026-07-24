import React, { useState, useEffect } from 'react';
import '../Styles/planning.css';
import { CalendarDays, Eye, Pencil, Star, Hand, RefreshCw, User, Clock, CheckCircle2, AlertCircle, Search } from 'lucide-react';

const API_URL = 'https://script.google.com/macros/s/AKfycbxIgwbIuGymDkRREiidM0lJYZRi5KdKS217_inoU751zp_x3EAzzxcljjNHSxZc34zBxQ/exec';

export const ActivitiesEvents = ({ userData }) => {
    const [activities, setActivities] = useState([]);
    const [allDetails, setAllDetails] = useState([]);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showDetailForm, setShowDetailForm] = useState(false);
    const [summaryData, setSummaryData] = useState(null); 

     const [filterMode, setFilterMode] = useState('all');

    const isAdmin = userData.ROL?.toUpperCase() === 'ADMIN';

    const [detailData, setDetailData] = useState({
        Academic_Objective: "", 
        Target_Vocabulary: "", 
        Language_Structures: "",
        Speaking_Challenge: "", 
        Interactive_Stages: "", 
        Resource_Links: "",
        Evaluation_Method: "", 
        Evidence_Preview: "", 
        Budget_Status: "Pending",
        Feedback: "", 
        Score: ""
    });

    useEffect(() => { 
        fetchActivities();
        fetchAllDetails(); 
    }, []);

    const fetchActivities = async () => {
        setIsSyncing(true);
        try {
            const resp = await fetch(`${API_URL}?sheet=Activities_Calendar`);
            const data = await resp.json();
            if (Array.isArray(data)) setActivities(data);
        } catch (e) { console.error(e); }
        setIsSyncing(false);
    };

    const fetchAllDetails = async () => {
        try {
            const resp = await fetch(`${API_URL}?sheet=Activity_Details_Form`);
            const data = await resp.json();
            if (Array.isArray(data)) setAllDetails(data);
        } catch (e) { console.error(e); }
    };

    const getExistingDetail = (activityId) => {
        const existingEntries = allDetails.filter(d => String(d.ID_Activity) === String(activityId));
        return existingEntries.length > 0 ? existingEntries[existingEntries.length - 1] : null;
    };

    // FUNCIÓN PARA CONVERTIR TEXTO CON LINKS EN ELEMENTOS CLICKABLES
    const renderTextWithLinks = (text) => {
        if (!text) return "Not filled";
        
        // Expresión regular para detectar URLs que empiecen con http o https o www.
        const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
        
        const parts = String(text).split(urlRegex);
        
        return parts.map((part, index) => {
            if (part.match(urlRegex)) {
                const href = part.startsWith('www.') ? `https://${part}` : part;
                return (
                    <a 
                        key={index} 
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all' }}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    const handleOpenForm = (activity) => {
        setSelectedActivity(activity);
        const lastEntry = getExistingDetail(activity.ID_Activity);
        
        if (lastEntry) {
            setDetailData({
                rowId: lastEntry.rowId,
                Academic_Objective: lastEntry.Academic_Objective || "",
                Target_Vocabulary: lastEntry.Target_Vocabulary || "",
                Language_Structures: lastEntry.Language_Structures || "",
                Speaking_Challenge: lastEntry.Speaking_Challenge || "",
                Interactive_Stages: lastEntry.Interactive_Stages || "",
                Resource_Links: lastEntry.Resource_Links || "",
                Evaluation_Method: lastEntry.Evaluation_Method || "",
                Evidence_Preview: lastEntry.Evidence_Preview || "",
                Budget_Status: lastEntry.Budget_Status || "Pending",
                Feedback: lastEntry.Feedback || "",
                Score: lastEntry.Score || ""
            });
        } else {
            setDetailData({
                Academic_Objective: "", Target_Vocabulary: "", Language_Structures: "",
                Speaking_Challenge: "", Interactive_Stages: "", Resource_Links: "",
                Evaluation_Method: "", Evidence_Preview: "", Budget_Status: "Pending",
                Feedback: "", Score: ""
            });
        }
        setShowDetailForm(true);
    };

    const handleOpenSummary = (activity) => {
        const lastEntry = getExistingDetail(activity.ID_Activity);
        if (lastEntry) {
            setSummaryData({
                ...lastEntry,
                Event_Name: activity.Event_Name 
            });
        }
    };

    const calculateProgress = (activity) => {
        const detail = getExistingDetail(activity.ID_Activity);
        if (!detail) return 0;
        const relevantFields = [
            'Academic_Objective', 'Target_Vocabulary', 'Language_Structures', 
            'Speaking_Challenge', 'Interactive_Stages', 'Resource_Links', 
            'Evaluation_Method', 'Evidence_Preview'
        ];
        const completedFields = relevantFields.filter(field => detail[field] && detail[field].toString().trim() !== "");
        return Math.min(Math.round((completedFields.length / relevantFields.length) * 100), 100);
    };

    const handleAssignMe = async (activity) => {
        const userName = userData.Teacher_Name || userData.Full_Name || userData.name;
        const updatedLocal = activities.map(a => 
            a.ID_Activity === activity.ID_Activity 
            ? { ...a, Responsable_ID: userName, Status: "In Progress" } : a
        );
        setActivities(updatedLocal);
        setIsSyncing(true);
        try {
            await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'update', sheet: "Activities_Calendar", rowId: activity.rowId,
                    data: { ...activity, "Responsable_ID": userName, "Status": "In Progress" }
                })
            });
        } catch (e) { fetchActivities(); }
        setIsSyncing(false);
    };

    const handleSaveDetails = async (e) => {
        e.preventDefault();
        const newDetailEntry = { 
            ...detailData, 
            ID_Activity: selectedActivity.ID_Activity,
            ID_Detail: `DET-${selectedActivity.ID_Activity}`
        };
        setAllDetails(prev => [...prev.filter(d => d.ID_Activity !== selectedActivity.ID_Activity), newDetailEntry]);
        setIsSyncing(true);
        setShowDetailForm(false);
        const methodAction = detailData.rowId ? 'update' : 'create';
        try {
            await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: methodAction, sheet: "Activity_Details_Form", rowId: detailData.rowId || null, data: newDetailEntry
                })
            });
            fetchAllDetails(); 
        } catch (e) { fetchActivities(); }
        setIsSyncing(false);
    };

    const getSemaforoLogic = (activity) => {
        const progress = calculateProgress(activity);
        if (!activity.Responsable_ID) return { color: "#ef4444", label: "Unassigned" };
        if (progress < 100) return { color: "#f59e0b", label: `Incomplete (${progress}%)` };
        return { color: "#10b981", label: "Form Completed" };
    };

    const myName = userData.Teacher_Name || userData.Full_Name || userData.name;
    const visibleActivities = activities.filter(act => {
        if (filterMode === 'mine') return act.Responsable_ID === myName;
        if (filterMode === 'free') return !act.Responsable_ID;
        return true;
    });
    const freeCount = activities.filter(a => !a.Responsable_ID).length;
    const mineCount = activities.filter(a => a.Responsable_ID === myName).length;

    return (
        <div className="planning-wrapper">

            <div className="act-toolbar">
                
                <div className="act-filters">
                    <button className={`act-filter ${filterMode === 'all' ? 'on' : ''}`} onClick={() => setFilterMode('all')}>
                        Todas <span className="act-count">{activities.length}</span>
                    </button>
                    <button className={`act-filter ${filterMode === 'mine' ? 'on' : ''}`} onClick={() => setFilterMode('mine')}>
                        Mis actividades <span className="act-count">{mineCount}</span>
                    </button>
                    <button className={`act-filter ${filterMode === 'free' ? 'on' : ''}`} onClick={() => setFilterMode('free')}>
                        Sin responsable <span className="act-count alert">{freeCount}</span>
                    </button>
                </div>
                
            </div>

            <div className="act-grid">
                {visibleActivities.map((act) => {
                    const statusInfo = getSemaforoLogic(act);
                    const progress = calculateProgress(act);
                    const isMyActivity = act.Responsable_ID === myName;
                    const hasDetail = getExistingDetail(act.ID_Activity);
                    const isFree = !act.Responsable_ID;

                    return (
                        <article
                            key={act.ID_Activity}
                            className={`act-card ${isFree ? 'free' : ''} ${isMyActivity ? 'mine' : ''}`}
                            style={{ '--act-accent': statusInfo.color }}
                        >
                            <div className="act-card-top">
                                <span className="act-status" style={{ color: statusInfo.color, background: `${statusInfo.color}18`, borderColor: `${statusInfo.color}44` }}>
                                    {statusInfo.label}
                                </span>
                                {hasDetail && (
                                    <button className="act-icon-btn" title="Ver resumen" onClick={() => handleOpenSummary(act)}>
                                        <Eye size={16} strokeWidth={2.2} />
                                    </button>
                                )}
                            </div>

                            <h3 className="act-name">{act.Event_Name}</h3>
                            {act.Description && <p className="act-desc">{act.Description}</p>}

                            {progress > 0 && progress < 100 && (
                                <div className="act-progress">
                                    <div className="act-progress-bar">
                                        <span style={{ width: `${progress}%`, background: statusInfo.color }} />
                                    </div>
                                    <span className="act-progress-num">{progress}%</span>
                                </div>
                            )}

                            <div className="act-owner">
                                {isFree ? (
                                    <><AlertCircle size={14} strokeWidth={2.2} /> <em>Sin responsable asignado</em></>
                                ) : (
                                    <><User size={14} strokeWidth={2.2} /> {act.Responsable_ID}</>
                                )}
                            </div>

                            <div className="act-actions">
                                {isFree ? (
                                    <button className="act-btn take" onClick={() => handleAssignMe(act)}>
                                        <Hand size={15} strokeWidth={2.2} /> Tomar actividad
                                    </button>
                                ) : (
                                    <>
                                        {isMyActivity && (
                                            <button className="act-btn primary" onClick={() => handleOpenForm(act)}>
                                                {progress === 100
                                                    ? <><CheckCircle2 size={15} strokeWidth={2.2} /> Editar diseño</>
                                                    : <><Pencil size={15} strokeWidth={2.2} /> Continuar diseño</>}
                                            </button>
                                        )}
                                        {isAdmin && (
                                            <button className="act-btn eval" onClick={() => handleOpenForm(act)}>
                                                <Star size={15} strokeWidth={2.2} /> Evaluar
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </article>
                    );
                })}

                {visibleActivities.length === 0 && (
                    <div className="act-empty">
                        <div className="act-empty-icon">
                            <Search size={30} strokeWidth={1.7} />
                        </div>
                        <h3>{isSyncing ? 'Buscando actividades…' : 'No hay actividades aquí'}</h3>
                        <p>
                            {isSyncing
                                ? 'Un momento, estamos trayendo el calendario.'
                                : filterMode === 'free'
                                    ? 'Todas las actividades ya tienen responsable. ¡Buen trabajo!'
                                    : filterMode === 'mine'
                                        ? 'Aún no has tomado ninguna actividad.'
                                        : 'No hay actividades en el calendario.'}
                        </p>
                        {filterMode !== 'all' && (
                            <div className="act-empty-actions">
                                <button className="act-btn primary" onClick={() => setFilterMode('all')}>
                                    Ver todas las actividades
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showDetailForm && (
                <div className="modal-overlay" onClick={() => setShowDetailForm(false)}>
                    <div className="scaffolding-modal" style={{ maxWidth: '850px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>Design: {selectedActivity.Event_Name}</h2>
                                <p style={{fontSize: '0.8rem', color: '#64748b'}}>Updating existing record in Excel.</p>
                            </div>
                            <button className="close-x" onClick={() => setShowDetailForm(false)}>×</button>
                        </div>
                        <form onSubmit={handleSaveDetails} className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div className="input-group" style={{gridColumn: 'span 2'}}>
                                <label>Academic Objective</label>
                                <textarea value={detailData.Academic_Objective} required onChange={(e) => setDetailData({...detailData, Academic_Objective: e.target.value})} />
                            </div>
                            <div className="input-group">
                                <label>Target Vocabulary</label>
                                <input type="text" value={detailData.Target_Vocabulary} onChange={(e) => setDetailData({...detailData, Target_Vocabulary: e.target.value})} />
                            </div>
                            <div className="input-group">
                                <label>Language Structures</label>
                                <input type="text" value={detailData.Language_Structures} onChange={(e) => setDetailData({...detailData, Language_Structures: e.target.value})} />
                            </div>
                            <div className="input-group" style={{gridColumn: 'span 2'}}>
                                <label>Interactive Stages</label>
                                <textarea value={detailData.Interactive_Stages} onChange={(e) => setDetailData({...detailData, Interactive_Stages: e.target.value})} />
                            </div>
                            <div className="input-group">
                                <label>Speaking Challenge</label>
                                <input type="text" value={detailData.Speaking_Challenge} onChange={(e) => setDetailData({...detailData, Speaking_Challenge: e.target.value})} />
                            </div>
                            <div className="input-group">
                                <label>Evaluation Method</label>
                                <select value={detailData.Evaluation_Method} onChange={(e) => setDetailData({...detailData, Evaluation_Method: e.target.value})}>
                                    <option value="">Select...</option>
                                    <option value="Rubric">Rubric</option>
                                    <option value="Checklist">Checklist</option>
                                    <option value="Direct Observation">Direct Observation</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Evidence Preview</label>
                                <input type="text" value={detailData.Evidence_Preview} onChange={(e) => setDetailData({...detailData, Evidence_Preview: e.target.value})} />
                            </div>
                            <div className="input-group">
                                <label>Resource Links</label>
                                <input type="text" value={detailData.Resource_Links} onChange={(e) => setDetailData({...detailData, Resource_Links: e.target.value})} />
                            </div>
                            <div className="input-group" style={{gridColumn: 'span 2'}}>
                                <label>Budget Status</label>
                                <select value={detailData.Budget_Status} onChange={(e) => setDetailData({...detailData, Budget_Status: e.target.value})}>
                                    <option value="Not Required">Not Required</option>
                                    <option value="Pending Approval">Pending Approval</option>
                                    <option value="Approved">Approved</option>
                                </select>
                            </div>

                            {isAdmin && (
                                <div style={{gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '15px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd'}}>
                                    <div className="input-group">
                                        <label>Score (0-100)</label>
                                        <input type="number" value={detailData.Score} onChange={(e) => setDetailData({...detailData, Score: e.target.value})} />
                                    </div>
                                    <div className="input-group">
                                        <label>Feedback</label>
                                        <input type="text" value={detailData.Feedback} onChange={(e) => setDetailData({...detailData, Feedback: e.target.value})} />
                                    </div>
                                </div>
                            )}
                            
                            <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                                <button type="submit" className="btn-save-all" style={{width: '100%'}} disabled={isSyncing}>
                                    {isSyncing ? "Saving Changes..." : "Update Progress"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE RESUMEN (POP UP OJO) - CORREGIDO PARA LINKS */}
            {summaryData && (
                <div className="modal-overlay" onClick={() => setSummaryData(null)}>
                    <div className="scaffolding-modal" style={{maxWidth: '600px'}} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Summary: {summaryData.Event_Name}</h2>
                            <button className="close-x" onClick={() => setSummaryData(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="snapshot-info" style={{background: 'white', border: 'none', padding: '0', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                <p><strong>Academic Objective:</strong> {renderTextWithLinks(summaryData.Academic_Objective)}</p>
                                <p><strong>Target Vocabulary:</strong> {renderTextWithLinks(summaryData.Target_Vocabulary)}</p>
                                <p><strong>Language Structures:</strong> {renderTextWithLinks(summaryData.Language_Structures)}</p>
                                <p><strong>Interactive Stages:</strong> {renderTextWithLinks(summaryData.Interactive_Stages)}</p>
                                <p><strong>Speaking Challenge:</strong> {renderTextWithLinks(summaryData.Speaking_Challenge)}</p>
                                <p><strong>Evaluation Method:</strong> {summaryData.Evaluation_Method || "Not filled"}</p>
                                <p><strong>Evidence Preview:</strong> {renderTextWithLinks(summaryData.Evidence_Preview)}</p>
                                <p><strong>Resource Links:</strong> {renderTextWithLinks(summaryData.Resource_Links)}</p>
                                <p><strong>Budget Status:</strong> {summaryData.Budget_Status}</p>
                                
                                {(summaryData.Score || summaryData.Feedback) && (
                                    <div style={{marginTop: '15px', padding: '15px', background: '#f8fafc', borderRadius: '8px', borderLeft: '5px solid #2563eb'}}>
                                        <h4 style={{margin: '0 0 10px 0', color: '#2563eb'}}>Admin Evaluation</h4>
                                        {summaryData.Score && <p><strong>Score:</strong> {summaryData.Score}/100</p>}
                                        {summaryData.Feedback && <p><strong>Feedback:</strong> {renderTextWithLinks(summaryData.Feedback)}</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-main" style={{width: '100%'}} onClick={() => setSummaryData(null)}>Close View</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};