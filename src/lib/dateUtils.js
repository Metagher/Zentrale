export const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const WEEKDAYS_FULL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
export const MONTHS_FULL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Alle folgenden Funktionen rechnen bewusst in UTC, damit reine Kalenderdaten
// (YYYY-MM-DD) unabhängig von der Zeitzone des Browsers korrekt verarbeitet werden.
// Eine frühere Version nutzte lokale Zeit + toISOString(), wodurch das Datum in
// Zeitzonen mit positivem UTC-Versatz (z. B. Deutschland) beim Hochzählen stehen
// bleiben konnte -> Endlosschleife bei wiederkehrenden Aufgaben.
export function parseISODate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
export function toISODate(d) {
  return d.toISOString().slice(0, 10);
}
export function addDays(dateStr, n) {
  const d = parseISODate(dateStr);
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}
export function dowSunFirst(dateStr) {
  return parseISODate(dateStr).getUTCDay(); // 0=So .. 6=Sa
}
export function weekStart(dateStr) {
  const d = parseISODate(dateStr);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return toISODate(d);
}
export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
}
export function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ', ' +
    d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
