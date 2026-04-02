import { loadAllData } from '../utils/dataLoader';

let cachedData = null;

const CANONICAL_STAGES = [
  {
    title: 'Stage 1 — Very Early (First ~5–10 Hours)',
    tasks: [
      'Taxiing Using Rudder Pedals',
      'Normal Takeoff Procedure',
      'Rotation & Initial Climb',
      'Straight & Level Flight (Altitude, Heading Hold)',
      'Vy/Vx Climb Performance',
      'Taxi Clearance Request',
      'Turns to Headings (Standard Rate)',
      'Climbing & Descending Turns',
      'Traffic Pattern Entry & Position Reports',
      'Normal Landing Procedure',
      'Full Stop Landings',
      'Go-Around/Missed Approach Procedures',
      'Touch-and-Go Landings',
      'Use of Flaps for Landing',
    ],
  },
  {
    title: 'Stage 2 — Early Training (Pre-Solo Skill Building)',
    tasks: [
      'Crosswind Takeoff Technique',
      'Crosswind Landing Technique',
      'Slow Flight (Configuration, Control)',
      'Power-Off Stalls (Approach to Landing Stall)',
      'Power-On Stalls (Takeoff/Departure Stall)',
      'Rectangular Course',
      'Turns Around a Point',
      'S-Turns Across a Road',
      'Basic Instrument Maneuvers (Straight & Level, Turns, Climbs, Descents)',
      'Use of Backup Instruments',
      'Engine Failure During Takeoff Roll',
      'Engine Failure After Takeoff',
      'Engine Failure in Flight (ABC: Airspeed, Best Field, Checklist)',
      'Forced Landing (Field Selection, Approach, Landing)',
    ],
  },
  {
    title: 'Stage 3 — Solo Readiness / Early Solo Phase',
    tasks: [
      'Solo Takeoffs & Landings',
      'Solo Traffic Pattern Operations',
      'Short Field Takeoff Technique',
      'Short Field Landing Technique',
      'Soft Field Takeoff Technique',
      'Soft Field Landing Technique',
      'Forward Slip to Landing',
      'Emergency Descent',
      'Recovery from Unusual Attitudes',
      'Electrical Failure (Alternator/Generator Out)',
      'Fire (Engine, Cabin, Electrical)',
    ],
  },
  {
    title: 'Stage 4 — Cross Country Phase',
    tasks: [
      'Sectional Chart Reading',
      'Use of Electronic Flight Bag (ForeFlight, Garmin Pilot)',
      'Pilotage (Visual Reference Points)',
      'Dead Reckoning Navigation',
      'GPS Navigation (Direct-To, Flight Plan, Waypoints)',
      'VOR Navigation (Tune, Identify, Track Radials)',
      'Radio Navigation (VOR, ILS, GPS, DME, ADF)',
      'Diversion to Alternate Airport',
      'Cross Country Flight Execution',
      'Solo Cross Country Planning & Execution',
    ],
  },
  {
    title: 'Stage 5 — Advanced / Night / Checkride Prep',
    tasks: [
      'Night Taxi Procedures',
      'Night Takeoff & Landing',
      'Night Traffic Pattern Operations',
      'Night Navigation (Visual, Electronic)',
      'Solo Night Flight',
      'Solo Emergency Procedures',
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

function transformSyllabus() {
  return {
    title: 'AI Flight Syllabus',
    track: 'Private Pilot Training Plan',
    student: 'Mathew Bryant',
    objective: 'Five-stage training syllabus with required pass tasks for each stage.',
    phases: CANONICAL_STAGES.map((stage, stageIndex) => ({
      id: `phase-${stageIndex + 1}`,
      title: stage.title,
      description: `Required pass tasks for ${stage.title}. Complete each task to move forward.`,
      sessions: stage.tasks.map((taskTitle, lessonIndex) => ({
        id: `s${stageIndex + 1}-${lessonIndex + 1}`,
        legacyId: `${stageIndex}:${lessonIndex}`,
        title: taskTitle,
        stageTitle: stage.title,
        type: inferType(taskTitle),
        duration: inferDuration(taskTitle),
        status: inferStatus(null),
        focus: `Demonstrate pass-level proficiency in ${taskTitle.toLowerCase()}.`,
        notes: '',
        rating: null,
        objectives: buildObjectives(taskTitle, stage.title),
        checklist: buildChecklist(taskTitle),
        aiPrompt: buildAiPrompt(taskTitle, stage.title, null),
      })),
    })),
  };
}

export async function initializeData() {
  if (cachedData) {
    return cachedData;
  }

  try {
    const { progressHistory, oralSessions } = await loadAllData();
    cachedData = {
      syllabus: transformSyllabus(),
      progressHistory,
      oralSessions,
    };
    return cachedData;
  } catch (error) {
    console.error('Failed to initialize data:', error);
    cachedData = {
      syllabus: transformSyllabus(),
      progressHistory: [],
      oralSessions: [],
    };
    return cachedData;
  }
}

// Default exports for sync access (used before async init)
export const syllabus = transformSyllabus();
export const progressHistory = [];
export const oralSessions = [];