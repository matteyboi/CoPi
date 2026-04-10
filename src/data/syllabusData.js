import { loadAllData } from '../utils/dataLoader';

let cachedData = null;

// Save oral/ground/knowledge tasks for future use
export const ORAL_KNOWLEDGE_TASKS = [
  'Pilot Qualifications',
  'Airworthiness Requirements',
  'Human Factors',
  'Operation of Systems',
  'Preflight Assessment',
  'Flight Deck Management',
  'Before Takeoff Check',
  'Communications, Light Signals, and Runway Lighting Systems',
  'National Airspace System',
  'Weather Information',
  'Performance and Limitations',
  'Cross-Country Flight Planning',
];

const CANONICAL_STAGES = [
  {
    title: 'Phase 1 - Foundations, Preflight & Basic Maneuvers',
    tasks: [
      'Engine Starting',
      'Taxiing',
      'Traffic Patterns',
      'Normal Takeoff and Climb',
      'Normal Approach and Landing',
      'Steep Turns',
      'Ground Reference Maneuvers',
      'Maneuvering During Slow Flight',
      'Power-Off Stalls',
      'Power-On Stalls',
      'Spin Awareness',
      'Forward Slip to a Landing',
      'Go-Around/Rejected Landing',
    ],
  },
  {
    title: 'Phase 2 — Solo Prep & Emergencies',
    tasks: [
      'Soft-Field Takeoff and Climb',
      'Soft-Field Approach and Landing',
      'Short-Field Takeoff and Maximum Performance Climb',
      'Short-Field Approach and Landing',
      'Emergency Descent',
      'Emergency Approach and Landing',
      'Systems and Equipment Malfunctions',
      'Emergency Equipment and Survival Gear',
      'After Landing, Parking, and Securing',
    ],
  },
  // First Solo (existing logic expects this between 2 and 3)
  // (removed for undo)
  {
    title: 'Phase 3 — Cross-Country & Navigation',
    tasks: [
      'Pilotage and Dead Reckoning',
      'Navigation Systems and Radar Services',
      'Diversion',
      'Lost Procedures',
      'Basic Instrument Maneuvers',
    ],
  },
  // Cross Country Solo (removed for undo)
  {
    title: 'Phase 4 — Advanced, Night, & Checkride Prep',
    tasks: [
      'Night Operations',
      'Checkride Preparation (Comprehensive Review of All Tasks)',
    ],
  },
  {
    title: 'Stage 5 — Comprehensive Flight Review',
    tasks: [
      // All flight tasks from previous stages
      'Engine Starting',
      'Taxiing (ASEL, AMEL)',
      'Traffic Patterns',
      'Normal Takeoff and Climb',
      'Normal Approach and Landing',
      'Steep Turns',
      'Ground Reference Maneuvers',
      'Maneuvering During Slow Flight',
      'Power-Off Stalls',
      'Power-On Stalls',
      'Spin Awareness',
      'Forward Slip to a Landing',
      'Go-Around/Rejected Landing',
      'Soft-Field Takeoff and Climb',
      'Soft-Field Approach and Landing',
      'Short-Field Takeoff and Maximum Performance Climb',
      'Short-Field Approach and Landing',
      'Emergency Descent',
      'Emergency Approach and Landing',
      'Systems and Equipment Malfunctions',
      'Emergency Equipment and Survival Gear',
      'After Landing, Parking, and Securing',
      'Pilotage and Dead Reckoning',
      'Navigation Systems and Radar Services',
      'Diversion',
      'Lost Procedures',
      'Basic Instrument Maneuvers',
      'Night Operations',
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
      sessions: stage.tasks.map((taskTitle, lessonIndex) => {
        // Assign an array of official sources (regulations, ACS, handbooks, etc.) for each session
        let standards = [];
        // Example for stacking: [{ref: '§61.87', link: '...'}, {ref: 'AFH Ch. 3', link: '...'}]
        if (stageIndex === 0) {
          const links = [
            [
              {ref: '§61.87', link: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61'},
              {ref: 'AFH Ch. 2', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: '§61.87', link: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61'},
              {ref: 'AFH Ch. 5', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AC 61-65J', link: 'https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/1044436'},
              {ref: 'AFH Ch. 3', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 3', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 3', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: '§91.129', link: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-91'}
            ],
            [
              {ref: 'AFH Ch. 3', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 3', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 7', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 8', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 8', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 8', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 8', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 8', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
          ];
          standards = links[lessonIndex] || [];
        } else if (stageIndex === 1) {
          const links = [
            [
              {ref: 'AFH Ch. 5', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 8', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 6', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 4', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 4', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 6', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 6', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 6', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'IPH Ch. 2', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/instrument_procedures_handbook/media/FAA-H-8083-16B.pdf'}
            ],
            [
              {ref: 'IPH Ch. 2', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/instrument_procedures_handbook/media/FAA-H-8083-16B.pdf'}
            ],
            [
              {ref: 'AFH Ch. 16', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 16', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 16', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 16', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
          ];
          standards = links[lessonIndex] || [];
        } else if (stageIndex === 2) {
          const links = [
            [
              {ref: '§61.87', link: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61'}
            ],
            [
              {ref: '§61.87', link: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61'}
            ],
            [
              {ref: 'AFH Ch. 5', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 8', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 5', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 8', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 8', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 17', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 4', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 16', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 16', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
          ];
          standards = links[lessonIndex] || [];
        } else if (stageIndex === 3) {
          const links = [
            [
              {ref: 'AFH Ch. 15', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 15', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 15', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 15', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 15', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 15', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 15', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 15', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 15', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
            [
              {ref: 'AFH Ch. 15', link: 'https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook/media/airplane_handbook.pdf'}
            ],
          ];
          standards = links[lessonIndex] || [];
        }
        // Map each task to its ACS reference and direct PDF link (leave blank if not applicable)
        const acsMap = {
          'Engine Starting': {ref: 'PA.IV.A.S1', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=47'},
          'Taxiing': {ref: 'PA.IV.A.S2', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=48'},
          'Traffic Patterns': {ref: 'PA.IV.A.S3', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=49'},
          'Normal Takeoff and Climb': {ref: 'PA.VI.A', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=61'},
          'Normal Approach and Landing': {ref: 'PA.VI.B', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=62'},
          'Steep Turns': {ref: 'PA.VIII.A', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=70'},
          'Ground Reference Maneuvers': {ref: 'PA.VIII.B', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=71'},
          'Maneuvering During Slow Flight': {ref: 'PA.VII.A', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=66'},
          'Power-Off Stalls': {ref: 'PA.VII.B', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=67'},
          'Power-On Stalls': {ref: 'PA.VII.C', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=68'},
          'Spin Awareness': {ref: 'PA.VII.D', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=69'},
          'Forward Slip to a Landing': {ref: 'PA.VI.C', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=63'},
          'Go-Around/Rejected Landing': {ref: 'PA.VI.D', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=64'},
          'Soft-Field Takeoff and Climb': {ref: 'PA.VI.E', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=65'},
          'Soft-Field Approach and Landing': {ref: 'PA.VI.F', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=66'},
          'Short-Field Takeoff and Maximum Performance Climb': {ref: 'PA.VI.G', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=67'},
          'Short-Field Approach and Landing': {ref: 'PA.VI.H', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=68'},
          'Emergency Descent': {ref: 'PA.XI.A', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=80'},
          'Emergency Approach and Landing': {ref: 'PA.XI.B', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=81'},
          'Systems and Equipment Malfunctions': {ref: 'PA.XI.C', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=82'},
          'Emergency Equipment and Survival Gear': {ref: '', link: ''},
          'After Landing, Parking, and Securing': {ref: '', link: ''},
          'Pilotage and Dead Reckoning': {ref: 'PA.IX.A', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=74'},
          'Navigation Systems and Radar Services': {ref: 'PA.IX.B', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=75'},
          'Diversion': {ref: 'PA.IX.C', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=76'},
          'Lost Procedures': {ref: 'PA.IX.D', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=77'},
          'Basic Instrument Maneuvers': {ref: 'PA.X.A', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=78'},
          'Night Operations': {ref: 'PA.XII.A', link: 'https://www.faa.gov/sites/faa.gov/files/training_testing/testing/acs/private_pilot_airplane_acs.pdf#page=84'},
          'Checkride Preparation (Comprehensive Review of All Tasks)': {ref: '', link: ''},
          // Add more mappings as needed
        };
        const acs = acsMap[taskTitle] || {ref: '', link: ''};
        if (acs.ref && acs.link) {
          standards = [{ref: acs.ref, link: acs.link}];
        } else {
          standards = [];
        }
        return {
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
          standards,
        };
      }),
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