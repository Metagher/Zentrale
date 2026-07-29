import { useEffect, useRef, useState } from 'react';
import { Home, LogOut, RefreshCw } from 'lucide-react';
import { getStoredConfig, saveConfig, clearConfig, buildClient } from './supabase.js';
import SetupScreen from './SetupScreen.jsx';
import { USERS, NAV_ITEMS, DEFAULT_ACTIVITY_TYPES } from './constants.js';
import { addDays, formatDate, todayISO } from './lib/dateUtils.js';
import { extendRecurringInstances, generateInstancesForDef, makeInstance, rollWindowFor, uid } from './lib/recurrence.js';
import { loadKey, saveKey } from './lib/storage.js';
import { guard } from './lib/guard.js';
import { DRYER_TASK_DEF_ID, DRYER_TASK_TITLE_DEFAULT, LAUNDRY_DEFAULT, LAUNDRY_STATES, monthKey, resolveDryerTaskRoomId } from './lib/laundry.js';
import { suppressVacationInstances } from './lib/vacation.js';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { Login } from './components/Login.jsx';
import { AccentButton, Field, GhostButton, Modal, Toast, inputCls } from './components/ui.jsx';
import { OverviewView } from './views/OverviewView.jsx';
import { CalendarView } from './views/CalendarView.jsx';
import { TasksView } from './views/TasksView.jsx';
import { ReportsView } from './views/ReportsView.jsx';
import { LaundryView } from './views/LaundryView.jsx';
import { ShoppingView } from './views/ShoppingView.jsx';
import { SettingsView } from './views/SettingsView.jsx';

function AppInner() {
  const [config, setConfig] = useState(() => getStoredConfig());
  const [supabase, setSupabase] = useState(() => config ? buildClient(config) : null);
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState(null);
  const [view, setView] = useState('overview');
  const [rooms, setRooms] = useState([]);
  const [taskDefs, setTaskDefs] = useState([]);
  const [instances, setInstances] = useState([]);
  const [laundry, setLaundry] = useState({ waschmaschine: LAUNDRY_DEFAULT, trockner: LAUNDRY_DEFAULT });
  const [shopping, setShopping] = useState([]);
  const [balance, setBalance] = useState({ amount: null, updatedBy: null, updatedAt: null });
  const [activities, setActivities] = useState([]);
  const [activityTypes, setActivityTypes] = useState(DEFAULT_ACTIVITY_TYPES);
  const [vacations, setVacations] = useState([]);
  const [quickAddDate, setQuickAddDate] = useState(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  const instancesRef = useRef(instances);
  const userNameRef = useRef(userName);

  useEffect(() => { instancesRef.current = instances; }, [instances]);
  useEffect(() => { userNameRef.current = userName; }, [userName]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => { if (supabase) load(); }, [supabase]);
  useEffect(() => {
    if (!supabase || !userName) return;
    const id = setInterval(() => { load(); }, 30000);
    return () => clearInterval(id);
  }, [supabase, userName]);
  useEffect(() => {
    const onError = (e) => {
      console.error('Unerwarteter Fehler:', e.error || e.message);
      window.alert('Unerwarteter Fehler: ' + (e.error?.message || e.message || 'unbekannt'));
    };
    const onRejection = (e) => {
      console.error('Unerwarteter Fehler (Promise):', e.reason);
      window.alert('Unerwarteter Fehler: ' + (e.reason?.message || String(e.reason)));
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  async function load() {
    let r = await loadKey(supabase, 'rooms', []);
    r = r.map(room => {
      if (room.technischeInfo !== undefined) return room;
      const legacy = [
        room.etage ? `Etage: ${room.etage}` : '',
        room.flaeche ? `Fläche: ${room.flaeche} m²` : '',
        room.boden ? `Boden: ${room.boden}` : '',
        room.heizung ? `Heizung: ${room.heizung}` : '',
        room.notizen || '',
      ].filter(Boolean).join('\n');
      const { etage, flaeche, boden, heizung, notizen, ...rest } = room;
      return { ...rest, technischeInfo: legacy };
    });
    let d = await loadKey(supabase, 'taskDefs', []);
    let i = await loadKey(supabase, 'instances', []);

    // Reparatur: Räume/Aufgaben, die durch einen früheren Fehler ohne gültige ID
    // gespeichert wurden, bekommen jetzt eine ID. Verweise darauf werden nachgezogen.
    const seenRoomIds = new Set();
    let firstRepairedRoomId = null;
    r = r.map(room => {
      if (room.id && !seenRoomIds.has(room.id)) {
        seenRoomIds.add(room.id);
        return room;
      }
      const newId = uid();
      seenRoomIds.add(newId);
      if (!firstRepairedRoomId) firstRepairedRoomId = newId;
      return { ...room, id: newId };
    });
    const seenDefIds = new Set();
    let firstRepairedDefId = null;
    d = d.map(def => {
      if (def.id && !seenDefIds.has(def.id)) {
        seenDefIds.add(def.id);
        return def;
      }
      const newId = uid();
      seenDefIds.add(newId);
      if (!firstRepairedDefId) firstRepairedDefId = newId;
      return { ...def, id: newId };
    });
    if (firstRepairedRoomId) {
      d = d.map(def => def.roomId ? def : { ...def, roomId: firstRepairedRoomId });
      i = i.map(inst => inst.roomId ? inst : { ...inst, roomId: firstRepairedRoomId });
    }
    if (firstRepairedDefId) {
      i = i.map(inst => inst.defId ? inst : { ...inst, defId: firstRepairedDefId });
    }

    const v = await loadKey(supabase, 'vacations', []);

    const today = todayISO();
    i = i.map(inst => (!inst.completed && inst.dueDate < today) ? { ...inst, dueDate: today } : inst);
    const ext = extendRecurringInstances(d, i, today, v);
    const cleanedInstances = suppressVacationInstances(ext.instances, v);

    // Neue Kommentare der jeweils anderen Person kurz als Toast anzeigen.
    // Nur relevant, wenn schon eingeloggt - der allererste Load (vor dem Login)
    // würde sonst jeden bestehenden Kommentar fälschlich als "neu" melden.
    if (userNameRef.current) {
      const seen = new Set();
      instancesRef.current.forEach(inst => {
        (inst.comments || []).forEach(c => seen.add(`${inst.id}|${c.ts}|${c.user}`));
      });
      let latestNew = null;
      cleanedInstances.forEach(inst => {
        (inst.comments || []).forEach(c => {
          if (c.user === userNameRef.current) return;
          if (seen.has(`${inst.id}|${c.ts}|${c.user}`)) return;
          if (!latestNew || c.ts > latestNew.ts) latestNew = { ...c, taskTitle: inst.title };
        });
      });
      if (latestNew) {
        setToast(`Neuer Kommentar von ${latestNew.user} bei „${latestNew.taskTitle}“`);
      }
    }

    let l = await loadKey(supabase, 'laundry', null);
    if (!l || typeof l !== 'object') l = {};
    l = {
      waschmaschine: { ...LAUNDRY_DEFAULT, ...(l.waschmaschine || {}), counts: { ...(l.waschmaschine?.counts || {}) } },
      trockner: { ...LAUNDRY_DEFAULT, ...(l.trockner || {}), counts: { ...(l.trockner?.counts || {}) } },
      dryerTask: l.dryerTask || { title: DRYER_TASK_TITLE_DEFAULT, roomId: '' },
    };

    const s = await loadKey(supabase, 'shopping', []);
    const b = await loadKey(supabase, 'balance', { amount: null, updatedBy: null, updatedAt: null });
    const act = await loadKey(supabase, 'activities', []);
    const actTypes = await loadKey(supabase, 'activityTypes', DEFAULT_ACTIVITY_TYPES);

    setRooms(r);
    setTaskDefs(ext.defs);
    setInstances(cleanedInstances);
    setLaundry(l);
    setShopping(s);
    setBalance(b);
    setActivities(act);
    setActivityTypes(actTypes);
    setVacations(v);
    setReady(true);
    saveKey(supabase, 'rooms', r);
    saveKey(supabase, 'taskDefs', ext.defs);
    saveKey(supabase, 'instances', cleanedInstances);
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  function persistLaundry(next) { setLaundry(next); saveKey(supabase, 'laundry', next); }
  function cycleMachine(machine) {
    const current = laundry[machine] || LAUNDRY_DEFAULT;
    const nextIndex = (LAUNDRY_STATES.indexOf(current.status) + 1) % LAUNDRY_STATES.length;
    const nextStatus = LAUNDRY_STATES[nextIndex];
    const counts = { ...(current.counts || {}) };
    if (nextStatus === 'FERTIG') {
      const key = monthKey();
      counts[key] = (counts[key] || 0) + 1;
    }
    const next = {
      ...laundry,
      [machine]: { status: nextStatus, changedBy: user.name, changedAt: new Date().toISOString(), counts },
    };
    persistLaundry(next);
    if (machine === 'trockner' && nextStatus === 'FERTIG' && laundry.dryerTask?.title) {
      const roomId = resolveDryerTaskRoomId(laundry.dryerTask, rooms);
      if (roomId) {
        const dryerDef = { id: DRYER_TASK_DEF_ID, title: laundry.dryerTask.title, roomId };
        persistInstances([...instances, makeInstance(dryerDef, todayISO())]);
        const roomName = rooms.find(r => r.id === roomId)?.name;
        setToast(`Automatische Aufgabe erstellt: „${laundry.dryerTask.title}“${roomName ? ` (${roomName})` : ''}`);
      }
    }
  }
  function saveDryerTask(data) {
    persistLaundry({ ...laundry, dryerTask: { title: data.title.trim(), roomId: data.roomId } });
  }
  function adjustLaundryCount(machine, delta) {
    const current = laundry[machine] || LAUNDRY_DEFAULT;
    const key = monthKey();
    const counts = { ...(current.counts || {}) };
    counts[key] = Math.max(0, (counts[key] || 0) + delta);
    persistLaundry({ ...laundry, [machine]: { ...current, counts } });
  }

  function persistRooms(next) { setRooms(next); saveKey(supabase, 'rooms', next); }
  function persistDefs(next) { setTaskDefs(next); saveKey(supabase, 'taskDefs', next); }
  function persistInstances(next) { setInstances(next); saveKey(supabase, 'instances', next); }
  function persistVacations(next) { setVacations(next); saveKey(supabase, 'vacations', next); }

  function addVacation({ start, end }) {
    const next = [...vacations, { id: uid(), start, end }];
    persistVacations(next);
    const cleaned = suppressVacationInstances(instances, next);
    if (cleaned.length !== instances.length) persistInstances(cleaned);
  }
  function deleteVacation(id) {
    persistVacations(vacations.filter(v => v.id !== id));
  }

  function addTaskDef(data) {
    const { isCleaning, ...rest } = data;
    const def = { ...rest, id: uid(), generatedThrough: null };
    const through = def.recurType === 'once' ? def.startDate : addDays(todayISO(), rollWindowFor(def.recurType));
    // Einmalige Vorlagen erzeugen bewusst keinen Termin beim Anlegen - Termine
    // entstehen dafür ausschließlich über die "Heute"/"Morgen"-Buttons. Sonst
    // gäbe es sofort einen zusätzlichen, unerwünschten Termin am Erstelldatum.
    const skipInitialInstance = def.recurType === 'once' && def.isTemplate;
    const newInstances = skipInitialInstance ? [] : generateInstancesForDef(def, def.startDate, through, vacations);
    def.generatedThrough = through;
    persistDefs([...taskDefs, def]);
    persistInstances([...instances, ...newInstances]);
    if (isCleaning) {
      persistRooms(rooms.map(r => r.id === def.roomId ? { ...r, cleaningDefId: def.id } : r));
    }
  }
  function editTaskDef(data) {
    const { isCleaning, ...rest } = data;
    const prev = taskDefs.find(d => d.id === rest.id);
    const patternChanged = prev && (
      prev.recurType !== rest.recurType ||
      prev.startDate !== rest.startDate ||
      JSON.stringify(prev.daysOfWeek || []) !== JSON.stringify(rest.daysOfWeek || [])
    );
    const today = todayISO();

    let nextInstances;
    if (patternChanged && rest.recurType !== 'once') {
      // Die Wiederholungsregel selbst hat sich geändert: noch nicht vergangene und
      // noch nicht erledigte Termine dieser Aufgabe werden verworfen und anhand der
      // neuen Regel neu erzeugt. Vergangene und bereits erledigte Termine bleiben
      // unangetastet (keine rückwirkende Änderung historischer Daten).
      const kept = instances.filter(i => !(i.defId === rest.id && i.dueDate >= today && !i.completed));
      const through = addDays(today, rollWindowFor(rest.recurType));
      const existingDates = new Set(kept.filter(i => i.defId === rest.id).map(i => i.dueDate));
      const fresh = generateInstancesForDef(rest, today, through, vacations).filter(inst => !existingDates.has(inst.dueDate));
      nextInstances = [...kept, ...fresh];
      rest.generatedThrough = through;
    } else {
      // Nur Titel/Raum auf bereits erzeugte, noch nicht vergangene Termine übertragen.
      nextInstances = instances.map(i =>
        (i.defId === rest.id && i.dueDate >= today) ? { ...i, title: rest.title, roomId: rest.roomId } : i
      );
    }

    persistDefs(taskDefs.map(d => d.id === rest.id ? { ...d, ...rest } : d));
    persistRooms(rooms.map(r => {
      if (isCleaning && r.id === rest.roomId) return { ...r, cleaningDefId: rest.id };
      if (r.cleaningDefId === rest.id && (!isCleaning || r.id !== rest.roomId)) return { ...r, cleaningDefId: null };
      return r;
    }));
    persistInstances(nextInstances);
  }

  function createInstanceFromTemplate(def, dueDate) {
    persistInstances([...instances, makeInstance(def, dueDate)]);
  }
  function deleteTaskDef(def) {
    if (!window.confirm(`Aufgabe "${def.title}" inklusive zukünftiger offener Termine löschen?`)) return;
    persistDefs(taskDefs.filter(d => d.id !== def.id));
    persistInstances(instances.filter(i => !(i.defId === def.id && !i.completed)));
    persistRooms(rooms.map(r => r.cleaningDefId === def.id ? { ...r, cleaningDefId: null } : r));
  }

  function updateInstance(next) {
    persistInstances(instances.map(i => i.id === next.id ? next : i));
  }
  function deleteInstance(inst) {
    if (!window.confirm('Diese Aufgabe löschen?')) return;
    persistInstances(instances.filter(i => i.id !== inst.id));
  }

  function persistShopping(next) { setShopping(next); saveKey(supabase, 'shopping', next); }
  function addShoppingItem(name) {
    const item = { id: uid(), name: name.trim(), done: false, addedBy: user.name, addedAt: new Date().toISOString(), doneBy: null, doneAt: null };
    persistShopping([...shopping, item]);
  }
  function toggleShoppingItem(item) {
    const nextDone = !item.done;
    persistShopping(shopping.map(i => i.id === item.id
      ? { ...i, done: nextDone, doneBy: nextDone ? user.name : null, doneAt: nextDone ? new Date().toISOString() : null }
      : i));
  }
  function deleteShoppingItem(item) {
    persistShopping(shopping.filter(i => i.id !== item.id));
  }
  function clearBoughtShoppingItems() {
    if (!window.confirm('Gekaufte Einträge aus der Liste entfernen?')) return;
    persistShopping(shopping.filter(i => !i.done));
  }

  function saveBalance(amount) {
    const next = { amount, updatedBy: user.name, updatedAt: new Date().toISOString() };
    setBalance(next);
    saveKey(supabase, 'balance', next);
  }

  function logActivity(type) {
    const event = { id: uid(), type, user: user.name, ts: new Date().toISOString() };
    const next = [...activities, event];
    setActivities(next);
    saveKey(supabase, 'activities', next);
  }
  function undoActivity(id) {
    const next = activities.filter(a => a.id !== id);
    setActivities(next);
    saveKey(supabase, 'activities', next);
  }

  function persistActivityTypes(next) { setActivityTypes(next); saveKey(supabase, 'activityTypes', next); }
  function addActivityType(label) {
    persistActivityTypes([...activityTypes, { id: uid(), label: label.trim() }]);
  }
  function deleteActivityType(id) {
    persistActivityTypes(activityTypes.filter(t => t.id !== id));
  }

  function quickAdd(title, roomId, dueDate) {
    const def = { id: uid(), title, roomId, recurType: 'once', startDate: dueDate, generatedThrough: dueDate };
    persistDefs([...taskDefs, def]);
    persistInstances([...instances, makeInstance(def, dueDate)]);
    setQuickAddDate(null);
  }

  if (!config || !supabase) {
    return (
      <SetupScreen
        onSave={(project, anonKey) => {
          saveConfig(project, anonKey);
          const cfg = { project, anonKey };
          setConfig(cfg);
          setSupabase(buildClient(cfg));
        }}
      />
    );
  }
  if (!ready) return <div className="min-h-screen bg-zinc-950" />;
  if (!userName) return <Login onLogin={setUserName} onReset={() => { clearConfig(); setConfig(null); setSupabase(null); setReady(false); }} />;

  const user = USERS[userName];

  return (
    <div style={{ '--accent': user.accent, '--accent-ring': user.ring }} className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-30 bg-zinc-900/90 backdrop-blur border-b border-zinc-800"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-5xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Home size={15} className="text-white" />
            </div>
            <span className="font-semibold text-sm text-zinc-50">Zuhause</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1" style={{ backgroundColor: user.light }}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: user.accent }}>
                {user.name[0]}
              </span>
              <span className="text-xs font-medium" style={{ color: user.accent }}>{user.name}</span>
            </div>
            <button onClick={refresh} disabled={refreshing} title="Aktualisieren"
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 disabled:opacity-50">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setUserName(null)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto md:flex">
        <nav className="hidden md:flex flex-col gap-1 w-52 shrink-0 px-4 py-6" style={{ alignSelf: 'flex-start' }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button key={item.id} onClick={() => setView(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${active ? 'text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
                style={active ? { backgroundColor: 'var(--accent)' } : {}}
              >
                <Icon size={17} /> {item.label}
              </button>
            );
          })}
        </nav>

        <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-10 min-w-0">
          {view === 'overview' && (
            <OverviewView instances={instances} rooms={rooms} user={user} onlyMine={onlyMine} setOnlyMine={setOnlyMine}
              onUpdate={guard(updateInstance, 'Aufgabe speichern')} onDelete={guard(deleteInstance, 'Aufgabe löschen')} onQuickAdd={setQuickAddDate}
              activityTypes={activityTypes} activities={activities}
              onLogActivity={guard(logActivity, 'Aktivität erfassen')} onUndoActivity={guard(undoActivity, 'Erfassung rückgängig machen')} />
          )}
          {view === 'calendar' && (
            <CalendarView instances={instances} rooms={rooms} user={user} onlyMine={onlyMine} setOnlyMine={setOnlyMine}
              onUpdate={guard(updateInstance, 'Aufgabe speichern')} onDelete={guard(deleteInstance, 'Aufgabe löschen')} onQuickAdd={setQuickAddDate} />
          )}
          {view === 'tasks' && (
            <TasksView taskDefs={taskDefs} rooms={rooms} onAddDef={guard(addTaskDef, 'Aufgabe anlegen')} onEditDef={guard(editTaskDef, 'Aufgabe speichern')} onDeleteDef={guard(deleteTaskDef, 'Aufgabe löschen')}
              onCreateFromTemplate={guard(createInstanceFromTemplate, 'Aufgabe erstellen')} />
          )}
          {view === 'reports' && (
            <ReportsView rooms={rooms} instances={instances} laundry={laundry} activities={activities} activityTypes={activityTypes} />
          )}
          {view === 'laundry' && (
            <LaundryView laundry={laundry} onCycle={guard(cycleMachine, 'Waschstatus ändern')} onAdjust={guard(adjustLaundryCount, 'Zähler anpassen')} />
          )}
          {view === 'shopping' && (
            <ShoppingView items={shopping} balance={balance}
              onAdd={guard(addShoppingItem, 'Eintrag hinzufügen')}
              onToggle={guard(toggleShoppingItem, 'Eintrag abhaken')}
              onDelete={guard(deleteShoppingItem, 'Eintrag löschen')}
              onClearBought={guard(clearBoughtShoppingItems, 'Liste aufräumen')}
              onSaveBalance={guard(saveBalance, 'Kontostand speichern')} />
          )}
          {view === 'settings' && (
            <SettingsView rooms={rooms} instances={instances} onSaveRooms={guard(persistRooms, 'Raum speichern')}
              vacations={vacations} onAddVacation={guard(addVacation, 'Urlaub hinzufügen')} onDeleteVacation={guard(deleteVacation, 'Urlaub löschen')}
              dryerTask={laundry.dryerTask} onSaveDryerTask={guard(saveDryerTask, 'Automatische Aufgabe speichern')}
              activityTypes={activityTypes} onAddActivityType={guard(addActivityType, 'Aktivität hinzufügen')} onDeleteActivityType={guard(deleteActivityType, 'Aktivität löschen')} />
          )}
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-zinc-900 border-t border-zinc-800 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button key={item.id} onClick={() => setView(item.id)}
              className="flex-1 min-w-0 flex flex-col items-center gap-0.5 py-2 px-0.5"
              style={{ color: active ? 'var(--accent)' : '#a1a1aa' }}
            >
              <Icon size={18} />
              <span className="text-[10px] font-medium leading-tight truncate max-w-full">{item.shortLabel || item.label}</span>
            </button>
          );
        })}
      </nav>

      {quickAddDate && (
        <QuickAddModal date={quickAddDate} rooms={rooms} onCancel={() => setQuickAddDate(null)} onSave={guard(quickAdd, 'Aufgabe anlegen')} />
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}

function QuickAddModal({ date, rooms, onCancel, onSave }) {
  const [title, setTitle] = useState('');
  const [roomId, setRoomId] = useState(rooms[0]?.id || '');
  return (
    <Modal title={`Aufgabe am ${formatDate(date)}`} onClose={onCancel}>
      <Field label="Titel">
        <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="z. B. Bad putzen" autoFocus />
      </Field>
      <Field label="Raum">
        <select className={inputCls} value={roomId} onChange={e => setRoomId(e.target.value)}>
          {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </Field>
      <div className="flex gap-2 justify-end mt-2">
        <GhostButton onClick={onCancel}>Abbrechen</GhostButton>
        <AccentButton disabled={!title.trim() || !roomId} onClick={() => onSave(title.trim(), roomId, date)}>Speichern</AccentButton>
      </div>
    </Modal>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
