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

    const [customFrame, setCustomFrame] = useState("");
    const [localCustomFrames, setLocalCustomFrames] = useState([]);

    const [filterGrade, setFilterGrade] = useState("");
    const [filterSubject, setFilterSubject] = useState("");
    const [filterTerm, setFilterTerm] = useState("");

    const userGrades = userData.Assigned_Grade?.split(',').map(g => g.trim()) || [];
    const userSubjects = userData.Assigned_Subject?.split(',').map(s => s.trim()) || [];
    const terms = ["First Term", "Second Term", "Third Term", "Fourth Term"];

    const [selectedGrades, setSelectedGrades] = useState([]);
    const [formsData, setFormsData] = useState({});

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setIsSyncing(true);
        try {
            const resp = await fetch(`${API_URL}?sheet=Lesson_Planners`);
            const data = await resp.json();
            if (Array.isArray(data)) {
                const myData = data.filter(p => p.Teacher_Key === userData.Teacher_Key);
                setPlannings(myData);
            }
        } catch (e) { console.error("Error fetching data:", e); }
        setIsSyncing(false);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        return dateStr.split('T')[0];
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
                "Thinking Skill": typeof plan["Thinking Skill"] === 'string' ? plan["Thinking Skill"].split(", ") : (plan["Thinking Skill"] || []),
                "Language Frame": typeof plan["Language Frame"] === 'string' ? plan["Language Frame"].split(", ") : (plan["Language Frame"] || []),
                "Start Date": formatDate(plan["Start Date"]),
                "Finish Date": formatDate(plan["Finish Date"])
            }
        });
        setShowForm(true);
    };

    const handleOpenForm = () => {
        if (showForm) {
            handleCancelForm();
        } else {
            setFormsData({});
            setSelectedGrades([]);
            setLocalCustomFrames([]);
            setCustomFrame("");
            setShowForm(true);
        }
    };

    const handleCancelForm = () => {
        setShowForm(false);
        setSelectedGrades([]);
        setFormsData({});
        setLocalCustomFrames([]);
        setCustomFrame("");
    };

    const toggleGradeSelection = (grade) => {
        if (selectedGrades.includes(grade)) {
            setSelectedGrades(selectedGrades.filter(g => g !== grade));
            const updated = { ...formsData }; delete updated[grade];
            setFormsData(updated);
        } else {
            setSelectedGrades([...selectedGrades, grade]);
            setFormsData(prev => ({
                ...prev,
                [grade]: {
                    Grade: grade, Subject: "", Topic: "", Objective: "", Term: "", Session_Number: "",
                    "Start Date": "", "Finish Date": "", "The Hook": "", "Vocabulary Big 5": "",
                    "Thinking Skill": [], "Language Frame": [], "Thinking Routine": "",
                    "Richmond Resources": "", "Activity Link": "", "Parent Task": "",
                    "Weekly Challenge": "", "% Status": "0%", ID_Setup: `ID-${Date.now()}-${grade}`,
                    Teacher_Key: userData.Teacher_Key
                }
            }));
        }
    };

    const handleInputChange = (grade, field, value) => {
        setFormsData(prev => ({
            ...prev,
            [grade]: { ...prev[grade], [field]: value }
        }));
    };

    const handleMultiSelect = (grade, field, value) => {
        const current = formsData[grade]?.[field] || [];
        const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
        handleInputChange(grade, field, updated);
    };

    const handleAddCustomFrame = (grade) => {
        if (!customFrame.trim()) return;
        if (!localCustomFrames.includes(customFrame)) {
            setLocalCustomFrames([...localCustomFrames, customFrame]);
        }
        handleMultiSelect(grade, "Language Frame", customFrame);
        setCustomFrame("");
    };

    const handleSaveToQueue = (e) => {
        e.preventDefault();
        const formatted = Object.values(formsData).map(entry => ({
            ...JSON.parse(JSON.stringify(entry)),
            "Thinking Skill": Array.isArray(entry["Thinking Skill"]) ? entry["Thinking Skill"].join(", ") : entry["Thinking Skill"],
            "Language Frame": Array.isArray(entry["Language Frame"]) ? entry["Language Frame"].join(", ") : entry["Language Frame"],
            isLocal: true
        }));
        
        const newIds = formatted.map(f => f.ID_Setup);
        setPlannings(prev => [...formatted, ...prev.filter(p => !newIds.includes(p.ID_Setup))]);
        setSyncQueue(prev => [...prev, ...formatted]);
        handleCancelForm();
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
            setSyncQueue([]); 
            fetchData();
            alert("Success!");
        } catch (e) { alert("Error syncing data"); }
        setIsSyncing(false);
    };

    const renderLinks = (links) => {
        if (!links) return "No links provided";
        return links.split(',').map((link, idx) => (
            <a key={idx} href={link.trim()} target="_blank" rel="noopener noreferrer" className="link-item" style={{ marginRight: '10px', color: '#2563eb', textDecoration: 'underline' }}>
                🔗 Link {idx + 1}
            </a>
        ));
    };

    const filteredPlannings = plannings.filter(p => {
        return (filterGrade === "" || p.Grade === filterGrade) &&
            (filterSubject === "" || p.Subject === filterSubject) &&
            (filterTerm === "" || p.Term === filterTerm);
    });

    const isFiltered = filterGrade !== "" || filterSubject !== "" || filterTerm !== "";
    const displayedPlannings = isFiltered ? filteredPlannings : filteredPlannings.slice(0, 10);

    return (
        <div className="planning-wrapper">
            <header className="page-header">
                <div className="title-section">
                    <h1>CLIL Lesson Planner</h1>
                    <p>Independent content management per grade.</p>
                </div>
                <div className="header-actions">
                    <button className="btn-refresh" onClick={fetchData} disabled={isSyncing} title="Reload Data">
                        {isSyncing ? "..." : "🔄 Refresh"}
                    </button>
                    {syncQueue.length > 0 && (
                        <button className="btn-sync" onClick={syncWithExcel} disabled={isSyncing}>
                            {isSyncing ? "..." : `📤 Push ${syncQueue.length} to Excel`}
                        </button>
                    )}
                    <button className="btn-main" onClick={handleOpenForm}>
                        {showForm ? "✕ Close Form" : "＋ New Planning"}
                    </button>
                </div>
            </header>

            <div className="filters-container">
                <div className="filter-group">
                    <label>Grade:</label>
                    <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
                        <option value="">All Grades</option>
                        {userGrades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Subject:</label>
                    <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                        <option value="">All Subjects</option>
                        {userSubjects.map(s => <option key={s}>{s}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Term:</label>
                    <select value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)}>
                        <option value="">All Terms</option>
                        {terms.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                {isFiltered && (
                    <button className="btn-clear" onClick={() => { setFilterGrade(""); setFilterSubject(""); setFilterTerm(""); }}>Clear Filters</button>
                )}
            </div>

            {showForm && (
                <div className="form-container">
                    <div className="step-box">
                        <h3>1. Select grades to plan:</h3>
                        <div className="grade-selector">
                            {userGrades.map(g => (
                                <button key={g} type="button" className={`grade-chip ${selectedGrades.includes(g) ? 'active' : ''}`} onClick={() => toggleGradeSelection(g)}>{g}</button>
                            ))}
                        </div>
                    </div>
                    <form onSubmit={handleSaveToQueue}>
                        {selectedGrades.map((grade) => (
                            <div key={grade} className="individual-grade-card">
                                <div className="card-tag">{grade}</div>
                                <div className="grid-3">
                                    <div className="input-group">
                                        <label>Subject</label>
                                        <select required value={formsData[grade]?.Subject || ""} onChange={(e) => handleInputChange(grade, "Subject", e.target.value)}>
                                            <option value="">Select...</option>
                                            {userSubjects.map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Term</label>
                                        <select required value={formsData[grade]?.Term || ""} onChange={(e) => handleInputChange(grade, "Term", e.target.value)}>
                                            <option value="">Select Term...</option>
                                            {terms.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Session Number</label>
                                        <input type="number" required value={formsData[grade]?.Session_Number || ""} onChange={(e) => handleInputChange(grade, "Session_Number", e.target.value)} />
                                    </div>
                                </div>

                                <div className="grid-2">
                                    <div className="input-group">
                                        <label>Start Date</label>
                                        <input type="date" required value={formsData[grade]?.["Start Date"] || ""} onChange={(e) => handleInputChange(grade, "Start Date", e.target.value)} />
                                    </div>
                                    <div className="input-group">
                                        <label>Finish Date</label>
                                        <input type="date" required value={formsData[grade]?.["Finish Date"] || ""} onChange={(e) => handleInputChange(grade, "Finish Date", e.target.value)} />
                                    </div>
                                </div>

                                <div className="grid-2">
                                    <div className="input-group">
                                        <label>Topic</label>
                                        <input type="text" required value={formsData[grade]?.Topic || ""} placeholder="Theme" onChange={(e) => handleInputChange(grade, "Topic", e.target.value)} />
                                    </div>
                                    <div className="input-group">
                                        <label>Objective</label>
                                        <input type="text" required value={formsData[grade]?.Objective || ""} placeholder="Learning Goal" onChange={(e) => handleInputChange(grade, "Objective", e.target.value)} />
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
                                                        <div key={s} className={`clil-option ${formsData[grade]?.["Thinking Skill"]?.includes(s) ? 'active' : ''}`} onClick={() => handleMultiSelect(grade, "Thinking Skill", s)}>{s}</div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="clil-box">
                                        <label>Language Frames</label>
                                        <div className="clil-custom-add" style={{ padding: '10px', display: 'flex', gap: '5px' }}>
                                            <input
                                                type="text"
                                                placeholder="Add custom frame..."
                                                value={customFrame}
                                                onChange={(e) => setCustomFrame(e.target.value)}
                                                style={{ fontSize: '0.8rem', flex: 1 }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleAddCustomFrame(grade)}
                                                className="btn-view"
                                                style={{ padding: '5px 10px' }}
                                            >+</button>
                                        </div>
                                        <div className="clil-scroll">
                                            {localCustomFrames.length > 0 && (
                                                <div className="clil-cat">
                                                    <strong>USER CUSTOM</strong>
                                                    {localCustomFrames.map(cf => (
                                                        <div key={cf} className={`clil-option ${formsData[grade]?.["Language Frame"]?.includes(cf) ? 'active' : ''}`} onClick={() => handleMultiSelect(grade, "Language Frame", cf)}>{cf}</div>
                                                    ))}
                                                </div>
                                            )}
                                            {Object.entries(CLIL_RESOURCES.languageFrames).map(([cat, frames]) => (
                                                <div key={cat} className="clil-cat">
                                                    <strong>{cat.toUpperCase()}</strong>
                                                    {frames.map(f => (
                                                        <div key={f} className={`clil-option ${formsData[grade]?.["Language Frame"]?.includes(f) ? 'active' : ''}`} onClick={() => handleMultiSelect(grade, "Language Frame", f)}>{f}</div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid-3">
                                    <div className="input-group">
                                        <label>Thinking Routine</label>
                                        <select value={formsData[grade]?.["Thinking Routine"] || ""} onChange={(e) => handleInputChange(grade, "Thinking Routine", e.target.value)}>
                                            <option value="">Select Routine...</option>
                                            {CLIL_RESOURCES.thinkingRoutines.map(r => <option key={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Vocabulary Big 5</label>
                                        <input type="text" value={formsData[grade]?.["Vocabulary Big 5"] || ""} placeholder="Word1, Word2..." onChange={(e) => handleInputChange(grade, "Vocabulary Big 5", e.target.value)} />
                                    </div>
                                    <div className="input-group">
                                        <label>Resources</label>
                                        <input type="text" value={formsData[grade]?.["Richmond Resources"] || ""} placeholder="Richmond / Digital" onChange={(e) => handleInputChange(grade, "Richmond Resources", e.target.value)} />
                                    </div>
                                </div>

                                <div className="grid-2">
                                    <textarea placeholder="The Hook (Activity Description)" value={formsData[grade]?.["The Hook"] || ""} onChange={(e) => handleInputChange(grade, "The Hook", e.target.value)} />
                                    <div className="grid-vertical">
                                        <input type="text" placeholder="Activity Links (comma separated)" value={formsData[grade]?.["Activity Link"] || ""} onChange={(e) => handleInputChange(grade, "Activity Link", e.target.value)} />
                                        <input type="text" placeholder="Homework / Parent Task" value={formsData[grade]?.["Parent Task"] || ""} onChange={(e) => handleInputChange(grade, "Parent Task", e.target.value)} />
                                        <input type="text" placeholder="Weekly Challenge" value={formsData[grade]?.["Weekly Challenge"] || ""} onChange={(e) => handleInputChange(grade, "Weekly Challenge", e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="form-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            {selectedGrades.length > 0 && <button type="submit" className="btn-save-all">Save Changes Locally</button>}
                            <button type="button" className="btn-cancel" onClick={handleCancelForm}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="table-card">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>Grade / Term</th>
                            <th>Subject / Session</th>
                            <th>Topic / Objective / Dates</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                            <th style={{ textAlign: 'center' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedPlannings.map((plan, i) => (
                            <tr key={i} className={plan.isLocal ? "row-local" : ""}>
                                <td>
                                    <span className="grade-tag">{plan.Grade}</span>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>{plan.Term}</div>
                                </td>
                                <td>
                                    <strong>{plan.Subject}</strong>
                                    <div style={{ fontSize: '0.75rem' }}>Sess: {plan.Session_Number}</div>
                                </td>
                                <td>
                                    <strong>{plan.Topic}</strong>
                                    <div style={{ fontSize: '0.75rem', color: '#334155' }}>{plan.Objective?.substring(0, 50)}...</div>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px' }}>
                                        📅 {formatDate(plan["Start Date"])} to {formatDate(plan["Finish Date"])}
                                    </div>
                                </td>
                                <td className="actions-td">
                                    <div className="actions-cell">
                                        <button className="btn-view" onClick={() => setSelectedSummary(plan)} title="View">👁️</button>
                                        <button className="btn-edit" onClick={() => handleEdit(plan)} title="Edit">✏️</button>
                                        <button className="btn-del" onClick={() => handleDelete(plan)} title="Delete">🗑️</button>
                                    </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    {plan.isLocal ? "⏳" : "✅"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedSummary && (
                <div className="modal-overlay" onClick={() => setSelectedSummary(null)}>
                    <div className="scaffolding-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📌 {selectedSummary.Topic} (Session {selectedSummary.Session_Number})</h2>
                            <button className="close-x" onClick={() => setSelectedSummary(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="snapshot-info">
                                <p><strong>Subject:</strong> {selectedSummary.Subject} ({selectedSummary.Term})</p>
                                <p><strong>Key Vocabulary:</strong> {selectedSummary["Vocabulary Big 5"]}</p>
                                <p><strong>Language Frames:</strong> {selectedSummary["Language Frame"]}</p>
                                <p><strong>Activity Links:</strong> {renderLinks(selectedSummary["Activity Link"])}</p>
                                <p><strong>Homework / Parent Task:</strong> {selectedSummary["Parent Task"] || "Not assigned"}</p>
                                <p><strong>Planned Period:</strong> {formatDate(selectedSummary["Start Date"])} to {formatDate(selectedSummary["Finish Date"])}</p>
                            </div>
                            <hr className="modal-hr" />
                            <div className="narrative-summary">
                                <h3>🧠 CLIL Summary Paragraph</h3>
                                <p>
                                    In this CLIL lesson, students worked on <strong>{selectedSummary.Topic}</strong> in the subject <strong>{selectedSummary.Subject}</strong>.
                                    The objective was <strong>{selectedSummary.Objective}</strong>.
                                    The learning process started with <em>"{selectedSummary["The Hook"]}"</em>.
                                    Students developed thinking skills such as <strong>{selectedSummary["Thinking Skill"]}</strong>,
                                    supported by the routine <strong>{selectedSummary["Thinking Routine"]}</strong>.
                                    Scaffolding was provided via <strong>{selectedSummary["Language Frame"]}</strong>.
                                    Reinforcement: <strong>{selectedSummary["Richmond Resources"] || "Digital materials"}</strong>.
                                    Challenge: <strong>{selectedSummary["Weekly Challenge"]}</strong>.
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