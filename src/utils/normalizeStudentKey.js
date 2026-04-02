// Utility to normalize student keys for localStorage and profile management
export function normalizeStudentKey(name) {
  return String(name || '').trim().toLowerCase() || 'default-student';
}
