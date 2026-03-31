import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { initializeData, oralSessions as defaultOralSessions, progressHistory as defaultProgressHistory, syllabus as defaultSyllabus } from './data/syllabusData';

const STORAGE_KEY = 'ai-flight-syllabus-progress-v1';
const NOTES_STORAGE_KEY = 'ai-flight-syllabus-notes-v1';
const CHECKLIST_STORAGE_KEY = 'ai-flight-syllabus-checklist-v1';
const RATING_STORAGE_KEY = 'ai-flight-syllabus-rating-v1';

const statusLabel = {
  completed: 'Completed',
  'in-progress': 'In Progress',
  planned: 'Planned',
};

const statusOrder = ['planned', 'in-progress', 'completed'];

function App() {
  const [dataLoading, setDataLoading] = useState(true);
  const [syllabus, setSyllabus] = useState(defaultSyllabus);
  const [progressHistory, setProgressHistory] = useState(defaultProgressHistory);
  const [oralSessions, setOralSessions] = useState(defaultOralSessions);
  
  const [sessionStatuses, setSessionStatuses] = useState(() => {
    if (typeof window === 'undefined') {
      return {};
    }

    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    } catch {
      return {};
    }
  });
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sessionNotes, setSessionNotes] = useState(() => {
    if (typeof window === 'undefined') {
      return {};
    }

    try {
      return JSON.parse(window.localStorage.getItem(NOTES_STORAGE_KEY) ?? '{}');
    } catch {
      return {};
    }
  });
  const [sessionChecklist, setSessionChecklist] = useState(() => {
    if (typeof window === 'undefined') {
      return {};
    }

    try {
      return JSON.parse(window.localStorage.getItem(CHECKLIST_STORAGE_KEY) ?? '{}');
    } catch {
      return {};
    }
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [chatMessages, setChatMessages] = useState(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      return JSON.parse(window.localStorage.getItem('ai-flight-syllabus-chat-v1') ?? '[]');
    } catch {
      return [];
    }
  });
  const [chatInput, setChatInput] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [ratingMenuOpen, setRatingMenuOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(() => {
    if (typeof window === 'undefined') {
      return 'Private Pilot';
    }

    return window.localStorage.getItem(RATING_STORAGE_KEY) ?? 'Private Pilot';
  });

  useEffect(() => {
    initializeData().then((data) => {
      setSyllabus(data.syllabus);
      setProgressHistory(data.progressHistory);
      setOralSessions(data.oralSessions);
      setDataLoading(false);
    });
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionStatuses));
  }, [sessionStatuses]);

  useEffect(() => {
    window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(sessionNotes));
  }, [sessionNotes]);

  useEffect(() => {
    window.localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(sessionChecklist));
  }, [sessionChecklist]);

  useEffect(() => {
    window.localStorage.setItem('ai-flight-syllabus-chat-v1', JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    window.localStorage.setItem(RATING_STORAGE_KEY, selectedRating);
  }, [selectedRating]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuOpen && !e.target.closest('.hero-menu-button') && !e.target.closest('.hero-menu-dropdown')) {
        setMenuOpen(false);
      }

      if (ratingMenuOpen && !e.target.closest('.hero-rating-toggle') && !e.target.closest('.hero-rating-dropdown')) {
        setRatingMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen, ratingMenuOpen]);

  const phasesWithProgress = useMemo(
    () =>
      syllabus.phases.map((phase) => ({
        ...phase,
        sessions: phase.sessions.map((session) => ({
          ...session,
          status: sessionStatuses[session.id] ?? session.status,
        })),
      })),
    [syllabus.phases, sessionStatuses]
  );

  const allSessions = phasesWithProgress.flatMap((phase) => phase.sessions);
  const completedSessions = allSessions.filter((session) => session.status === 'completed');
  const inProgressSessions = allSessions.filter((session) => session.status === 'in-progress');
  const plannedSessions = allSessions.filter((session) => session.status === 'planned');
  const nextSession = inProgressSessions[0] || plannedSessions[0];
  const completionRate = Math.round((completedSessions.length / allSessions.length) * 100);
  const ratedSessions = allSessions.filter((session) => typeof session.rating === 'number');
  const phaseOptions = syllabus.phases.map((phase) => phase.title);
  const typeOptions = [...new Set(allSessions.map((session) => session.type))];
  const hasActiveFilters = phaseFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all';
  const averageLessonRating = ratedSessions.length
    ? (ratedSessions.reduce((total, session) => total + session.rating, 0) / ratedSessions.length).toFixed(1)
    : null;
  const latestOralSession = oralSessions[oralSessions.length - 1] ?? null;
  const latestProgressSnapshot = progressHistory[progressHistory.length - 1] ?? null;

  const isInstrumentComingSoon = selectedRating === 'Instrument - Coming Soon';

  const filteredPhases = phasesWithProgress
    .map((phase) => {
      const matchesPhase = phaseFilter === 'all' || phase.title === phaseFilter;
      const sessions = phase.sessions.filter((session) => {
        const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
        const matchesType = typeFilter === 'all' || session.type === typeFilter;

        return matchesPhase && matchesStatus && matchesType;
      });

      return {
        ...phase,
        sessions,
      };
    })
    .filter((phase) => phase.sessions.length > 0);

  const selectedSessionId = allSessions
    .find((session) => session.status === 'in-progress' || session.status === 'planned')?.id ?? allSessions[0]?.id;
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    if (selectedSessionId) {
      const session = allSessions.find((s) => s.id === selectedSessionId);
      setSelectedSession(session || nextSession || allSessions[0]);
    }
  }, [selectedSessionId, allSessions, nextSession]);

  const selectedChecklistState = selectedSession ? sessionChecklist[selectedSession.id] ?? {} : {};
  const selectedChecklistCompleted = selectedSession?.checklist?.filter((item) => selectedChecklistState[item]).length ?? 0;

  const stats = [
    {
      label: 'Completion',
      value: `${completionRate}%`,
      helper: `${completedSessions.length} of ${allSessions.length} sessions complete`,
    },
    {
      label: 'Lesson Ratings',
      value: ratedSessions.length,
      helper: `${averageLessonRating ? `${averageLessonRating}/5 avg` : 'No ratings yet'}`,
    },
    {
      label: 'Latest Oral',
      value: latestOralSession ? `${latestOralSession.pct}%` : '—',
      helper: latestOralSession ? latestOralSession.topic : 'No oral reviews logged yet',
    },
    {
      label: 'Snapshot',
      value: latestProgressSnapshot ? `${latestProgressSnapshot.completion_pct}%` : '—',
      helper: latestProgressSnapshot
        ? `${latestProgressSnapshot.completed_lessons}/${latestProgressSnapshot.total_lessons} lessons in history`
        : 'No progress snapshots saved yet',
    },
    {
      label: 'Remaining',
      value: plannedSessions.length,
      helper: 'Queued sessions ready to schedule',
    },
  ];

  const updateSessionStatus = (sessionId, nextStatus) => {
    setSessionStatuses((currentStatuses) => ({
      ...currentStatuses,
      [sessionId]: nextStatus,
    }));
  };

  const resetProgress = () => {
    setSessionStatuses({});
  };

  const clearFilters = () => {
    setPhaseFilter('all');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  const updateSessionNote = (sessionId, note) => {
    setSessionNotes((currentNotes) => ({
      ...currentNotes,
      [sessionId]: note,
    }));
  };

  const toggleChecklistItem = (sessionId, item) => {
    setSessionChecklist((currentChecklist) => ({
      ...currentChecklist,
      [sessionId]: {
        ...currentChecklist[sessionId],
        [item]: !currentChecklist[sessionId]?.[item],
      },
    }));
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const newMessage = {
      id: Date.now(),
      role: 'user',
      content: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages([...chatMessages, newMessage]);
    setChatInput('');

    // Simulate a response from CoPi
    setTimeout(() => {
      const responses = [
        'That\'s a great question! Let me help you with that.',
        'I\'m here to assist you with your training. Tell me more about what you need.',
        'Based on your training plan, here\'s what I recommend...',
        'Good question! This relates to your current focus session.',
      ];

      const response = {
        id: Date.now() + 1,
        role: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, response]);
    }, 800);
  };

  if (dataLoading) {
    return (
      <div className="App">
        <main className="dashboard-shell">
          <div style={{ padding: '40px', textAlign: 'center', color: '#cbd5e1' }}>
            <p>Loading your flight training data...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="App">
      <main className="dashboard-shell">
        <section className="hero-card">
          <div>
            <p className="eyebrow">Your flight training companion</p>
            <h1>CoPi</h1>
          </div>

          <div className="hero-panel">
            <button
              className="hero-menu-button"
              onClick={() => setMenuOpen(!menuOpen)}
              type="button"
              aria-label="Open menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            
            {menuOpen && (
              <div className="hero-menu-dropdown">
                <button type="button">Switch user</button>
                <button type="button">Settings</button>
                <button type="button">Help</button>
                <div className="menu-divider"></div>
                <button type="button">Log In / Log Out</button>
              </div>
            )}
            
            <strong className="hero-student-name">{syllabus.student}</strong>
            <div className="hero-rating-wrap">
              <button
                className="hero-rating-pill hero-rating-toggle"
                type="button"
                onClick={() => setRatingMenuOpen((isOpen) => !isOpen)}
                aria-expanded={ratingMenuOpen}
              >
                {selectedRating}
                <span className="hero-rating-caret">▾</span>
              </button>

              {ratingMenuOpen ? (
                <div className="hero-rating-dropdown">
                  <button
                    type="button"
                    className={`hero-rating-option ${selectedRating === 'Private Pilot' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedRating('Private Pilot');
                      setRatingMenuOpen(false);
                    }}
                  >
                    Private Pilot
                  </button>
                  <button
                    type="button"
                    className={`hero-rating-option ${selectedRating === 'Instrument - Coming Soon' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedRating('Instrument - Coming Soon');
                      setRatingMenuOpen(false);
                    }}
                  >
                    Instrument - Coming Soon
                  </button>
                </div>
              ) : null}
            </div>
            {nextSession ? (
              <>
                <span className="hero-label next-label">Next session</span>
                <h2>{nextSession.title}</h2>
              </>
            ) : (
              <p>All sessions complete.</p>
            )}
          </div>
        </section>

        {activeTab === 'dashboard' && (
          <section className="tab-content">
            <section className="stats-grid" aria-label="Training summary">
              {stats.map((stat) => (
                <article className="stat-card" key={stat.label}>
                  <span className="stat-label">{stat.label}</span>
                  <strong className="stat-value">{stat.value}</strong>
                  <span className="stat-helper">{stat.helper}</span>
                </article>
              ))}
            </section>

            {selectedSession ? (
              <section className="quick-detail">
                <div className="detail-header">
                  <p className="eyebrow">Current focus</p>
                  <h3>{selectedSession.title}</h3>
                  <p>{selectedSession.focus}</p>
                </div>

                <div className="detail-meta-row">
                  <span>{selectedSession.type}</span>
                  <span>{selectedSession.duration}</span>
                  {typeof selectedSession.rating === 'number' ? <span>Rating {selectedSession.rating}/5</span> : null}
                  <span className={`status-pill ${selectedSession.status}`}>{statusLabel[selectedSession.status]}</span>
                </div>

                <section className="detail-section">
                  <div className="detail-section-header">
                    <h4>Objectives</h4>
                  </div>
                  <ul className="detail-list">
                    {selectedSession.objectives?.map((objective) => (
                      <li key={objective}>{objective}</li>
                    ))}
                  </ul>
                </section>

                <section className="detail-section">
                  <div className="detail-section-header">
                    <h4>AI study prompt by CoPi</h4>
                  </div>
                  <p>{selectedSession.aiPrompt}</p>
                </section>
              </section>
            ) : null}
          </section>
        )}

        {activeTab === 'syllabus' && (
          <section className="tab-content">
            <section className="controls-card" aria-label="Filters">
              <div className="filter-group">
                <label className="filter-field">
                  <span>Phase</span>
                  <select value={phaseFilter} onChange={(event) => setPhaseFilter(event.target.value)}>
                    <option value="all">All phases</option>
                    {phaseOptions.map((phase) => (
                      <option key={phase} value={phase}>
                        {phase}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="filter-field">
                  <span>Status</span>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="all">All statuses</option>
                    {statusOrder.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel[status]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="filter-field">
                  <span>Type</span>
                  <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                    <option value="all">All types</option>
                    {typeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="control-actions">
                <div className="button-row">
                  {hasActiveFilters ? (
                    <button className="ghost-button" type="button" onClick={clearFilters}>
                      Clear filters
                    </button>
                  ) : null}
                  <button className="ghost-button" type="button" onClick={resetProgress} disabled={isInstrumentComingSoon}>
                    Reset progress
                  </button>
                </div>
              </div>
            </section>

            {isInstrumentComingSoon ? (
              <div className="coming-soon-banner">Instrument training tools are coming soon. Syllabus editing is temporarily disabled.</div>
            ) : null}

            <div className="phase-grid">
              {filteredPhases.map((phase) => (
                <article className="phase-card" key={phase.id}>
                  <div className="phase-card-header">
                    <div>
                      <p className="phase-title">{phase.title}</p>
                      <p className="phase-description">{phase.description}</p>
                    </div>
                    <span className="phase-count">{phase.sessions.length} sessions</span>
                  </div>

                  <div className="session-list">
                    {phase.sessions.map((session) => (
                      <div className={`session-row ${selectedSession?.id === session.id ? 'selected' : ''}`} key={session.id}>
                        <div className="session-main">
                          <div className={`status-dot ${session.status}`} aria-hidden="true" />
                          <div className="session-copy">
                            <div className="session-title-row">
                              <h3>{session.title}</h3>
                              <button
                                type="button"
                                className={`session-open-button ${selectedSession?.id === session.id ? 'active' : ''}`}
                                onClick={() => setSelectedSession(session)}
                              >
                                {selectedSession?.id === session.id ? 'Selected' : 'Open'}
                              </button>
                            </div>
                            <p>{session.focus}</p>

                            <div className="status-actions" aria-label={`Update ${session.title} status`}>
                              {statusOrder.map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  className={`status-button ${session.status === status ? 'active' : ''}`}
                                  onClick={() => updateSessionStatus(session.id, status)}
                                  disabled={isInstrumentComingSoon}
                                >
                                  {statusLabel[status]}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="session-meta">
                          <span>{session.type}</span>
                          <span>{session.duration}</span>
                          {typeof session.rating === 'number' ? <span>Rating {session.rating}/5</span> : null}
                          <span className={`status-pill ${session.status}`}>{statusLabel[session.status]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            {!filteredPhases.length ? (
              <div className="empty-state">
                <h3>No sessions match the current filters.</h3>
                <p>Clear the filters to show the full syllabus again.</p>
              </div>
            ) : null}

            {selectedSession ? (
              <section className="detail-panel">
                <div className="detail-header">
                  <p className="eyebrow">Session detail</p>
                  <h3>{selectedSession.title}</h3>
                  <p>{selectedSession.focus}</p>
                </div>

                <div className="detail-meta-row">
                  <span>{selectedSession.stageTitle}</span>
                  <span>{selectedSession.type}</span>
                  <span>{selectedSession.duration}</span>
                  {typeof selectedSession.rating === 'number' ? <span>Rating {selectedSession.rating}/5</span> : null}
                  <span className={`status-pill ${selectedSession.status}`}>{statusLabel[selectedSession.status]}</span>
                </div>

                <section className="detail-section">
                  <div className="detail-section-header">
                    <h4>Checklist</h4>
                    <span>{selectedChecklistCompleted}/{selectedSession.checklist?.length ?? 0} complete</span>
                  </div>
                  <div className="checklist-list">
                    {selectedSession.checklist?.map((item) => (
                      <label className="checklist-item" key={item}>
                        <input
                          type="checkbox"
                          checked={Boolean(selectedChecklistState[item])}
                          onChange={() => toggleChecklistItem(selectedSession.id, item)}
                          disabled={isInstrumentComingSoon}
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="detail-section">
                  <div className="detail-section-header">
                    <h4>Notes</h4>
                    <span>Saved locally</span>
                  </div>
                  <textarea
                    className="session-notes"
                    rows="7"
                    value={sessionNotes[selectedSession.id] ?? ''}
                    onChange={(event) => updateSessionNote(selectedSession.id, event.target.value)}
                    readOnly={isInstrumentComingSoon}
                    placeholder="Capture takeaways, instructor notes, weak spots, or questions for next time."
                  />
                </section>
              </section>
            ) : null}
          </section>
        )}

        {activeTab === 'progress' && (
          <section className="tab-content">
            <section className="progress-section">
              <div className="section-heading">
                <p className="eyebrow">Your progress</p>
                <h2>Training snapshot</h2>
              </div>

              {latestProgressSnapshot ? (
                <article className="stat-card wide">
                  <span className="stat-label">Latest progress snapshot</span>
                  <strong className="stat-value">{latestProgressSnapshot.completion_pct}%</strong>
                  <span className="stat-helper">
                    {latestProgressSnapshot.completed_lessons}/{latestProgressSnapshot.total_lessons} lessons completed
                  </span>
                </article>
              ) : (
                <p style={{ color: '#cbd5e1' }}>No progress snapshots saved yet.</p>
              )}

              {latestOralSession ? (
                <article className="stat-card wide">
                  <span className="stat-label">Latest oral review</span>
                  <strong className="stat-value">{latestOralSession.pct}%</strong>
                  <span className="stat-helper">
                    {latestOralSession.topic} · {latestOralSession.correct}/{latestOralSession.total} correct
                  </span>
                  {latestOralSession.missed_questions?.length ? (
                    <ul className="detail-list" style={{ marginTop: '16px' }}>
                      {latestOralSession.missed_questions.map((question) => (
                        <li key={question}>{question}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ) : (
                <p style={{ color: '#cbd5e1' }}>No oral reviews logged yet.</p>
              )}

              <div style={{ marginTop: '24px' }}>
                <h3 style={{ color: '#e2e8f0', marginBottom: '16px' }}>Lessons by status</h3>
                <div className="stats-grid">
                  <article className="stat-card">
                    <span className="stat-label">Completed</span>
                    <strong className="stat-value">{completedSessions.length}</strong>
                  </article>
                  <article className="stat-card">
                    <span className="stat-label">In progress</span>
                    <strong className="stat-value">{inProgressSessions.length}</strong>
                  </article>
                  <article className="stat-card">
                    <span className="stat-label">Planned</span>
                    <strong className="stat-value">{plannedSessions.length}</strong>
                  </article>
                </div>
              </div>
            </section>
          </section>
        )}

        {activeTab === 'copi' && (
          <section className="tab-content chat-content">
            <div className="chat-container">
              <div className="chat-messages">
                {chatMessages.length === 0 ? (
                  <div className="chat-welcome">
                    <p className="eyebrow">Welcome to CoPi</p>
                    <h3>Hey! I'm your AI flight training assistant.</h3>
                    <p>Ask me anything about your training, need help with a concept, or want study tips. I'm here to help you succeed!</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className={`chat-message ${msg.role}`}>
                      <div className="chat-bubble">
                        <p>{msg.content}</p>
                        <span className="chat-time">{msg.timestamp}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="chat-input-area">
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Ask CoPi anything about your training..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button
                  className="chat-send-button"
                  onClick={handleSendMessage}
                  type="button"
                  disabled={!chatInput.trim()}
                >
                  Send
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="tabs-nav-bottom">
          <button
            className={`tab-bubble ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            type="button"
          >
            Dashboard
          </button>
          <button
            className={`tab-bubble ${activeTab === 'syllabus' ? 'active' : ''}`}
            onClick={() => setActiveTab('syllabus')}
            type="button"
          >
            Syllabus
          </button>
          <button
            className={`tab-bubble copi-tab ${activeTab === 'copi' ? 'active' : ''}`}
            onClick={() => setActiveTab('copi')}
            type="button"
          >
            CoPi
          </button>
          <button
            className={`tab-bubble ${activeTab === 'progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('progress')}
            type="button"
          >
            Progress
          </button>
          <button
            className={`tab-bubble blank-tab ${activeTab === 'blank' ? 'active' : ''}`}
            onClick={() => setActiveTab('blank')}
            type="button"
          >
            Soon
          </button>
        </section>

        {activeTab === 'blank' && (
          <section className="tab-content">
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#cbd5e1' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Coming soon...</p>
              <p style={{ color: '#94a3b8' }}>We're working on something new to help you.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
