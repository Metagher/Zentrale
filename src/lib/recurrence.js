import { WEEKDAYS_SHORT, addDays, dowSunFirst, formatDate } from './dateUtils.js';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function byOpenFirstThenTitle(a, b) {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  return a.title.localeCompare(b.title);
}

export function recurrenceLabel(def) {
  if (def.recurType === 'once') return `Einmalig, ${formatDate(def.startDate)}`;
  if (def.recurType === 'daily') return 'Täglich';
  if (def.recurType === 'weekly') {
    const days = (def.daysOfWeek || []).slice().sort().map(d => WEEKDAYS_SHORT[d]).join(', ');
    return `Wöchentlich: ${days || '–'}`;
  }
  if (def.recurType === 'monthly') {
    const day = new Date(def.startDate + 'T00:00:00').getDate();
    return `Monatlich am ${day}.`;
  }
  return '';
}

export function generateInstancesForDef(def, fromDate, throughDate) {
  const out = [];
  if (def.recurType === 'once') {
    if (def.startDate >= fromDate && def.startDate <= throughDate) {
      out.push(makeInstance(def, def.startDate));
    }
    return out;
  }
  let cursor = fromDate > def.startDate ? fromDate : def.startDate;
  while (cursor <= throughDate) {
    let matches = false;
    if (def.recurType === 'daily') matches = true;
    else if (def.recurType === 'weekly') {
      const dow = (dowSunFirst(cursor) + 6) % 7; // Mo=0..So=6
      matches = (def.daysOfWeek || []).includes(dow);
    } else if (def.recurType === 'monthly') {
      const startDay = new Date(def.startDate + 'T00:00:00').getDate();
      matches = new Date(cursor + 'T00:00:00').getDate() === startDay;
    }
    if (matches) out.push(makeInstance(def, cursor));
    cursor = addDays(cursor, 1);
  }
  return out;
}

export function makeInstance(def, dueDate) {
  return {
    id: uid(),
    defId: def.id,
    title: def.title,
    roomId: def.roomId,
    dueDate,
    assignedTo: null,
    completed: false,
    completedAt: null,
    completedBy: null,
    comments: [],
  };
}

export const ROLL_DAYS = 60;
export const WEEKLY_ROLL_DAYS = 21; // Wochenserien: immer nur 3 Wochen im Voraus erzeugen

export function rollWindowFor(recurType) {
  return recurType === 'weekly' ? WEEKLY_ROLL_DAYS : ROLL_DAYS;
}

export function extendRecurringInstances(defs, instances, today) {
  let list = [...instances];
  const newDefs = defs.map(def => {
    if (def.recurType === 'once') return def;
    const targetThrough = addDays(today, rollWindowFor(def.recurType));
    const genThrough = def.generatedThrough || def.startDate;
    if (genThrough >= targetThrough) return def;
    const from = addDays(genThrough, 1);
    const existingKeys = new Set(list.filter(i => i.defId === def.id).map(i => i.dueDate));
    const added = generateInstancesForDef(def, from, targetThrough).filter(a => !existingKeys.has(a.dueDate));
    list = list.concat(added);
    return { ...def, generatedThrough: targetThrough };
  });
  return { defs: newDefs, instances: list };
}
