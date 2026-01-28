import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/dashboard.css"; 

import { PlanningCLIL } from "./PlanningCLIL"; 
import { ActivitiesEvents } from "./ActivitiesEvents";
import { ClassReview } from "./ClassReview"; 

const API_URL = 'https://script.google.com/macros/s/AKfycbxIgwbIuGymDkRREiidM0lJYZRi5KdKS217_inoU751zp_x3EAzzxcljjNHSxZc34zBxQ/exec';

const SHEETS = [
    "Teachers_Users",
    "Activities_Calendar",
    "Lesson_Planners",
    "Class_Observations",
    "Activity_Details_Form",
    "Weekly_Challenges"
];

const CLIL_TIPS = [
    "Use language frames to guide answers.", "Connect content with real-life examples.", "Pre-teach key vocabulary.",
    "Use visuals to support understanding.", "Encourage students to explain ideas aloud.", "Model complete sentences.",
    "Scaffold before expecting independence.", "Recycle language constantly.", "Ask content + language questions.",
    "Highlight key words on the board.", "Allow think time before answering.", "Use pair work to lower anxiety.",
    "Check comprehension frequently.", "Simplify instructions, not content.", "Use gestures and body language.",
    "Encourage students to justify answers.", "Accept mistakes as part of learning.", "Use sentence starters.",
    "Link new content to prior knowledge.", "Repeat instructions in different ways.", "Use graphic organizers.",
    "Promote academic language use.", "Ask students to summarize ideas.", "Use real objects when possible.",
    "Focus on meaning before accuracy.", "Use cooperative learning strategies.", "Provide word banks.",
    "Encourage peer support.", "Use short chunks of information.", "Read instructions aloud.",
    "Encourage students to ask questions.", "Highlight cognates carefully.", "Use color coding for concepts.",
    "Build routines for language use.", "Integrate listening, speaking, reading, and writing.", "Use examples before definitions.",
    "Encourage complete answers.", "Use checklists for tasks.", "Provide models of expected output.",
    "Use charts and diagrams.", "Reinforce key language daily.", "Give feedback on content and language.",
    "Use repetition with variation.", "Encourage clarification requests.", "Use exit tickets for reflection.",
    "Ask students to compare ideas.", "Allow collaborative note-taking.", "Use guiding questions.",
    "Break complex tasks into steps.", "Encourage academic connectors.", "Use visuals before text.",
    "Promote higher-order thinking.", "Rephrase student answers correctly.", "Use rubrics with language criteria.",
    "Encourage use of subject-specific vocabulary.", "Use real-world problems.", "Activate background knowledge first.",
    "Encourage risk-taking in language.", "Use timelines for processes.", "Model pronunciation of key terms.",
    "Use concept maps.", "Encourage short oral explanations.", "Use comparison tables.",
    "Highlight cause and effect language.", "Ask “why” and “how” questions.", "Use consistent classroom language.",
    "Support writing with frames.", "Encourage students to paraphrase.", "Use peer correction carefully.",
    "Integrate micro-presentations.", "Use visuals to check understanding.", "Allow students to rehearse answers.",
    "Encourage subject talk, not single words.", "Use bilingual support strategically.", "Highlight academic verbs.",
    "Use real data when possible.", "Encourage reflective thinking.", "Use step-by-step explanations.",
    "Reinforce language objectives explicitly.", "Connect tasks to learning goals.", "Use sentence expansion activities.",
    "Encourage prediction before content.", "Use guiding posters in class.", "Promote respectful discussion.",
    "Use short formative assessments.", "Encourage use of transition words.", "Make language visible in the classroom.",
    "Use examples from students.", "Encourage self-correction.", "Use structured debates.",
    "Provide wait time after questions.", "Use mini word walls.", "Encourage explanation over memorization.",
    "Use learning objectives clearly.", "Connect language to thinking skills.", "Use reflection journals.",
    "Encourage clarity over speed.", "Celebrate effort in language use.", "Use consistent scaffolding.",
    "Always link language to content."
];

// Metas SMART Definidas para el 2026
const INITIAL_GOALS_2026 = [
    { id: 1, text: "Certificar al 100% de los docentes de inglés (B2/C1).", completed: false },
    { id: 2, text: "Implementar semanalmente el 'Parent Homework' (80% participación).", completed: false },
    { id: 3, text: "Asegurar un Student Talk Time (Speaking) del 60% por clase.", completed: false },
    { id: 4, text: "Realizar 1 simulación mensual de exámenes de certificación.", completed: false },
    { id: 5, text: "Garantizar 2 ejercicios de Listening por semana en cada nivel.", completed: false },
    { id: 6, text: "Producir 1 texto académico corto estructurado por unidad (Writing).", completed: false },
    { id: 7, text: "Lectura de 1 texto informativo relacionado a la materia cada 15 días.", completed: false },
    { id: 8, text: "Lograr que el 90% de estudiantes suban un nivel de Proficiency Goal.", completed: false },
    { id: 9, text: "Realizar 1 Home Challenge mensual de 'Vocabulary Big 5'.", completed: false },
    { id: 10, text: "Mantener un Performance Score promedio sobre 92/100.", completed: false },
    { id: 11, text: "Capacitar a padres en el uso de 5 Language Frames básicos.", completed: false },
    { id: 12, text: "Completar 100% de los Weekly Challenges sin interrupción.", completed: false },
    { id: 13, text: "Integrar 10 términos de lenguaje de examen en el Vocab Bank.", completed: false },
    { id: 14, text: "Actualizar DOFA trimestral enfocado en metas de Certificación.", completed: false },
    { id: 15, text: "Documentar evidencias cualitativas en 100% de retos logrados.", completed: false }
];

export const Dashboard = ({ user: propUser, onLogout }) => {
    const [activeTab, setActiveTab] = useState("profile");
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showVocabModal, setShowVocabModal] = useState(false);
    const [showChallengeModal, setShowChallengeModal] = useState(false);
    const [sessionTip, setSessionTip] = useState("");

    const [excelData, setExcelData] = useState({});
    const [allTeachers, setAllTeachers] = useState([]);
    const [userActivities, setUserActivities] = useState([]);
    const [userChallenges, setUserChallenges] = useState([]); 
    const [vocabularyData, setVocabularyData] = useState([]); 
    const [simpleVocabList, setSimpleVocabList] = useState([]); 
    const [averageScore, setAverageScore] = useState(0);

    // Estado para Metas 2026 (Local Storage)
    const [goals2026, setGoals2026] = useState(() => {
        const saved = localStorage.getItem("bilingual_goals_2026");
        return saved ? JSON.parse(saved) : INITIAL_GOALS_2026;
    });

    const [syncTime, setSyncTime] = useState(0);
    const syncInterval = useRef(null);

    const [challengeForm, setChallengeForm] = useState({
        Challenge_Descriptions: ["", "", "", "", ""],
        Existing_IDs: [null, null, null, null, null],
        Start_Date: new Date().toISOString().split('T')[0],
        Days_Active: "15",
        Status: "non completed",
        Evidence_Note: ""
    });
    
    const navigate = useNavigate();

    // Guardar metas 2026 localmente
    useEffect(() => {
        localStorage.setItem("bilingual_goals_2026", JSON.stringify(goals2026));
    }, [goals2026]);

    const toggleGoal = (id) => {
        setGoals2026(prev => prev.map(g => 
            g.id === id ? { ...g, completed: !g.completed } : g
        ));
    };

    const getActiveChallenges = (challenges) => {
        return challenges.filter(c => {
            if (!c.Start_Date) return false;
            const start = new Date(c.Start_Date);
            const today = new Date();
            const diffDays = (today - start) / (1000 * 60 * 60 * 24);
            return diffDays >= 0 && diffDays <= 15;
        });
    };

    useEffect(() => {
        const savedUser = localStorage.getItem("userBilingual");
        if (!propUser && !savedUser) {
            navigate("/");
        } else {
            const data = propUser || JSON.parse(savedUser);
            setUserData(data);
            setSessionTip(CLIL_TIPS[Math.floor(Math.random() * CLIL_TIPS.length)]);
            fetchAllSheets();
        }
    }, [propUser, navigate]);

    useEffect(() => {
        if (isLoading) {
            setSyncTime(0);
            syncInterval.current = setInterval(() => {
                setSyncTime(prev => prev + 0.1);
            }, 100);
        } else {
            clearInterval(syncInterval.current);
        }
        return () => clearInterval(syncInterval.current);
    }, [isLoading]);

    const fetchAllSheets = async () => {
        setIsLoading(true);
        const result = {};
        try {
            await Promise.all(
                SHEETS.map(async (sheet) => {
                    const resp = await fetch(`${API_URL}?sheet=${sheet}`);
                    const data = await resp.json();
                    result[sheet] = Array.isArray(data) ? data : [];
                })
            );
            setExcelData(result);
        } catch (e) {
            console.error("Error loading Excel sheets:", e);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (!excelData.Teachers_Users || !userData) return;
        const teacherName = userData.Teacher_Name || userData.name;
        const teacherKey = userData.Teacher_Key || teacherName; 

        setAllTeachers(excelData.Teachers_Users);

        const allMyChallenges = (excelData.Weekly_Challenges || []).filter(c => 
            String(c.Teacher_Key) === String(teacherKey) || String(c.Teacher_Key) === String(teacherName)
        );
        setUserChallenges(allMyChallenges);

        const myActs = (excelData.Activities_Calendar || []).filter(a => 
            String(a.Responsable || a.Teacher || a.Responsable_ID || "").trim().toUpperCase() === String(teacherName).trim().toUpperCase()
        );
        setUserActivities(myActs);

        let myPlans = (excelData.Lesson_Planners || []).filter(p => 
            p.Teacher && String(p.Teacher).trim().toUpperCase() === String(teacherName).trim().toUpperCase()
        );
        if (myPlans.length === 0) myPlans = excelData.Lesson_Planners || [];
        setVocabularyData(myPlans);

        const allWords = myPlans
            .map(p => p["Vocabulary Big 5"] || p.Vocabulary_Big_5)
            .filter(Boolean).join(',').split(',').map(v => v.trim()).filter(v => v !== "");
        setSimpleVocabList([...new Set(allWords)]);

        const myObs = (excelData.Class_Observations || []).filter(o => 
            String(o.Teacher_Name || o.Teacher || "").trim().toUpperCase() === String(teacherName).trim().toUpperCase()
        );
        if (myObs.length > 0) {
            const total = myObs.reduce((sum, obs) => sum + (Number(obs.Calculated_Score || obs.Score || 0)), 0);
            setAverageScore((total / myObs.length).toFixed(1));
        }
    }, [excelData, userData]);

    const handleChallengeDescriptionChange = (index, value) => {
        const updated = [...challengeForm.Challenge_Descriptions];
        updated[index] = value;
        setChallengeForm({ ...challengeForm, Challenge_Descriptions: updated });
    };

    const openChallengeModal = () => {
        const activeOnes = getActiveChallenges(userChallenges);
        const prefilledDesc = Array(5).fill("").map((_, i) => activeOnes[i] ? activeOnes[i].Challenge_Description : "");
        const prefilledIds = Array(5).fill(null).map((_, i) => activeOnes[i] ? activeOnes[i].ID_Challenge : null);

        setChallengeForm({
            Challenge_Descriptions: prefilledDesc,
            Existing_IDs: prefilledIds,
            Start_Date: activeOnes.length > 0 ? new Date(activeOnes[0].Start_Date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            Days_Active: "15",
            Status: "non completed",
            Evidence_Note: ""
        });
        setShowChallengeModal(true);
    };

    const handleChallengeSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const teacherIdentifier = userData.Teacher_Name || userData.name;
        try {
            await Promise.all(
                challengeForm.Challenge_Descriptions.map((description, idx) => {
                    if (!description.trim()) return Promise.resolve();
                    const existingId = challengeForm.Existing_IDs[idx];
                    return fetch(API_URL, {
                        method: "POST",
                        body: JSON.stringify({
                            action: existingId ? "update" : "create",
                            sheet: "Weekly_Challenges",
                            idField: "ID_Challenge",
                            idValue: existingId,
                            data: {
                                ID_Challenge: existingId || `CH-${Date.now()}-${idx}`,
                                Teacher_Key: teacherIdentifier, 
                                Challenge_Description: description,
                                Start_Date: challengeForm.Start_Date,
                                Days_Active: challengeForm.Days_Active,
                                Status: challengeForm.Status,
                                Evidence_Note: challengeForm.Evidence_Note
                            }
                        })
                    });
                })
            );
            setShowChallengeModal(false);
            await fetchAllSheets(); 
        } catch (err) { console.error(err); }
        setIsLoading(false);
    };

    const toggleChallengeStatus = async (challenge) => {
        const newStatus = challenge.Status === "completed" ? "non completed" : "completed";
        const updatedChallenges = userChallenges.map(c => 
            c.ID_Challenge === challenge.ID_Challenge ? { ...c, Status: newStatus } : c
        );
        setUserChallenges(updatedChallenges);
        setIsLoading(true);
        try {
            await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ 
                    action: 'update', sheet: "Weekly_Challenges", 
                    idField: "ID_Challenge", idValue: challenge.ID_Challenge,
                    data: { Status: newStatus } 
                })
            });
        } catch (e) { console.error(e); await fetchAllSheets(); }
        setIsLoading(false);
    };

    const getSemaforoLogic = (activity) => {
        const hasDetails = (excelData.Activity_Details_Form || []).some(detail => 
            String(detail.ID_Activity) === String(activity.ID_Activity)
        );
        if (!activity.Responsable_ID && !activity.Responsable) return { color: "#ef4444", label: "Unassigned" };
        if (!hasDetails) return { color: "#f59e0b", label: "Pending Form" };
        return { color: "#10b981", label: "Form Completed" };
    };

    const handleLogoutAction = () => {
        localStorage.removeItem("userBilingual");
        if (onLogout) onLogout();
        navigate("/");
    };

    if (!userData) return <div className="global-loader">Syncing Dashboard...</div>;

    const renderContent = () => {
        switch (activeTab) {
            case "profile":
                return (
                    <div className="content-grid">
                        <div className="info-card score-card">
                            <h3>Performance Score</h3>
                            <div className="score-main">
                                <span className="score-val">{averageScore}</span>
                                <span className="score-max">/ 100</span>
                            </div>
                            <p className="score-desc">Classroom Observations Average</p>
                        </div>

                        <div className="info-card status-card">
                            <h3>Bilingual Status</h3>
                            <p style={{textAlign: 'left', marginBottom: '10px'}}><strong>Role:</strong> {userData.ROL}</p>
                            <div className="clil-tip-container">
                                <div className="clil-tip-header"><span>💡</span> CLIL Tip of the Day</div>
                                <p className="clil-tip-text">"{sessionTip}"</p>
                            </div>
                        </div>

                        <div className="info-card">
                            <h3>My Responsibilities</h3>
                            <div className="mini-activity-list">
                                {userActivities.length > 0 ? userActivities.slice(0, 3).map((act, i) => (
                                    <div key={i} className="mini-act-row">
                                        <div className="act-info">
                                            <strong>{act.Event_Name || "Activity"}</strong>
                                            <span className="semaforo-status" style={{color: getSemaforoLogic(act).color, fontSize: '0.75rem', display: 'block'}}>● {getSemaforoLogic(act).label}</span>
                                        </div>
                                    </div>
                                )) : <p className="empty-msg">No activities found.</p>}
                            </div>
                            <button className="btn-link" onClick={() => setActiveTab("activities")}>Fill Forms →</button>
                        </div>

                        <div className="info-card">
                            <h3>Weekly Challenges</h3>
                            <div className="mini-activity-list">
                                {getActiveChallenges(userChallenges).length > 0 ? getActiveChallenges(userChallenges).map((ch, i) => (
                                    <div key={i} className="mini-act-row">
                                        <div className="act-info">
                                            <strong style={{textDecoration: ch.Status === 'completed' ? 'line-through' : 'none', fontSize: '0.85rem', color: ch.Status === 'completed' ? '#999' : 'inherit'}}>
                                                {ch.Challenge_Description}
                                            </strong>
                                        </div>
                                        <button className={`check-status-btn ${ch.Status === 'completed' ? 'completed' : ''}`} onClick={() => toggleChallengeStatus(ch)} style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem'}}>
                                            {ch.Status === 'completed' ? '✅' : '⭕'}
                                        </button>
                                    </div>
                                )) : <p className="empty-msg">No active challenges (15-day cycle).</p>}
                            </div>
                            <button className="btn-link" onClick={openChallengeModal}>{getActiveChallenges(userChallenges).length > 0 ? "✎ Edit Challenges" : "+ Log 5 Challenges"}</button>
                        </div>

                        <div className="info-card">
                            <h3>Vocabulary Big 5</h3>
                            <div className="vocab-cloud">
                                {simpleVocabList.slice(0, 10).map((v, i) => <span key={i} className="tag-v">{v}</span>)}
                            </div>
                            <button className="btn-link" onClick={() => setShowVocabModal(true)}>View All</button>
                        </div>

                        <div className="info-card">
                            <h3>Bilingual Tools</h3>
                            <div className="tool-links-grid">
                                <a href="https://taupe-sprinkles-8a613b.netlify.app/" target="_blank" rel="noreferrer" className="tool-box">📊 My DOFA</a>
                                <a href="https://playful-moxie-a7b0d0.netlify.app/" target="_blank" rel="noreferrer" className="tool-box">📈 Proficiency</a>
                            </div>
                        </div>

                        <div className="info-card wide-card">
                            <h3>Expected Proficiency Goals</h3>
                            <div className="goals-container-modern">
                                <div className="goal-block"><strong>Elementary:</strong><p>1°-2°: A1 | 3°-5°: A2</p></div>
                                <div className="goal-block"><strong>High School:</strong><p>6°-8°: B1 | 9°-11°: B2</p></div>
                            </div>
                        </div>

                        {/* NUEVA CARD: METAS SMART 2026 */}
                        <div className="info-card wide-card">
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                                <h3>🚀 Roadmap: Certificación 2026</h3>
                                <span style={{fontSize:'0.75rem', fontWeight:'bold', color:'white', background:'#ab0505', padding:'5px 12px', borderRadius:'15px'}}>
                                    {goals2026.filter(g => g.completed).length} / 15 Logradas
                                </span>
                            </div>

                            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'20px'}}>
                                {/* Columna Pendientes */}
                                <div>
                                    <p style={{fontSize:'0.7rem', fontWeight:'bold', color:'#64748b', textTransform:'uppercase', marginBottom:'8px'}}>Por Cumplir</p>
                                    <div className="batch-scroll-area" style={{maxHeight:'220px', margin:0, background:'#f8fafc', padding:'10px', borderRadius:'10px'}}>
                                        {goals2026.filter(g => !g.completed).map(goal => (
                                            <div key={goal.id} className="mini-act-row" style={{background:'white', border:'1px solid #e2e8f0', marginBottom:'8px', padding:'10px'}}>
                                                <span style={{fontSize:'0.85rem', flex:1, lineHeight:'1.2'}}>{goal.text}</span>
                                                <button onClick={() => toggleGoal(goal.id)} style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.1rem'}}>⭕</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Columna Completadas */}
                                <div>
                                    <p style={{fontSize:'0.7rem', fontWeight:'bold', color:'#10b981', textTransform:'uppercase', marginBottom:'8px'}}>Logros Alcanzados</p>
                                    <div className="batch-scroll-area" style={{maxHeight:'220px', margin:0, background:'#f0fdf4', padding:'10px', borderRadius:'10px'}}>
                                        {goals2026.filter(g => g.completed).length > 0 ? (
                                            goals2026.filter(g => g.completed).map(goal => (
                                                <div key={goal.id} className="mini-act-row" style={{background:'white', border:'1px solid #bbf7d0', marginBottom:'8px', padding:'10px'}}>
                                                    <span style={{fontSize:'0.85rem', flex:1, color:'#16a34a', textDecoration:'line-through'}}>{goal.text}</span>
                                                    <button onClick={() => toggleGoal(goal.id)} style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.1rem'}}>✅</button>
                                                </div>
                                            ))
                                        ) : (
                                            <p style={{fontSize:'0.8rem', color:'#94a3b8', textAlign:'center', marginTop:'20px'}}>Aún no hay metas marcadas como logradas.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case "planning": return <PlanningCLIL userData={userData} />;
            case "activities": return <ActivitiesEvents userData={userData} />;
            case "revision": return <ClassReview userData={userData} teacherList={allTeachers} />;
            default: return null;
        }
    };

    return (
        <div className="dashboard-container">
            <aside className="sidebar">
                <div className="sidebar-profile">
                    <div className="avatar-circle">{userData.Teacher_Name?.charAt(0)}</div>
                    <h3>{userData.Teacher_Name}</h3>
                    <p className="role-badge">{userData.ROL}</p>
                </div>
                <nav className="sidebar-menu">
                    <button className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>👤 Profile</button>
                    <button className={activeTab === "planning" ? "active" : ""} onClick={() => setActiveTab("planning")}>📝 Planning</button>
                    <button className={activeTab === "activities" ? "active" : ""} onClick={() => setActiveTab("activities")}>📅 Activities</button>
                    {userData.ROL === "Admin" && (
                        <button className={activeTab === "revision" ? "active" : ""} onClick={() => setActiveTab("revision")}>🔍 Revision</button>
                    )}
                    <button className="logout-btn-side" onClick={handleLogoutAction} style={{marginTop: 'auto'}}>🚪 Logout</button>
                </nav>
            </aside>

            <main className="main-content">
                <header className="main-header">
                    <div className="header-left">
                        <h2>{activeTab.toUpperCase()}</h2>
                        <div className="sync-container">
                            <p className={`sync-status ${isLoading ? 'loading' : ''}`}>
                                {isLoading ? `⏳ Sincronizando: ${syncTime.toFixed(1)}s` : "✅ Cloud Updated"}
                            </p>
                        </div>
                    </div>
                </header>
                <section className="dynamic-section">{renderContent()}</section>
            </main>

            {showChallengeModal && (
                <div className="modal-overlay" onClick={() => setShowChallengeModal(false)}>
                    <div className="batch-challenge-window" onClick={e => e.stopPropagation()}>
                        <div className="batch-header">
                            <h2>🚀 Weekly Challenges Cycle</h2>
                            <button className="batch-close" onClick={() => setShowChallengeModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleChallengeSubmit} className="batch-form">
                            <div className="batch-teacher-name-box">
                                <label style={{display:'block', fontSize:'0.7rem', color:'#64748b', fontWeight:'800'}}>TEACHER</label>
                                <span>{userData.Teacher_Name || userData.name}</span>
                            </div>
                            <label className="batch-label-group">Manage your 5 active challenges</label>
                            <div className="batch-scroll-area">
                                {challengeForm.Challenge_Descriptions.map((desc, index) => (
                                    <div key={index} style={{position:'relative'}}>
                                        <textarea value={desc} onChange={e => handleChallengeDescriptionChange(index, e.target.value)} placeholder={`Challenge ${index + 1}`} className="batch-textarea" />
                                        {challengeForm.Existing_IDs[index] && <span style={{position:'absolute', right:'15px', top:'5px', fontSize:'0.65rem', color:'#10b981', fontWeight:'800'}}>✓ SAVED</span>}
                                    </div>
                                ))}
                            </div>
                            <div className="batch-row-grid">
                                <div className="batch-field"><label>Start Date</label><input type="date" className="batch-input" value={challengeForm.Start_Date} onChange={e => setChallengeForm({...challengeForm, Start_Date: e.target.value})} /></div>
                                <div className="batch-field"><label>Days Active</label><input type="number" className="batch-input" value={challengeForm.Days_Active} readOnly /></div>
                            </div>
                            <button type="submit" className="batch-submit-btn" disabled={isLoading}>{isLoading ? "Syncing..." : "Update & Save All Challenges"}</button>
                        </form>
                    </div>
                </div>
            )}

            {showVocabModal && (
                <div className="modal-overlay" onClick={() => setShowVocabModal(false)}>
                    <div className="vocab-v2-window" onClick={e => e.stopPropagation()}>
                        <div className="vocab-v2-header">
                            <h2>📚 Vocabulary Bank</h2>
                            <button className="vocab-v2-close" onClick={() => setShowVocabModal(false)}>×</button>
                        </div>
                        <div className="vocab-v2-grid">
                            {vocabularyData.map((plan, idx) => (
                                <div key={idx} className="vocab-v2-card">
                                    <div className="vocab-v2-tags"><span className="v2-tag-grade">{plan.Grade}</span><span className="v2-tag-sub">{plan.Subject}</span></div>
                                    <h4 style={{margin: '10px 0'}}>{plan.Topic}</h4>
                                    <div className="v2-word-wrap">{String(plan["Vocabulary Big 5"] || "").split(',').map((w, i) => w.trim() && <span key={i} className="v2-word-chip">{w.trim()}</span>)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};