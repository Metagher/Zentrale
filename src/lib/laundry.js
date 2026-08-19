import { MONTHS_FULL } from './dateUtils.js';

export const LAUNDRY_STATES = ['FREI', 'LÄUFT', 'FERTIG'];
export const LAUNDRY_DEFAULT = { status: 'FREI', changedBy: null, changedAt: null, counts: {} };

export function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS_FULL[m - 1]} ${y}`;
}

export function laundryStyle(status) {
  if (status === 'LÄUFT') return { bg: 'var(--accent)', text: '#ffffff' };
  if (status === 'FERTIG') return { bg: '#059669', text: '#ffffff' };
  return { bg: '#27272a', text: '#a1a1aa' }; // FREI
}
