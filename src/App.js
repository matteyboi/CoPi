import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import copiLogo from './7F5D28DA-9DA4-47A8-83DA-F88671CB6067-removebg-preview.png';
import { initializeData, oralSessions as defaultOralSessions, progressHistory as defaultProgressHistory, syllabus as defaultSyllabus } from './data/syllabusData';

const STORAGE_KEY = 'ai-flight-syllabus-progress-v1';
const NOTES_STORAGE_KEY = 'ai-flight-syllabus-notes-v1';
const CHECKLIST_STORAGE_KEY = 'ai-flight-syllabus-checklist-v1';
const RATING_STORAGE_KEY = 'ai-flight-syllabus-rating-v1';
const CHAT_THREADS_STORAGE_KEY = 'ai-flight-syllabus-chat-threads-v1';
const ACTIVE_CHAT_THREAD_STORAGE_KEY = 'ai-flight-syllabus-chat-active-thread-v1';
const LEGACY_CHAT_STORAGE_KEY = 'ai-flight-syllabus-chat-v1';
const CHAT_CONTEXT_STORAGE_KEY = 'ai-flight-syllabus-chat-context-v1';
const STUDENT_NAME_STORAGE_KEY = 'ai-flight-syllabus-student-name-v1';
const STUDENT_PROFILES_STORAGE_KEY = 'ai-flight-syllabus-student-profiles-v1';
const CLEAR_UNDO_TIMEOUT_MS = 5000;

const statusLabel = {
  completed: 'Completed',
  'in-progress': 'In Progress',
  planned: 'Planned',
};

const statusOrder = ['planned', 'in-progress', 'completed'];

const GENERIC_CHAT_TITLES = new Set(['Conversation', 'New chat']);

const createDefaultChatThread = () => ({
  id: 'chat-default',
  title: 'Conversation',
  pinned: false,
  updatedAt: new Date().toISOString(),
  messages: [],
});

const normalizeStudentKey = (name) => String(name || '').trim().toLowerCase() || 'default-student';

const readStudentProfiles = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem(STUDENT_PROFILES_STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
};

const writeStudentProfiles = (profiles) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STUDENT_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
};

const isGenericChatTitle = (title) => GENERIC_CHAT_TITLES.has(title) || /^Chat \d+$/.test(String(title || ''));

const sanitizeThreadTitle = (title, fallback = 'Conversation') => {
  const nextTitle = String(title || '')
    .replace(/\s+/g, ' ')
    .replace(/^['"“”‘’]+|['"“”‘’]+$/g, '')
    .trim()
    .slice(0, 48);

  return nextTitle || fallback;
};

const buildFallbackThreadTitle = (messages) => {
  const firstUserMessage = messages.find((message) => message.role === 'user' && message.content)?.content;
  if (!firstUserMessage) {
    return 'Conversation';
  }

  const compact = String(firstUserMessage)
    .replace(/\s+/g, ' ')
    .replace(/[?.!].*$/, '')
    .trim();

  if (!compact) {
    return 'Conversation';
  }

  const words = compact.split(' ').slice(0, 6).join(' ');
  return sanitizeThreadTitle(words, 'Conversation');
};

function App() {
  const [dataLoading, setDataLoading] = useState(true);
  const [syllabus, setSyllabus] = useState(defaultSyllabus);
  const [activeStudentName, setActiveStudentName] = useState(() => {
    if (typeof window === 'undefined') {
      return defaultSyllabus.student;
    }

    return window.localStorage.getItem(STUDENT_NAME_STORAGE_KEY) || defaultSyllabus.student;
  });
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
  const [chatThreads, setChatThreads] = useState(() => {
    if (typeof window === 'undefined') {
      return [
        {
          id: 'chat-default',
          title: 'Conversation',
          pinned: false,
          updatedAt: new Date().toISOString(),
          messages: [],
        },
      ];
    }

    try {
      const storedThreads = JSON.parse(window.localStorage.getItem(CHAT_THREADS_STORAGE_KEY) ?? '[]');
      if (Array.isArray(storedThreads) && storedThreads.length) {
        return storedThreads;
      }

      const legacyMessages = JSON.parse(window.localStorage.getItem(LEGACY_CHAT_STORAGE_KEY) ?? '[]');
      if (Array.isArray(legacyMessages) && legacyMessages.length) {
        return [
          {
            id: 'chat-default',
            title: 'Conversation',
            pinned: false,
            updatedAt: new Date().toISOString(),
            messages: legacyMessages,
          },
        ];
      }
    } catch {
      return [
        {
          id: 'chat-default',
          title: 'Conversation',
          pinned: false,
          updatedAt: new Date().toISOString(),
          messages: [],
        },
      ];
    }

    return [
      {
        id: 'chat-default',
        title: 'Conversation',
        pinned: false,
        updatedAt: new Date().toISOString(),
        messages: [],
      },
    ];
  });
  const [activeChatThreadId, setActiveChatThreadId] = useState(() => {
    if (typeof window === 'undefined') {
      return 'chat-default';
    }

    return window.localStorage.getItem(ACTIVE_CHAT_THREAD_STORAGE_KEY) ?? 'chat-default';
  });
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [ratingMenuOpen, setRatingMenuOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(() => {
    if (typeof window === 'undefined') {
      return 'Private Pilot';
    }

    return window.localStorage.getItem(RATING_STORAGE_KEY) ?? 'Private Pilot';
  });
  const [useLessonContext, setUseLessonContext] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    const stored = window.localStorage.getItem(CHAT_CONTEXT_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });
  const [isContextPreviewOpen, setIsContextPreviewOpen] = useState(false);
  const [isOralExamMode, setIsOralExamMode] = useState(false);
  const [savedReplyId, setSavedReplyId] = useState(null);
  const [copiedReplyId, setCopiedReplyId] = useState(null);
  const [noteToastMessage, setNoteToastMessage] = useState('');
  const [chatBackendStatus, setChatBackendStatus] = useState({
    level: 'checking',
    message: 'Checking CoPi backend...',
  });
  const [clearUndoState, setClearUndoState] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [promptModal, setPromptModal] = useState(null);
  const [promptValue, setPromptValue] = useState('');
  const chatMessagesRef = useRef(null);
  const wasNearBottomRef = useRef(true);
  const previousThreadIdRef = useRef(null);
  const clearUndoTimeoutRef = useRef(null);
  const hasInitializedStudentProfileRef = useRef(false);
  const importProfilesInputRef = useRef(null);

  const openConfirmModal = ({ title, body, confirmLabel = 'Confirm', danger = false, onConfirm }) => {
    setConfirmModal({ title, body, confirmLabel, danger, onConfirm });
  };

  const openPromptModal = ({ title, placeholder = '', defaultValue = '', onConfirm }) => {
    setPromptValue(defaultValue);
    setPromptModal({ title, placeholder, onConfirm });
  };

  const hydrateStudentProfile = useCallback((profile) => {
    if (profile) {
      setSessionStatuses(profile.sessionStatuses ?? {});
      setSessionNotes(profile.sessionNotes ?? {});
      setSessionChecklist(profile.sessionChecklist ?? {});
      setSelectedRating(profile.selectedRating ?? 'Private Pilot');
      setChatThreads(profile.chatThreads?.length ? profile.chatThreads : [createDefaultChatThread()]);
      setActiveChatThreadId(profile.activeChatThreadId ?? 'chat-default');
      setUseLessonContext(profile.useLessonContext ?? true);
      return;
    }

    setSessionStatuses({});
    setSessionNotes({});
    setSessionChecklist({});
    setSelectedRating('Private Pilot');
    const starterThread = createDefaultChatThread();
    setChatThreads([starterThread]);
    setActiveChatThreadId(starterThread.id);
    setUseLessonContext(true);
  }, []);

  useEffect(() => {
    initializeData().then((data) => {
      setSyllabus({
        ...data.syllabus,
        student: activeStudentName,
      });
      setProgressHistory(data.progressHistory);
      setOralSessions(data.oralSessions);
      setDataLoading(false);
    });
  }, [activeStudentName]);

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
    window.localStorage.setItem(CHAT_THREADS_STORAGE_KEY, JSON.stringify(chatThreads));
  }, [chatThreads]);

  useEffect(() => {
    window.localStorage.setItem(ACTIVE_CHAT_THREAD_STORAGE_KEY, activeChatThreadId);
  }, [activeChatThreadId]);

  useEffect(() => {
    window.localStorage.setItem(RATING_STORAGE_KEY, selectedRating);
  }, [selectedRating]);

  useEffect(() => {
    window.localStorage.setItem(CHAT_CONTEXT_STORAGE_KEY, String(useLessonContext));
  }, [useLessonContext]);

  useEffect(() => {
    if (dataLoading) {
      return;
    }

    const studentKey = normalizeStudentKey(activeStudentName);
    const profiles = readStudentProfiles();
    const profile = profiles[studentKey];

    if (!hasInitializedStudentProfileRef.current) {
      hasInitializedStudentProfileRef.current = true;
      if (!profile) {
        return;
      }
    }

    if (profile) {
      setSessionStatuses(profile.sessionStatuses ?? {});
      setSessionNotes(profile.sessionNotes ?? {});
      setSessionChecklist(profile.sessionChecklist ?? {});
      setSelectedRating(profile.selectedRating ?? 'Private Pilot');
      setChatThreads(profile.chatThreads?.length ? profile.chatThreads : [createDefaultChatThread()]);
      setActiveChatThreadId(profile.activeChatThreadId ?? 'chat-default');
      setUseLessonContext(profile.useLessonContext ?? true);
      return;
    }

    setSessionStatuses({});
    setSessionNotes({});
    setSessionChecklist({});
    setSelectedRating('Private Pilot');
    const starterThread = createDefaultChatThread();
    setChatThreads([starterThread]);
    setActiveChatThreadId(starterThread.id);
    setUseLessonContext(true);
  }, [activeStudentName, dataLoading]);

  useEffect(() => {
    if (dataLoading || !activeStudentName) {
      return;
    }

    const profiles = readStudentProfiles();
    profiles[normalizeStudentKey(activeStudentName)] = {
      studentName: activeStudentName,
      sessionStatuses,
      sessionNotes,
      sessionChecklist,
      selectedRating,
      chatThreads,
      activeChatThreadId,
      useLessonContext,
    };
    writeStudentProfiles(profiles);
  }, [
    activeChatThreadId,
    activeStudentName,
    chatThreads,
    dataLoading,
    selectedRating,
    sessionChecklist,
    sessionNotes,
    sessionStatuses,
    useLessonContext,
  ]);

  useEffect(() => {
    if (!activeStudentName) {
      return;
    }

    window.localStorage.setItem(STUDENT_NAME_STORAGE_KEY, activeStudentName);
  }, [activeStudentName]);

  useEffect(() => {
    if (!savedReplyId && !copiedReplyId && !noteToastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSavedReplyId(null);
      setCopiedReplyId(null);
      setNoteToastMessage('');
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [savedReplyId, copiedReplyId, noteToastMessage]);

  useEffect(
    () => () => {
      if (clearUndoTimeoutRef.current) {
        window.clearTimeout(clearUndoTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedInsideMenuCluster = Boolean(
        e.target.closest('.hero-menu-button')
          || e.target.closest('.hero-menu-dropdown')
          || e.target.closest('.hero-user-dropdown')
          || e.target.closest('.hero-settings-dropdown')
          || e.target.closest('.hero-help-panel')
      );

      if (!clickedInsideMenuCluster) {
        if (menuOpen) setMenuOpen(false);
        if (showUserDropdown) setShowUserDropdown(false);
        if (showSettingsDropdown) setShowSettingsDropdown(false);
        if (showHelpPanel) setShowHelpPanel(false);
      }

      if (ratingMenuOpen && !e.target.closest('.hero-rating-toggle') && !e.target.closest('.hero-rating-dropdown')) {
        setRatingMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpen, ratingMenuOpen, showHelpPanel, showSettingsDropdown, showUserDropdown]);

  useEffect(() => {
    if (!chatThreads.length) {
      return;
    }

    const activeExists = chatThreads.some((thread) => thread.id === activeChatThreadId);
    if (!activeExists) {
      setActiveChatThreadId(chatThreads[0].id);
    }
  }, [activeChatThreadId, chatThreads]);

  useEffect(() => {
    let ignore = false;

    const checkBackendHealth = async () => {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) {
          throw new Error('Health check failed');
        }

        const data = await response.json();
        if (!ignore) {
          if (data?.aiConfigured) {
            setChatBackendStatus({
              level: 'online',
              message: `CoPi AI connected${data?.model ? ` (${data.model})` : ''}.`,
            });
          } else {
            setChatBackendStatus({
              level: 'missing-key',
              message: 'CoPi backend is online, but OPENAI_API_KEY is missing.',
            });
          }
        }
      } catch {
        if (!ignore) {
          setChatBackendStatus({
            level: 'offline',
            message: 'CoPi backend is offline. Start with npm run dev.',
          });
        }
      }
    };

    checkBackendHealth();

    return () => {
      ignore = true;
    };
  }, []);

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
  const visibleChatThreads = useMemo(
    () => [...chatThreads].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    [chatThreads]
  );
  const activeChatThread = useMemo(
    () => chatThreads.find((thread) => thread.id === activeChatThreadId) ?? chatThreads[0] ?? null,
    [activeChatThreadId, chatThreads]
  );
  const previousChatThreads = useMemo(
    () => visibleChatThreads.filter((thread) => thread.id !== activeChatThreadId && thread.messages.length > 0),
    [activeChatThreadId, visibleChatThreads]
  );
  const chatMessages = activeChatThread?.messages ?? [];
  const buildOralExamStarterPrompt = useCallback(() => {
    if (useLessonContext && selectedSession) {
      return `Start an oral exam for ${selectedSession.title}. Ask me one question at a time, wait for my answer, then give brief feedback and ask the next question.`;
    }

    return 'Start a private pilot oral exam. Ask me one question at a time, wait for my answer, then give brief feedback and ask the next question.';
  }, [selectedSession, useLessonContext]);

  const quickPrompts = useMemo(() => {
    if (isOralExamMode) {
      if (useLessonContext && selectedSession) {
        return [
          'Start oral exam',
          `5 oral questions: ${selectedSession.title}`,
          `Hard oral: ${selectedSession.title}`,
        ];
      }

      return [
        'Start oral exam',
        '5 oral questions',
        'Tricky oral question',
      ];
    }

    if (!useLessonContext || !selectedSession) {
      return [
        'Study plan',
        'Quiz me',
        'Top mistakes',
      ];
    }

    const lessonType = String(selectedSession.type || 'lesson').toLowerCase();
    const lessonStatus = String(selectedSession.status || 'planned').toLowerCase();
    const lessonTitle = selectedSession.title || 'this lesson';
    const primaryObjective = selectedSession.objectives?.[0] || 'the key standard for this lesson';

    const typePrompt = lessonType === 'flight'
      ? `Give me a flight brief for ${lessonTitle} with setup, tolerances, and common errors.`
      : lessonType === 'ground'
        ? `Teach me ${lessonTitle} in plain language, then quiz me with 3 oral questions.`
        : `Give me an efficient study strategy for ${lessonTitle} and what to memorize first.`;

    const statusPrompt = lessonStatus === 'completed'
      ? `Debrief: ${lessonTitle}`
      : lessonStatus === 'in-progress'
        ? `Focus: ${lessonTitle}`
        : `Prep: ${lessonTitle}`;

    return [
      `Quiz: ${lessonTitle}`,
      typePrompt.replace('Give me a flight brief for ', 'Brief: ').replace('Teach me ', 'Teach: ').replace('Give me an efficient study strategy for ', 'Study: ').replace(' with setup, tolerances, and common errors.', '').replace(' in plain language, then quiz me with 3 oral questions.', '').replace(' and what to memorize first.', ''),
      statusPrompt,
    ];
  }, [buildOralExamStarterPrompt, isOralExamMode, selectedSession, useLessonContext]);
  const chatContextPayload = useMemo(
    () => ({
      student: syllabus.student,
      rating: selectedRating,
      copiMode: isOralExamMode ? 'oral-exam' : 'coach',
      useLessonContext,
      lessonTitle: useLessonContext ? selectedSession?.title : null,
      lessonFocus: useLessonContext ? selectedSession?.focus : null,
      lessonType: useLessonContext ? selectedSession?.type : null,
      lessonStatus: useLessonContext ? selectedSession?.status : null,
      objectives: useLessonContext ? selectedSession?.objectives ?? [] : [],
      checklistProgress: useLessonContext
        ? `${selectedChecklistCompleted}/${selectedSession?.checklist?.length ?? 0}`
        : null,
      notes: useLessonContext && selectedSession ? sessionNotes[selectedSession.id] ?? '' : '',
    }),
    [
      selectedChecklistCompleted,
      selectedRating,
      selectedSession,
      sessionNotes,
      syllabus.student,
      isOralExamMode,
      useLessonContext,
    ]
  );

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

  const handleChatMessagesScroll = () => {
    const node = chatMessagesRef.current;
    if (!node) {
      return;
    }

    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    wasNearBottomRef.current = distanceFromBottom < 80;
  };

  useEffect(() => {
    if (activeTab !== 'copi') {
      return;
    }

    const node = chatMessagesRef.current;
    if (!node) {
      return;
    }

    const threadChanged = previousThreadIdRef.current !== activeChatThreadId;
    previousThreadIdRef.current = activeChatThreadId;

    if (threadChanged || wasNearBottomRef.current) {
      node.scrollTop = node.scrollHeight;
    }
  }, [activeTab, activeChatThreadId, chatMessages.length]);

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

  const createChatThread = () => {
    const newThread = {
      id: `chat-${Date.now()}`,
      title: 'New chat',
      pinned: false,
      updatedAt: new Date().toISOString(),
      messages: [],
    };

    setChatThreads((currentThreads) => [newThread, ...currentThreads]);
    setActiveChatThreadId(newThread.id);
  };

  const scheduleClearUndo = (snapshot, message) => {
    if (clearUndoTimeoutRef.current) {
      window.clearTimeout(clearUndoTimeoutRef.current);
    }

    setClearUndoState({
      snapshot,
      message: `${message} (Undo ${Math.round(CLEAR_UNDO_TIMEOUT_MS / 1000)}s)`,
    });

    clearUndoTimeoutRef.current = window.setTimeout(() => {
      setClearUndoState(null);
      clearUndoTimeoutRef.current = null;
    }, CLEAR_UNDO_TIMEOUT_MS);
  };

  const undoClearAction = () => {
    if (!clearUndoState) {
      return;
    }

    setChatThreads(clearUndoState.snapshot.chatThreads);
    setActiveChatThreadId(clearUndoState.snapshot.activeChatThreadId);
    setClearUndoState(null);

    if (clearUndoTimeoutRef.current) {
      window.clearTimeout(clearUndoTimeoutRef.current);
      clearUndoTimeoutRef.current = null;
    }
  };

  const clearActiveChat = () => {
    if (!activeChatThread) {
      return;
    }

    openConfirmModal({
      title: 'Clear Chat Thread',
      body: `Clear all messages in "${activeChatThread.title}"? This cannot be undone.`,
      confirmLabel: 'Clear',
      danger: true,
      onConfirm: () => {
        const snapshot = {
          chatThreads,
          activeChatThreadId,
        };

        setChatThreads((currentThreads) =>
          currentThreads.map((thread) =>
            thread.id === activeChatThread.id
              ? {
                  ...thread,
                  messages: [],
                  updatedAt: new Date().toISOString(),
                }
              : thread
          )
        );

        scheduleClearUndo(snapshot, `Cleared ${activeChatThread.title}`);
      },
    });
  };

  const deleteChatThread = (threadId) => {
    if (!threadId) {
      return;
    }

    const threadToDelete = chatThreads.find((thread) => thread.id === threadId);
    if (!threadToDelete) {
      return;
    }

    openConfirmModal({
      title: 'Delete Conversation',
      body: `Delete "${threadToDelete.title}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => {
        const snapshot = {
          chatThreads,
          activeChatThreadId,
        };

        setChatThreads((currentThreads) => {
          const remainingThreads = currentThreads.filter((thread) => thread.id !== threadId);
          if (remainingThreads.length > 0) {
            return remainingThreads;
          }

          return [createDefaultChatThread()];
        });

        if (threadId === activeChatThreadId) {
          const fallbackThread = chatThreads.find((thread) => thread.id !== threadId);
          setActiveChatThreadId(fallbackThread?.id ?? 'chat-default');
        }

        scheduleClearUndo(snapshot, `Deleted ${threadToDelete.title}`);
      },
    });
  };

  const clearAllChatHistory = () => {
    openConfirmModal({
      title: 'Clear Active Chat',
      body: `Clear all messages in "${activeChatThread?.title || 'this chat'}"? This cannot be undone.`,
      confirmLabel: 'Clear All',
      danger: true,
      onConfirm: () => {
        const snapshot = {
          chatThreads,
          activeChatThreadId,
        };

        if (!activeChatThread) {
          return;
        }

        setChatThreads((currentThreads) =>
          currentThreads.map((thread) =>
            thread.id === activeChatThread.id
              ? {
                  ...thread,
                  messages: [],
                  updatedAt: new Date().toISOString(),
                }
              : thread
          )
        );

        scheduleClearUndo(snapshot, `Cleared ${activeChatThread.title}`);
      },
    });
  };

  const exportSelectedSessionNotes = () => {
    if (!selectedSession) {
      return;
    }

    const noteText = sessionNotes[selectedSession.id] ?? '';
    const fileSafeTitle = selectedSession.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
    const exportBody = [
      `Lesson: ${selectedSession.title}`,
      `Stage: ${selectedSession.stageTitle}`,
      `Type: ${selectedSession.type}`,
      `Status: ${statusLabel[selectedSession.status]}`,
      `Checklist: ${selectedChecklistCompleted}/${selectedSession.checklist?.length ?? 0}`,
      `Exported: ${new Date().toLocaleString()}`,
      '',
      'Notes',
      '-----',
      noteText || 'No notes yet.',
    ].join('\n');

    const blob = new Blob([exportBody], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileSafeTitle || 'lesson-notes'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    setNoteToastMessage(`Exported notes for ${selectedSession.title}`);
  };

  const startOralExamMode = () => {
    setIsOralExamMode(true);
    handleSendMessage(buildOralExamStarterPrompt(), {
      ...chatContextPayload,
      copiMode: 'oral-exam',
    });
  };

  const maybeGenerateThreadTitle = useCallback(async (threadId, messages, context, currentTitle) => {
    if (!threadId || !isGenericChatTitle(currentTitle)) {
      return;
    }

    const fallbackTitle = buildFallbackThreadTitle(messages);

    try {
      const response = await fetch('/api/chat/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, context }),
      });

      if (!response.ok) {
        throw new Error('Title generation unavailable');
      }

      const data = await response.json();
      const nextTitle = sanitizeThreadTitle(data?.title, fallbackTitle);

      setChatThreads((currentThreads) =>
        currentThreads.map((thread) =>
          thread.id === threadId && isGenericChatTitle(thread.title)
            ? { ...thread, title: nextTitle }
            : thread
        )
      );
    } catch {
      setChatThreads((currentThreads) =>
        currentThreads.map((thread) =>
          thread.id === threadId && isGenericChatTitle(thread.title)
            ? { ...thread, title: fallbackTitle }
            : thread
        )
      );
    }
  }, []);

  const saveReplyToLessonNotes = (messageId, content) => {
    if (!selectedSession || isInstrumentComingSoon) {
      return;
    }

    const existingNote = sessionNotes[selectedSession.id] ?? '';
    const stampedLine = `[CoPi ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}] ${content}`;
    const nextNote = existingNote ? `${existingNote}\n\n${stampedLine}` : stampedLine;

    updateSessionNote(selectedSession.id, nextNote);
    setSavedReplyId(messageId);
    setNoteToastMessage(`Saved to notes for ${selectedSession.title}`);
  };

  const copyReplyToClipboard = async (messageId, content) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const fallbackInput = document.createElement('textarea');
        fallbackInput.value = content;
        fallbackInput.setAttribute('readonly', '');
        fallbackInput.style.position = 'absolute';
        fallbackInput.style.left = '-9999px';
        document.body.appendChild(fallbackInput);
        fallbackInput.select();
        document.execCommand('copy');
        document.body.removeChild(fallbackInput);
      }

      setCopiedReplyId(messageId);
      setNoteToastMessage('Copied response');
    } catch (_error) {
      setNoteToastMessage('Unable to copy right now');
    }
  };

  const handleSendMessage = async (overrideInput = null, overrideContext = null) => {
    const nextInput = String(overrideInput ?? chatInput).trim();
    if (!nextInput || isSendingChat || !activeChatThread) return;

    // Capture thread ID now to avoid stale closure during async streaming
    const threadId = activeChatThread.id;

    const newMessage = {
      id: Date.now(),
      role: 'user',
      content: nextInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...chatMessages, newMessage];
    const shouldAutoTitleThread = isGenericChatTitle(activeChatThread.title)
      && updatedMessages.filter((message) => message.role === 'user').length === 1;

    setChatThreads((currentThreads) =>
      currentThreads.map((thread) =>
        thread.id === threadId
          ? { ...thread, messages: updatedMessages, updatedAt: new Date().toISOString() }
          : thread
      )
    );

    if (shouldAutoTitleThread) {
      maybeGenerateThreadTitle(threadId, updatedMessages, overrideContext ?? chatContextPayload, activeChatThread.title);
    }

    setChatInput('');
    setIsSendingChat(true);

    // Insert a streaming placeholder message immediately so the user sees activity
    const streamMsgId = Date.now() + 1;
    setChatThreads((currentThreads) =>
      currentThreads.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              messages: [
                ...updatedMessages,
                {
                  id: streamMsgId,
                  role: 'assistant',
                  content: '',
                  isStreaming: true,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ],
            }
          : thread
      )
    );

    try {
      let receivedDelta = false;
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, context: overrideContext ?? chatContextPayload }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Chat service is unavailable right now.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamError = null;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break outer;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) { streamError = parsed.error; break outer; }
            if (parsed.delta) {
              if (!receivedDelta) {
                receivedDelta = true;
                setChatBackendStatus({
                  level: 'online',
                  message: 'CoPi online · Live responses active',
                });
              }
              setChatThreads((currentThreads) =>
                currentThreads.map((thread) =>
                  thread.id === threadId
                    ? {
                        ...thread,
                        messages: thread.messages.map((m) =>
                          m.id === streamMsgId ? { ...m, content: m.content + parsed.delta } : m
                        ),
                      }
                    : thread
                )
              );
            }
          } catch {}
        }
      }

      if (streamError) {
        const missingKey = String(streamError).toLowerCase().includes('api key');
        setChatBackendStatus(
          missingKey
            ? {
                level: 'missing-key',
                message: 'CoPi backend online, but OPENAI_API_KEY is missing or invalid.',
              }
            : {
                level: 'offline',
                message: 'CoPi backend error. Check API logs and try again.',
              }
        );
        setChatThreads((currentThreads) =>
          currentThreads.map((thread) =>
            thread.id === threadId
              ? {
                  ...thread,
                  messages: thread.messages.map((m) =>
                    m.id === streamMsgId
                      ? { ...m, content: `CoPi encountered an error: ${streamError}` }
                      : m
                  ),
                }
              : thread
          )
        );
      }
    } catch (_error) {
      setChatThreads((currentThreads) =>
        currentThreads.map((thread) =>
          thread.id === threadId
            ? {
                ...thread,
                messages: thread.messages.map((m) =>
                  m.id === streamMsgId
                    ? {
                        ...m,
                        content:
                          'CoPi could not reach the chat backend. Start the API server with `npm run server` (or `npm run dev`).',
                      }
                    : m
                ),
              }
            : thread
        )
      );
      setChatBackendStatus({
        level: 'offline',
        message: 'CoPi backend is offline. Start with npm run dev.',
      });
    } finally {
      // Mark streaming complete and persist updatedAt
      setChatThreads((currentThreads) =>
        currentThreads.map((thread) =>
          thread.id === threadId
            ? {
                ...thread,
                messages: thread.messages.map((m) =>
                  m.id === streamMsgId ? { ...m, isStreaming: false } : m
                ),
                updatedAt: new Date().toISOString(),
              }
            : thread
        )
      );
      setIsSendingChat(false);
    }
  };

  const handleChatInputKeyDown = (event) => {
    if (event.key === 'Escape' && isContextPreviewOpen) {
      setIsContextPreviewOpen(false);
      return;
    }

    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSendMessage();
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const getExistingStudents = () => {
    const profiles = readStudentProfiles();
    const studentNames = new Set();

    if (activeStudentName) {
      studentNames.add(activeStudentName);
    }

    Object.entries(profiles).forEach(([studentKey, profile]) => {
      const profileName = profile?.studentName;
      const resolvedName = String(profileName || studentKey || '').trim();
      if (resolvedName) {
        studentNames.add(resolvedName);
      }
    });

    return Array.from(studentNames).sort((a, b) => a.localeCompare(b));
  };

  const handleUserSelection = (studentName) => {
    if (studentName === 'ADD_NEW') {
      setShowUserDropdown(false);
      setMenuOpen(false);
      openPromptModal({
        title: 'Add Student',
        placeholder: 'Enter student name...',
        defaultValue: '',
        onConfirm: (newStudentName) => {
          const sanitizedName = newStudentName.trim().slice(0, 48);
          if (!sanitizedName) {
            return;
          }

          setActiveStudentName(sanitizedName);
          setSyllabus((current) => ({
            ...current,
            student: sanitizedName,
          }));
          setNoteToastMessage(`Created new student profile: ${sanitizedName}`);
        },
      });
    } else {
      setActiveStudentName(studentName);
      setSyllabus((current) => ({
        ...current,
        student: studentName,
      }));
      setNoteToastMessage(`Switched user to ${studentName}`);
      setShowUserDropdown(false);
      setMenuOpen(false);
    }
  };

  const toggleSettingsDropdown = () => {
    setMenuOpen(false);
    setShowUserDropdown(false);
    setShowHelpPanel(false);
    setShowSettingsDropdown((isOpen) => !isOpen);
  };

  const toggleHelpPanel = () => {
    setMenuOpen(false);
    setShowUserDropdown(false);
    setShowSettingsDropdown(false);
    setShowHelpPanel((isOpen) => !isOpen);
  };

  const resetCurrentStudentData = () => {
    openConfirmModal({
      title: 'Reset Student Data',
      body: `Reset progress, notes, checklist, and chat for ${activeStudentName}? This cannot be undone.`,
      confirmLabel: 'Reset',
      danger: true,
      onConfirm: () => {
        hydrateStudentProfile(null);
        setIsOralExamMode(false);
        setShowSettingsDropdown(false);
        setMenuOpen(false);
        setNoteToastMessage(`Reset training data for ${activeStudentName}`);
      },
    });
  };

  const exportAllStudentProfiles = () => {
    const profiles = readStudentProfiles();
    profiles[normalizeStudentKey(activeStudentName)] = {
      studentName: activeStudentName,
      sessionStatuses,
      sessionNotes,
      sessionChecklist,
      selectedRating,
      chatThreads,
      activeChatThreadId,
      useLessonContext,
    };

    const fileTimestamp = new Date().toISOString().split('T')[0];
    const fileName = `copi-student-profiles-${fileTimestamp}.json`;
    const payload = JSON.stringify(profiles, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setShowSettingsDropdown(false);
    setMenuOpen(false);
    setNoteToastMessage('Exported student profiles');
  };

  const openImportProfilesPicker = () => {
    importProfilesInputRef.current?.click();
  };

  const importStudentProfiles = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText);

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Invalid profile file format');
      }

      const importedProfiles = Object.entries(parsed).reduce((accumulator, [studentKey, profile]) => {
        if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
          return accumulator;
        }

        const profileStudentName = String(profile.studentName || studentKey || '').trim();
        if (!profileStudentName) {
          return accumulator;
        }

        accumulator[normalizeStudentKey(profileStudentName)] = {
          ...profile,
          studentName: profileStudentName,
        };
        return accumulator;
      }, {});

      const existingProfiles = readStudentProfiles();
      const mergedProfiles = {
        ...existingProfiles,
        ...importedProfiles,
      };

      writeStudentProfiles(mergedProfiles);

      const currentProfile = mergedProfiles[normalizeStudentKey(activeStudentName)];
      if (currentProfile) {
        hydrateStudentProfile(currentProfile);
      }

      const importedCount = Object.keys(importedProfiles).length;
      setNoteToastMessage(`Imported ${importedCount} student profile${importedCount === 1 ? '' : 's'}`);
      setShowSettingsDropdown(false);
      setMenuOpen(false);
    } catch {
      setNoteToastMessage('Could not import profiles. Please use a valid JSON export file.');
    } finally {
      event.target.value = '';
    }
  };

  const switchUser = () => {
    setMenuOpen(false);
    setShowSettingsDropdown(false);
    setShowHelpPanel(false);
    setShowUserDropdown((isOpen) => !isOpen);
  };

  const handleMenuToggle = () => {
    setMenuOpen((isOpen) => {
      const nextState = !isOpen;
      if (!nextState) {
        setShowUserDropdown(false);
        setShowSettingsDropdown(false);
        setShowHelpPanel(false);
      }
      return nextState;
    });
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
            <img src={copiLogo} alt="CoPi" className="hero-logo" />
            <p className="eyebrow">Your flight training companion</p>
          </div>

          <div className="hero-panel">
            <button
              className="hero-menu-button"
              onClick={handleMenuToggle}
              type="button"
              aria-label="Open menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>

            <input
              ref={importProfilesInputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={importStudentProfiles}
            />
            
            {showUserDropdown && (
              <div className="hero-user-dropdown">
                <button
                  type="button"
                  className="user-dropdown-add-new"
                  onClick={() => handleUserSelection('ADD_NEW')}
                >
                  + Add User
                </button>
                <div className="user-dropdown-divider"></div>
                {getExistingStudents().map((studentName) => (
                  <button
                    key={studentName}
                    type="button"
                    className={`user-dropdown-student ${
                      studentName === activeStudentName ? 'active' : ''
                    }`}
                    onClick={() => handleUserSelection(studentName)}
                  >
                    {studentName}
                  </button>
                ))}
              </div>
            )}

            {showSettingsDropdown && (
              <div className="hero-settings-dropdown">
                <div className={`settings-status-card ${chatBackendStatus.level}`} role="status" aria-live="polite">
                  <span className="settings-status-label">CoPi AI</span>
                  <span className="settings-status-message">{chatBackendStatus.message}</span>
                </div>
                <div className="menu-divider"></div>
                <button type="button" onClick={resetCurrentStudentData}>Reset current student data</button>
                <button type="button" onClick={exportAllStudentProfiles}>Export all student profiles</button>
                <button type="button" onClick={openImportProfilesPicker}>Import student profiles</button>
              </div>
            )}

            {showHelpPanel && (
              <div className="hero-help-panel">
                <p className="help-panel-title">How to use CoPi</p>
                <div className="help-section">
                  <p className="help-heading">Switch students</p>
                  <p className="help-body">Tap the menu → Switch user. Each student's progress, notes, and chat are saved separately.</p>
                </div>
                <div className="help-section">
                  <p className="help-heading">Oral exam mode</p>
                  <p className="help-body">Open the CoPi tab, toggle Oral exam mode, then tap Start exam. CoPi will act as an FAA examiner and ask one question at a time.</p>
                </div>
                <div className="help-section">
                  <p className="help-heading">Export &amp; import</p>
                  <p className="help-body">Settings → Export saves all student profiles as a JSON file to your Downloads folder. Use Import to restore or transfer them.</p>
                </div>
                <div className="help-section">
                  <p className="help-heading">Chat is offline?</p>
                  <p className="help-body">Run <code>npm run dev</code> in the project folder to start the backend, then reload the page.</p>
                </div>
                <div className="help-section">
                  <p className="help-heading">Where data is stored</p>
                  <p className="help-body">All progress, notes, and chat history live in your browser's local storage — nothing is sent to a server.</p>
                </div>
              </div>
            )}
            
            {menuOpen && !showUserDropdown && !showSettingsDropdown && !showHelpPanel && (
              <div className="hero-menu-dropdown">
                <button type="button" onClick={switchUser}>Switch user</button>
                <button type="button" onClick={toggleSettingsDropdown}>Settings</button>
                <button type="button" onClick={toggleHelpPanel}>Help</button>
                <div className="menu-divider"></div>
                <button type="button" className="menu-item-muted" disabled>Local mode only</button>
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
                    <div className="detail-section-actions">
                      <span>Saved locally</span>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={exportSelectedSessionNotes}
                        disabled={!selectedSession}
                      >
                        Export notes
                      </button>
                    </div>
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
              <div className="chat-history-bar">
                <div className="chat-history-header">
                  <div className="chat-history-actions">
                    <div className="chat-history-actions-left">
                      <button
                        type="button"
                        className="chat-new-thread-button"
                        onClick={createChatThread}
                      >
                        New chat
                      </button>
                      <details className="chat-history-dropdown">
                        <summary className="chat-history-dropdown-toggle">History</summary>
                        <div className="chat-history-dropdown-menu">
                          {previousChatThreads.length === 0 ? (
                            <p className="chat-history-empty">No previous conversations yet.</p>
                          ) : (
                            previousChatThreads.map((thread) => (
                              <div key={thread.id} className="chat-history-item">
                                <button
                                  type="button"
                                  className="chat-history-item-main"
                                  onClick={() => setActiveChatThreadId(thread.id)}
                                >
                                  <span>{thread.title}</span>
                                  <small>{new Date(thread.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</small>
                                </button>
                                <button
                                  type="button"
                                  className="chat-history-item-delete"
                                  onClick={() => deleteChatThread(thread.id)}
                                  aria-label={`Delete conversation ${thread.title}`}
                                >
                                  ×
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </details>
                    </div>
                    <div className="chat-history-actions-right">
                      <button
                        type="button"
                        className="chat-clear-history-button"
                        onClick={clearAllChatHistory}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {(chatBackendStatus.level === 'offline' || chatBackendStatus.level === 'missing-key') && (
                <div className={`chat-backend-banner ${chatBackendStatus.level}`} role="status" aria-live="polite">
                  {chatBackendStatus.message}
                </div>
              )}

              <div className="chat-messages" ref={chatMessagesRef} onScroll={handleChatMessagesScroll}>
                {chatMessages.length === 0 ? (
                  <div className="chat-welcome">
                    <p className="eyebrow">Welcome to CoPi</p>
                    <h3>Hey! I'm your AI flight training assistant.</h3>
                    <p>Ask me anything about your training, need help with a concept, or want study tips. I'm here to help you succeed!</p>
                    <div className="chat-welcome-prompts" aria-label="Example prompts">
                      <span className="chat-welcome-prompts-label">Try:</span>
                      {quickPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          className="chat-prompt-chip chat-welcome-prompt-chip"
                          onClick={() => setChatInput(prompt)}
                          disabled={isSendingChat}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className={`chat-message ${msg.role}`}>
                      <div className={`chat-bubble${msg.isStreaming ? ' streaming' : ''}`}>
                        <p>{msg.content || (msg.isStreaming ? '\u00a0' : '')}{msg.isStreaming && <span className="chat-bubble-cursor" aria-hidden="true" />}</p>
                        {!msg.isStreaming && (
                          <span className="chat-time">{msg.timestamp}</span>
                        )}
                        {msg.role === 'assistant' && !msg.isStreaming ? (
                          <div className="chat-reply-actions">
                            <button
                              type="button"
                              className="chat-copy-button"
                              onClick={() => copyReplyToClipboard(msg.id, msg.content)}
                            >
                              {copiedReplyId === msg.id ? 'Copied' : 'Copy'}
                            </button>
                            <button
                              type="button"
                              className="chat-save-note-button"
                              onClick={() => saveReplyToLessonNotes(msg.id, msg.content)}
                              disabled={!selectedSession || isInstrumentComingSoon}
                              title={!selectedSession ? 'Select a lesson first to save notes.' : undefined}
                            >
                              {savedReplyId === msg.id ? 'Saved to notes' : 'Save to notes'}
                            </button>
                          </div>
                        ) : null}
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
                  onKeyDown={handleChatInputKeyDown}
                  disabled={isSendingChat}
                />
                <button
                  className="chat-send-button"
                  onClick={handleSendMessage}
                  type="button"
                  disabled={!chatInput.trim() || isSendingChat}
                >
                  {isSendingChat ? 'Sending...' : 'Send'}
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

        {clearUndoState ? (
          <div className="note-save-toast">
            <span>{clearUndoState.message}</span>
            <button type="button" className="note-save-toast-action" onClick={undoClearAction}>Undo</button>
          </div>
        ) : null}
        {!clearUndoState && noteToastMessage ? <div className="note-save-toast">{noteToastMessage}</div> : null}
      </main>

      {confirmModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setConfirmModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <p className="modal-title">{confirmModal.title}</p>
            <p className="modal-body">{confirmModal.body}</p>
            <div className="modal-actions">
              <button type="button" className="modal-btn modal-btn-cancel" onClick={() => setConfirmModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={`modal-btn ${confirmModal.danger ? 'modal-btn-danger' : 'modal-btn-confirm'}`}
                onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {promptModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setPromptModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <p className="modal-title">{promptModal.title}</p>
            <input
              className="modal-input"
              type="text"
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              placeholder={promptModal.placeholder}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') { promptModal.onConfirm(promptValue); setPromptModal(null); }
                if (e.key === 'Escape') { setPromptModal(null); }
              }}
            />
            <div className="modal-actions">
              <button type="button" className="modal-btn modal-btn-cancel" onClick={() => setPromptModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn modal-btn-confirm"
                onClick={() => { promptModal.onConfirm(promptValue); setPromptModal(null); }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
