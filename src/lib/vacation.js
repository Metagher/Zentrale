export function isDateInVacation(dateStr, vacations) {
  return (vacations || []).some(v => dateStr >= v.start && dateStr <= v.end);
}

// Entfernt noch nicht erledigte Termine, deren Datum in einen Urlaubszeitraum fällt.
// Erledigte Termine (historische Daten) bleiben unangetastet.
export function suppressVacationInstances(instances, vacations) {
  if (!vacations || vacations.length === 0) return instances;
  return instances.filter(i => i.completed || !isDateInVacation(i.dueDate, vacations));
}
