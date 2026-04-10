import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Status order and labels for session status buttons
const statusOrder = ['planned', 'in-progress', 'completed'];
const statusLabel = {
  planned: 'Planned',
  'in-progress': 'In Progress',
  completed: 'Completed',
};
// --- Utility stubs for missing functions/constants ---
// Modal helpers (implement these in your component as needed)
// function openConfirmModal(props) { ... }
// function openPromptModal(props) { ... }

// Chat thread helpers
function createDefaultChatThread() {
  return {
    id: `chat-${Date.now()}`,
    title: 'Conversation',
    pinned: false,
    updatedAt: new Date().toISOString(),
    messages: [],
  };
}

// Chat title helpers
function isGenericChatTitle(title) {
  return !title || title === 'Conversation' || /^New chat/i.test(title);
}

function buildFallbackThreadTitle(messages) {
  // Use the first user message as a fallback title
  const firstUserMsg = (messages || []).find((m) => m.role === 'user');
  return firstUserMsg ? firstUserMsg.content.slice(0, 32) : 'Conversation';
}

function sanitizeThreadTitle(title, fallback) {
  if (!title) return fallback || 'Conversation';
  return String(title).replace(/["'`]/g, '').trim().slice(0, 32) || fallback || 'Conversation';
}



// Max photo size constant
const STUDENT_PHOTO_MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3MB
import {
  initializeData,
  oralSessions as defaultOralSessions,
  progressHistory as defaultProgressHistory,
  syllabus as defaultSyllabus
} from './data/syllabusData';
import './App.css';
import './instructorHours.css';

import { normalizeStudentKey } from './utils/normalizeStudentKey';
import { readStudentProfiles, writeStudentProfiles } from './utils/studentProfiles';
import {
  STORAGE_KEY,
  NOTES_STORAGE_KEY,
  CHECKLIST_STORAGE_KEY,
  RATING_STORAGE_KEY,
  CHAT_THREADS_STORAGE_KEY,
  ACTIVE_CHAT_THREAD_STORAGE_KEY,
  LEGACY_CHAT_STORAGE_KEY,
  CHAT_CONTEXT_STORAGE_KEY,
  STUDENT_NAME_STORAGE_KEY,
  STUDENT_PROFILES_STORAGE_KEY,
  LESSON_DAYS_STORAGE_KEY,
  BRIEFING_CACHE_STORAGE_KEY,
  INSTRUCTOR_PIN_STORAGE_KEY
} from './storageKeys';

function App() {




              // For progress history expansion
              const [expandedHistoryId, setExpandedHistoryId] = useState(null);

              // ...existing code...

              // Place this after phasesWithProgress is defined
              // Helper: are all Phase 1 tasks complete?
              let allPhase1Complete = false;
              let phase1Idx = -1;
              // This must be after phasesWithProgress is defined
              // (so after the useMemo for phasesWithProgress)
            // Persistent Cross Country Solo checkbox state
            const [crossCountrySoloChecked, setCrossCountrySoloChecked] = useState(() => {
              if (typeof window !== 'undefined') {
                try {
                  const saved = window.localStorage.getItem('cross-country-solo-checked');
                  return saved ? JSON.parse(saved) : false;
                } catch {
                  return false;
                }
              }
              return false;
            });
            const handleCrossCountrySoloCheck = () => {
              setCrossCountrySoloChecked((prev) => {
                const next = !prev;
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem('cross-country-solo-checked', JSON.stringify(next));
                }
                return next;
              });
            };
          const studentPhotoInputRef = useRef(null);
        // --- MISSING REFS ---
        const hasInitializedStudentProfileRef = useRef(false);
        const chatMessagesRef = useRef(null);
        const wasNearBottomRef = useRef(false);
        const previousThreadIdRef = useRef(null);

        // --- MISSING STATE ---
        const [instructorMode, setInstructorMode] = useState(false);
        const [instructorHours, setInstructorHours] = useState('');
        const [pinInput, setPinInput] = useState('');
        const [pinConfirmInput, setPinConfirmInput] = useState('');
        const [pinError, setPinError] = useState('');
        const [instructorPinModal, setInstructorPinModal] = useState(null);
        const [briefingLoading, setBriefingLoading] = useState(false);

        // --- CONSTANTS ---
        const CLEAR_UNDO_TIMEOUT_MS = 5000;
      const importProfilesInputRef = useRef(null);
    const clearUndoTimeoutRef = useRef(null);
  const [endorsementChecks, setEndorsementChecks] = useState({
    Medical: false,
    'TSA Endorsement': false,
    IACRA: false,
  });
  const [selectedEndorsement, setSelectedEndorsement] = useState('');
  const [showEndorsementsDropdown, setShowEndorsementsDropdown] = useState(false);
  const handleEndorsementSelect = (option) => {
    setShowEndorsementsDropdown(false);
    setNoteToastMessage(`Selected endorsement: ${option}`);
  };
  // Cleaned: Only one progressHistory state declaration allowed
  const [hoursError, setHoursError] = useState('');
  const [stage6Checked, setStage6Checked] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('stage6-checks');
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }
    return {};
  });
  const handleStage6Check = (id) => {
    setStage6Checked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('stage6-checks', JSON.stringify(next));
      }
      return next;
    });
  };
  const [dataLoading, setDataLoading] = useState(true);
  const [syllabus, setSyllabus] = useState(defaultSyllabus);
  const [activeStudentName, setActiveStudentName] = useState(() => {
    if (typeof window === 'undefined') {
      return defaultSyllabus.student;
    }
    return window.localStorage.getItem(STUDENT_NAME_STORAGE_KEY) || defaultSyllabus.student;
  });
  const [oralSessions, setOralSessions] = useState(defaultOralSessions);
  const [progressHistory, setProgressHistory] = useState(defaultProgressHistory);
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
  const [sessionDraftStatuses, setSessionDraftStatuses] = useState(() => {
    if (typeof window === 'undefined') {
      return {};
    }

    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    } catch {
      return {};
    }
  });
  const [sessionRatings, setSessionRatings] = useState({});
  const [sessionDraftRatings, setSessionDraftRatings] = useState({});
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
  // All phases collapsed by default
  const [expandedStageIds, setExpandedStageIds] = useState({});
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
      // ignore and fall through to default
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
  // Robust hamburger menu logic (from working demo)
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const menuDropdownRef = useRef(null);
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
  const [studentPhoto, setStudentPhoto] = useState(null);
  const [lessonDays, setLessonDays] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(window.localStorage.getItem(LESSON_DAYS_STORAGE_KEY) ?? '[]');
    } catch { return []; }
  });
  const [dashboardBriefing, setDashboardBriefing] = useState(null);

  const [plannedSessionIds, setPlannedSessionIds] = useState([]);
  const [plannedDraftSessionIds, setPlannedDraftSessionIds] = useState([]);

  useEffect(() => {
    initializeData().then((data) => {
      setSyllabus({
        ...data.syllabus,
        student: activeStudentName,
      });
      setProgressHistory(data.progressHistory);
      setOralSessions(data.oralSessions);
      setExpandedStageIds({}); // Collapse all phases when switching students
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
    window.localStorage.setItem(LESSON_DAYS_STORAGE_KEY, JSON.stringify(lessonDays));
  }, [lessonDays]);

  // Load cached briefing when student switches
  useEffect(() => {
    try {
      const cache = JSON.parse(window.localStorage.getItem(BRIEFING_CACHE_STORAGE_KEY) ?? '{}');
      setDashboardBriefing(cache[normalizeStudentKey(activeStudentName)] ?? null);
    } catch {
      setDashboardBriefing(null);
    }
  }, [activeStudentName]);

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
      const savedStatuses = profile.sessionStatuses ?? {};
      setSessionStatuses(savedStatuses);
      setSessionDraftStatuses(savedStatuses);
      const savedRatings = profile.sessionRatings ?? {};
      setSessionRatings(savedRatings);
      setSessionDraftRatings(savedRatings);
      setSessionNotes(profile.sessionNotes ?? {});
      setSessionChecklist(profile.sessionChecklist ?? {});
      const plannedIds = Array.isArray(profile.plannedSessionIds) ? profile.plannedSessionIds : [];
      setPlannedSessionIds(plannedIds);
      setPlannedDraftSessionIds(plannedIds);
      setSelectedRating(profile.selectedRating ?? 'Private Pilot');
      setChatThreads(profile.chatThreads?.length ? profile.chatThreads : [createChatThread()]);
      setActiveChatThreadId(profile.activeChatThreadId ?? 'chat-default');
      setUseLessonContext(profile.useLessonContext ?? true);
      setStudentPhoto(profile.studentPhoto ?? null);
      return;
    }

    setSessionStatuses({});
    setSessionDraftStatuses({});
    setSessionRatings({});
    setSessionDraftRatings({});
    setSessionNotes({});
    setSessionChecklist({});
    setPlannedSessionIds([]);
    setPlannedDraftSessionIds([]);
    setSelectedRating('Private Pilot');
    const starterThread = createDefaultChatThread();
    setChatThreads([starterThread]);
    setActiveChatThreadId(starterThread.id);
    setUseLessonContext(true);
    setStudentPhoto(null);
  }, [activeStudentName, dataLoading]);

  useEffect(() => {
    if (dataLoading || !activeStudentName) {
      return;
    }

    const profiles = readStudentProfiles();
    profiles[normalizeStudentKey(activeStudentName)] = {
      studentName: activeStudentName,
      sessionStatuses,
      sessionRatings,
      sessionNotes,
      sessionChecklist,
      plannedSessionIds,
      selectedRating,
      chatThreads,
      activeChatThreadId,
      useLessonContext,
      studentPhoto,
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
    sessionRatings,
    plannedSessionIds,
    studentPhoto,
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

  // Robust outside click handler for hamburger menu
  // Robust outside click handler for hamburger menu (from demo)
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e) {
      if (
        menuButtonRef.current?.contains(e.target) ||
        menuDropdownRef.current?.contains(e.target)
      ) {
        return;
      }
      setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

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
      syllabus.phases.map((phase) => {
        // Map sessions to include status and rating
        const sessionsWithStatus = phase.sessions.map((session) => ({
          ...session,
          status: sessionStatuses[session.id] ?? null,
          rating: sessionRatings[session.id] ?? null,
        }));
        // Sort: planned, in-progress, then completed (completed always at the bottom)
        // Only move completed sessions to the bottom; keep others in original order
        const incomplete = sessionsWithStatus.filter(s => s.status !== 'completed');
        const completed = sessionsWithStatus.filter(s => s.status === 'completed');
        const sortedSessions = [...incomplete, ...completed];
        // Preserve original order for incomplete
        sessionsWithStatus.splice(0, sessionsWithStatus.length, ...sortedSessions);
        return {
          ...phase,
          sessions: sessionsWithStatus,
        };
      }),
    [sessionRatings, sessionStatuses, syllabus.phases]
  );

  const allSessions = phasesWithProgress.flatMap((phase) => phase.sessions);
  const plannedSessionIdSet = useMemo(() => new Set(plannedSessionIds), [plannedSessionIds]);
  const plannedDraftSessionIdSet = useMemo(() => new Set(plannedDraftSessionIds), [plannedDraftSessionIds]);
  const plannedLessons = useMemo(
    () => allSessions.filter((session) => plannedSessionIdSet.has(session.id)),
    [allSessions, plannedSessionIdSet]
  );
  const hasPendingStatusChanges = useMemo(() => {
    const statusKeys = new Set([...Object.keys(sessionStatuses), ...Object.keys(sessionDraftStatuses)]);
    for (const key of Array.from(statusKeys)) {
      if ((sessionStatuses[key] ?? '') !== (sessionDraftStatuses[key] ?? '')) {
        return true;
      }
    }
    return false;
  }, [sessionDraftStatuses, sessionStatuses]);
  const hasPendingRatingChanges = useMemo(() => {
    const ratingKeys = new Set([...Object.keys(sessionRatings), ...Object.keys(sessionDraftRatings)]);
    for (const key of Array.from(ratingKeys)) {
      if ((sessionRatings[key] ?? null) !== (sessionDraftRatings[key] ?? null)) {
        return true;
      }
    }
    return false;
  }, [sessionDraftRatings, sessionRatings]);
  const hasPendingPlannedChanges = useMemo(() => {
    if (plannedSessionIds.length !== plannedDraftSessionIds.length) {
      return true;
    }
    return plannedDraftSessionIds.some((id) => !plannedSessionIdSet.has(id))
      || plannedSessionIds.some((id) => !plannedDraftSessionIdSet.has(id));
  }, [plannedDraftSessionIds, plannedSessionIdSet, plannedSessionIds.length]);
  const hasPendingSyllabusChanges = hasPendingStatusChanges || hasPendingPlannedChanges || hasPendingRatingChanges;
  const completedSessions = allSessions.filter((session) => session.status === 'completed');
  const inProgressSessions = allSessions.filter((session) => session.status === 'in-progress');
  const plannedSessions = plannedLessons;
  const nextSession = inProgressSessions[0] || plannedSessions[0];
  const completionRate = allSessions.length
    ? Math.round((completedSessions.length / allSessions.length) * 100)
    : 0;
  const ratedSessions = allSessions.filter((session) => typeof session.rating === 'number');
  const averageLessonRating = ratedSessions.length
    ? (ratedSessions.reduce((total, session) => total + session.rating, 0) / ratedSessions.length).toFixed(1)
    : null;
  const latestOralSession = oralSessions[oralSessions.length - 1] ?? null;
  const latestProgressSnapshot = progressHistory[progressHistory.length - 1] ?? null;

  const isInstrumentComingSoon = selectedRating === 'Instrument - Coming Soon';

  const phaseProgress = useMemo(() => {
      const total = phasesWithProgress.reduce((sum, phase) => sum + phase.sessions.length, 0);
      let cumulative = 0;
      const minOffset = 14; // percent offset for the first marker (increase to move right)
      const maxOffset = 100 - minOffset;
      const phaseCount = phasesWithProgress.length;

      return phasesWithProgress.map((phase, idx) => {
        const completedCount = phase.sessions.filter((session) => session.status === 'completed').length;
        const totalCount = phase.sessions.length;
        cumulative += totalCount;

        // Spread markers from minOffset to maxOffset
        let positionPercent = 0;
        if (phaseCount > 1) {
          positionPercent = minOffset + ((maxOffset) * idx / (phaseCount - 1));
        } else {
          positionPercent = 50;
        }

        return {
          id: phase.id,
          title: phase.title,
          isCompleted: totalCount > 0 && completedCount === totalCount,
          positionPercent,
        };
      });
    }, [phasesWithProgress]);
  const completedPhaseCount = phaseProgress.filter((phase) => phase.isCompleted).length;

  // Improved sequential phase unlocking: only the next phase (or solo) is unlocked after completing the current one
  const phaseLockStates = useMemo(() => {
    // Find phase 2 index
    const phase2Idx = phasesWithProgress.findIndex(p => p.title && p.title.toLowerCase().includes('phase 2'));
    // Find phase 3 index
    const phase3Idx = phasesWithProgress.findIndex(p => p.title && p.title.toLowerCase().includes('phase 3'));
    // Find solo index
    let soloIdx = -1;
    for (let i = 0; i < phasesWithProgress.length; i++) {
      if (phasesWithProgress[i].title && phasesWithProgress[i].title.toLowerCase().includes('solo')) {
        soloIdx = i;
        break;
      }
    }

    // Helper: are all phase 1 tasks complete?
    const phase1Idx = phasesWithProgress.findIndex(p => p.title && p.title.toLowerCase().includes('phase 1'));
    const allPhase1Complete = phase1Idx !== -1 && phasesWithProgress[phase1Idx].sessions.every((session) => session.status === 'completed');
    // Helper: are all endorsements checked?
    const allEndorsementsChecked = endorsementChecks.Medical && endorsementChecks['TSA Endorsement'] && endorsementChecks.IACRA;

    return phasesWithProgress.map((phase, idx) => {
      const isCompleted = phase.sessions.length > 0 && phase.sessions.every((session) => session.status === 'completed');
      let isLocked = true;
      if (idx === 0) {
        isLocked = false; // First phase always unlocked
      } else if (idx === phase2Idx) {
        // Phase 2 is unlocked only if all phase 1 tasks complete AND all endorsements checked
        isLocked = !(allPhase1Complete && allEndorsementsChecked);
      } else if (soloIdx !== -1 && idx === soloIdx) {
        // Solo is unlocked only if phase 2 is complete
        isLocked = !(phase2Idx !== -1 && phasesWithProgress[phase2Idx].sessions.every((session) => session.status === 'completed'));
      } else if (soloIdx !== -1 && idx === phase3Idx) {
        // Phase 3 is unlocked only if solo is complete
        isLocked = !(soloIdx !== -1 && phasesWithProgress[soloIdx].sessions.every((session) => session.status === 'completed'));
      } else {
        // All other phases: unlocked only if previous phase is complete and not solo/phase3 special case
        isLocked = !(idx > 0 && phasesWithProgress[idx - 1].sessions.every((session) => session.status === 'completed'));
      }
      return { id: phase.id, isCompleted, isLocked };
    });
  }, [phasesWithProgress, endorsementChecks]);

  useEffect(() => {
    const firstUnlockedId = phaseLockStates.find((stage) => !stage.isLocked)?.id;
    setExpandedStageIds((current) => {
      const next = {};
      phaseLockStates.forEach((stage) => {
        if (!stage.isLocked && current[stage.id]) {
          next[stage.id] = true;
        }
      });

      if (!Object.keys(next).length && firstUnlockedId) {
        next[firstUnlockedId] = true;
      }

      return next;
    });
  }, [phaseLockStates]);

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
  const hasBriefingInput = lessonDays.some((day) => day.note || day.tasks.some((task) => task.rating != null));
  const visibleChatThreads = useMemo(
    () => [...chatThreads].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
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
    const lessonTitle = selectedSession?.title || 'current lesson';
    const lessonType = String(selectedSession?.type || 'lesson').toLowerCase();
    const lessonStatus = String(selectedSession?.status || 'planned').toLowerCase();
    const primaryObjective = selectedSession?.objectives?.[0] || 'the key standard for this lesson';

    if (isOralExamMode) {
      if (useLessonContext && selectedSession) {
        return [
          {
            label: 'Examiner Warm-Up',
            prompt: `You are my ${selectedRating} oral examiner. Run a warm-up oral for ${lessonTitle}. Ask 5 one-at-a-time questions, wait for my answer each time, then give a quick score and one coaching tip.`
          },
          {
            label: 'Checkride Curveball',
            prompt: `Give me one realistic checkride curveball for ${lessonTitle} (objective: ${primaryObjective}). After I answer, grade it like a DPE and show an ideal answer format.`
          },
          {
            label: 'Rapid-Fire Oral',
            prompt: `Run a rapid-fire oral on ${lessonTitle} for a ${selectedRating} student: 7 short questions, increasing difficulty, then list my top 3 weak spots and exactly what to review next.`
          },
        ];
      }

      return [
        {
          label: 'Examiner Warm-Up',
          prompt: `You are my ${selectedRating} oral examiner. Run a warm-up oral with 5 one-at-a-time questions, then give concise feedback and my biggest weak area.`
        },
        {
          label: 'Checkride Curveball',
          prompt: `Give me one tricky but fair ${selectedRating} oral question. After my answer, evaluate like a DPE and provide the model answer.`
        },
        {
          label: 'Rapid-Fire Oral',
          prompt: `Run a 7-question rapid-fire oral for a ${selectedRating} student and end with a focused next-study checklist.`
        },
      ];
    }

    if (!useLessonContext || !selectedSession) {
      return [
        {
          label: 'ATC Lightning Round',
          prompt: `Create a fun lightning round for a ${selectedRating} student: 8 short scenario questions across regulations, systems, weather, and ADM. Keep it practical and score me after each answer.`
        },
        {
          label: 'Mission Brief Builder',
          prompt: `Build me a 20-minute study mission for my ${selectedRating} training today: warm-up, main drill, and confidence check. Include exact tasks and timing.`
        },
        {
          label: 'Mistake Radar',
          prompt: `List the top 5 mistakes ${selectedRating} students make right now, how to spot each one early, and one corrective habit for each.`
        },
      ];
    }

    const briefLabel = lessonType === 'flight' ? 'Cockpit Gameplan' : lessonType === 'ground' ? 'Hangar Breakdown' : 'Mission Plan';
    const briefPrompt = lessonType === 'flight'
      ? `Build a cockpit gameplan for ${lessonTitle} (${selectedRating}). Output: (1) setup briefing, (2) maneuver tolerances, (3) common errors to avoid, (4) in-flight self-check script.`
      : lessonType === 'ground'
        ? `Teach ${lessonTitle} for a ${selectedRating} student in plain language. Output: (1) 5 key ideas, (2) 3 memory hooks, (3) 3 oral-style checks.`
        : `Create a mission plan for ${lessonTitle}. Output: (1) what to know first, (2) what to practice second, (3) how to self-evaluate in 5 minutes.`;

    const statusLabel = lessonStatus === 'completed'
      ? 'Debrief & Level Up'
      : lessonStatus === 'in-progress'
        ? 'Coach Me Through It'
        : 'Preflight Power-Up';

    const statusPrompt = lessonStatus === 'completed'
      ? `Debrief my performance on ${lessonTitle}. Focus on ${primaryObjective}. Output: what I did well, what likely failed under pressure, and a 10-minute tune-up drill.`
      : lessonStatus === 'in-progress'
        ? `Coach me through ${lessonTitle} step-by-step at ${selectedRating} level. Focus on ${primaryObjective}. Give callouts, mistakes to watch for, and confidence cues.`
        : `Give me a preflight power-up for ${lessonTitle} (${selectedRating}). Focus on ${primaryObjective}. Output: must-know points, do-not-miss errors, and a short confidence checklist.`;

    return [
      {
        label: `Stump Me: ${lessonTitle}`,
        prompt: `Stump me on ${lessonTitle} with 6 escalating questions for a ${selectedRating} student. After each answer, give fast feedback and one improvement cue.`
      },
      {
        label: briefLabel,
        prompt: briefPrompt,
      },
      {
        label: statusLabel,
        prompt: statusPrompt,
      },
    ];
  }, [isOralExamMode, selectedRating, selectedSession, useLessonContext]);
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
    if (!instructorMode) {
      return;
    }
    setSessionDraftStatuses((currentStatuses) => {
      if (nextStatus == null) {
        // Remove the key entirely to allow fallback to no status
        const { [sessionId]: _, ...rest } = currentStatuses;
        return rest;
      }
      // If setting to 'in-progress', clear 'in-progress' from all other sessions
      if (nextStatus === 'in-progress') {
        const newStatuses = { ...currentStatuses };
        Object.keys(newStatuses).forEach((id) => {
          if (id !== sessionId && newStatuses[id] === 'in-progress') {
            newStatuses[id] = null;
          }
        });
        newStatuses[sessionId] = 'in-progress';
        return newStatuses;
      }
      return {
        ...currentStatuses,
        [sessionId]: nextStatus,
      };
    });
  };

  const clearSessionDraftStatus = (sessionId) => {
    if (!instructorMode) {
      return;
    }
    setSessionDraftStatuses((currentStatuses) => ({
      ...currentStatuses,
      [sessionId]: null,
    }));
  };

  const setSessionDraftRating = (sessionId, rating) => {
    if (!instructorMode) {
      return;
    }
    setSessionDraftRatings((currentRatings) => ({
      ...currentRatings,
      [sessionId]: rating,
    }));
    // If 5 stars, immediately set draft status to completed for instant tab highlight
    if (rating === 5) {
      setSessionDraftStatuses((currentStatuses) => ({
        ...currentStatuses,
        [sessionId]: 'completed',
      }));
    }
  };

  const togglePlannedDraftStatus = (sessionId) => {
    setPlannedDraftSessionIds((current) => (
      current.includes(sessionId)
        ? current.filter((id) => id !== sessionId)
        : [...current, sessionId]
    ));
  };

  const clearPlannedDraftStatus = (sessionId) => {
    setPlannedDraftSessionIds((current) => current.filter((id) => id !== sessionId));
  };

  const saveSyllabusChanges = () => {
    if (!instructorMode) {
      return;
    }
    // Only require hours if saving non-planned statuses
    const savingOnlyPlanned = plannedDraftSessionIds.length > 0 && Object.keys(sessionDraftStatuses).length === 0 && Object.keys(sessionDraftRatings).length === 0;
    if (!savingOnlyPlanned) {
      const hoursPattern = /^\d+(\.\d)?$/;
      if (!instructorHours || !hoursPattern.test(instructorHours)) {
        setHoursError('Enter hours in FAA format (e.g., 1.4)');
        return;
      }
    }
    setHoursError('');
    // Merge completed statuses from previous saves to ensure persistence
    setSessionStatuses((prevStatuses) => {
      // Start with previous statuses to preserve completed
      const mergedStatuses = { ...prevStatuses };
      // Apply draft changes, but never revert completed to incomplete
      Object.keys(sessionDraftStatuses).forEach((sessionId) => {
        const prev = mergedStatuses[sessionId];
        const next = sessionDraftStatuses[sessionId];
        if (prev === 'completed') {
          // Never revert completed to anything else
          mergedStatuses[sessionId] = 'completed';
        } else {
          mergedStatuses[sessionId] = next;
        }
      });
      // If a session is newly completed via 5-star rating, mark as completed
      Object.keys(sessionDraftRatings).forEach((sessionId) => {
        const rating = sessionDraftRatings[sessionId];
        if (rating === 5) {
          mergedStatuses[sessionId] = 'completed';
        }
      });
      return { ...mergedStatuses };
    });
    setSessionRatings((prevRatings) => ({ ...prevRatings, ...sessionDraftRatings }));
    setPlannedSessionIds([...plannedDraftSessionIds]);
    setSessionDraftStatuses({});
    setSessionDraftRatings({});
    setInstructorHours('');
    setTimeout(() => setSessionStatuses((s) => ({ ...s })), 0);
  };

  const getStoredPinHash = () => window.localStorage.getItem(INSTRUCTOR_PIN_STORAGE_KEY) ?? null;
  const hashPin = (pin) => btoa(pin + ':copi-instructor');

  const generateBriefing = async (updatedDays) => {
    const daysWithData = updatedDays.filter((d) => d.note || d.tasks.some((t) => t.rating != null));
    if (!daysWithData.length) return;
    setBriefingLoading(true);
    const currentStage = phasesWithProgress.find((p) =>
      !p.sessions.every((s) => s.status === 'completed')
    )?.title || 'Private Pilot Training';
    const recentDays = daysWithData.slice(0, 5);
    const upcomingPlanned = plannedSessions.slice(0, 3).map((s) => ({
      title: s.title,
      stageTitle: s.stageTitle,
    }));
    try {
      const response = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student: activeStudentName,
          stage: currentStage,
          recentDays,
          plannedSessions: upcomingPlanned,
        }),
      });
      const data = await response.json();
      if (data.briefing) {
        setDashboardBriefing(data.briefing);
        try {
          const cache = JSON.parse(window.localStorage.getItem(BRIEFING_CACHE_STORAGE_KEY) ?? '{}');
          cache[normalizeStudentKey(activeStudentName)] = data.briefing;
          window.localStorage.setItem(BRIEFING_CACHE_STORAGE_KEY, JSON.stringify(cache));
        } catch {}
      }
    } catch {
      // Briefing is non-critical — fail silently
    } finally {
      setBriefingLoading(false);
    }
  };

  const openInstructorLogin = () => {
    setMenuOpen(false);
    setPinInput('');
    setPinConfirmInput('');
    setPinError('');
    const hasPin = !!getStoredPinHash();
    setInstructorPinModal({ mode: hasPin ? 'enter' : 'set' });
  };

  const submitInstructorPin = () => {
    if (instructorPinModal?.mode === 'set') {
      if (pinInput.length < 4) { setPinError('PIN must be at least 4 characters.'); return; }
      if (pinInput !== pinConfirmInput) { setPinError('PINs do not match.'); return; }
      window.localStorage.setItem(INSTRUCTOR_PIN_STORAGE_KEY, hashPin(pinInput));
      setInstructorMode(true);
      setInstructorPinModal(null);
    } else {
      if (hashPin(pinInput) === getStoredPinHash()) {
        setInstructorMode(true);
        setInstructorPinModal(null);
      } else {
        setPinError('Incorrect PIN.');
        setPinInput('');
      }
    }
  };

  const lockInstructorMode = () => {
    setInstructorMode(false);
    setMenuOpen(false);
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

    setConfirmModal({
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

    setConfirmModal({
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
    setConfirmModal({
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
      setPromptModal({
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

  // Hydrate or reset the current student profile (null = full reset)
  const hydrateStudentProfile = (profile) => {
    if (!profile) {
      setSessionStatuses({});
      setSessionDraftStatuses({});
      setSessionRatings({});
      setSessionDraftRatings({});
      setSessionNotes({});
      setSessionChecklist({});
      setPlannedSessionIds([]);
      setPlannedDraftSessionIds([]);
      setSelectedRating('Private Pilot');
      const starterThread = createDefaultChatThread();
      setChatThreads([starterThread]);
      setActiveChatThreadId(starterThread.id);
      setUseLessonContext(true);
      setStudentPhoto(null);
      // Also clear localStorage for this student
      try {
        const key = normalizeStudentKey(activeStudentName);
        const profiles = readStudentProfiles();
        profiles[key] = {
          studentName: activeStudentName,
        };
        writeStudentProfiles(profiles);
      } catch {}
      return;
    }
    setSessionStatuses(profile.sessionStatuses ?? {});
    setSessionDraftStatuses(profile.sessionStatuses ?? {});
    setSessionRatings(profile.sessionRatings ?? {});
    setSessionDraftRatings(profile.sessionRatings ?? {});
    setSessionNotes(profile.sessionNotes ?? {});
    setSessionChecklist(profile.sessionChecklist ?? {});
    setPlannedSessionIds(Array.isArray(profile.plannedSessionIds) ? profile.plannedSessionIds : []);
    setPlannedDraftSessionIds(Array.isArray(profile.plannedSessionIds) ? profile.plannedSessionIds : []);
    setSelectedRating(profile.selectedRating ?? 'Private Pilot');
    setChatThreads(profile.chatThreads?.length ? profile.chatThreads : [createDefaultChatThread()]);
    setActiveChatThreadId(profile.activeChatThreadId ?? (profile.chatThreads?.[0]?.id || 'chat-default'));
    setUseLessonContext(profile.useLessonContext ?? true);
    setStudentPhoto(profile.studentPhoto ?? null);
  };

  const resetCurrentStudentData = () => {
    setConfirmModal({
      title: 'Reset Student Data',
      body: `Reset ALL progress, notes, checklist, chat, ratings, solo/endorsement checkboxes, and lesson days for ${activeStudentName}? This cannot be undone.`,
      confirmLabel: 'Reset',
      danger: true,
      onConfirm: () => {
        hydrateStudentProfile(null);
        setIsOralExamMode(false);
        setShowSettingsDropdown(false);
        setMenuOpen(false);
        setNoteToastMessage(`Reset ALL training data for ${activeStudentName}`);
      },
    });
  };

  const exportAllStudentProfiles = () => {
    const profiles = readStudentProfiles();
    profiles[normalizeStudentKey(activeStudentName)] = {
      studentName: activeStudentName,
      sessionStatuses,
      sessionRatings,
      sessionNotes,
      sessionChecklist,
      plannedSessionIds,
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

  const openStudentPhotoPicker = () => {
    studentPhotoInputRef.current?.click();
  };

  const updateStudentPhoto = async (event) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith('image/')) {
      setNoteToastMessage('Please select an image file.');
      return;
    }

    if (selectedFile.size > STUDENT_PHOTO_MAX_SIZE_BYTES) {
      setNoteToastMessage('Image is too large. Please use a file under 3MB.');
      return;
    }

    try {
      const imageData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read image'));
        reader.readAsDataURL(selectedFile);
      });

      if (!imageData) {
        setNoteToastMessage('Could not load image. Please try again.');
        return;
      }

      setStudentPhoto(imageData);
    } catch {
      setNoteToastMessage('Could not load image. Please try again.');
    }
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
          <div className="hero-brand-wrap">
            {/* Logo removed: missing asset. You can add a logo here if desired. */}
            <span className="hero-logo-text" style={{fontWeight:700,fontSize:'2.2rem',color:'#38bdf8',letterSpacing:'0.04em'}}>CoPi</span>
            <p className="eyebrow hero-companion-tagline">Your flight training companion</p>

            <div className="hero-student-header-box" style={{ background: 'rgba(15,23,42,0.85)', borderRadius: 16, border: '1.5px solid #38bdf8', padding: '32px 32px 36px 32px', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', margin: '96px 0 18px 0', position: 'relative', minHeight: 210 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <strong className="hero-student-name">{syllabus.student}</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="hero-student-photo-button"
                    onClick={openStudentPhotoPicker}
                    aria-label={studentPhoto ? 'Change student photo' : 'Upload student photo'}
                    title={studentPhoto ? 'Change photo' : 'Upload photo'}
                    style={{ marginLeft: 12, marginRight: 8 }}
                  >
                    {studentPhoto ? (
                      <img src={studentPhoto} alt={`${syllabus.student} profile`} className="hero-student-photo-image" />
                    ) : (
                      <svg
                        className="hero-student-photo-icon"
                        viewBox="0 0 64 64"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <rect x="10" y="20" width="44" height="30" rx="8" className="camera-outline" />
                        <path d="M21 20l4-6h14l4 6" className="camera-outline" />
                        <circle cx="32" cy="35" r="9" className="camera-outline" />
                        <circle cx="46" cy="26" r="1.8" className="camera-dot" />
                      </svg>
                    )}
                  </button>
                  <button
                    className="hero-menu-button"
                    ref={menuButtonRef}
                    onClick={() => setMenuOpen((v) => !v)}
                    type="button"
                    aria-label="Open menu"
                    aria-expanded={menuOpen}
                    aria-haspopup="true"
                    style={{ marginLeft: 0, marginRight: 0, position: 'static', zIndex: 10001 }}
                  >
                    <span></span>
                    <span></span>
                    <span></span>
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginTop: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
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
                  <div
                    className="hero-stage-progress"
                    role="button"
                    tabIndex={0}
                    aria-label={`Training completion ${completionRate}%. Stages completed: ${completedPhaseCount} of ${phaseProgress.length}. Click to view progress.`}
                    onClick={() => setActiveTab('progress')}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setActiveTab('progress')}
                    style={{ cursor: 'pointer', position: 'relative', left: 0, right: 0, bottom: 0, marginLeft: 24, flex: 1 }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '-28px',
                      left: 0,
                      width: '100%',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#38bdf8',
                      fontSize: '1.08rem',
                      letterSpacing: '0.01em',
                      zIndex: 2
                    }}>{completionRate}%</div>
                    <div className="hero-tube-track" role="presentation">
                      <div className="hero-tube-fill" style={{ width: `${completionRate}%` }} />
                      <div className="hero-tube-markers" aria-hidden="true">
                        {phaseProgress.map((phase, index) => (
                          <span
                            key={phase.id ?? `${phase.title}-${index}`}
                            className={`hero-tube-marker${phase.isCompleted ? ' is-complete' : ''}`}
                            style={{ left: `${phase.positionPercent}%` }}
                            title={phase.title}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {menuOpen && (
                <div
                  className="hero-menu-dropdown"
                  ref={menuDropdownRef}
                  style={{
                    zIndex: 9999,
                    position: 'absolute',
                    top: '100%',
                    right: 24,
                    marginTop: 6,
                    minWidth: 160
                  }}
                >
                  {instructorMode ? (
                    <>
                      <button type="button" onClick={() => { switchUser(); setMenuOpen(false); }}>Switch user</button>
                      <button type="button" onClick={() => { toggleSettingsDropdown(); setMenuOpen(false); }}>Settings</button>
                    </>
                  ) : null}
                  <button type="button" onClick={() => { toggleHelpPanel(); setMenuOpen(false); }}>Help</button>
                  <div className="menu-divider"></div>
                  {instructorMode ? (
                    <button type="button" className="menu-item-warn" onClick={() => { lockInstructorMode(); setMenuOpen(false); }}>🔒 Lock instructor mode</button>
                  ) : (
                    <button type="button" className="menu-item-instructor" onClick={() => { openInstructorLogin(); setMenuOpen(false); }}>Instructor login</button>
                  )}
                </div>
              )}
            </div>

            <input
              ref={importProfilesInputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={importStudentProfiles}
            />

            <input
              ref={studentPhotoInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={updateStudentPhoto}
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
                  <p className="help-body">Tap the menu → Switch user.</p>
                </div>
                <div className="help-section">
                  <p className="help-heading">Oral exam mode</p>
                  <p className="help-body">Open the CoPi tab, toggle Oral exam mode, then tap Start exam. CoPi will act as an FAA examiner and ask one question at a time.</p>
                </div>
                <div className="help-section">
                  <p className="help-heading">Export &amp; import</p>
                  <p className="help-body">Settings → Export saves all student profiles as a JSON file to your Downloads folder</p>
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

{instructorMode && (
              <div className="instructor-badge">
                <span>INSTRUCTOR</span>
                <button type="button" className="instructor-lock-btn" onClick={lockInstructorMode} aria-label="Lock instructor mode">🔒</button>
              </div>
            )}

            {menuOpen && (
              <div
                className="hero-menu-dropdown"
                ref={menuDropdownRef}
                style={{
                  zIndex: 9999,
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 6,
                  minWidth: 160
                }}
              >
                {instructorMode ? (
                  <>
                    <button type="button" onClick={() => { switchUser(); setMenuOpen(false); }}>Switch user</button>
                    <button type="button" onClick={() => { toggleSettingsDropdown(); setMenuOpen(false); }}>Settings</button>
                  </>
                ) : null}
                <button type="button" onClick={() => { toggleHelpPanel(); setMenuOpen(false); }}>Help</button>
                <div className="menu-divider"></div>
                {instructorMode ? (
                  <button type="button" className="menu-item-warn" onClick={() => { lockInstructorMode(); setMenuOpen(false); }}>🔒 Lock instructor mode</button>
                ) : (
                  <button type="button" className="menu-item-instructor" onClick={() => { openInstructorLogin(); setMenuOpen(false); }}>Instructor login</button>
                )}
              </div>
            )}
          </div>

          {/* Removed redundant bottom Private Pilot/progress bar box as requested */}
        </section>

        {activeTab === 'dashboard' && (
          <section className="tab-content">
            <section className="copi-console-card">
              <div className="copi-console-header">
                <h3>CoPi Console</h3>
              </div>
              <div className="copi-console-body">
                {/* AI Teaching Tips */}
                {briefingLoading ? (
                  <div className="briefing-loading">
                    <span className="briefing-loading-dot" />
                    <span className="briefing-loading-dot" />
                    <span className="briefing-loading-dot" />
                    <span className="briefing-loading-label">AI is analyzing your notes, ratings, and planned lessons…</span>
                  </div>
                ) : dashboardBriefing ? (
                  <>
                    {dashboardBriefing.upNext?.length > 0 ? (
                      <ul className="ai-teaching-list">
                        {dashboardBriefing.upNext.map((item, i) => (
                          <li key={i} className="ai-teaching-item">
                            <strong>{item.title}:</strong> {item.tip}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="ai-teaching-empty">No upcoming tasks found. Add planned lessons to get teaching tips!</p>
                    )}
                  </>
                ) : (
                  <></>
                )}
                {/* Planned Lessons */}
                <div className="copi-console-planned">
                  <div className="planned-lessons-header">
                    <h4 style={{margin:'18px 0 8px 0', color:'#7dd3fc'}}>Planned Lessons</h4>
                  </div>
                  {plannedLessons.length ? (
                    <ul className="planned-lessons-list">
                      {plannedLessons.map((session) => (
                        <li key={session.id}>{session.title}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="planned-lessons-empty">Every great pilot starts with day one—add your first planned lesson to begin your journey!</p>
                  )}
                </div>
              </div>
            </section>
            {/* Log Lesson Day UI removed as requested */}

            {(hasBriefingInput || briefingLoading || dashboardBriefing) && (
              <div className="briefing-section">
                {briefingLoading ? (
                  <div className="briefing-loading">
                    <span className="briefing-loading-dot" />
                    <span className="briefing-loading-dot" />
                    <span className="briefing-loading-dot" />
                    <span className="briefing-loading-label">CoPi is preparing your briefing…</span>
                  </div>
                ) : dashboardBriefing ? (
                  <>
                    {dashboardBriefing.strengths?.length > 0 && (
                      <div className="briefing-card briefing-strengths">
                        <div className="briefing-card-header">
                          <span className="briefing-icon-check">✓</span>
                          <span className="briefing-card-title">What you're doing well</span>
                        </div>
                        <ul className="briefing-list">
                          {dashboardBriefing.strengths.map((s, i) => (
                            <li key={i} className="briefing-strength-item">{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {dashboardBriefing.focusAreas?.length > 0 && (
                      <div className="briefing-card briefing-focus">
                        <div className="briefing-card-header">
                          <span className="briefing-icon-focus">⚑</span>
                          <span className="briefing-card-title">Focus areas</span>
                        </div>
                        {dashboardBriefing.focusAreas.map((area, i) => (
                          <div key={i} className="briefing-focus-item">
                            <p className="briefing-focus-skill">{area.skill}</p>
                            <p className="briefing-focus-fix">{area.fix}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {dashboardBriefing.upNext?.length > 0 && (
                      <div className="briefing-card briefing-upnext">
                        <div className="briefing-card-header">
                          <span className="briefing-icon-next">→</span>
                          <span className="briefing-card-title">Up next</span>
                        </div>
                        {dashboardBriefing.upNext.map((item, i) => (
                          <div key={i} className="briefing-upnext-item">
                            <p className="briefing-upnext-title">{item.title}</p>
                            <p className="briefing-upnext-tip">{item.tip}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      className="briefing-refresh-btn"
                      onClick={() => generateBriefing(lessonDays)}
                      disabled={briefingLoading}
                    >↻ Refresh briefing</button>
                  </>
                ) : hasBriefingInput ? (
                  <div className="briefing-empty">
                    <p className="briefing-empty-text">Every great pilot starts with day one—log your first rated lesson and CoPi will turn your progress into a personalized flight plan for growth.</p>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        )}

        {activeTab === 'syllabus' && (
          <section className="tab-content syllabus-bottom-spacing">
            {isInstrumentComingSoon ? (
              <div className="coming-soon-banner">Instrument training tools are coming soon. Syllabus editing is temporarily disabled.</div>
            ) : null}

            {instructorMode ? (
              <div className="syllabus-save-row" style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 28 }}>
                <div className="instructor-hours-group">
                  <div className="hours-bubble" style={{ marginRight: 0 }}>
                    <span className="hours-bubble-label">Hours</span>
                    <input
                      id="instructor-hours-input"
                      type="text"
                      value={instructorHours}
                      onChange={e => setInstructorHours(e.target.value)}
                      className="instructor-hours-input"
                      inputMode="decimal"
                      placeholder=""
                      onFocus={e => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
                    />
                  </div>
                  {hoursError && <span className="instructor-hours-error">{hoursError}</span>}
                </div>
                <button
                  type="button"
                  className="planned-save-button"
                  onClick={saveSyllabusChanges}
                  disabled={!hasPendingSyllabusChanges || isInstrumentComingSoon}
                  style={{ marginLeft: 8, marginRight: '5%' }}
                >
                  Save
                </button>
              </div>
            ) : null}


            {/* Endorsements dropdown below hours/save row */}
            <div className="endorsements-dropdown-row" style={{ maxWidth: 320, margin: '16px 0 12px 32px', whiteSpace: 'nowrap', position: 'relative', left: 0 }}>
              <label className="endorsements-dropdown-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap', fontSize: '1.08rem' }}>
                <div style={{ position: 'relative', marginLeft: '5%', display: 'inline-flex', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="endorsements-dropdown-toggle"
                    style={{
                      padding: '0 16px',
                      borderRadius: 8,
                      border: '1px solid #38bdf8',
                      background: '#0b1220',
                      color: '#dbeafe',
                      fontWeight: 500,
                      fontSize: '1.08rem',
                      cursor: 'pointer',
                      minWidth: 120,
                      textAlign: 'left',
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: 40,
                    }}
                    onClick={() => setShowEndorsementsDropdown((v) => !v)}
                  >
                    <span style={{fontWeight:700,letterSpacing:'0.03em',color:'#38bdf8'}}>
                      Endorsements
                    </span>
                    <span style={{ marginLeft: 8, fontSize: '1.1em', display: 'inline-block', transform: showEndorsementsDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                  </button>
                  {showEndorsementsDropdown && (
                    <ul style={{ position: 'absolute', top: '110%', left: '5%', zIndex: 10, background: '#1e293b', border: '1px solid #38bdf8', borderRadius: 8, minWidth: '75vw', width: '75vw', maxWidth: '75vw', padding: 0, margin: 0, listStyle: 'none', boxShadow: '0 2px 8px #0008' }}>
                      {['Medical', 'TSA Endorsement', 'IACRA'].map((option) => (
                        <li key={option} style={{ display: 'flex', alignItems: 'center', padding: '4px 0' }}>
                          <input
                            type="checkbox"
                            checked={!!endorsementChecks[option]}
                            onChange={() => setEndorsementChecks(prev => ({ ...prev, [option]: !prev[option] }))}
                            style={{ marginRight: 10, accentColor: '#38bdf8', width: 18, height: 18, cursor: 'pointer' }}
                            id={`endorsement-checkbox-${option}`}
                          />
                          <label htmlFor={`endorsement-checkbox-${option}`} style={{ color: '#dbeafe', fontSize: '1rem', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {option}
                            {option === 'TSA Endorsement' && (
                              <a
                                href="https://www.faa.gov/sites/faa.gov/files/pilots/become/student/A_14.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#38bdf8', fontWeight: 600, marginLeft: 6, textDecoration: 'underline', fontSize: '0.98em' }}
                                title="View A.14 TSA Endorsement PDF"
                              >
                                A.14
                              </a>
                            )}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </label>
            </div>

            <div className="phase-grid">
              {/* Render phases, and insert Solo checkbox after Phase 2 and before Phase 3 */}
              {phasesWithProgress.map((phase, index) => {
                // Insert Solo checkbox after Phase 2 and before Phase 3
                const isPhase1 = phase.title && phase.title.toLowerCase().includes('phase 1 - foundations, preflight & basic maneuvers');
                const isPhase2 = phase.title && phase.title.toLowerCase().includes('phase 2');
                const isPhase3 = phase.title && phase.title.toLowerCase().includes('phase 3');
                let soloChecklist = null;
                let soloCheckbox = null;
                let crossCountrySoloCheckbox = null;
                // First Solo logic (after Phase 2, before Phase 3)
                if (
                  index > 0 &&
                  phasesWithProgress[index - 1].title &&
                  phasesWithProgress[index - 1].title.toLowerCase().includes('phase 2') &&
                  phase.title && phase.title.toLowerCase().includes('phase 3')
                ) {
                  const phase2 = phasesWithProgress.find(p => p.title && p.title.toLowerCase().includes('phase 2'));
                  const phase2Complete = phase2 && phase2.sessions.every(s => s.status === 'completed');
                  soloCheckbox = (
                    <div className="solo-checkbox-row" style={{ maxWidth: 320, margin: '0 auto', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      <label className="solo-checkbox-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
                        <input
                          type="checkbox"
                          className="solo-checkbox-input"
                          style={{ accentColor: '#f59e42', width: 20, height: 20, marginRight: 8, boxShadow: '0 2px 8px #f59e4233', cursor: phase2Complete ? 'pointer' : 'not-allowed', opacity: phase2Complete ? 1 : 0.5 }}
                          aria-label="Solo"
                          disabled={!phase2Complete}
                        />
                        <span className="solo-checkbox-text" style={{ fontSize: '1.08rem', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                          <span style={{fontWeight:700,letterSpacing:'0.03em',color:'#f59e42'}}>First Solo</span>
                        </span>
                      </label>
                    </div>
                  );
                }
                // Cross Country Solo logic (after Phase 3, before Phase 4)
                if (
                  index > 0 &&
                  phasesWithProgress[index - 1].title &&
                  phasesWithProgress[index - 1].title.toLowerCase().includes('phase 3') &&
                  phase.title && phase.title.toLowerCase().includes('phase 4')
                ) {
                  const phase3 = phasesWithProgress.find(p => p.title && p.title.toLowerCase().includes('phase 3'));
                  const phase3Complete = phase3 && phase3.sessions.every(s => s.status === 'completed');
                  crossCountrySoloCheckbox = (
                    <div className="solo-checkbox-row" style={{ maxWidth: 320, margin: '0 auto', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      <label className="solo-checkbox-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
                        <input
                          type="checkbox"
                          className="solo-checkbox-input"
                          checked={crossCountrySoloChecked}
                          onChange={handleCrossCountrySoloCheck}
                          style={{ accentColor: '#f59e42', width: 20, height: 20, marginRight: 8, boxShadow: '0 2px 8px #f59e4233', cursor: phase3Complete ? 'pointer' : 'not-allowed', opacity: phase3Complete ? 1 : 0.5 }}
                          aria-label="Cross Country Solo"
                          disabled={!phase3Complete}
                        />
                        <span className="solo-checkbox-text" style={{ fontSize: '1.08rem', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                          <span style={{fontWeight:700,letterSpacing:'0.03em',color:'#f59e42'}}>Cross Country Solo</span>
                        </span>
                      </label>
                    </div>
                  );
                }
                // Make Stage 6 collapsible with its unique checklist UI
                if (phase.title && phase.title.startsWith('Stage 6')) {
                  const stageState = phaseLockStates[index] ?? { isLocked: false };
                  const isLocked = stageState.isLocked;
                  const isExpanded = Boolean(expandedStageIds[phase.id]);
                  return (
                    <article className={`phase-card${isLocked ? ' is-locked' : ''}`} key={phase.id}>
                      <div
                        className={`phase-card-header phase-dropdown-button${isLocked ? ' is-locked' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setExpandedStageIds((current) => ({
                            ...current,
                            [phase.id]: !current[phase.id],
                          }));
                        }}
                        aria-expanded={isExpanded}
                      >
                        <p className="phase-title">{phase.title}</p>
                        {isLocked ? (
                          <p className="phase-locked-note">Complete all previous stages to unlock.</p>
                        ) : null}
                        <span className="phase-dropdown-caret">{isExpanded ? '▾' : '▸'}</span>
                      </div>
                      {isExpanded && (
                        <div className={`phase-content${isLocked ? ' phase-content-locked' : ''}`}
                          style={isLocked ? { pointerEvents: 'none', opacity: 0.5, filter: 'grayscale(0.5)' } : {}}>
                          <div className="stage6-prompt" style={{marginBottom: '12px', color: '#f59e42', fontWeight: 500}}>
                            Review each flight task below before your checkride. Make sure you can confidently brief, fly, and debrief every maneuver!
                          </div>
                          <ul className="plain-review-list">
                            {phase.sessions.map((session) => (
                              session.title && session.title.trim() !== '' ? (
                                <li key={session.id} style={{display:'flex',alignItems:'center',gap:'10px'}}>
                                  <input
                                    type="checkbox"
                                    checked={!!stage6Checked[session.id]}
                                    onChange={() => handleStage6Check(session.id)}
                                    style={{width:'18px',height:'18px',accentColor:'#38bdf8',cursor:'pointer'}}
                                    aria-label={`Mark ${session.title} reviewed`}
                                    disabled={isLocked}
                                  />
                                  <span>{session.title}</span>
                                </li>
                              ) : null
                            ))}
                          </ul>
                        </div>
                      )}
                    </article>
                  );
                }
                // ...existing code for other phases...
                // Insert Solo checkbox between Phase 1 - Foundations, Preflight & Basic Maneuvers and Phase 2
                let stageState, isLocked, isExpanded, nonBlankSessions;
                stageState = phaseLockStates[index] ?? { isLocked: false };
                isLocked = stageState.isLocked;
                // Lock Stage 2 unless ALL checklist items are checked (none remain)
                if (
                  phase.title &&
                  phase.title.trim().toLowerCase().startsWith('stage 2')
                ) {
                  isLocked = true;
                }
                isExpanded = Boolean(expandedStageIds[phase.id]);
                nonBlankSessions = phase.sessions.filter(
                  (session) => session && session.title && session.title.trim() !== ''
                );
                if (soloChecklist || soloCheckbox || crossCountrySoloCheckbox) {
                  // Get phase completion state for highlight
                  const phaseState = phaseProgress.find(p => p.id === phase.id) || {};
                  const isCompleted = phaseState.isCompleted;
                  return (
                    <>
                      {soloChecklist}
                      {soloCheckbox}
                      {crossCountrySoloCheckbox}
                      <article className={`phase-card${isLocked ? ' is-locked' : ''}`} key={phase.id}>
                        <div
                          className={`phase-card-header phase-dropdown-button${isLocked ? ' is-locked' : ''}${isCompleted ? ' burnt-orange-title' : ''}`}
                          style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
                          onClick={() => {
                            setExpandedStageIds((current) => ({
                              ...current,
                              [phase.id]: !current[phase.id],
                            }));
                          }}
                          aria-expanded={isExpanded}
                        >
                          <p className="phase-title" style={{ margin: 0 }}>{phase.title}</p>
                          {isLocked && phase.title && phase.title.trim().toLowerCase().startsWith('stage 2') && (!allPhase1Complete) ? (
                            <p className="phase-locked-note">Complete all Phase 1 - Foundations, Preflight & Basic Maneuvers tasks before continuing to Phase 2.</p>
                          ) : isLocked ? (
                            <p className="phase-locked-note">Complete the previous stage to unlock.</p>
                          ) : null}
                        </div>
                        {isExpanded && phase.dpeGuidance ? (
                          <section className="phase-guidance phase-content-locked" style={isLocked ? { pointerEvents: 'none', opacity: 0.5, filter: 'grayscale(0.5)' } : {}}>
                            <p className="phase-guidance-title">DPE & FAA focus</p>
                            <ul className="phase-guidance-list">
                              {phase.dpeGuidance.focus?.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                            <p className="phase-guidance-ref">{phase.dpeGuidance.acsReference}</p>
                          </section>
                        ) : null}
                        {isExpanded ? (
                          <div className={`session-list${isLocked ? ' phase-content-locked' : ''}`}
                            style={isLocked ? { pointerEvents: 'none', opacity: 0.5, filter: 'grayscale(0.5)' } : {}}>
                            {/* No checklist items remain for Phase 1 - Foundations, Preflight & Basic Maneuvers */}
                            {/* Phase 1 checklist removed as requested */}
                            {nonBlankSessions.map((session) => (
                              <div className="session-row" key={session.id} style={{ position: 'relative' }}>
                                <div className="session-main">
                                  <div className="session-copy">
                                    <div className="session-title-row">
                                      <h3>{session.title}</h3>
                                    </div>
                                    {/* Standards Link Icon (bottom right) */}
                                    {Array.isArray(session.standards) && session.standards.length > 0 && (() => {
                                      // Prefer AC link if present, otherwise first
                                      const ac = session.standards.find(std => std.ref.startsWith('AC'));
                                      const std = ac || session.standards[0];
                                      return (
                                        <div
                                          className="standards-link-stack"
                                          style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 2, display: 'block', maxWidth: '220px' }}
                                        >
                                          <a
                                            href={std.link}
                                            className={`standards-link${std.ref.startsWith('AC') ? ' ac-link' : ''}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title={`View ${std.ref}`}
                                            style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.82em', fontWeight: std.ref.startsWith('AC') ? 'bold' : 'normal', color: std.ref.startsWith('AC') ? '#f59e42' : undefined }}
                                          >
                                            {std.ref}
                                          </a>
                                        </div>
                                      );
                                    })()}
                                    {(() => {
                                      // Use draft status in instructor mode, saved status otherwise
                                      // Only highlight as planned if user explicitly selects it
                                      const plannedIsActive = instructorMode
                                        ? plannedDraftSessionIdSet.has(session.id)
                                        : plannedSessionIdSet.has(session.id);
                                      let highlightStatus;
                                      if (plannedIsActive) {
                                        highlightStatus = 'planned';
                                      } else if (instructorMode && Object.prototype.hasOwnProperty.call(sessionDraftStatuses, session.id)) {
                                        highlightStatus = sessionDraftStatuses[session.id];
                                      } else {
                                        highlightStatus = session.status || null;
                                      }
                                      return (
                                        <div className="status-actions" aria-label={`Update ${session.title} status`}>
                                          {statusOrder.map((status) => {
                                            const isDisabled = isInstrumentComingSoon || !instructorMode || isLocked;
                                            return (
                                              <button
                                                key={status}
                                                type="button"
                                                className={`status-button status-${status} ${status === highlightStatus ? 'active' : ''}`}
                                                onClick={() => {
                                                  if (isDisabled) return;
                                                  if (status === highlightStatus) {
                                                    // Unclick: clear status
                                                    if (status === 'planned') {
                                                      togglePlannedDraftStatus(session.id);
                                                      updateSessionStatus(session.id, null);
                                                    } else {
                                                      updateSessionStatus(session.id, null);
                                                    }
                                                    return;
                                                  }
                                                  if (status === 'planned') {
                                                    togglePlannedDraftStatus(session.id);
                                                  } else {
                                                    clearPlannedDraftStatus(session.id);
                                                    updateSessionStatus(session.id, status);
                                                  }
                                                }}
                                                disabled={isDisabled}
                                              >
                                                {statusLabel[status]}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      );
                                    })()}
                                    {(() => {
                                      const savedStatus = session.status;
                                      const hasDraftStatus = Object.prototype.hasOwnProperty.call(sessionDraftStatuses, session.id);
                                      const draftStatus = hasDraftStatus ? sessionDraftStatuses[session.id] : savedStatus;
                                      const plannedIsActive = instructorMode
                                        ? plannedDraftSessionIdSet.has(session.id)
                                        : plannedSessionIdSet.has(session.id);
                                      const effectiveActiveStatus = plannedIsActive ? 'planned' : (instructorMode ? draftStatus : savedStatus);
                                      if (effectiveActiveStatus !== 'in-progress') {
                                        return null;
                                      }
                                      const currentRating = instructorMode
                                        ? (sessionDraftRatings[session.id] ?? 0)
                                        : (sessionRatings[session.id] ?? 0);
                                      return (
                                        <div className="in-progress-rating-stars" aria-label={`Rating for ${session.title}`}>
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                              key={star}
                                              type="button"
                                              className={`log-star${currentRating >= star ? ' active' : ''}`}
                                              onClick={() => setSessionDraftRating(session.id, star)}
                                              disabled={!instructorMode || isInstrumentComingSoon || isLocked}
                                              aria-label={`${star} star`}
                                            >★</button>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    </>
                  );
                }
                // Get phase completion state for highlight
                const phaseState = phaseProgress.find(p => p.id === phase.id) || {};
                const isCompleted = phaseState.isCompleted;
                return (
                  <article className={`phase-card${isLocked ? ' is-locked' : ''}`} key={phase.id}>
                    <div
                      className={`phase-card-header phase-dropdown-button${isLocked ? ' is-locked' : ''}${isCompleted ? ' burnt-orange-title' : ''}`}
                      style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
                      onClick={() => {
                        setExpandedStageIds((current) => ({
                          ...current,
                          [phase.id]: !current[phase.id],
                        }));
                      }}
                      aria-expanded={isExpanded}
                    >
                      <p className="phase-title" style={{ margin: 0 }}>{phase.title}</p>
                      {isLocked && phase.title && phase.title.trim().toLowerCase().startsWith('stage 2') && (!allPhase1Complete) ? (
                        <p className="phase-locked-note">Complete all Phase 1 - Foundations, Preflight & Basic Maneuvers tasks before continuing to Phase 2.</p>
                      ) : isLocked ? (
                        <p className="phase-locked-note">Complete the previous stage to unlock.</p>
                      ) : null}
                    </div>
                    {isExpanded && phase.dpeGuidance ? (
                      <section className="phase-guidance phase-content-locked" style={isLocked ? { pointerEvents: 'none', opacity: 0.5, filter: 'grayscale(0.5)' } : {}}>
                        <p className="phase-guidance-title">DPE & FAA focus</p>
                        <ul className="phase-guidance-list">
                          {phase.dpeGuidance.focus?.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                        <p className="phase-guidance-ref">{phase.dpeGuidance.acsReference}</p>
                      </section>
                    ) : null}
                    {isExpanded ? (
                      <div className={`session-list${isLocked ? ' phase-content-locked' : ''}`}
                        style={isLocked ? { pointerEvents: 'none', opacity: 0.5, filter: 'grayscale(0.5)' } : {}}>
                        {/* No checklist items remain for Phase 1 - Foundations, Preflight & Basic Maneuvers */}
                        {/* Phase 1 checklist removed as requested */}
                        {nonBlankSessions.map((session) => (
                          <div className="session-row" key={session.id} style={{ position: 'relative' }}>
                            <div className="session-main">
                              <div className="session-copy">
                                <div className="session-title-row">
                                  <h3>{session.title}</h3>
                                </div>
                                {/* Standards Link Icon (bottom right) */}
                                {Array.isArray(session.standards) && session.standards.length > 0 && (() => {
                                  // Prefer AC link if present, otherwise first
                                  const ac = session.standards.find(std => std.ref.startsWith('AC'));
                                  const std = ac || session.standards[0];
                                  return (
                                    <div
                                      className="standards-link-stack"
                                      style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 2, display: 'block', maxWidth: '220px' }}
                                    >
                                      <a
                                        href={std.link}
                                        className={`standards-link${std.ref.startsWith('AC') ? ' ac-link' : ''}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={`View ${std.ref}`}
                                        style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.82em', fontWeight: std.ref.startsWith('AC') ? 'bold' : 'normal', color: std.ref.startsWith('AC') ? '#f59e42' : undefined }}
                                      >
                                        {std.ref}
                                      </a>
                                    </div>
                                  );
                                })()}
                                {(() => {
                                  // Use draft status in instructor mode, saved status otherwise
                                  // Only highlight as planned if user explicitly selects it
                                  const plannedIsActive = instructorMode
                                    ? plannedDraftSessionIdSet.has(session.id)
                                    : plannedSessionIdSet.has(session.id);
                                  let highlightStatus;
                                  if (plannedIsActive) {
                                    highlightStatus = 'planned';
                                  } else if (instructorMode && Object.prototype.hasOwnProperty.call(sessionDraftStatuses, session.id)) {
                                    highlightStatus = sessionDraftStatuses[session.id];
                                  } else {
                                    highlightStatus = session.status || null;
                                  }
                                  return (
                                    <div className="status-actions" aria-label={`Update ${session.title} status`}>
                                      {statusOrder.map((status) => {
                                        const isDisabled = isInstrumentComingSoon || !instructorMode || isLocked;
                                        return (
                                          <button
                                            key={status}
                                            type="button"
                                            className={`status-button status-${status} ${status === highlightStatus ? 'active' : ''}`}
                                            onClick={() => {
                                              if (isDisabled) return;
                                              if (status === highlightStatus) {
                                                // Unclick: clear status
                                                if (status === 'planned') {
                                                  togglePlannedDraftStatus(session.id);
                                                  updateSessionStatus(session.id, null);
                                                } else {
                                                  updateSessionStatus(session.id, null);
                                                }
                                                return;
                                              }
                                              if (status === 'planned') {
                                                togglePlannedDraftStatus(session.id);
                                              } else {
                                                clearPlannedDraftStatus(session.id);
                                                updateSessionStatus(session.id, status);
                                              }
                                            }}
                                            disabled={isDisabled}
                                          >
                                            {statusLabel[status]}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                                {(() => {
                                  const savedStatus = session.status;
                                  const hasDraftStatus = Object.prototype.hasOwnProperty.call(sessionDraftStatuses, session.id);
                                  const draftStatus = hasDraftStatus ? sessionDraftStatuses[session.id] : savedStatus;
                                  const plannedIsActive = instructorMode
                                    ? plannedDraftSessionIdSet.has(session.id)
                                    : plannedSessionIdSet.has(session.id);
                                  const effectiveActiveStatus = plannedIsActive ? 'planned' : (instructorMode ? draftStatus : savedStatus);
                                  if (effectiveActiveStatus !== 'in-progress') {
                                    return null;
                                  }
                                  const currentRating = instructorMode
                                    ? (sessionDraftRatings[session.id] ?? 0)
                                    : (sessionRatings[session.id] ?? 0);
                                  return (
                                    <div className="in-progress-rating-stars" aria-label={`Rating for ${session.title}`}>
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                          key={star}
                                          type="button"
                                          className={`log-star${currentRating >= star ? ' active' : ''}`}
                                          onClick={() => setSessionDraftRating(session.id, star)}
                                          disabled={!instructorMode || isInstrumentComingSoon || isLocked}
                                          aria-label={`${star} star`}
                                        >★</button>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            {!phasesWithProgress.length ? (
              <div className="empty-state">
                <h3>No sessions available.</h3>
              </div>
            ) : null}

            {instructorMode ? (
              <div className="syllabus-save-row syllabus-save-row-bottom" style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 28 }}>
                <div className="instructor-hours-group">
                  <div className="hours-bubble" style={{ marginRight: 0 }}>
                    <span className="hours-bubble-label">Hours</span>
                    <input
                      id="instructor-hours-input-bottom"
                      type="text"
                      value={instructorHours}
                      onChange={e => setInstructorHours(e.target.value)}
                      className="instructor-hours-input"
                      inputMode="decimal"
                      placeholder=""
                      onFocus={e => e.target.setSelectionRange(e.target.value.length, e.target.value.length)}
                    />
                  </div>
                  {hoursError && <span className="instructor-hours-error">{hoursError}</span>}
                </div>
                <button
                  type="button"
                  className="planned-save-button"
                  onClick={saveSyllabusChanges}
                  disabled={!hasPendingSyllabusChanges || isInstrumentComingSoon}
                  style={{ marginLeft: 8, marginRight: '5%' }}
                >
                  Save
                </button>
              </div>
            ) : null}

          </section>
        )}

        {activeTab === 'ground' && (
          <section className="tab-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
            <h2 style={{ color: '#e2e8f0', marginBottom: 12 }}>Ground School</h2>
            <div style={{ color: '#cbd5e1', fontSize: '1.2rem', opacity: 0.8, textAlign: 'center' }}>
              <span role="img" aria-label="Coming soon" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 8 }}>🛫</span>
              Ground school features are coming soon!
            </div>
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
                      {quickPrompts.map((quickPrompt) => (
                        <button
                          key={quickPrompt.label}
                          type="button"
                          className="chat-prompt-chip chat-welcome-prompt-chip"
                          onClick={() => setChatInput(quickPrompt.prompt)}
                          disabled={isSendingChat}
                        >
                          {quickPrompt.label}
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
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
          >
            {/* Logo removed: missing asset. You can add a logo here if desired. */}
            <span className="hero-logo-text" style={{fontWeight:700,fontSize:'2.2rem',color:'#38bdf8',letterSpacing:'0.04em'}}>CoPi</span>
          </button>
          <button
            className={`tab-bubble history-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            type="button"
          >
            History
          </button>
          <button
            className={`tab-bubble ${activeTab === 'ground' ? 'active' : ''}`}
            onClick={() => setActiveTab('ground')}
            type="button"
          >
            Ground
          </button>
        </section>

        {activeTab === 'history' && (
          <section className="tab-content">
            {lessonDays.length === 0 ? (
              <div className="history-empty">
                <p className="history-empty-title">No lesson days logged yet.</p>
                <p className="history-empty-sub">Use the Dashboard to log a lesson day and rate each task.</p>
              </div>
            ) : (
              <div className="history-list">
                {lessonDays.map((day) => (
                  <div className="history-card" key={day.id}>
                    <button
                      type="button"
                      className="history-card-header"
                      onClick={() => setExpandedHistoryId(expandedHistoryId === day.id ? null : day.id)}
                    >
                      <span className="history-card-date">{day.date}</span>
                      <span className="history-card-meta">{day.tasks.length} task{day.tasks.length !== 1 ? 's' : ''}</span>
                      <span className="history-card-caret">{expandedHistoryId === day.id ? '▲' : '▼'}</span>
                    </button>
                    {expandedHistoryId === day.id && (
                      <div className="history-card-body">
                        {day.tasks.map((task, i) => (
                          <div className="history-task-row" key={`${task.sessionId}-${i}`}>
                            <div className="history-task-info">
                              <span className="history-task-stage burnt-orange-title">{task.stageTitle}</span>
                              <span className="history-task-title">{task.title}</span>
                            </div>
                            <div className="history-task-stars">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span key={star} className={`history-star${task.rating != null && task.rating >= star ? ' active' : ''}`}>★</span>
                              ))}
                              {task.rating == null && <span className="history-no-rating">Not rated</span>}
                            </div>
                          </div>
                        ))}
                        {day.note ? (
                          <p className="history-card-note">{day.note}</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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

      {/* Always render confirmModal at the end of the root, above all overlays */}
      {confirmModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" style={{zIndex: 9999}} onClick={() => setConfirmModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <p className="modal-title">{confirmModal.title}</p>
            <p className="modal-body">{confirmModal.body}</p>
            <div className="modal-actions">
              <button type="button" className="modal-btn modal-btn-cancel" onClick={() => setConfirmModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={`modal-btn ${confirmModal.danger ? 'modal-btn-danger' : 'modal-btn-confirm'}`}
                autoFocus
                onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {instructorPinModal && (
        <div className="modal-overlay pin-modal-overlay" role="dialog" aria-modal="true" onClick={() => setInstructorPinModal(null)}>
          <div className="modal-box pin-modal-box" onClick={(e) => e.stopPropagation()}>
            <p className="modal-title">{instructorPinModal.mode === 'set' ? 'Set Instructor PIN' : 'Instructor Login'}</p>
            <p className="pin-modal-sub">{instructorPinModal.mode === 'set' ? 'Create a PIN to protect instructor features.' : 'Enter your instructor PIN to continue.'}</p>
            <input
              className="modal-input pin-input"
              type="password"
              inputMode="numeric"
              placeholder={instructorPinModal.mode === 'set' ? 'New PIN' : 'PIN'}
              value={pinInput}
              autoFocus
              onChange={(e) => { setPinInput(e.target.value); setPinError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submitInstructorPin(); if (e.key === 'Escape') setInstructorPinModal(null); }}
            />
            {instructorPinModal.mode === 'set' && (
              <input
                className="modal-input pin-input"
                type="password"
                inputMode="numeric"
                placeholder="Confirm PIN"
                value={pinConfirmInput}
                onChange={(e) => { setPinConfirmInput(e.target.value); setPinError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') submitInstructorPin(); if (e.key === 'Escape') setInstructorPinModal(null); }}
              />
            )}
            {pinError && <p className="pin-error">{pinError}</p>}
            <div className="modal-actions">
              <button type="button" className="modal-btn modal-btn-cancel" onClick={() => setInstructorPinModal(null)}>Cancel</button>
              <button type="button" className="modal-btn modal-btn-confirm" onClick={submitInstructorPin}>
                {instructorPinModal.mode === 'set' ? 'Set PIN & Unlock' : 'Unlock'}
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

import HamburgerMenuDemo from './HamburgerMenuDemo.jsx';
// Add this inside your main App render to test:
// <HamburgerMenuDemo />

