const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = value => typeof value === 'string' && value.trim().length > 0;

export function inspectData(data) {
  const issues = [];
  const add = (collection, id, message) => issues.push({ collection, id: id || 'unbekannt', message });
  const arrays = ['rooms', 'taskDefs', 'instances', 'shopping', 'people', 'appOpens', 'vacations'];
  arrays.forEach(key => { if (!Array.isArray(data[key])) add(key, 'gesamter Bereich', 'Gespeicherter Wert ist keine Liste.'); });

  const rooms = Array.isArray(data.rooms) ? data.rooms : [];
  const defs = Array.isArray(data.taskDefs) ? data.taskDefs : [];
  const roomIds = new Set(rooms.filter(isObject).map(r => r.id));
  const defIds = new Set(defs.filter(isObject).map(d => d.id));

  const checkUnique = (items, collection) => {
    const seen = new Set();
    items.forEach((item, index) => {
      if (!isObject(item)) return add(collection, `Position ${index + 1}`, 'Eintrag ist kein gültiges Objekt.');
      if (!isText(item.id)) add(collection, `Position ${index + 1}`, 'ID fehlt.');
      else if (seen.has(item.id)) add(collection, item.id, 'ID ist doppelt vorhanden.');
      else seen.add(item.id);
    });
  };
  arrays.forEach(key => checkUnique(Array.isArray(data[key]) ? data[key] : [], key));

  rooms.forEach((r, i) => { if (isObject(r) && !isText(r.name)) add('rooms', r.id || `Position ${i + 1}`, 'Raumname fehlt.'); });
  defs.forEach((d, i) => {
    if (!isObject(d)) return;
    if (!isText(d.title)) add('taskDefs', d.id || `Position ${i + 1}`, 'Aufgabentitel fehlt.');
    if (!roomIds.has(d.roomId)) add('taskDefs', d.id, 'Verknüpfter Raum existiert nicht.');
    if (d.household && (!Number.isFinite(d.greenDays) || !Number.isFinite(d.yellowDays) || d.greenDays < 0 || d.yellowDays <= d.greenDays)) {
      add('taskDefs', d.id, 'Statusgrenzen für Super und Okay sind ungültig.');
    }
  });
  (Array.isArray(data.instances) ? data.instances : []).forEach((item, i) => {
    if (!isObject(item)) return;
    if (!isText(item.title)) add('instances', item.id || `Position ${i + 1}`, 'Aufgabentitel fehlt.');
    if (item.roomId && !roomIds.has(item.roomId)) add('instances', item.id, 'Verknüpfter Raum existiert nicht.');
    if (item.defId && !defIds.has(item.defId)) add('instances', item.id, 'Verknüpfte Aufgabe existiert nicht.');
    if (item.completed && (!isText(item.completedAt) || Number.isNaN(Date.parse(item.completedAt)))) add('instances', item.id, 'Erledigungszeitpunkt ist ungültig.');
  });
  (Array.isArray(data.shopping) ? data.shopping : []).forEach((x, i) => { if (isObject(x) && !isText(x.name)) add('shopping', x.id || `Position ${i + 1}`, 'Bezeichnung fehlt.'); });
  (Array.isArray(data.people) ? data.people : []).forEach((x, i) => {
    if (!isObject(x)) return;
    if (!isText(x.name) || !/^\d{4}-\d{2}-\d{2}$/.test(x.birthday || '') || Number.isNaN(Date.parse(`${x.birthday}T00:00:00`))) add('people', x.id || `Position ${i + 1}`, 'Name oder Geburtstag ist ungültig.');
  });
  (Array.isArray(data.appOpens) ? data.appOpens : []).forEach((x, i) => {
    if (!isObject(x)) return;
    if (!isText(x.person) || !isText(x.openedAt) || Number.isNaN(Date.parse(x.openedAt)) || !['app', 'qr'].includes(x.source)) add('appOpens', x.id || `Position ${i + 1}`, 'App-Öffnung ist unvollständig oder ungültig.');
  });
  (Array.isArray(data.vacations) ? data.vacations : []).forEach((x, i) => {
    if (!isObject(x) || !isText(x.start) || !isText(x.end) || x.end < x.start) add('vacations', x?.id || `Position ${i + 1}`, 'Urlaubszeitraum ist ungültig.');
  });
  if (!isObject(data.balance)) add('balance', 'gesamter Bereich', 'Kontostand ist ungültig.');
  return issues;
}

export function cleanData(data) {
  const uniqueValid = (items, valid) => {
    if (!Array.isArray(items)) return [];
    const seen = new Set();
    return items.filter(item => {
      if (!isObject(item) || !isText(item.id) || seen.has(item.id) || !valid(item)) return false;
      seen.add(item.id);
      return true;
    });
  };
  const rooms = uniqueValid(data.rooms, r => isText(r.name));
  const roomIds = new Set(rooms.map(r => r.id));
  const taskDefs = uniqueValid(data.taskDefs, d => isText(d.title) && roomIds.has(d.roomId) && (!d.household || (Number.isFinite(d.greenDays) && Number.isFinite(d.yellowDays) && d.greenDays >= 0 && d.yellowDays > d.greenDays)));
  const defIds = new Set(taskDefs.map(d => d.id));
  const instances = uniqueValid(data.instances, x => isText(x.title) && (!x.roomId || roomIds.has(x.roomId)) && (!x.defId || defIds.has(x.defId)) && (!x.completed || (isText(x.completedAt) && !Number.isNaN(Date.parse(x.completedAt)))));
  return {
    ...data, rooms, taskDefs, instances,
    shopping: uniqueValid(data.shopping, x => isText(x.name)),
    people: uniqueValid(data.people, x => isText(x.name) && /^\d{4}-\d{2}-\d{2}$/.test(x.birthday || '') && !Number.isNaN(Date.parse(`${x.birthday}T00:00:00`))),
    appOpens: uniqueValid(data.appOpens, x => isText(x.person) && isText(x.openedAt) && !Number.isNaN(Date.parse(x.openedAt)) && ['app', 'qr'].includes(x.source)),
    vacations: uniqueValid(data.vacations, x => isText(x.start) && isText(x.end) && x.end >= x.start),
    balance: isObject(data.balance) ? data.balance : { amount: null, updatedBy: null, updatedAt: null },
  };
}
