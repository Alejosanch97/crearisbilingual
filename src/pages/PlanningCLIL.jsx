import React, { useState, useEffect } from 'react';
import '../Styles/planning.css';

const API_URL = 'https://script.google.com/macros/s/AKfycbxIgwbIuGymDkRREiidM0lJYZRi5KdKS217_inoU751zp_x3EAzzxcljjNHSxZc34zBxQ/exec';

const CLIL_RESOURCES = {
    thinkingSkills: {
        remembering: ["Recalling facts", "Naming concepts", "Listing examples", "Recognizing patterns", "Identifying key terms", "Matching concepts and definitions", "Labeling diagrams", "Recalling prior knowledge", "Identifying main ideas", "Noticing details"],
        understanding: ["Explaining ideas", "Summarizing information", "Interpreting data", "Classifying information", "Paraphrasing concepts", "Giving examples", "Explaining processes", "Describing relationships", "Identifying similarities", "Identifying differences"],
        applying: ["Using knowledge in new contexts", "Solving guided problems", "Demonstrating procedures", "Applying rules", "Using formulas", "Following instructions", "Carrying out experiments", "Using models or simulations", "Applying strategies", "Completing real-life tasks"],
        analyzing: ["Comparing and contrasting", "Identifying cause and effect", "Finding relationships", "Analyzing data", "Breaking information into parts", "Detecting patterns and trends", "Organizing information", "Distinguishing facts from opinions", "Identifying assumptions", "Analyzing arguments"],
        evaluating: ["Justifying decisions", "Evaluating sources", "Defending opinions", "Critiquing solutions", "Assessing effectiveness", "Ranking alternatives", "Judging reliability", "Reflecting on outcomes", "Providing constructive feedback", "Supporting conclusions with evidence"],
        creating: ["Designing a product", "Creating a model", "Proposing solutions", "Developing hypotheses", "Planning a project", "Inventing new ideas", "Designing experiments", "Creating presentations", "Producing written texts", "Building prototypes"]
    },
    languageFrames: {
        observing: ["I can see that...", "At first glance...", "It appears that...", "One noticeable detail is...", "This image shows...", "I observe that...", "A key detail is...", "What stands out is...", "It seems clear that..."],
        comparing: ["Both ___ and ___ have...", "___ is similar to ___ because...", "However, ___ differs from ___ in...", "In contrast to ___, ___...", "Compared to ___, ___...", "While ___, ___...", "On the other hand...", "___ is more/less ___ than ___"],
        predicting: ["I predict that...", "If ___ happens, then ___ will...", "It is likely that...", "This may result in...", "I expect that...", "There is a possibility that...", "This could lead to...", "It is possible that..."],
        expressingOpinion: ["In my opinion...", "I strongly believe that...", "From my perspective...", "I think that...", "I agree/disagree because...", "In my view...", "I would argue that...", "Personally, I believe that..."],
        justifying: ["This is supported by...", "The evidence shows that...", "According to the data...", "This proves that...", "Based on the information...", "One reason for this is...", "This can be explained by...", "The results indicate that..."]
    },
    thinkingRoutines: [
        "See-Think-Wonder", "Think-Puzzle-Explore", "3-2-1 Bridge", "Compass Points", 
        "Claim-Support-Question", "Generate-Sort-Connect-Elaborate", "Color-Symbol-Image", 
        "Headlines", "I Used to Think… Now I Think…", "What Makes You Say That?"
    ]
};

export const PlanningCLIL = ({ userData }) => {
    const [plannings, setPlannings] = useState([]);
    const [syncQueue, setSyncQueue] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [selectedSummary, setSelectedSummary] = useState(null);
    
    // Estados para Filtros
    const [filterGrade, setFilterGrade] = useState("");
    const [filterSubject, setFilterSubject] = useState("");
    
    const userGrades = userData.Assigned_Grade?.split(',').map(g => g.trim()) || [];
    const userSubjects = userData.Assigned_Subject?.split(',').map(s => s.trim()) || [];

    const [selectedGrades, setSelectedGrades] = useState([]);
    const [formsData, setFormsData] = useState({});

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setIsSyncing(true);
        try {
            const resp = await fetch(`${API_URL}?sheet=Lesson_Planners`);
            const data = await resp.json();
            if (Array.isArray(data)) setPlannings(data);
        } catch (e) { console.error("Error:", e); }
        setIsSyncing(false);
    };

    const handleDelete = async (plan) => {
        if (!window.confirm("Are you sure?")) return;
        if (plan.isLocal) {
            setPlannings(plannings.filter(p => p.ID_Setup !== plan.ID_Setup));
            setSyncQueue(syncQueue.filter(q => q.ID_Setup !== plan.ID_Setup));
        } else {
            setIsSyncing(true);
            try {
                await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'delete', sheet: "Lesson_Planners", rowId: plan.rowId })
                });
                fetchData();
            } catch (e) { alert("Error deleting"); }
            setIsSyncing(false);
        }
    };

    const handleEdit = (plan) => {
        const grade = plan.Grade;
        setSelectedGrades([grade]);
        setFormsData({
            [grade]: {
                ...plan,
                "Thinking Skill": typeof plan["Thinking Skill"] === 'string' ? plan["Thinking Skill"].split(", ") : plan["Thinking Skill"],
                "Language Frame": typeof plan["Language Frame"] === 'string' ? plan["Language Frame"].split(", ") : plan["Language Frame"]
            }
        });
        setShowForm(true);
        if (!plan.isLocal) {
            setPlannings(plannings.filter(p => p.rowId !== plan.rowId));
        } else {
            setPlannings(plannings.filter(p => p.ID_Setup !== plan.ID_Setup));
            setSyncQueue(syncQueue.filter(q => q.ID_Setup !== plan.ID_Setup));
        }
    };

    const toggleGradeSelection = (grade) => {
        if (selectedGrades.includes(grade)) {
            setSelectedGrades(selectedGrades.filter(g => g !== grade));
            const updated = { ...formsData }; delete updated[grade];
            setFormsData(updated);
        } else {
            setSelectedGrades([...selectedGrades, grade]);
            setFormsData({
                ...formsData,
                [grade]: {
                    Grade: grade, Subject: "", Topic: "", "The Hook": "", "Vocabulary Big 5": "",
                    "Thinking Skill": [], "Language Frame": [], "Thinking Routine": "",
                    "Richmond Resources": "", "Activity Link": "", "Parent Task": "",
                    "Weekly Challenge": "", "% Status": "0%", ID_Setup: `ID-${Date.now()}-${grade}`
                }
            });
        }
    };

    const handleInputChange = (grade, field, value) => {
        setFormsData({ ...formsData, [grade]: { ...formsData[grade], [field]: value } });
    };

    const handleMultiSelect = (grade, field, value) => {
        const current = formsData[grade][field] || [];
        const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
        handleInputChange(grade, field, updated);
    };

    const handleSaveToQueue = (e) => {
        e.preventDefault();
        const formatted = Object.values(formsData).map(entry => ({
            ...entry,
            "Thinking Skill": Array.isArray(entry["Thinking Skill"]) ? entry["Thinking Skill"].join(", ") : entry["Thinking Skill"],
            "Language Frame": Array.isArray(entry["Language Frame"]) ? entry["Language Frame"].join(", ") : entry["Language Frame"],
            isLocal: true
        }));
        setPlannings([...formatted, ...plannings]);
        setSyncQueue([...syncQueue, ...formatted]);
        setShowForm(false); setSelectedGrades([]); setFormsData({});
    };

    const syncWithExcel = async () => {
        setIsSyncing(true);
        try {
            for (const item of syncQueue) {
                const { isLocal, rowId, ...dataToSend } = item;
                await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'create', sheet: "Lesson_Planners", data: dataToSend })
                });
            }
            setSyncQueue([]); fetchData();
            alert("Success!");
        } catch (e) { alert("Error"); }
        setIsSyncing(false);
    };

    // --- LÓGICA DE FILTRADO Y LÍMITE ---
    const filteredPlannings = plannings.filter(p => {
        return (filterGrade === "" || p.Grade === filterGrade) &&
               (filterSubject === "" || p.Subject === filterSubject);
    });

    // Si no hay filtros aplicados, mostramos solo los últimos 7. Si hay filtros, mostramos todo.
    const isFiltered = filterGrade !== "" || filterSubject !== "";
    const displayedPlannings = isFiltered ? filteredPlannings : filteredPlannings.slice(0, 7);

    return (
        <div className="planning-wrapper">
            <header className="page-header">
                <div className="title-section">
                    <h1>CLIL Lesson Planner</h1>
                    <p>Múltiples grados, contenidos independientes.</p>
                </div>
                <div className="header-actions">
                    {syncQueue.length > 0 && (
                        <button className="btn-sync" onClick={syncWithExcel} disabled={isSyncing}>
                            {isSyncing ? "..." : `🔄 Push ${syncQueue.length} to Excel`}
                        </button>
                    )}
                    <button className="btn-main" onClick={() => setShowForm(!showForm)}>
                        {showForm ? "✕ Cancel" : "＋ New Planning"}
                    </button>
                </div>
            </header>

            {/* SECCIÓN DE FILTROS */}
            <div className="filters-container">
                <div className="filter-group">
                    <label>Filter by Grade:</label>
                    <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
                        <option value="">All Grades (Showing last 7)</option>
                        {userGrades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Filter by Subject:</label>
                    <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                        <option value="">All Subjects</option>
                        {userSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                {(filterGrade || filterSubject) && (
                    <button className="btn-clear" onClick={() => { setFilterGrade(""); setFilterSubject(""); }}>Clear Filters</button>
                )}
            </div>

            {showForm && (
                <div className="form-container">
                    <div className="step-box">
                        <h3>1. Select grades to plan:</h3>
                        <div className="grade-selector">
                            {userGrades.map(g => (
                                <button key={g} className={`grade-chip ${selectedGrades.includes(g) ? 'active' : ''}`} onClick={() => toggleGradeSelection(g)}>{g}</button>
                            ))}
                        </div>
                    </div>
                    <form onSubmit={handleSaveToQueue}>
                        {selectedGrades.map((grade) => (
                            <div key={grade} className="individual-grade-card">
                                <div className="card-tag">{grade}</div>
                                <div className="grid-2">
                                    <div className="input-group">
                                        <label>Subject</label>
                                        <select required value={formsData[grade].Subject} onChange={(e) => handleInputChange(grade, "Subject", e.target.value)}>
                                            <option value="">Select...</option>
                                            {userSubjects.map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Topic</label>
                                        <input type="text" required value={formsData[grade].Topic} placeholder="Theme" onChange={(e) => handleInputChange(grade, "Topic", e.target.value)} />
                                    </div>
                                </div>
                                <div className="clil-selector-grid">
                                    <div className="clil-box">
                                        <label>Thinking Skills</label>
                                        <div className="clil-scroll">
                                            {Object.entries(CLIL_RESOURCES.thinkingSkills).map(([cat, skills]) => (
                                                <div key={cat} className="clil-cat">
                                                    <strong>{cat.toUpperCase()}</strong>
                                                    {skills.map(s => (
                                                        <div key={s} className={`clil-option ${formsData[grade]["Thinking Skill"]?.includes(s) ? 'active' : ''}`} onClick={() => handleMultiSelect(grade, "Thinking Skill", s)}>{s}</div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="clil-box">
                                        <label>Language Frames</label>
                                        <div className="clil-scroll">
                                            {Object.entries(CLIL_RESOURCES.languageFrames).map(([cat, frames]) => (
                                                <div key={cat} className="clil-cat">
                                                    <strong>{cat.toUpperCase()}</strong>
                                                    {frames.map(f => (
                                                        <div key={f} className={`clil-option ${formsData[grade]["Language Frame"]?.includes(f) ? 'active' : ''}`} onClick={() => handleMultiSelect(grade, "Language Frame", f)}>{f}</div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid-3">
                                    <div className="input-group">
                                        <label>Thinking Routine</label>
                                        <select value={formsData[grade]["Thinking Routine"]} onChange={(e) => handleInputChange(grade, "Thinking Routine", e.target.value)}>
                                            <option value="">Select Routine...</option>
                                            {CLIL_RESOURCES.thinkingRoutines.map(r => <option key={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Vocabulary Big 5</label>
                                        <input type="text" value={formsData[grade]["Vocabulary Big 5"]} placeholder="Word1, Word2..." onChange={(e) => handleInputChange(grade, "Vocabulary Big 5", e.target.value)} />
                                    </div>
                                    <div className="input-group">
                                        <label>Richmond Resources</label>
                                        <input type="text" value={formsData[grade]["Richmond Resources"]} onChange={(e) => handleInputChange(grade, "Richmond Resources", e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid-2">
                                    <textarea placeholder="The Hook (Activity)" value={formsData[grade]["The Hook"]} onChange={(e) => handleInputChange(grade, "The Hook", e.target.value)} />
                                    <div className="grid-vertical">
                                        <input type="text" placeholder="Activity Link" value={formsData[grade]["Activity Link"]} onChange={(e) => handleInputChange(grade, "Activity Link", e.target.value)} />
                                        <input type="text" placeholder="Parent Task" value={formsData[grade]["Parent Task"]} onChange={(e) => handleInputChange(grade, "Parent Task", e.target.value)} />
                                        <input type="text" placeholder="Weekly Challenge" value={formsData[grade]["Weekly Challenge"]} onChange={(e) => handleInputChange(grade, "Weekly Challenge", e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {selectedGrades.length > 0 && <button type="submit" className="btn-save-all">Save Locally</button>}
                    </form>
                </div>
            )}

            <div className="table-card">
                <table className="modern-table">
                    <thead><tr><th>Grade</th><th>Subject</th><th>Topic</th><th>Actions</th><th>Status</th></tr></thead>
                    <tbody>
                        {displayedPlannings.map((plan, i) => (
                            <tr key={i} className={plan.isLocal ? "row-local" : ""}>
                                <td><span className="grade-tag">{plan.Grade}</span></td>
                                <td>{plan.Subject}</td>
                                <td>{plan.Topic}</td>
                                <td className="actions-cell">
                                    <button className="btn-view" onClick={() => setSelectedSummary(plan)}>👁️</button>
                                    <button className="btn-edit" onClick={() => handleEdit(plan)}>✏️</button>
                                    <button className="btn-del" onClick={() => handleDelete(plan)}>🗑️</button>
                                </td>
                                <td>{plan.isLocal ? "⏳" : "✅"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!isFiltered && filteredPlannings.length > 7 && (
                    <div className="table-footer-info">Showing last 7 entries. Use filters to see all.</div>
                )}
            </div>

            {/* MODAL SUMMARY */}
            {selectedSummary && (
                <div className="modal-overlay" onClick={() => setSelectedSummary(null)}>
                    <div className="scaffolding-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📌 CLIL Lesson Snapshot</h2>
                            <button className="close-x" onClick={() => setSelectedSummary(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="snapshot-info">
                                <p><strong>Topic:</strong> {selectedSummary.Topic}</p>
                                <p><strong>Subject:</strong> {selectedSummary.Subject}</p>
                                <p><strong>Key Vocabulary:</strong> {selectedSummary["Vocabulary Big 5"]}</p>
                                <p><strong>Language Frames:</strong> {selectedSummary["Language Frame"]}</p>
                            </div>
                            <hr className="modal-hr" />
                            <div className="narrative-summary">
                                <h3>🧠 CLIL Summary Paragraph</h3>
                                <p>
                                    In this CLIL lesson, students worked on <strong>{selectedSummary.Topic}</strong> in the subject <strong>{selectedSummary.Subject}</strong>. 
                                    The learning process started with a motivating hook <em>"{selectedSummary["The Hook"]}"</em> to activate prior knowledge and generate curiosity. 
                                    Through guided activities, students developed thinking skills such as <strong>{selectedSummary["Thinking Skill"]}</strong>, 
                                    supported by the thinking routine <strong>{selectedSummary["Thinking Routine"]}</strong>, which helped structure reflection and understanding. 
                                    Language scaffolding was provided using the frames <strong>{selectedSummary["Language Frame"]}</strong> to support academic communication throughout the lesson. 
                                    This resource <strong>{selectedSummary["Richmond Resources"] || "Richmond/Digital materials"}</strong> was used to reinforce content and language integration, 
                                    and learning was consolidated through a weekly challenge <strong>{selectedSummary["Weekly Challenge"]}</strong>, allowing students to apply their knowledge in a meaningful and contextualized way.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-main" onClick={() => setSelectedSummary(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};