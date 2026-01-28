import React, { useState, useEffect } from 'react';
import '../Styles/planning.css';

const API_URL = 'https://script.google.com/macros/s/AKfycbxIgwbIuGymDkRREiidM0lJYZRi5KdKS217_inoU751zp_x3EAzzxcljjNHSxZc34zBxQ/exec';

export const ActivitiesEvents = ({ userData }) => {
    const [activities, setActivities] = useState([]);
    const [allDetails, setAllDetails] = useState([]);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showDetailForm, setShowDetailForm] = useState(false);

    const [detailData, setDetailData] = useState({
        Academic_Objective: "", 
        Target_Vocabulary: "", 
        Language_Structures: "",
        Speaking_Challenge: "", 
        Interactive_Stages: "", 
        Resource_Links: "",
        Evaluation_Method: "", 
        Evidence_Preview: "", 
        Budget_Status: "Pending"
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

    const handleOpenForm = (activity) => {
        setSelectedActivity(activity);
        const existingEntries = allDetails.filter(d => String(d.ID_Activity) === String(activity.ID_Activity));
        const lastEntry = existingEntries.length > 0 ? existingEntries[existingEntries.length - 1] : null;
        
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
                Budget_Status: lastEntry.Budget_Status || "Pending"
            });
        } else {
            setDetailData({
                Academic_Objective: "", Target_Vocabulary: "", Language_Structures: "",
                Speaking_Challenge: "", Interactive_Stages: "", Resource_Links: "",
                Evaluation_Method: "", Evidence_Preview: "", Budget_Status: "Pending"
            });
        }
        setShowDetailForm(true);
    };

    const calculateProgress = (activity) => {
        const existingEntries = allDetails.filter(d => String(d.ID_Activity) === String(activity.ID_Activity));
        const detail = existingEntries.length > 0 ? existingEntries[existingEntries.length - 1] : null;
        
        if (!detail) return 0;
        const relevantFields = [
            'Academic_Objective', 'Target_Vocabulary', 'Language_Structures', 
            'Speaking_Challenge', 'Interactive_Stages', 'Resource_Links', 
            'Evaluation_Method', 'Evidence_Preview'
        ];
        const completedFields = relevantFields.filter(field => detail[field] && detail[field].toString().trim() !== "");
        return Math.min(Math.round((completedFields.length / relevantFields.length) * 100), 100);
    };

    // --- CORRECCIÓN: ASIGNACIÓN INSTANTÁNEA (OPTIMISTIC UI) ---
    const handleAssignMe = async (activity) => {
        const userName = userData.Teacher_Name || userData.Full_Name || userData.name;

        // 1. Actualización Visual Inmediata
        const updatedLocal = activities.map(a => 
            a.ID_Activity === activity.ID_Activity 
            ? { ...a, Responsable_ID: userName, Status: "In Progress" } : a
        );
        setActivities(updatedLocal);
        
        // 2. Iniciar sincronización en segundo plano
        setIsSyncing(true);

        try {
            await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'update',
                    sheet: "Activities_Calendar",
                    rowId: activity.rowId,
                    data: { ...activity, "Responsable_ID": userName, "Status": "In Progress" }
                })
            });
            // No llamamos a fetchActivities() aquí para evitar el parpadeo de recarga
        } catch (e) { 
            console.error(e);
            // Si falla, revertimos para que el usuario sepa que no se guardó
            fetchActivities();
        } finally {
            setIsSyncing(false);
        }
    };

    // --- CORRECCIÓN: GUARDADO INSTANTÁNEO ---
    const handleSaveDetails = async (e) => {
        e.preventDefault();
        
        // 1. Crear el objeto de detalle para actualizar el progreso visualmente de inmediato
        const newDetailEntry = { 
            ...detailData, 
            ID_Activity: selectedActivity.ID_Activity,
            ID_Detail: `DET-${selectedActivity.ID_Activity}`
        };

        // 2. Actualizar estado local instantáneamente
        setAllDetails(prev => [...prev.filter(d => d.ID_Activity !== selectedActivity.ID_Activity), newDetailEntry]);
        
        setIsSyncing(true);
        setShowDetailForm(false);

        const methodAction = detailData.rowId ? 'update' : 'create';

        try {
            await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: methodAction,
                    sheet: "Activity_Details_Form",
                    rowId: detailData.rowId || null,
                    data: newDetailEntry
                })
            });
            // Recargamos detalles en silencio para obtener los rowIds nuevos
            fetchAllDetails(); 
        } catch (e) { 
            console.error(e);
            fetchActivities();
        } finally {
            setIsSyncing(false);
        }
    };

    const getSemaforoLogic = (activity) => {
        const progress = calculateProgress(activity);
        if (!activity.Responsable_ID) return { color: "#ef4444", label: "Unassigned" };
        if (progress < 100) return { color: "#f59e0b", label: `Incomplete (${progress}%)` };
        return { color: "#10b981", label: "Form Completed" };
    };

    return (
        <div className="planning-wrapper">
            <header className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div className="title-section">
                    <h1>Activities & Events</h1>
                    <p>Calendario institucional y diseño pedagógico.</p>
                </div>
                <div className={`sync-indicator ${isSyncing ? 'syncing' : 'synced'}`}>
                    {isSyncing ? "⏳ Syncing with Cloud..." : "✅ Cloud Synchronized"}
                </div>
            </header>

            <div className="activities-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {activities.map((act) => {
                    const statusInfo = getSemaforoLogic(act);
                    const progress = calculateProgress(act);
                    const isMyActivity = act.Responsable_ID === (userData.Teacher_Name || userData.Full_Name || userData.name);

                    return (
                        <div key={act.ID_Activity} className="individual-grade-card" 
                             style={{ 
                                borderLeft: `6px solid ${statusInfo.color}`, 
                                padding: '20px',
                                transition: 'all 0.3s ease' // Para que el cambio de color sea suave
                             }}>
                            <div className="card-tag" style={{ background: statusInfo.color }}>{statusInfo.label}</div>
                            <h3 style={{marginTop: '10px'}}>{act.Event_Name}</h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748b', minHeight: '50px' }}>{act.Description}</p>
                            
                            <div className="activity-meta" style={{ margin: '15px 0', padding: '10px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.9rem' }}>
                                <div><strong>Responsible:</strong> {act.Responsable_ID || "🚫 Unassigned"}</div>
                            </div>

                            <div className="actions">
                                {!act.Responsable_ID ? (
                                    <button className="btn-main" style={{width: '100%'}} onClick={() => handleAssignMe(act)}>
                                        🙋‍♂️ I'll take it
                                    </button>
                                ) : (
                                    isMyActivity && (
                                        <button className="btn-sync" style={{width: '100%', cursor: 'pointer'}} onClick={() => handleOpenForm(act)}>
                                            {progress === 100 ? "✅ Edit Completed Form" : "📝 Continue Design"}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    );
                })}
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
                            
                            <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                                <button type="submit" className="btn-save-all" style={{width: '100%'}} disabled={isSyncing}>
                                    {isSyncing ? "Saving Changes..." : "Update Progress"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};