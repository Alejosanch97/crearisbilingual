import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/dashboard.css"; 
import { LayoutDashboard, NotebookPen, CalendarDays, Search, LogOut, ChevronRight, RefreshCw, Target, ClipboardList, Trophy, Link2, BookOpen, Wrench, GraduationCap, ArrowRight, Plus, Check, Circle } from 'lucide-react';

import { PlanningCLIL } from "./PlanningCLIL"; 
import { ActivitiesEvents } from "./ActivitiesEvents";
import { ClassReview } from "./ClassReview"; 
import { LumiCard } from './LumiCard';

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
];

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
    const [showResourceModal, setShowResourceModal] = useState(false); // <--- Modal nuevo
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
    const [sessionTip, setSessionTip] = useState("");

    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [taskForm, setTaskForm] = useState({
        Challenge_Description: "",
        Days_Active: "normal",     // normal | urgente
        Status: "pending",         // pending | in_progress | completed
        Evidence_Note: "",
        Start_Date: ""
    });

    const [isSyncingTask, setIsSyncingTask] = useState(false);

    const [excelData, setExcelData] = useState({});
    const [allTeachers, setAllTeachers] = useState([]);
    const [userActivities, setUserActivities] = useState([]);
    const [allActivities, setAllActivities] = useState([]);
    const [userChallenges, setUserChallenges] = useState([]); 
    const [vocabularyData, setVocabularyData] = useState([]); 
    const [simpleVocabList, setSimpleVocabList] = useState([]); 
    const [averageScore, setAverageScore] = useState(0);

    const [resourceLink, setResourceLink] = useState(""); // Estado para el input de link

    const [goals2026, setGoals2026] = useState(() => {
        const saved = localStorage.getItem("bilingual_goals_2026");
        return saved ? JSON.parse(saved) : INITIAL_GOALS_2026;
    });

    const [syncTime, setSyncTime] = useState(0);
    const syncInterval = useRef(null);

    const [confirmState, setConfirmState] = useState(null);
    const [toast, setToast] = useState(null);

    /* Confirmación con promesa (reemplaza window.confirm) */
    const confirmDialog = ({ title, message, confirmText = "Confirmar", danger = false }) =>
        new Promise(resolve => {
            setConfirmState({ title, message, confirmText, danger, resolve });
        });

    const closeConfirm = (value) => {
        if (confirmState?.resolve) confirmState.resolve(value);
        setConfirmState(null);
    };

    /* Toast temporal */
    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3200);
    };

    const [challengeForm, setChallengeForm] = useState({
        Challenge_Descriptions: ["", "", "", "", ""],
        Existing_IDs: [null, null, null, null, null],
        Start_Date: new Date().toISOString().split('T')[0],
        Days_Active: "15",
        Status: "non completed",
        Evidence_Note: ""
    });
    
    const navigate = useNavigate();

    useEffect(() => {
        localStorage.setItem("bilingual_goals_2026", JSON.stringify(goals2026));
    }, [goals2026]);

    const toggleGoal = (id) => {
        setGoals2026(prev => prev.map(g => 
            g.id === id ? { ...g, completed: !g.completed } : g
        ));
    };

    const getActiveChallenges = (challenges) => {
        return (challenges || []).filter(c => {
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

    // 1. CORRECCIÓN DE LÓGICA DE PROGRESO (Semáforo)
    const calculateProgress = (activity) => {
        const details = excelData.Activity_Details_Form || [];
        // Buscamos el detalle que coincida con el ID de la actividad
        const detail = details.find(d => String(d.ID_Activity) === String(activity.ID_Activity));

        if (!detail) return 0;

        // Lista de campos exactos de tu tabla Activity_Details_Form
        const relevantFields = [
            'Academic_Objective',
            'Target_Vocabulary',
            'Language_Structures',
            'Speaking_Challenge',
            'Interactive_Stages',
            'Resource_Links',
            'Evaluation_Method',
            'Evidence_Preview'
        ];

        // Contamos cuántos de estos campos tienen contenido real
        const completedFields = relevantFields.filter(field => {
            const value = detail[field];
            return value && value.toString().trim() !== "" && value.toString().toLowerCase() !== "null";
        });

        // Calculamos el porcentaje
        const progress = Math.round((completedFields.length / relevantFields.length) * 100);
        return Math.min(progress, 100);
    };

    const getSemaforoLogic = (activity) => {
        const progress = calculateProgress(activity);
        if (!activity.Responsable_ID && !activity.Responsable) return { color: "#ef4444", label: "Unassigned" };
        if (progress < 100) return { color: "#f59e0b", label: `Incomplete (${progress}%)` };
        return { color: "#10b981", label: "Form Completed" };
    };

    useEffect(() => {
        if (!excelData.Teachers_Users || !userData) return;

        // Identificadores del usuario (usamos el User_Key para mayor precisión)
        const teacherName = (userData.Teacher_Name || userData.name || "").trim();
        const teacherKey = (userData.User_Key || userData.Teacher_Key || teacherName).trim();

        setAllTeachers(excelData.Teachers_Users);

        // Filtro Weekly Challenges (Usa Teacher_Key)
        const allMyChallenges = (excelData.Weekly_Challenges || []).filter(c =>
            String(c.Teacher_Key).trim() === teacherKey || String(c.Teacher_Key).trim() === teacherName
        );
        setUserChallenges(allMyChallenges);

        

        setAllActivities(excelData.Activities_Calendar || []);
        const myActs = (excelData.Activities_Calendar || []).filter(a =>
            String(a.Responsable_ID || a.Responsable || "").trim().toUpperCase() === teacherName.toUpperCase()
        );
        setUserActivities(myActs);

        // --- CORRECCIÓN VOCABULARY BIG 5 ---
        // Filtramos SOLO por la columna "Teacher" comparando con tu identificador
        // Eliminamos el "if (myPlans.length === 0)" para que no se filtre a otros profesores
        const myPlans = (excelData.Lesson_Planners || []).filter(p => {
            const planTeacher = String(p.Teacher || "").trim();
            return planTeacher === teacherKey || planTeacher === teacherName;
        });

        setVocabularyData(myPlans);

        // Generar nube de vocabulario solo con TUS datos
        const allWords = myPlans
            .map(p => p["Vocabulary Big 5"] || p.Vocabulary_Big_5)
            .filter(Boolean)
            .join(',')
            .split(',')
            .map(v => v.trim())
            .filter(v => v !== "");

        setSimpleVocabList([...new Set(allWords)]);

        // Filtro Observaciones
        const myObs = (excelData.Class_Observations || []).filter(o =>
            String(o.Teacher_Name || o.Teacher || "").trim().toUpperCase() === teacherName.toUpperCase()
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

    // Función para agregar Recursos Talleres al primer reto activo
    const handleAddResource = async () => {
        const link = resourceLink.trim();
        if (!link) return;

        const teacherIdentifier = userData.Teacher_Name || userData.name;
        const rowId = `RES-${Date.now()}`;

        const payload = {
            ID_Challenge: rowId,
            Teacher_Key: teacherIdentifier,
            Challenge_Description: "",
            Start_Date: "",
            Days_Active: "",
            Status: "resource",
            Evidence_Note: "",
            Bilingual_Resources: link
        };

        // Pinta al instante
        setUserChallenges(prev => [...prev, payload]);
        setResourceLink("");
        setShowResourceModal(false);

        try {
            await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({
                    action: "create",
                    sheet: "Weekly_Challenges",
                    idField: "ID_Challenge",
                    idValue: null,
                    data: payload
                })
            });
        } catch (err) { console.error(err); }
    };

    const removeResource = async (resource) => {
        const ok = await confirmDialog({
            title: "Eliminar recurso",
            message: "Este enlace se quitará de tu biblioteca.",
            confirmText: "Eliminar",
            danger: true
        });
        if (!ok) return;

        const backup = userChallenges;
        setUserChallenges(prev => prev.filter(c => c.ID_Challenge !== resource.ID_Challenge));
        try {
            const resp = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({
                    action: "delete",
                    sheet: "Weekly_Challenges",
                    idField: "ID_Challenge",
                    idValue: resource.ID_Challenge
                })
            });
            const result = await resp.json();
            if (result.status !== 'success') throw new Error(result.message);
        } catch (err) {
            console.error(err);
            setUserChallenges(backup);
            showToast("No se pudo eliminar el recurso.", "error");
        }
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

    /* ================= AGENDA DE TAREAS ================= */
    const myTasks = [...userChallenges]
        .filter(t => t.Challenge_Description && t.Status !== 'resource')
        .sort((a, b) => {
            const done = (x) => x.Status === 'completed' ? 1 : 0;
            if (done(a) !== done(b)) return done(a) - done(b);
            const urg = (x) => x.Days_Active === 'urgente' ? 0 : 1;
            return urg(a) - urg(b);
        });

    const myResources = userChallenges.filter(c =>
        c.Status === 'resource' && c.Bilingual_Resources
    );

    const pendingTasks = myTasks.filter(t => t.Status !== 'completed');

    const openNewTask = () => {
        setEditingTask(null);
        setTaskForm({
            Challenge_Description: "",
            Days_Active: "normal",
            Status: "pending",
            Evidence_Note: "",
            Start_Date: new Date().toISOString().split('T')[0]
        });
        setShowTaskModal(true);
    };

    const openEditTask = (task) => {
        setEditingTask(task);
        setTaskForm({
            Challenge_Description: task.Challenge_Description || "",
            Days_Active: task.Days_Active || "normal",
            Status: task.Status || "pending",
            Evidence_Note: task.Evidence_Note || "",
            Start_Date: task.Start_Date || new Date().toISOString().split('T')[0]
        });
        setShowTaskModal(true);
    };

    const handleTaskSubmit = async (e) => {
        e.preventDefault();
        if (!taskForm.Challenge_Description.trim()) return;

        const teacherIdentifier = userData.Teacher_Name || userData.name;
        const existingId = editingTask ? editingTask.ID_Challenge : null;
        const id = existingId || `TK-${Date.now()}`;

        const payload = {
            ID_Challenge: id,
            Teacher_Key: teacherIdentifier,
            Challenge_Description: taskForm.Challenge_Description.trim(),
            Start_Date: taskForm.Start_Date,
            Days_Active: taskForm.Days_Active,
            Status: taskForm.Status,
            Evidence_Note: taskForm.Evidence_Note
        };

        // 1) Pintar YA en pantalla y cerrar el modal
        setUserChallenges(prev => existingId
            ? prev.map(t => t.ID_Challenge === id ? { ...t, ...payload } : t)
            : [...prev, { ...payload, _pending: true }]
        );
        setShowTaskModal(false);
        setEditingTask(null);

        // 2) Sincronizar en segundo plano
        setIsSyncingTask(true);
        try {
            await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({
                    action: existingId ? "update" : "create",
                    sheet: "Weekly_Challenges",
                    idField: "ID_Challenge",
                    idValue: existingId,
                    data: payload
                })
            });
            // Marca como sincronizada
            setUserChallenges(prev => prev.map(t =>
                t.ID_Challenge === id ? { ...t, _pending: false } : t
            ));
        } catch (err) {
            console.error("Error guardando tarea:", err);
            setUserChallenges(prev => prev.map(t =>
                t.ID_Challenge === id ? { ...t, _error: true, _pending: false } : t
            ));
        }
        setIsSyncingTask(false);
    };

    const cycleTaskStatus = async (task) => {
        const order = ['pending', 'in_progress', 'completed'];
        const current = task.Status || 'pending';
        const newStatus = order[(order.indexOf(current) + 1) % order.length];
        setUserChallenges(prev => prev.map(c =>
            c.ID_Challenge === task.ID_Challenge ? { ...c, Status: newStatus } : c
        ));
        setIsSyncingTask(true);
        try {
            await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({
                    action: "update",
                    sheet: "Weekly_Challenges",
                    idField: "ID_Challenge",
                    idValue: task.ID_Challenge,
                    data: { Status: newStatus }
                })
            });
        } catch (err) { console.error(err); }
        setIsSyncingTask(false);
    };

    const deleteTask = async (task) => {
        const ok = await confirmDialog({
            title: "Eliminar tarea",
            message: `"${task.Challenge_Description}" se eliminará de tu agenda.`,
            confirmText: "Eliminar",
            danger: true
        });
        if (!ok) return;

        const backup = userChallenges;
        setUserChallenges(prev => prev.filter(c => c.ID_Challenge !== task.ID_Challenge));
        setIsSyncingTask(true);
        try {
            const resp = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({
                    action: "delete",
                    sheet: "Weekly_Challenges",
                    idField: "ID_Challenge",
                    idValue: task.ID_Challenge
                })
            });
            const result = await resp.json();
            if (result.status !== 'success') throw new Error(result.message);
        } catch (err) {
            console.error("Error eliminando:", err);
            setUserChallenges(backup);   // revierte si falla
            showToast("No se pudo eliminar. Intenta de nuevo.", "error");
        }
        setIsSyncingTask(false);
    };

    const toggleChallengeStatus = async (challenge) => {
        const newStatus = challenge.Status === "completed" ? "non completed" : "completed";
        const updatedChallenges = userChallenges.map(c => c.ID_Challenge === challenge.ID_Challenge ? { ...c, Status: newStatus } : c);
        setUserChallenges(updatedChallenges);
        setIsLoading(true);
        try {
            await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'update', sheet: "Weekly_Challenges", idField: "ID_Challenge", idValue: challenge.ID_Challenge, data: { Status: newStatus } })
            });
        } catch (e) { console.error(e); await fetchAllSheets(); }
        setIsLoading(false);
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
                const activeChallenges = getActiveChallenges(userChallenges);
                return (
                    <div className="profile-layout">

                        {/* ===== LUMI a ancho completo ===== */}
                        <LumiCard
                            userData={userData}
                            stats={{
                                pendingTasks: pendingTasks.length,
                                totalTasks: myTasks.length,
                                urgentTasks: myTasks.filter(t => t.Days_Active === 'urgente' && t.Status !== 'completed').length,
                                unassignedActivities: allActivities.filter(a =>
                                    !String(a.Responsable_ID || a.Responsable || "").trim()
                                ).length,
                                myActivities: userActivities.length,
                                resources: myResources.length,
                            }}
                        />

                        {/* ===== Fila de métricas ===== */}
                        <div className="metrics-row">
                            <div className="metric-card primary">
                                <div className="metric-icon"><Target size={20} strokeWidth={2} /></div>
                                <div className="metric-body">
                                    <span className="metric-label">Performance Score</span>
                                    <div className="metric-value">
                                        <strong>{averageScore}</strong>
                                        <em>/ 100</em>
                                    </div>
                                    <span className="metric-desc">Classroom Observations</span>
                                </div>
                            </div>

                            <div className="metric-card">
                                <div className="metric-icon"><ClipboardList size={20} strokeWidth={2} /></div>
                                <div className="metric-body">
                                    <span className="metric-label">Actividades</span>
                                    <div className="metric-value"><strong>{userActivities.length}</strong></div>
                                    <span className="metric-desc">asignadas a ti</span>
                                </div>
                            </div>

                            <div className="metric-card">
                                <div className="metric-icon"><ClipboardList size={20} strokeWidth={2} /></div>
                                <div className="metric-body">
                                    <span className="metric-label">Tareas pendientes</span>
                                    <div className="metric-value"><strong>{pendingTasks.length}</strong></div>
                                    <span className="metric-desc">de {myTasks.length} en tu agenda</span>
                                </div>
                            </div>

                            <div className="metric-card">
                                <div className="metric-icon"><BookOpen size={20} strokeWidth={2} /></div>
                                <div className="metric-body">
                                    <span className="metric-label">Vocabulario</span>
                                    <div className="metric-value"><strong>{simpleVocabList.length}</strong></div>
                                    <span className="metric-desc">palabras registradas</span>
                                </div>
                            </div>
                        </div>

                        {/* ===== Panel principal: dos columnas ===== */}
                        <div className="panel-grid">

                            {/* Responsabilidades */}
                            <section className="panel">
                                <div className="panel-head">
                                    <h3><ClipboardList size={16} strokeWidth={2.2} /> Mis responsabilidades</h3>
                                    <button className="panel-action" onClick={() => setActiveTab("activities")}>
                                        Ver todas <ArrowRight size={14} strokeWidth={2.4} />
                                    </button>
                                </div>
                                <div className="panel-body">
                                    {userActivities.length > 0 ? userActivities.slice(0, 3).map((act, i) => {
                                        const status = getSemaforoLogic(act);
                                        const startDate = act.Start ? new Date(act.Start).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : "—";
                                        const deadlineDate = act.Deadline ? new Date(act.Deadline).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : "Sin fecha";
                                        return (
                                            <div key={i} className="task-row">
                                                <span className="task-dot" style={{ background: status.color }} />
                                                <div className="task-info">
                                                    <strong>{act.Event_Name || "Actividad"}</strong>
                                                    <div className="task-meta">
                                                        <span>{startDate} → {deadlineDate}</span>
                                                        <span className="task-status" style={{ color: status.color }}>{status.label}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }) : <p className="panel-empty">No tienes actividades asignadas.</p>}
                                </div>
                            </section>

                            {/* Retos */}
                            <section className="panel">
                               <div className="panel-head">
                                    <h3>
                                        <ClipboardList size={16} strokeWidth={2.2} /> Mi agenda
                                        {isSyncingTask && <span className="agenda-sync"><RefreshCw size={12} strokeWidth={2.5} /> guardando</span>}
                                    </h3>
                                    <button className="panel-action" onClick={openNewTask}>
                                        Nueva tarea <Plus size={14} strokeWidth={2.4} />
                                    </button>
                                </div>
                                <div className="panel-body">
                                    {myTasks.length > 0 ? (
                                        <div className="agenda-list">
                                            {myTasks.map((task, i) => (
                                                <div key={task.ID_Challenge || i} className={`agenda-item ${task.Status === 'completed' ? 'done' : ''} ${task.Days_Active === 'urgente' ? 'urgent' : ''} ${task._pending ? 'syncing' : ''} ${task._error ? 'failed' : ''}`}>
                                                    <button
                                                        className={`agenda-check ${task.Status || 'pending'}`}
                                                        onClick={() => cycleTaskStatus(task)}
                                                        title="Cambiar estado"
                                                    >
                                                        {task.Status === 'completed' && <Check size={13} strokeWidth={3} />}
                                                        {task.Status === 'in_progress' && <span className="agenda-half" />}
                                                        {(!task.Status || task.Status === 'pending') && <Circle size={13} strokeWidth={2} />}
                                                    </button>

                                                    <div className="agenda-body" onClick={() => openEditTask(task)}>
                                                        <div className="agenda-top">
                                                            <span className="agenda-text">{task.Challenge_Description}</span>
                                                            {task.Days_Active === 'urgente' && <span className="agenda-flag">Urgente</span>}
                                                        </div>
                                                        {task.Evidence_Note && <p className="agenda-note">{task.Evidence_Note}</p>}
                                                        {task.Start_Date && (
                                                            <span className="agenda-date">
                                                                <CalendarDays size={11} strokeWidth={2.2} />
                                                                {new Date(task.Start_Date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <button className="agenda-del" onClick={() => deleteTask(task)} title="Eliminar">×</button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="panel-empty">Tu agenda está vacía. Crea tu primera tarea.</p>
                                    )}
                                </div>
                            </section>

                            {/* Vocabulario */}
                            <section className="panel">
                                <div className="panel-head">
                                    <h3><BookOpen size={16} strokeWidth={2.2} /> Vocabulary Big 5</h3>
                                    <button className="panel-action" onClick={() => setShowVocabModal(true)}>
                                        Ver todo <ArrowRight size={14} strokeWidth={2.4} />
                                    </button>
                                </div>
                                <div className="panel-body">
                                    {simpleVocabList.length > 0 ? (
                                        <div className="vocab-chips">
                                            {simpleVocabList.slice(-8).map((v, i) => (
                                                <span key={i} className="vocab-chip">{v}</span>
                                            ))}
                                        </div>
                                    ) : <p className="panel-empty">Sin vocabulario registrado.</p>}
                                </div>
                            </section>

                            {/* Recursos */}
                            <section className="panel">
                                <div className="panel-head">
                                    <h3><Link2 size={16} strokeWidth={2.2} /> Mis recursos</h3>
                                    <button className="panel-action" onClick={() => setShowResourceModal(true)}>
                                        Agregar <Plus size={14} strokeWidth={2.4} />
                                    </button>
                                </div>
                                <div className="panel-body">
                                    {myResources.length > 0 ? (
                                        <div className="res-list">
                                            {myResources.map((res, idx) => {
                                                const link = res.Bilingual_Resources;
                                                let host = link;
                                                try { host = new URL(link).hostname.replace('www.', ''); } catch {}
                                                return (
                                                    <div key={res.ID_Challenge || idx} className="res-item">
                                                        <a href={link} target="_blank" rel="noreferrer" className="res-link">
                                                            <span className="res-favicon">
                                                                <Link2 size={13} strokeWidth={2.4} />
                                                            </span>
                                                            <span className="res-host">{host}</span>
                                                        </a>
                                                        <button className="res-del" onClick={() => removeResource(res)} title="Eliminar">×</button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="panel-empty">Guarda aquí los enlaces que usas siempre.</p>
                                    )}
                                </div>
                            </section>

                            {/* Herramientas — ancho completo */}
                           <section className="panel wide">
                                <div className="panel-head">
                                    <h3><Wrench size={16} strokeWidth={2.2} /> Herramientas</h3>
                                </div>
                                <div className="panel-body">
                                    <div className="tools-grid">
                                        <a href="https://taupe-sprinkles-8a613b.netlify.app/" target="_blank" rel="noreferrer" className="tool-card">
                                            <span className="tool-icon dofa"><Target size={22} strokeWidth={2} /></span>
                                            <strong>My DOFA</strong>
                                        </a>
                                        <a href="https://drive.google.com/drive/folders/1Q6RLxnkbYsU4JdYXx32GErmVLsF6QJ1x?usp=sharing" target="_blank" rel="noreferrer" className="tool-card">
                                            <span className="tool-icon maps"><GraduationCap size={22} strokeWidth={2} /></span>
                                            <strong>Curriculum Maps</strong>
                                        </a>
                                        <a href="https://docs.google.com/document/d/1gg2fdgI7m43YX3uhzhTRzu1ObnKTYJsS/edit" target="_blank" rel="noreferrer" className="tool-card">
                                            <span className="tool-icon actas"><ClipboardList size={22} strokeWidth={2} /></span>
                                            <strong>Actas</strong>
                                        </a>
                                        <a href="https://drive.google.com/drive/folders/1KWU4jClPFqUIA6nuOizHMMW1AVt7S__l?usp=drive_link" target="_blank" rel="noreferrer" className="tool-card">
                                            <span className="tool-icon plan"><BookOpen size={22} strokeWidth={2} /></span>
                                            <strong>Area Plan</strong>
                                        </a>
                                    </div>
                                </div>
                            </section>

                            {/* Metas — ancho completo */}
                            <section className="panel wide">
                                <div className="panel-head">
                                    <h3><GraduationCap size={16} strokeWidth={2.2} /> Metas de proficiencia</h3>
                                </div>
                                <div className="panel-body">
                                    <div className="goals-grid">
                                        <div className="goal-item">
                                            <span className="goal-tag">Elementary</span>
                                            <p><strong>1°-2°</strong> A1 · <strong>3°-5°</strong> A2</p>
                                        </div>
                                        <div className="goal-item">
                                            <span className="goal-tag">High School</span>
                                            <p><strong>6°-8°</strong> B1 · <strong>9°-11°</strong> B2</p>
                                        </div>
                                    </div>
                                </div>
                            </section>
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
        <div className={`dashboard-container ${isMobileMenuOpen ? "mobile-menu-active" : ""}`}>
            
            <button className="hamburger-menu" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? "✕" : "☰"}
            </button>

            {isMobileMenuOpen && <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>}

            <aside className={`lumi-sidebar ${isMobileMenuOpen ? "open" : ""}`}>
                <div className="ls-brand">
                    <div className="ls-avatar">{userData.Teacher_Name?.charAt(0)}</div>
                    <div className="ls-brand-text">
                        <strong>{userData.Teacher_Name}</strong>
                        <span>{userData.ROL}</span>
                    </div>
                </div>

                <nav className="ls-nav">
                    <button
                        className={`ls-item ${activeTab === "profile" ? "on" : ""}`}
                        onClick={() => { setActiveTab("profile"); setIsMobileMenuOpen(false); }}
                    >
                        <span className="ls-item-glow" />
                        <LayoutDashboard className="ls-icon" size={19} strokeWidth={2} />
                        <span className="ls-label">Profile</span>
                        <ChevronRight className="ls-chevron" size={15} strokeWidth={2.5} />
                    </button>

                    <button
                        className={`ls-item ${activeTab === "planning" ? "on" : ""}`}
                        onClick={() => { setActiveTab("planning"); setIsMobileMenuOpen(false); }}
                    >
                        <span className="ls-item-glow" />
                        <NotebookPen className="ls-icon" size={19} strokeWidth={2} />
                        <span className="ls-label">Planning</span>
                        <ChevronRight className="ls-chevron" size={15} strokeWidth={2.5} />
                    </button>

                    <button
                        className={`ls-item ${activeTab === "activities" ? "on" : ""}`}
                        onClick={() => { setActiveTab("activities"); setIsMobileMenuOpen(false); }}
                    >
                        <span className="ls-item-glow" />
                        <CalendarDays className="ls-icon" size={19} strokeWidth={2} />
                        <span className="ls-label">Activities</span>
                        <ChevronRight className="ls-chevron" size={15} strokeWidth={2.5} />
                    </button>

                    {userData.ROL === "Admin" && (
                        <button
                            className={`ls-item ${activeTab === "revision" ? "on" : ""}`}
                            onClick={() => { setActiveTab("revision"); setIsMobileMenuOpen(false); }}
                        >
                            <span className="ls-item-glow" />
                            <Search className="ls-icon" size={19} strokeWidth={2} />
                            <span className="ls-label">Review</span>
                            <ChevronRight className="ls-chevron" size={15} strokeWidth={2.5} />
                        </button>
                    )}

                    <button
                        className="ls-item logout"
                        onClick={() => { handleLogoutAction(); setIsMobileMenuOpen(false); }}
                    >
                        <LogOut className="ls-icon" size={19} strokeWidth={2} />
                        <span className="ls-label">Logout</span>
                    </button>
                </nav>
            </aside>

            <main className="main-content">
                <header className="dash-header">
                    <div className="dh-title">
                        <span className="dh-eyebrow">Bilingual Management</span>
                        <h2>{activeTab === 'profile' ? 'Mi espacio' : activeTab.toUpperCase()}</h2>
                    </div>
                    <button
                        onClick={fetchAllSheets}
                        disabled={isLoading}
                        className={`dh-sync ${isLoading ? 'loading' : ''}`}
                        title="Sincronizar"
                    >
                        <RefreshCw size={15} strokeWidth={2.4} className="dh-sync-icon" />
                        <span>{isLoading ? `Sincronizando ${syncTime.toFixed(1)}s` : 'Actualizado'}</span>
                    </button>
                </header>
                <section className="dynamic-section">{renderContent()}</section>
            </main>

            {/* Modal para Recursos Talleres */}
            {showResourceModal && (
                <div className="modal-overlay" onClick={() => setShowResourceModal(false)}>
                    <div className="task-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className="tm-head">
                            <div>
                                <span className="tm-eyebrow">Nuevo recurso</span>
                                <h3>Mis recursos</h3>
                            </div>
                            <button className="tm-close" onClick={() => setShowResourceModal(false)}>×</button>
                        </div>

                        <div className="tm-body">
                            <div className="tm-field">
                                <label>Enlace del recurso</label>
                                <input
                                    type="url"
                                    className="res-input"
                                    value={resourceLink}
                                    onChange={e => setResourceLink(e.target.value)}
                                    placeholder="https://..."
                                    onKeyDown={e => { if (e.key === 'Enter') handleAddResource(); }}
                                    autoFocus
                                />
                                <p className="res-hint">Pega la dirección completa. Se guardará en tu biblioteca personal.</p>
                            </div>
                        </div>

                        <div className="tm-foot">
                            <button className="tm-btn ghost" onClick={() => setShowResourceModal(false)}>Cancelar</button>
                            <button className="tm-btn primary" onClick={handleAddResource} disabled={!resourceLink.trim()}>
                                Guardar recurso
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                    <div className="vocab-v2-meta">
                                        {/* CORRECCIÓN ESPACIADO GRADO - SUBJECT */}
                                        <span>{plan.Grade} - {plan.Subject}</span>
                                        <small>{plan.Unit || "No Unit"}</small>
                                    </div>
                                    <p className="vocab-v2-words">{plan["Vocabulary Big 5"] || plan.Vocabulary_Big_5}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {showTaskModal && (
                <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
                    <form className="task-modal" onClick={e => e.stopPropagation()} onSubmit={handleTaskSubmit}>
                        <div className="tm-head">
                            <div>
                                <span className="tm-eyebrow">{editingTask ? 'Editar tarea' : 'Nueva tarea'}</span>
                                <h3>Mi agenda</h3>
                            </div>
                            <button type="button" className="tm-close" onClick={() => setShowTaskModal(false)}>×</button>
                        </div>

                        <div className="tm-body">
                            <div className="tm-field">
                                <label>¿Qué necesitas hacer?</label>
                                <textarea
                                    rows={3}
                                    required
                                    placeholder="Ej: Revisar planeaciones de 5° antes del viernes"
                                    value={taskForm.Challenge_Description}
                                    onChange={e => setTaskForm(f => ({ ...f, Challenge_Description: e.target.value }))}
                                />
                            </div>

                            <div className="tm-row">
                                <div className="tm-field">
                                    <label>Prioridad</label>
                                    <div className="tm-chips">
                                        <button type="button" className={`tm-chip prio-normal ${taskForm.Days_Active === 'normal' ? 'on' : ''}`}
                                            onClick={() => setTaskForm(f => ({ ...f, Days_Active: 'normal' }))}>Normal</button>
                                        <button type="button" className={`tm-chip prio-urgente ${taskForm.Days_Active === 'urgente' ? 'on' : ''}`}
                                            onClick={() => setTaskForm(f => ({ ...f, Days_Active: 'urgente' }))}>Urgente</button>
                                    </div>
                                </div>

                                <div className="tm-field">
                                    <label>Fecha</label>
                                    <input
                                        type="date"
                                        value={taskForm.Start_Date}
                                        onChange={e => setTaskForm(f => ({ ...f, Start_Date: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="tm-field">
                                <label>Estado</label>
                                <div className="tm-chips">
                                    <button type="button" className={`tm-chip st-pending ${taskForm.Status === 'pending' ? 'on' : ''}`}
                                        onClick={() => setTaskForm(f => ({ ...f, Status: 'pending' }))}>Pendiente</button>
                                    <button type="button" className={`tm-chip st-in_progress ${taskForm.Status === 'in_progress' ? 'on' : ''}`}
                                        onClick={() => setTaskForm(f => ({ ...f, Status: 'in_progress' }))}>En proceso</button>
                                    <button type="button" className={`tm-chip st-completed ${taskForm.Status === 'completed' ? 'on' : ''}`}
                                        onClick={() => setTaskForm(f => ({ ...f, Status: 'completed' }))}>Completada</button>
                                </div>
                            </div>

                            <div className="tm-field">
                                <label>Notas <em>(opcional)</em></label>
                                <textarea
                                    rows={2}
                                    placeholder="Detalles, enlaces, recordatorios…"
                                    value={taskForm.Evidence_Note}
                                    onChange={e => setTaskForm(f => ({ ...f, Evidence_Note: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="tm-foot">
                            <button type="button" className="tm-btn ghost" onClick={() => setShowTaskModal(false)}>Cancelar</button>
                            <button type="submit" className="tm-btn primary">
                                {editingTask ? 'Guardar cambios' : 'Crear tarea'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ---------- Diálogo de confirmación ---------- */}
            {confirmState && (
                <div className="modal-overlay" onClick={() => closeConfirm(false)}>
                    <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
                        <div className={`cd-icon ${confirmState.danger ? 'danger' : ''}`}>
                            {confirmState.danger ? '⚠' : '?'}
                        </div>
                        <h3>{confirmState.title}</h3>
                        <p>{confirmState.message}</p>
                        <div className="cd-actions">
                            <button className="tm-btn ghost" onClick={() => closeConfirm(false)}>Cancelar</button>
                            <button
                                className={`tm-btn ${confirmState.danger ? 'danger' : 'primary'}`}
                                onClick={() => closeConfirm(true)}
                            >{confirmState.confirmText}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ---------- Toast ---------- */}
            {toast && (
                <div className={`lumi-toast ${toast.type}`}>
                    <span className="toast-dot" />
                    {toast.message}
                </div>
            )}
        </div>
    );
};