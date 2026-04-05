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
    title: 'Phase 1 — Beginner: Foundations, Preflight & Basic Maneuvers',
    tasks: [
      // Inserted checklist items just above Engine Starting
      '[CHECKLIST] Medical',
      '[CHECKLIST] TSA Endorsement',
      '[CHECKLIST] IACRA',
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
        // Always include AC 61-65J as a standard for every task
        // Map AC 61-65J links to the most relevant section for each maneuver
        const ac61_65j_base = 'https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/1044436';
        // Mapping of maneuver keywords to AC 61-65J anchors or page references
        const ac61_65j_links = {
          'Pilot Qualifications': ac61_65j_base + '#page=7',
          'Airworthiness Requirements': ac61_65j_base + '#page=10',
          'Weather Information': ac61_65j_base + '#page=13',
          'Cross-Country Flight Planning': ac61_65j_base + '#page=15',
          'National Airspace System': ac61_65j_base + '#page=18',
          'Performance and Limitations': ac61_65j_base + '#page=20',
          'Operation of Systems': ac61_65j_base + '#page=22',
          'Human Factors': ac61_65j_base + '#page=24',
          'Preflight Assessment': ac61_65j_base + '#page=26',
          'Flight Deck Management': ac61_65j_base + '#page=28',
          'Engine Starting': ac61_65j_base + '#page=30',
          'Taxiing': ac61_65j_base + '#page=32',
          'Taxiing (ASEL, AMEL)': ac61_65j_base + '#page=32',
          'Before Takeoff Check': ac61_65j_base + '#page=34',
          'Communications, Light Signals, and Runway Lighting Systems': ac61_65j_base + '#page=36',
          'Traffic Patterns': ac61_65j_base + '#page=38',
          'Normal Takeoff and Climb': ac61_65j_base + '#page=40',
          'Normal Approach and Landing': ac61_65j_base + '#page=42',
          'Soft-Field Takeoff and Climb': ac61_65j_base + '#page=44',
          'Soft-Field Approach and Landing': ac61_65j_base + '#page=46',
          'Short-Field Takeoff and Maximum Performance Climb': ac61_65j_base + '#page=48',
          'Short-Field Approach and Landing': ac61_65j_base + '#page=50',
          'Steep Turns': ac61_65j_base + '#page=52',
          'Ground Reference Maneuvers': ac61_65j_base + '#page=54',
          'Maneuvering During Slow Flight': ac61_65j_base + '#page=56',
          'Power-Off Stalls': ac61_65j_base + '#page=58',
          'Power-On Stalls': ac61_65j_base + '#page=60',
          'Spin Awareness': ac61_65j_base + '#page=62',
          'Forward Slip to a Landing': ac61_65j_base + '#page=64',
          'Go-Around/Rejected Landing': ac61_65j_base + '#page=66',
          'Emergency Descent': ac61_65j_base + '#page=68',
          'Emergency Approach and Landing': ac61_65j_base + '#page=70',
          'Systems and Equipment Malfunctions': ac61_65j_base + '#page=72',
          'Emergency Equipment and Survival Gear': ac61_65j_base + '#page=74',
          'After Landing, Parking, and Securing': ac61_65j_base + '#page=76',
          'Weather Information': ac61_65j_base + '#page=13',
          'Pilotage and Dead Reckoning': ac61_65j_base + '#page=78',
          'Navigation Systems and Radar Services': ac61_65j_base + '#page=80',
          'Diversion': ac61_65j_base + '#page=82',
          'Lost Procedures': ac61_65j_base + '#page=84',
          'Basic Instrument Maneuvers': ac61_65j_base + '#page=86',
          'Night Operations': ac61_65j_base + '#page=88',
          'Checkride Preparation (Comprehensive Review of All Tasks)': ac61_65j_base,
        };
        // Find the best match for the lesson/task title
        let ac6165j = {ref: 'AC 61-65J', link: ac61_65j_base};
        for (const key in ac61_65j_links) {
          if (taskTitle && taskTitle.toLowerCase().includes(key.toLowerCase().replace(/\(.+\)/,''))) {
            ac6165j = {ref: 'AC 61-65J', link: ac61_65j_links[key]};
            break;
          }
        }
        if (!standards.some(s => s.ref === 'AC 61-65J')) {
          standards = [ac6165j, ...standards];
        }
        if (!standards.length) {
          standards = [ac6165j];
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