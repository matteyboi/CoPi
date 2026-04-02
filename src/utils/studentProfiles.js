// src/utils/studentProfiles.js

import { STUDENT_PROFILES_STORAGE_KEY } from '../storageKeys';

export function readStudentProfiles() {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    return JSON.parse(window.localStorage.getItem(STUDENT_PROFILES_STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function writeStudentProfiles(profiles) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STUDENT_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
}
