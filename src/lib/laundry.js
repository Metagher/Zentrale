import { MONTHS_FULL } from './dateUtils.js';

export const LAUNDRY_STATES = ['FREI', 'LÄUFT', 'FERTIG'];
export const LAUNDRY_DEFAULT = { status: 'FREI', changedBy: null, changedAt: null, counts: {} };

// Feste "Def-ID" für die automatisch nach jedem Trockner-Lauf angelegte Aufgabe.
// Es gibt dafür keinen echten Eintrag in taskDefs - der Wert dient nur dazu, dass
// die erzeugten Instanzen eine stabile, nicht-leere defId haben (u. a. damit die
// Altdaten-Reparatur in App.jsx sie nicht fälschlich einem anderen Def zuordnet).
export const DRYER_TASK_DEF_ID = 'auto-dryer-task';
export const DRYER_TASK_TITLE_DEFAULT = 'Wäsche falten und verräumen';

export function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS_FULL[m - 1]} ${y}`;
}

// Liefert die Raum-ID, die für die automatische Trockner-Aufgabe tatsächlich
// verwendet werden soll: die gespeicherte Auswahl, falls der Raum noch existiert,
// sonst ein Raum namens "Wohnung", sonst der erste vorhandene Raum. Wird live zum
// Zeitpunkt der Nutzung berechnet (nicht einmalig beim App-Start), damit es auch
// funktioniert, wenn der Raum erst nach dem ersten Laden angelegt wurde.
export function resolveDryerTaskRoomId(dryerTask, rooms) {
  if (dryerTask?.roomId && rooms.some(r => r.id === dryerTask.roomId)) return dryerTask.roomId;
  const wohnung = rooms.find(r => (r.name || '').trim().toLowerCase() === 'wohnung');
  if (wohnung) return wohnung.id;
  return rooms[0]?.id || '';
}

export function laundryStyle(status) {
  if (status === 'LÄUFT') return { bg: 'var(--accent)', text: '#ffffff' };
  if (status === 'FERTIG') return { bg: '#059669', text: '#ffffff' };
  return { bg: '#27272a', text: '#a1a1aa' }; // FREI
}
