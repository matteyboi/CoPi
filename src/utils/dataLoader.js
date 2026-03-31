/**
 * Load syllabus and progress data from JSON files in the public folder.
 * Falls back to default demo data if files are not available.
 */

const fallbackSyllabus = [
  {
    stage: 'Stage 1: Pre-Solo',
    lessons: [
      { name: 'Lesson 1: Introduction & Aircraft Familiarization', notes: '', rating: null },
      { name: 'Lesson 2: Basic Maneuvers', notes: '', rating: null },
      { name: 'Lesson 3: Takeoffs and Landings', notes: '', rating: null },
    ],
  },
  {
    stage: 'Stage 2: Cross-Country',
    lessons: [
      { name: 'Lesson 4: Navigation Basics', notes: '', rating: null },
      { name: 'Lesson 5: Cross-Country Flight Planning', notes: '', rating: null },
    ],
  },
];

const fallbackProgressHistory = [];
const fallbackOralSessions = [];

export async function loadSyllabusData() {
  try {
    const response = await fetch('/syllabus_data.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('Failed to load syllabus_data.json, using fallback:', error.message);
    return fallbackSyllabus;
  }
}

export async function loadProgressHistory() {
  try {
    const response = await fetch('/progress_history.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('Failed to load progress_history.json, using fallback:', error.message);
    return fallbackProgressHistory;
  }
}

export async function loadOralSessions() {
  try {
    const response = await fetch('/oral_sessions.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('Failed to load oral_sessions.json, using fallback:', error.message);
    return fallbackOralSessions;
  }
}

export async function loadAllData() {
  const [rawSyllabus, progressHistory, oralSessions] = await Promise.all([
    loadSyllabusData(),
    loadProgressHistory(),
    loadOralSessions(),
  ]);
  return { rawSyllabus, progressHistory, oralSessions };
}
