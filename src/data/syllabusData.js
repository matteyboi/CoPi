import { loadAllData } from '../utils/dataLoader';

let cachedData = null;

const fallbackRawSyllabus = [
  {
    stage: 'Stage 1: Pre-Solo',
    lessons: [
      { name: 'Lesson 1: Introduction & Aircraft Familiarization', notes: '', rating: null },
      { name: 'Lesson 2: Basic Maneuvers', notes: '', rating: null },
    ],
  },
];

const durationByKeyword = [
  { match: /written test|checkride/i, value: '45 min' },
  { match: /planning|navigation/i, value: '60 min' },
  { match: /maneuvers|takeoffs|landings|solo|emergency/i, value: '1.4 hr' },
];

const inferType = (lessonName) => {
  if (/takeoffs|landings|maneuvers|solo|emergency/i.test(lessonName)) {
    return 'Flight';
  }

  if (/written test|checkride|planning|navigation/i.test(lessonName)) {
    return 'Ground';
  }

  return 'Study';
};

const inferDuration = (lessonName) => {
  const matchedDuration = durationByKeyword.find(({ match }) => match.test(lessonName));
  return matchedDuration?.value ?? '50 min';
};

const inferStatus = (rating) => {
  if (typeof rating === 'number') {
    return 'completed';
  }

  return 'planned';
};

const buildObjectives = (lessonName, stageName) => [
  `Understand the core standards for ${lessonName.toLowerCase()}.`,
  `Connect this lesson to the broader goals in ${stageName.toLowerCase()}.`,
  'Identify what to practice next before the following training event.',
];

const buildChecklist = (lessonName) => [
  `Brief the key flow for ${lessonName.toLowerCase()}.`,
  'Write down one confidence gap to review with CoPi or your instructor.',
  'Capture a concise debrief note after the lesson is complete.',
];

const buildAiPrompt = (lessonName, stageName, rating) => {
  const ratingText = typeof rating === 'number' ? `${rating}/5` : 'not yet rated';
  return `Coach me through ${lessonName} in ${stageName}. My current lesson rating is ${ratingText}. Give me likely checkride questions, common mistakes, and one focused practice plan.`;
};

function transformSyllabus(rawSyllabus) {
  return {
    title: 'AI Flight Syllabus',
    track: 'Private Pilot Training Plan',
    student: 'Mathew Bryant',
    objective: 'Synced from your actual training data. Updates automatically when JSON files change.',
    phases: rawSyllabus.map((stage, stageIndex) => ({
      id: `phase-${stageIndex + 1}`,
      title: stage.stage,
      description: `Imported from your active training syllabus with ${stage.lessons.length} lessons in this stage.`,
      sessions: stage.lessons.map((lesson, lessonIndex) => ({
        id: `s${stageIndex + 1}-${lessonIndex + 1}`,
        legacyId: `${stageIndex}:${lessonIndex}`,
        title: lesson.name,
        stageTitle: stage.stage,
        type: inferType(lesson.name),
        duration: inferDuration(lesson.name),
        status: inferStatus(lesson.rating),
        focus: lesson.notes || `Continue building proficiency in ${lesson.name.toLowerCase()}.`,
        notes: lesson.notes,
        rating: lesson.rating,
        objectives: buildObjectives(lesson.name, stage.stage),
        checklist: buildChecklist(lesson.name),
        aiPrompt: buildAiPrompt(lesson.name, stage.stage, lesson.rating),
      })),
    })),
  };
}

export async function initializeData() {
  if (cachedData) {
    return cachedData;
  }

  try {
    const { rawSyllabus, progressHistory, oralSessions } = await loadAllData();
    cachedData = {
      syllabus: transformSyllabus(rawSyllabus),
      progressHistory,
      oralSessions,
    };
    return cachedData;
  } catch (error) {
    console.error('Failed to initialize data:', error);
    cachedData = {
      syllabus: transformSyllabus(fallbackRawSyllabus),
      progressHistory: [],
      oralSessions: [],
    };
    return cachedData;
  }
}

// Default exports for sync access (used before async init)
export const syllabus = transformSyllabus(fallbackRawSyllabus);
export const progressHistory = [];
export const oralSessions = [];