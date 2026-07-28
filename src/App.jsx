import React, { useState, useEffect, useMemo } from 'react';
import {
  Home, Calendar, LayoutGrid, ListChecks, BarChart3, Check, Plus, X,
  ChevronLeft, ChevronRight, LogOut, MessageSquare, Trash2,
  Pencil, Undo2, MapPin, Sparkles, WashingMachine, Fan, ShoppingCart, RefreshCw
} from 'lucide-react';
import { getStoredConfig, saveConfig, clearConfig, buildClient } from './supabase.js';
import SetupScreen from './SetupScreen.jsx';

/* ---------------------------------------------------------------- */
/* Konstanten & Hilfsfunktionen                                     */
/* ---------------------------------------------------------------- */

const USERS = {
  Fabian: { name: 'Fabian', accent: '#2563eb', light: '#eff6ff', soft: '#dbeafe', ring: '#bfdbfe' },
  Marie:  { name: 'Marie',  accent: '#db2777', light: '#fdf2f8', soft: '#fce7f3', ring: '#fbcfe8' },
};

const NAV_ITEMS = [
  { id: 'overview', label: 'Übersicht', icon: Home },
  { id: 'tasks', label: 'Aufgaben', icon: ListChecks },
  { id: 'calendar', label: 'Kalender', icon: Calendar },
  { id: 'laundry', label: 'Waschstatus', shortLabel: 'Wäsche', icon: WashingMachine },
  { id: 'shopping', label: 'Einkaufen', icon: ShoppingCart },
  { id: 'rooms', label: 'Räume', icon: LayoutGrid },
  { id: 'reports', label: 'Berichte', icon: BarChart3 },
];

const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEKDAYS_FULL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTHS_FULL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// Alle folgenden Funktionen rechnen bewusst in UTC, damit reine Kalenderdaten
// (YYYY-MM-DD) unabhängig von der Zeitzone des Browsers korrekt verarbeitet werden.
// Eine frühere Version nutzte lokale Zeit + toISOString(), wodurch das Datum in
// Zeitzonen mit positivem UTC-Versatz (z. B. Deutschland) beim Hochzählen stehen
// bleiben konnte -> Endlosschleife bei wiederkehrenden Aufgaben.
function parseISODate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function toISODate(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(dateStr, n) {
  const d = parseISODate(dateStr);
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}
function dowSunFirst(dateStr) {
  return parseISODate(dateStr).getUTCDay(); // 0=So .. 6=Sa
}
function weekStart(dateStr) {
  const d = parseISODate(dateStr);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return toISODate(d);
}
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
}
function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ', ' +
    d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function byOpenFirstThenTitle(a, b) {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  return a.title.localeCompare(b.title);
}

function recurrenceLabel(def) {
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

function generateInstancesForDef(def, fromDate, throughDate) {
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

function makeInstance(def, dueDate) {
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

const ROLL_DAYS = 60;
const WEEKLY_ROLL_DAYS = 21; // Wochenserien: immer nur 3 Wochen im Voraus erzeugen

function rollWindowFor(recurType) {
  return recurType === 'weekly' ? WEEKLY_ROLL_DAYS : ROLL_DAYS;
}

function extendRecurringInstances(defs, instances, today) {
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

/* ---------------------------------------------------------------- */
/* Storage Helpers                                                  */
/* ---------------------------------------------------------------- */

async function loadKey(supabase, key, fallback) {
  try {
    const { data, error } = await supabase.from('zuhause_kv_store').select('value').eq('key', key).maybeSingle();
    if (error || !data) return fallback;
    return data.value;
  } catch (e) {
    return fallback;
  }
}
async function saveKey(supabase, key, value) {
  try {
    const { error } = await supabase.from('zuhause_kv_store').upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) console.error('Speichern fehlgeschlagen', key, error);
  } catch (e) {
    console.error('Speichern fehlgeschlagen', key, e);
  }
}

/* ---------------------------------------------------------------- */
/* Generische UI-Bausteine                                          */
/* ---------------------------------------------------------------- */

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-6"
      onClick={onClose}>
      <div
        className={`bg-zinc-900 w-full ${wide ? 'md:max-w-2xl' : 'md:max-w-md'} overflow-y-auto rounded-t-2xl md:rounded-2xl shadow-xl`}
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-900">
          <h2 className="text-base font-semibold text-zinc-50">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-zinc-700 bg-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-offset-0";

function AccentButton({ children, onClick, type = 'button', full, small, disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium text-white transition disabled:opacity-40 ${full ? 'w-full' : ''} ${small ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'}`}
      style={{ backgroundColor: 'var(--accent)' }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, small, danger }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium border transition ${small ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'} ${danger ? 'border-red-900 text-red-400 hover:bg-red-950' : 'border-zinc-800 text-zinc-200 hover:bg-zinc-800'}`}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- */
/* Login                                                             */
/* ---------------------------------------------------------------- */

function Login({ onLogin, onReset }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center">
            <Home size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-50">Zuhause</h1>
          <p className="text-sm text-zinc-400 mt-1">Wer nutzt die App gerade?</p>
        </div>
        <div className="space-y-3">
          {Object.values(USERS).map(u => (
            <button
              key={u.name}
              onClick={() => onLogin(u.name)}
              className="w-full flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 hover:shadow-md transition text-left"
            >
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                style={{ backgroundColor: u.accent }}>
                {u.name[0]}
              </div>
              <div>
                <div className="font-medium text-zinc-50">{u.name}</div>
                <div className="text-xs text-zinc-500">Anmelden</div>
              </div>
            </button>
          ))}
        </div>
        {onReset && (
          <button onClick={onReset} className="w-full text-center text-xs text-zinc-600 hover:text-zinc-400 mt-6">
            Supabase-Zugangsdaten ändern
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* TaskCard                                                          */
/* ---------------------------------------------------------------- */

function TaskCard({ instance, room, rooms, user, onUpdate, onDelete, compact }) {
  const [editing, setEditing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [form, setForm] = useState({
    roomId: instance.roomId, dueDate: instance.dueDate,
  });

  const assignedUser = instance.assignedTo ? USERS[instance.assignedTo] : null;

  function save() {
    onUpdate({ ...instance, ...form });
    setEditing(false);
  }
  function addComment() {
    if (!commentText.trim()) return;
    onUpdate({
      ...instance,
      comments: [...(instance.comments || []), { user: user.name, text: commentText.trim(), ts: new Date().toISOString() }],
    });
    setCommentText('');
  }

  const overdueGrace = false; // dueDate is auto-corrected on load already
  const otherUserName = Object.keys(USERS).find(n => n !== user.name);

  return (
    <div className={`rounded-xl border bg-zinc-900 ${instance.completed ? 'border-zinc-800 opacity-60' : 'border-zinc-800'} px-4 py-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-zinc-50 text-sm">{instance.title}</span>
            {!compact && (
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <MapPin size={11} /> {room ? room.name : '–'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
            {compact && <span className="flex items-center gap-1"><MapPin size={12} /> {room ? room.name : '–'}</span>}
            {assignedUser ? (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: assignedUser.accent }} />
                {assignedUser.name}
              </span>
            ) : (
              <span className="text-zinc-500">Nicht zugewiesen</span>
            )}
          </div>
          {instance.completed && (
            <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
              <Check size={12} /> Erledigt von {instance.completedBy} am {formatDateTime(instance.completedAt)}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {!instance.completed && !instance.assignedTo && (
            <AccentButton small onClick={() => onUpdate({ ...instance, assignedTo: user.name })}>Übernehmen</AccentButton>
          )}
          {!instance.completed && instance.assignedTo === otherUserName && (
            <GhostButton small onClick={() => onUpdate({ ...instance, assignedTo: user.name })}>Zurückholen</GhostButton>
          )}
          {!instance.completed && instance.assignedTo === user.name && (
            <AccentButton small onClick={() => onUpdate({ ...instance, completed: true, completedAt: new Date().toISOString(), completedBy: user.name })}>
              <Check size={13} /> Erledigt
            </AccentButton>
          )}
          {!instance.completed && instance.assignedTo !== otherUserName && (
            <GhostButton small onClick={() => onUpdate({ ...instance, assignedTo: otherUserName })}>
              Delegieren
            </GhostButton>
          )}
          {instance.completed && (
            <GhostButton small onClick={() => onUpdate({ ...instance, completed: false, completedAt: null, completedBy: null })}>
              <Undo2 size={13} /> Rückgängig
            </GhostButton>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-zinc-800">
        <button onClick={() => setEditing(v => !v)} className="text-xs text-zinc-500 hover:text-zinc-200 flex items-center gap-1">
          <Pencil size={11} /> Verschieben
        </button>
        <button onClick={() => setShowComments(v => !v)} className="text-xs text-zinc-500 hover:text-zinc-200 flex items-center gap-1">
          <MessageSquare size={11} /> Kommentare {instance.comments?.length ? `(${instance.comments.length})` : ''}
        </button>
        <button onClick={() => onDelete(instance)} className="text-xs text-zinc-600 hover:text-red-400 flex items-center gap-1 ml-auto">
          <Trash2 size={11} />
        </button>
      </div>

      {editing && (
        <div className="mt-3 grid grid-cols-2 gap-2 items-end">
          <select className={inputCls + ' col-span-2'} value={form.roomId}
            onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <input type="date" className={inputCls} value={form.dueDate}
            onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          <AccentButton small onClick={save}>Speichern</AccentButton>
        </div>
      )}

      {showComments && (
        <div className="mt-3 space-y-2">
          {(instance.comments || []).map((c, idx) => (
            <div key={idx} className="text-xs bg-zinc-800 rounded-lg px-3 py-2">
              <span className="font-medium" style={{ color: USERS[c.user]?.accent }}>{c.user}:</span>{' '}
              <span className="text-zinc-200">{c.text}</span>
            </div>
          ))}
          <div className="flex gap-2">
            <input className={inputCls} placeholder="Kommentar hinzufügen…" value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addComment(); }} />
            <AccentButton small onClick={addComment}>Senden</AccentButton>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Übersicht (Tag/Woche)                                             */
/* ---------------------------------------------------------------- */

function OverviewView({ instances, rooms, user, onlyMine, setOnlyMine, onUpdate, onDelete, onQuickAdd }) {
  const [mode, setMode] = useState('day');
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [roomFilter, setRoomFilter] = useState('all');

  const roomsById = useMemo(() => Object.fromEntries(rooms.map(r => [r.id, r])), [rooms]);

  const filtered = instances.filter(i =>
    (roomFilter === 'all' || i.roomId === roomFilter) &&
    (!onlyMine || i.assignedTo === user.name)
  );

  function shift(n) {
    setSelectedDate(d => addDays(d, mode === 'day' ? n : n * 7));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-50">Übersicht</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Aufgaben nach Tag oder Woche</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ToggleSwitch checked={onlyMine} onChange={setOnlyMine} label="Nur meine Aufgaben anzeigen" />
          <div className="inline-flex rounded-lg border border-zinc-800 p-0.5" style={{ display: 'inline-flex' }}>
            <button onClick={() => setMode('day')}
              className="px-3 py-1.5 text-xs font-medium rounded-md"
              style={{ backgroundColor: mode === 'day' ? 'var(--accent)' : 'transparent', color: mode === 'day' ? '#ffffff' : '#a1a1aa' }}>
              Tag
            </button>
            <button onClick={() => setMode('week')}
              className="px-3 py-1.5 text-xs font-medium rounded-md"
              style={{ backgroundColor: mode === 'week' ? 'var(--accent)' : 'transparent', color: mode === 'week' ? '#ffffff' : '#a1a1aa' }}>
              Woche
            </button>
          </div>
          <select className={inputCls + ' w-auto text-xs py-1.5'} value={roomFilter} onChange={e => setRoomFilter(e.target.value)}>
            <option value="all">Alle Räume</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button onClick={() => shift(-1)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"><ChevronLeft size={18} /></button>
        <div className="text-sm font-medium text-zinc-200 text-center">
          {mode === 'day' ? `${WEEKDAYS_FULL[dowSunFirst(selectedDate)]}, ${formatDate(selectedDate)}` :
            `${formatDate(weekStart(selectedDate))} – ${formatDate(addDays(weekStart(selectedDate), 6))}`}
          <button onClick={() => setSelectedDate(todayISO())} className="ml-2 text-xs underline text-zinc-500">Heute</button>
        </div>
        <button onClick={() => shift(1)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"><ChevronRight size={18} /></button>
      </div>

      {mode === 'day' ? (
        <DayByRoom date={selectedDate} instances={filtered} roomsById={roomsById} rooms={rooms} user={user}
          onUpdate={onUpdate} onDelete={onDelete} onQuickAdd={onQuickAdd} />
      ) : (
        <WeekList start={weekStart(selectedDate)} instances={filtered} roomsById={roomsById} rooms={rooms} user={user}
          onUpdate={onUpdate} onDelete={onDelete} />
      )}
    </div>
  );
}

function DayByRoom({ date, instances, roomsById, rooms, user, onUpdate, onDelete, onQuickAdd }) {
  const dayItems = instances.filter(i => i.dueDate === date);
  const grouped = {};
  dayItems.forEach(i => {
    const key = i.roomId || '_none';
    grouped[key] = grouped[key] || [];
    grouped[key].push(i);
  });
  const roomIds = Object.keys(grouped).sort((a, b) => (roomsById[a]?.name || '').localeCompare(roomsById[b]?.name || ''));

  if (rooms.length === 0) {
    return <EmptyState text="Lege zuerst einen Raum an, um Aufgaben zu planen." />;
  }
  if (roomIds.length === 0) {
    return <EmptyState text="Für diesen Tag sind keine Aufgaben geplant." action={{ label: 'Aufgabe hinzufügen', onClick: () => onQuickAdd(date) }} />;
  }

  return (
    <div className="space-y-6">
      {roomIds.map(rid => (
        <div key={rid}>
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
            {roomsById[rid]?.name || 'Ohne Raum'}
          </div>
          <div className="space-y-2">
            {grouped[rid].sort(byOpenFirstThenTitle).map(inst => (
              <TaskCard key={inst.id} instance={inst} room={roomsById[inst.roomId]} rooms={rooms} user={user}
                onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </div>
        </div>
      ))}
      <button onClick={() => onQuickAdd(date)} className="text-xs text-zinc-500 hover:text-zinc-200 flex items-center gap-1">
        <Plus size={13} /> Aufgabe für diesen Tag hinzufügen
      </button>
    </div>
  );
}

function WeekList({ start, instances, roomsById, rooms, user, onUpdate, onDelete }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="space-y-6">
      {days.map(d => {
        const items = instances.filter(i => i.dueDate === d).sort(byOpenFirstThenTitle);
        return (
          <div key={d}>
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
              {WEEKDAYS_FULL[dowSunFirst(d)]}, {formatDate(d)} {d === todayISO() && <span style={{ color: 'var(--accent)' }}>· heute</span>}
            </div>
            {items.length === 0 ? (
              <div className="text-xs text-zinc-600 pl-1">Keine Aufgaben</div>
            ) : (
              <div className="space-y-2">
                {items.map(inst => (
                  <TaskCard key={inst.id} instance={inst} room={roomsById[inst.roomId]} rooms={rooms} user={user}
                    onUpdate={onUpdate} onDelete={onDelete} compact />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ text, action }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 py-10 text-center">
      <p className="text-sm text-zinc-500">{text}</p>
      {action && (
        <button onClick={action.onClick} className="mt-3 text-xs font-medium" style={{ color: 'var(--accent)' }}>
          {action.label}
        </button>
      )}
    </div>
  );
}

function ToggleSwitch({ checked, onChange, label }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex items-center gap-2">
      <span className="relative inline-block w-9 h-5 rounded-full transition"
        style={{ backgroundColor: checked ? 'var(--accent)' : '#3f3f46' }}>
        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
          style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }} />
      </span>
      <span className="text-xs text-zinc-400">{label}</span>
    </button>
  );
}

/* ---------------------------------------------------------------- */
/* Kalender                                                          */
/* ---------------------------------------------------------------- */

function CalendarView({ instances, rooms, user, onlyMine, setOnlyMine, onUpdate, onDelete, onQuickAdd }) {
  const [monthCursor, setMonthCursor] = useState(() => {
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(todayISO());

  const roomsById = useMemo(() => Object.fromEntries(rooms.map(r => [r.id, r])), [rooms]);
  const filteredInstances = instances.filter(i => !onlyMine || i.assignedTo === user.name);

  const firstOfMonth = new Date(monthCursor.y, monthCursor.m, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Mo=0
  const daysInMonth = new Date(monthCursor.y, monthCursor.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthCursor.y}-${String(monthCursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push(dateStr);
  }

  function shiftMonth(n) {
    let m = monthCursor.m + n, y = monthCursor.y;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonthCursor({ y, m });
  }

  const dayItems = filteredInstances.filter(i => i.dueDate === selectedDate)
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-50">Kalender</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Alle geplanten und erledigten Aufgaben</p>
        </div>
        <ToggleSwitch checked={onlyMine} onChange={setOnlyMine} label="Nur meine Aufgaben anzeigen" />
      </div>

      <div className="flex items-center justify-between mb-3">
        <button onClick={() => shiftMonth(-1)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"><ChevronLeft size={18} /></button>
        <div className="text-sm font-medium text-zinc-200">{MONTHS_FULL[monthCursor.m]} {monthCursor.y}</div>
        <button onClick={() => shiftMonth(1)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"><ChevronRight size={18} /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS_SHORT.map(d => (
          <div key={d} className="text-center text-xs font-medium text-zinc-500 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((dateStr, idx) => {
          if (!dateStr) return <div key={idx} />;
          const items = filteredInstances.filter(i => i.dueDate === dateStr);
          const isToday = dateStr === todayISO();
          const isSelected = dateStr === selectedDate;
          return (
            <button key={dateStr} onClick={() => setSelectedDate(dateStr)}
              className={`aspect-square rounded-lg border text-xs flex flex-col items-center justify-center gap-1 transition
                ${isSelected ? 'border-transparent text-white' : isToday ? 'border-zinc-600' : 'border-zinc-800 hover:border-zinc-800'}`}
              style={isSelected ? { backgroundColor: 'var(--accent)' } : {}}
            >
              <span className={isSelected ? 'text-white' : 'text-zinc-200'}>{parseInt(dateStr.slice(-2))}</span>
              <span className="flex gap-0.5">
                {items.slice(0, 3).map((it, i2) => (
                  <span key={i2} className="w-1 h-1 rounded-full"
                    style={{ backgroundColor: isSelected ? 'white' : (it.completed ? '#71717a' : (it.assignedTo ? USERS[it.assignedTo].accent : '#52525b')) }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
            {WEEKDAYS_FULL[dowSunFirst(selectedDate)]}, {formatDate(selectedDate)}
          </div>
          <button onClick={() => onQuickAdd(selectedDate)} className="text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
            <Plus size={13} /> Hinzufügen
          </button>
        </div>
        {dayItems.length === 0 ? (
          <EmptyState text="Keine Aufgaben an diesem Tag." />
        ) : (
          <div className="space-y-2">
            {dayItems.map(inst => (
              <TaskCard key={inst.id} instance={inst} room={roomsById[inst.roomId]} rooms={rooms} user={user}
                onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Räume / Grundriss                                                 */
/* ---------------------------------------------------------------- */

function CornerFrame() {
  const style = { borderColor: 'var(--accent)' };
  return (
    <>
      <span className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2" style={style} />
      <span className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2" style={style} />
      <span className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b-2 border-l-2" style={style} />
      <span className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b-2 border-r-2" style={style} />
    </>
  );
}

function RoomsView({ rooms, instances, onSaveRooms }) {
  const [openRoom, setOpenRoom] = useState(null);
  const [adding, setAdding] = useState(false);

  function lastCompletion(roomId) {
    const done = instances.filter(i => i.roomId === roomId && i.completed)
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
    return done[0] || null;
  }
  function lastCleaning(room) {
    if (!room.cleaningDefId) return null;
    const done = instances.filter(i => i.defId === room.cleaningDefId && i.completed)
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
    return done[0] || null;
  }
  function openCount(roomId) {
    return instances.filter(i => i.roomId === roomId && !i.completed).length;
  }

  function addRoom(data) {
    onSaveRooms([...rooms, { ...data, id: uid() }]);
    setAdding(false);
  }
  function updateRoom(data) {
    onSaveRooms(rooms.map(r => r.id === data.id ? data : r));
    setOpenRoom(data);
  }
  function deleteRoom(room) {
    const inUse = instances.some(i => i.roomId === room.id);
    if (inUse && !window.confirm('Für diesen Raum existieren Aufgaben. Trotzdem löschen?')) return;
    onSaveRooms(rooms.filter(r => r.id !== room.id));
    setOpenRoom(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-50">Räume</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Grundriss und technische Informationen</p>
        </div>
        <AccentButton small onClick={() => setAdding(true)}><Plus size={14} /> Raum</AccentButton>
      </div>

      {rooms.length === 0 ? (
        <EmptyState text="Noch keine Räume angelegt." action={{ label: 'Ersten Raum anlegen', onClick: () => setAdding(true) }} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {rooms.map(r => (
            <button key={r.id} onClick={() => setOpenRoom(r)}
              className="relative rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left hover:shadow-md transition">
              <CornerFrame />
              <div className="font-medium text-zinc-50 text-sm">{r.name}</div>
            </button>
          ))}
        </div>
      )}

      {adding && <RoomForm onCancel={() => setAdding(false)} onSave={addRoom} />}
      {openRoom && (
        <RoomDetail room={openRoom} last={lastCompletion(openRoom.id)} cleaning={lastCleaning(openRoom)} openCount={openCount(openRoom.id)}
          onClose={() => setOpenRoom(null)} onSave={updateRoom} onDelete={deleteRoom} />
      )}
    </div>
  );
}

function RoomForm({ initial, onCancel, onSave }) {
  const [f, setF] = useState(initial || { name: '', technischeInfo: '' });
  return (
    <Modal title={initial ? 'Raum bearbeiten' : 'Neuer Raum'} onClose={onCancel}>
      <Field label="Name">
        <input className={inputCls} value={f.name} onChange={e => setF(v => ({ ...v, name: e.target.value }))} placeholder="z. B. Küche" />
      </Field>
      <Field label="Technische Informationen">
        <textarea className={inputCls} rows={6} value={f.technischeInfo}
          onChange={e => setF(v => ({ ...v, technischeInfo: e.target.value }))}
          placeholder="z. B. Etage, Fläche, Boden, Heizung, sonstige Hinweise" />
      </Field>
      <div className="flex gap-2 justify-end mt-2">
        <GhostButton onClick={onCancel}>Abbrechen</GhostButton>
        <AccentButton disabled={!f.name.trim()} onClick={() => onSave({ id: initial?.id || undefined, ...f })}>Speichern</AccentButton>
      </div>
    </Modal>
  );
}

function RoomDetail({ room, last, cleaning, openCount, onClose, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return <RoomForm initial={room} onCancel={() => setEditing(false)} onSave={data => { onSave(data); setEditing(false); }} />;
  }
  return (
    <Modal title={room.name} onClose={onClose}>
      {room.technischeInfo && (
        <div className="mb-4">
          <div className="text-xs text-zinc-500 mb-1">Technische Informationen</div>
          <div className="text-sm text-zinc-200 whitespace-pre-wrap">{room.technischeInfo}</div>
        </div>
      )}
      {room.cleaningDefId && (
        <div className="rounded-lg px-3 py-2.5 text-xs mb-3 flex items-center gap-2 bg-zinc-800">
          <Sparkles size={13} style={{ color: 'var(--accent)' }} />
          <span className="text-zinc-200">
            Zuletzt geputzt: <strong>{cleaning ? formatDate(cleaning.dueDate) : 'noch nie'}</strong>
          </span>
        </div>
      )}
      <div className="rounded-lg bg-zinc-800 px-3 py-2.5 text-xs text-zinc-300 mb-4">
        {last ? <>Zuletzt erledigt: <strong>{last.title}</strong> am {formatDate(last.dueDate)}</> : 'Für diesen Raum wurde noch keine Aufgabe erledigt.'}
        <br />{openCount} offene Aufgabe{openCount === 1 ? '' : 'n'}
      </div>
      <div className="flex gap-2 justify-end">
        <GhostButton danger onClick={() => onDelete(room)}><Trash2 size={13} /> Löschen</GhostButton>
        <AccentButton onClick={() => setEditing(true)}><Pencil size={13} /> Bearbeiten</AccentButton>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------- */
/* Aufgaben (Definitionen)                                           */
/* ---------------------------------------------------------------- */

function TaskDefForm({ initial, rooms, onCancel, onSave }) {
  const [f, setF] = useState(initial || {
    title: '', roomId: rooms[0]?.id || '',
    recurType: 'once', startDate: todayISO(), daysOfWeek: [1], isTemplate: false,
  });
  const [isCleaning, setIsCleaning] = useState(() => {
    if (!initial) return false;
    const room = rooms.find(r => r.id === initial.roomId);
    return room?.cleaningDefId === initial.id;
  });

  function toggleDay(d) {
    setF(v => ({ ...v, daysOfWeek: v.daysOfWeek.includes(d) ? v.daysOfWeek.filter(x => x !== d) : [...v.daysOfWeek, d].sort() }));
  }

  return (
    <Modal title={initial ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'} onClose={onCancel}>
      <Field label="Titel">
        <input className={inputCls} value={f.title} onChange={e => setF(v => ({ ...v, title: e.target.value }))} placeholder="z. B. Küche wischen" />
      </Field>
      <Field label="Raum">
        <select className={inputCls} value={f.roomId} onChange={e => setF(v => ({ ...v, roomId: e.target.value }))}>
          {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </Field>
      <Field label="Art">
        <select className={inputCls} value={f.recurType} onChange={e => setF(v => ({ ...v, recurType: e.target.value }))}>
          <option value="once">Einmalig</option>
          <option value="daily">Täglich</option>
          <option value="weekly">Wöchentlich</option>
          <option value="monthly">Monatlich</option>
        </select>
      </Field>
      <Field label={f.recurType === 'once' ? 'Datum' : 'Startdatum'}>
        <input type="date" className={inputCls} value={f.startDate} onChange={e => setF(v => ({ ...v, startDate: e.target.value }))} />
      </Field>
      {f.recurType === 'weekly' && (
        <Field label="Wochentage">
          <div className="flex gap-1.5 flex-wrap">
            {WEEKDAYS_SHORT.map((d, idx) => (
              <button key={d} type="button" onClick={() => toggleDay(idx)}
                className={`w-9 h-9 rounded-full text-xs font-medium border ${f.daysOfWeek.includes(idx) ? 'text-white border-transparent' : 'text-zinc-400 border-zinc-800'}`}
                style={f.daysOfWeek.includes(idx) ? { backgroundColor: 'var(--accent)' } : {}}
              >{d}</button>
            ))}
          </div>
        </Field>
      )}
      <button type="button" onClick={() => setIsCleaning(v => !v)}
        className="w-full flex items-center gap-2.5 rounded-lg border border-zinc-800 px-3 py-2.5 mb-2 text-left">
        <span className="w-4 h-4 rounded flex items-center justify-center shrink-0 border"
          style={{ backgroundColor: isCleaning ? 'var(--accent)' : 'transparent', borderColor: isCleaning ? 'var(--accent)' : '#52525b' }}>
          {isCleaning && <Check size={12} className="text-white" />}
        </span>
        <span className="text-xs text-zinc-200">
          Diese Aufgabe bzw. Serie als Reinigung des Raums markieren (für "Zuletzt geputzt")
        </span>
      </button>
      {f.recurType === 'once' && (
        <button type="button" onClick={() => setF(v => ({ ...v, isTemplate: !v.isTemplate }))}
          className="w-full flex items-center gap-2.5 rounded-lg border border-zinc-800 px-3 py-2.5 mb-2 text-left">
          <span className="w-4 h-4 rounded flex items-center justify-center shrink-0 border"
            style={{ backgroundColor: f.isTemplate ? 'var(--accent)' : 'transparent', borderColor: f.isTemplate ? 'var(--accent)' : '#52525b' }}>
            {f.isTemplate && <Check size={12} className="text-white" />}
          </span>
          <span className="text-xs text-zinc-200">
            Als Vorlage auf der Aufgabenseite behalten (mit Schnellzugriff "Heute"/"Morgen")
          </span>
        </button>
      )}
      <div className="flex gap-2 justify-end mt-2">
        <GhostButton onClick={onCancel}>Abbrechen</GhostButton>
        <AccentButton disabled={!f.title.trim() || !f.roomId} onClick={() => onSave({ id: initial?.id, ...f, isCleaning })}>Speichern</AccentButton>
      </div>
    </Modal>
  );
}

function TasksView({ taskDefs, rooms, onAddDef, onEditDef, onDeleteDef, onCreateFromTemplate }) {
  const [form, setForm] = useState(null); // null | 'new' | def object
  const roomsById = Object.fromEntries(rooms.map(r => [r.id, r]));
  const visibleDefs = taskDefs.filter(def => def.recurType !== 'once' || def.isTemplate);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-50">Aufgaben</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Wiederkehrende Aufgaben und Vorlagen für einmalige Aufgaben</p>
        </div>
        <AccentButton small disabled={rooms.length === 0} onClick={() => setForm('new')}><Plus size={14} /> Aufgabe</AccentButton>
      </div>

      {rooms.length === 0 ? (
        <EmptyState text="Lege zuerst mindestens einen Raum an." />
      ) : visibleDefs.length === 0 ? (
        <EmptyState text="Noch keine wiederkehrenden Aufgaben oder Vorlagen definiert." action={{ label: 'Erste Aufgabe anlegen', onClick: () => setForm('new') }} />
      ) : (
        <div className="space-y-2">
          {visibleDefs.map(def => {
            const isCleaning = roomsById[def.roomId]?.cleaningDefId === def.id;
            const isOnceTemplate = def.recurType === 'once';
            return (
              <div key={def.id} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm text-zinc-50 flex items-center gap-1.5">
                    {def.title}
                    {isCleaning && <Sparkles size={12} style={{ color: 'var(--accent)' }} />}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1"><MapPin size={11} /> {roomsById[def.roomId]?.name || '–'}</span>
                    <span>{isOnceTemplate ? 'Vorlage' : recurrenceLabel(def)}</span>
                    {isCleaning && <span style={{ color: 'var(--accent)' }}>Reinigung</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isOnceTemplate && (
                    <>
                      <GhostButton small onClick={() => onCreateFromTemplate(def, todayISO())}>Heute</GhostButton>
                      <GhostButton small onClick={() => onCreateFromTemplate(def, addDays(todayISO(), 1))}>Morgen</GhostButton>
                    </>
                  )}
                  <button onClick={() => setForm(def)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500"><Pencil size={14} /></button>
                  <button onClick={() => onDeleteDef(def)} className="p-1.5 rounded-lg hover:bg-red-950 text-zinc-600 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {form && (
        <TaskDefForm
          initial={form === 'new' ? null : form}
          rooms={rooms}
          onCancel={() => setForm(null)}
          onSave={data => { form === 'new' ? onAddDef(data) : onEditDef(data); setForm(null); }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Berichte                                                          */
/* ---------------------------------------------------------------- */

function ReportsView({ rooms, instances, laundry }) {
  const [tab, setTab] = useState('rooms');
  const [detailMachine, setDetailMachine] = useState(null);

  const roomStats = rooms.map(r => {
    const roomInstances = instances.filter(i => i.roomId === r.id);
    const done = roomInstances.filter(i => i.completed).sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
    const open = roomInstances.filter(i => !i.completed).length;
    const cleaningDone = r.cleaningDefId
      ? instances.filter(i => i.defId === r.cleaningDefId && i.completed).sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
      : [];
    return { room: r, last: done[0] || null, open, cleaning: cleaningDone[0] || null };
  }).sort((a, b) => {
    const av = a.last ? a.last.completedAt : '';
    const bv = b.last ? b.last.completedAt : '';
    return av.localeCompare(bv); // längste Zeit ohne Erledigung zuerst
  });

  const userStats = Object.values(USERS).map(u => {
    const done = instances.filter(i => i.completed && i.completedBy === u.name)
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
    const thisWeekStart = weekStart(todayISO());
    const thisWeek = done.filter(i => i.completedAt && i.completedAt.slice(0, 10) >= thisWeekStart).length;
    return { user: u, total: done.length, thisWeek, recent: done.slice(0, 8) };
  });

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-zinc-50">Berichte</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Status je Raum und Auswertung je Person</p>
      </div>

      <div className="inline-flex rounded-lg border border-zinc-800 p-0.5 mb-5">
        <button onClick={() => setTab('rooms')}
          className="px-4 py-1.5 text-xs font-medium rounded-md"
          style={{ backgroundColor: tab === 'rooms' ? 'var(--accent)' : 'transparent', color: tab === 'rooms' ? '#ffffff' : '#a1a1aa' }}>
          Raumstatus
        </button>
        <button onClick={() => setTab('users')}
          className="px-4 py-1.5 text-xs font-medium rounded-md"
          style={{ backgroundColor: tab === 'users' ? 'var(--accent)' : 'transparent', color: tab === 'users' ? '#ffffff' : '#a1a1aa' }}>
          Nutzer
        </button>
        <button onClick={() => setTab('laundry')}
          className="px-4 py-1.5 text-xs font-medium rounded-md"
          style={{ backgroundColor: tab === 'laundry' ? 'var(--accent)' : 'transparent', color: tab === 'laundry' ? '#ffffff' : '#a1a1aa' }}>
          Waschstatus
        </button>
      </div>

      {tab === 'rooms' && (
        rooms.length === 0 ? <EmptyState text="Noch keine Räume angelegt." /> : (
          <div className="space-y-2">
            {roomStats.map(({ room, last, open, cleaning }) => (
              <div key={room.id} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm text-zinc-50">{room.name}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {last ? <>Zuletzt: <strong>{last.title}</strong>, {formatDate(last.dueDate)}</> : 'Noch keine Aufgabe erledigt'}
                  </div>
                  {room.cleaningDefId && (
                    <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                      <Sparkles size={11} />
                      Zuletzt geputzt: {cleaning ? formatDate(cleaning.dueDate) : 'noch nie'}
                    </div>
                  )}
                </div>
                {open > 0 && <div className="text-xs font-medium shrink-0" style={{ color: 'var(--accent)' }}>{open} offen</div>}
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'users' && (
        <div className="grid md:grid-cols-2 gap-4">
          {userStats.map(({ user: u, total, thisWeek, recent }) => (
            <div key={u.name} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: u.accent }} />
                <span className="font-medium text-sm text-zinc-50">{u.name}</span>
              </div>
              <div className="flex gap-4 mb-3">
                <div>
                  <div className="text-xl font-semibold text-zinc-50">{total}</div>
                  <div className="text-xs text-zinc-500">Insgesamt erledigt</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-zinc-50">{thisWeek}</div>
                  <div className="text-xs text-zinc-500">Diese Woche</div>
                </div>
              </div>
              {recent.length > 0 && (
                <div className="space-y-1.5 pt-3 border-t border-zinc-800">
                  {recent.map(r => (
                    <div key={r.id} className="text-xs text-zinc-400 flex justify-between">
                      <span className="truncate">{r.title}</span>
                      <span className="shrink-0 ml-2">{formatDate(r.dueDate)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'laundry' && (
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { key: 'waschmaschine', label: 'Waschmaschine', Icon: WashingMachine },
            { key: 'trockner', label: 'Trockner', Icon: Fan },
          ].map(({ key, label, Icon }) => {
            const counts = (laundry && laundry[key] && laundry[key].counts) || {};
            const year = new Date().getFullYear();
            const yearTotal = Object.entries(counts)
              .filter(([k]) => k.startsWith(String(year)))
              .reduce((sum, [, v]) => sum + v, 0);
            const months = Object.keys(counts).sort().reverse().slice(0, 4);
            return (
              <button key={key} onClick={() => setDetailMachine(key)}
                className="text-left rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:shadow-md transition">
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={16} className="text-zinc-300" />
                  <span className="font-medium text-sm text-zinc-50">{label}</span>
                </div>
                <div className="mb-3">
                  <div className="text-xl font-semibold text-zinc-50">{yearTotal}</div>
                  <div className="text-xs text-zinc-500">Läufe {year} gesamt</div>
                </div>
                {months.length === 0 ? (
                  <div className="text-xs text-zinc-500">Noch keine Läufe erfasst.</div>
                ) : (
                  <div className="space-y-1.5 pt-3 border-t border-zinc-800">
                    {months.map(k => (
                      <div key={k} className="text-xs text-zinc-400 flex justify-between">
                        <span>{monthLabel(k)}</span>
                        <span>{counts[k]}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-xs mt-3" style={{ color: 'var(--accent)' }}>Details ansehen</div>
              </button>
            );
          })}
        </div>
      )}

      {detailMachine && (() => {
        const info = { waschmaschine: { label: 'Waschmaschine', Icon: WashingMachine }, trockner: { label: 'Trockner', Icon: Fan } }[detailMachine];
        const counts = (laundry && laundry[detailMachine] && laundry[detailMachine].counts) || {};
        const byYear = {};
        Object.entries(counts).forEach(([k, v]) => {
          const y = k.split('-')[0];
          byYear[y] = byYear[y] || { total: 0, months: [] };
          byYear[y].total += v;
          byYear[y].months.push([k, v]);
        });
        const years = Object.keys(byYear).sort().reverse();
        return (
          <Modal title={`${info.label} · Läufe im Detail`} onClose={() => setDetailMachine(null)}>
            {years.length === 0 ? (
              <div className="text-sm text-zinc-500">Noch keine Läufe erfasst.</div>
            ) : (
              <div className="space-y-5">
                {years.map(y => (
                  <div key={y}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-zinc-50">{y}</div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{byYear[y].total} gesamt</div>
                    </div>
                    <div className="space-y-1.5">
                      {byYear[y].months.sort((a, b) => b[0].localeCompare(a[0])).map(([k, v]) => (
                        <div key={k} className="text-xs text-zinc-400 flex justify-between rounded-lg bg-zinc-800 px-3 py-2">
                          <span>{monthLabel(k)}</span>
                          <span className="text-zinc-200 font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Modal>
        );
      })()}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Fehler sichtbar machen statt still zu scheitern                   */
/* ---------------------------------------------------------------- */

function guard(fn, label) {
  return (...args) => {
    try {
      const result = fn(...args);
      if (result && typeof result.catch === 'function') {
        result.catch(e => {
          console.error(label, e);
          window.alert('Fehler bei "' + label + '": ' + (e && e.message ? e.message : String(e)));
        });
      }
      return result;
    } catch (e) {
      console.error(label, e);
      window.alert('Fehler bei "' + label + '": ' + (e && e.message ? e.message : String(e)));
    }
  };
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('App-Fehler:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl border border-red-900 bg-zinc-900 p-5">
            <div className="font-semibold text-red-400 mb-2">Es ist ein Fehler aufgetreten</div>
            <div className="text-xs text-zinc-300 whitespace-pre-wrap mb-3">
              {this.state.error?.message || String(this.state.error)}
            </div>
            <button
              className="text-sm font-medium text-white rounded-lg px-4 py-2"
              style={{ backgroundColor: '#dc2626' }}
              onClick={() => this.setState({ error: null })}
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ---------------------------------------------------------------- */
/* Waschstatus                                                       */
/* ---------------------------------------------------------------- */

const LAUNDRY_STATES = ['FREI', 'LÄUFT', 'FERTIG'];
const LAUNDRY_DEFAULT = { status: 'FREI', changedBy: null, changedAt: null, counts: {} };

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS_FULL[m - 1]} ${y}`;
}

function laundryStyle(status) {
  if (status === 'LÄUFT') return { bg: 'var(--accent)', text: '#ffffff' };
  if (status === 'FERTIG') return { bg: '#059669', text: '#ffffff' };
  return { bg: '#27272a', text: '#a1a1aa' }; // FREI
}

function LaundryMachine({ label, Icon, state, onCycle, onAdjust }) {
  const s = laundryStyle(state.status);
  const counts = state.counts || {};
  const currentKey = monthKey();
  const currentCount = counts[currentKey] || 0;
  const history = Object.keys(counts)
    .filter(k => k !== currentKey)
    .sort().reverse().slice(0, 3);

  return (
    <div className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <button onClick={onCycle} className="w-full text-left">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300">
            <Icon size={20} />
          </div>
          <div className="font-medium text-zinc-50 text-sm">{label}</div>
        </div>
        <div className="rounded-lg py-3 text-center font-semibold text-sm tracking-wide"
          style={{ backgroundColor: s.bg, color: s.text }}>
          {state.status}
        </div>
        <div className="text-xs text-zinc-500 mt-2.5">
          {state.changedBy
            ? <>Zuletzt geändert von <span style={{ color: USERS[state.changedBy]?.accent }}>{state.changedBy}</span>, {formatDateTime(state.changedAt)}</>
            : 'Noch nicht geändert'}
        </div>
        <div className="text-xs text-zinc-600 mt-1">Antippen zum Weiterschalten</div>
      </button>

      <div className="mt-4 pt-4 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-500">Läufe {monthLabel(currentKey)}</div>
            <div className="text-xl font-semibold text-zinc-50">{currentCount}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onAdjust(-1)}
              className="w-8 h-8 rounded-lg border border-zinc-700 text-zinc-300 flex items-center justify-center hover:bg-zinc-800">−</button>
            <button onClick={() => onAdjust(1)}
              className="w-8 h-8 rounded-lg border border-zinc-700 text-zinc-300 flex items-center justify-center hover:bg-zinc-800">+</button>
          </div>
        </div>
        {history.length > 0 && (
          <div className="mt-3 space-y-1">
            {history.map(k => (
              <div key={k} className="text-xs text-zinc-500 flex justify-between">
                <span>{monthLabel(k)}</span>
                <span>{counts[k]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LaundryView({ laundry, onCycle, onAdjust, user }) {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-zinc-50">Waschstatus</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Status von Waschmaschine und Trockner</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 max-w-xl">
        <LaundryMachine label="Waschmaschine" Icon={WashingMachine}
          state={laundry.waschmaschine} onCycle={() => onCycle('waschmaschine')} onAdjust={(d) => onAdjust('waschmaschine', d)} />
        <LaundryMachine label="Trockner" Icon={Fan}
          state={laundry.trockner} onCycle={() => onCycle('trockner')} onAdjust={(d) => onAdjust('trockner', d)} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Einkaufen                                                         */
/* ---------------------------------------------------------------- */

function ShoppingItem({ item, onToggle, onDelete }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
      <button onClick={onToggle}
        className="w-5 h-5 rounded-md border flex items-center justify-center shrink-0"
        style={{ backgroundColor: item.done ? 'var(--accent)' : 'transparent', borderColor: item.done ? 'var(--accent)' : '#52525b' }}>
        {item.done && <Check size={13} className="text-white" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className={`text-sm ${item.done ? 'text-zinc-500 line-through' : 'text-zinc-50'}`}>{item.name}</div>
        {item.done && item.doneBy && (
          <div className="text-xs text-zinc-600 mt-0.5">Gekauft von {item.doneBy}{item.doneAt ? `, ${formatDateTime(item.doneAt)}` : ''}</div>
        )}
        {!item.done && item.addedBy && (
          <div className="text-xs text-zinc-500 mt-0.5">Hinzugefügt von {item.addedBy}</div>
        )}
      </div>
      <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-950 text-zinc-600 hover:text-red-400 shrink-0">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function ShoppingView({ items, onAdd, onToggle, onDelete, onClearBought }) {
  const [name, setName] = useState('');

  function submit() {
    if (!name.trim()) return;
    onAdd(name);
    setName('');
  }

  const open = items.filter(i => !i.done).sort((a, b) => (a.addedAt || '').localeCompare(b.addedAt || ''));
  const done = items.filter(i => i.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-zinc-50">Einkaufen</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Gemeinsame Einkaufsliste</p>
      </div>

      <div className="flex gap-2 mb-5">
        <input className={inputCls} placeholder="Was wird gebraucht?" value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
        <AccentButton onClick={submit} disabled={!name.trim()}><Plus size={15} /> Hinzufügen</AccentButton>
      </div>

      {items.length === 0 ? (
        <EmptyState text="Die Einkaufsliste ist leer." />
      ) : (
        <div className="space-y-4">
          {open.length > 0 && (
            <div className="space-y-2">
              {open.map(item => (
                <ShoppingItem key={item.id} item={item} onToggle={() => onToggle(item)} onDelete={() => onDelete(item)} />
              ))}
            </div>
          )}
          {open.length === 0 && done.length > 0 && (
            <EmptyState text="Alles erledigt – nichts mehr auf der Liste." />
          )}
          {done.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Gekauft</div>
                <button onClick={onClearBought} className="text-xs text-zinc-500 hover:text-zinc-200">Liste aufräumen</button>
              </div>
              <div className="space-y-2">
                {done.map(item => (
                  <ShoppingItem key={item.id} item={item} onToggle={() => onToggle(item)} onDelete={() => onDelete(item)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* App                                                                */
/* ---------------------------------------------------------------- */

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
  const [quickAddDate, setQuickAddDate] = useState(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

    const today = todayISO();
    i = i.map(inst => (!inst.completed && inst.dueDate < today) ? { ...inst, dueDate: today } : inst);
    const ext = extendRecurringInstances(d, i, today);

    let l = await loadKey(supabase, 'laundry', null);
    if (!l || typeof l !== 'object') l = {};
    l = {
      waschmaschine: { ...LAUNDRY_DEFAULT, ...(l.waschmaschine || {}), counts: { ...(l.waschmaschine?.counts || {}) } },
      trockner: { ...LAUNDRY_DEFAULT, ...(l.trockner || {}), counts: { ...(l.trockner?.counts || {}) } },
    };

    const s = await loadKey(supabase, 'shopping', []);

    setRooms(r);
    setTaskDefs(ext.defs);
    setInstances(ext.instances);
    setLaundry(l);
    setShopping(s);
    setReady(true);
    saveKey(supabase, 'rooms', r);
    saveKey(supabase, 'taskDefs', ext.defs);
    saveKey(supabase, 'instances', ext.instances);
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

  function addTaskDef(data) {
    const { isCleaning, ...rest } = data;
    const def = { ...rest, id: uid(), generatedThrough: null };
    const through = def.recurType === 'once' ? def.startDate : addDays(todayISO(), rollWindowFor(def.recurType));
    const newInstances = generateInstancesForDef(def, def.startDate, through);
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
      const fresh = generateInstancesForDef(rest, today, through).filter(inst => !existingDates.has(inst.dueDate));
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
              onUpdate={guard(updateInstance, 'Aufgabe speichern')} onDelete={guard(deleteInstance, 'Aufgabe löschen')} onQuickAdd={setQuickAddDate} />
          )}
          {view === 'calendar' && (
            <CalendarView instances={instances} rooms={rooms} user={user} onlyMine={onlyMine} setOnlyMine={setOnlyMine}
              onUpdate={guard(updateInstance, 'Aufgabe speichern')} onDelete={guard(deleteInstance, 'Aufgabe löschen')} onQuickAdd={setQuickAddDate} />
          )}
          {view === 'rooms' && (
            <RoomsView rooms={rooms} instances={instances} onSaveRooms={guard(persistRooms, 'Raum speichern')} />
          )}
          {view === 'tasks' && (
            <TasksView taskDefs={taskDefs} rooms={rooms} onAddDef={guard(addTaskDef, 'Aufgabe anlegen')} onEditDef={guard(editTaskDef, 'Aufgabe speichern')} onDeleteDef={guard(deleteTaskDef, 'Aufgabe löschen')}
              onCreateFromTemplate={guard(createInstanceFromTemplate, 'Aufgabe erstellen')} />
          )}
          {view === 'reports' && (
            <ReportsView rooms={rooms} instances={instances} laundry={laundry} />
          )}
          {view === 'laundry' && (
            <LaundryView laundry={laundry} onCycle={guard(cycleMachine, 'Waschstatus ändern')} onAdjust={guard(adjustLaundryCount, 'Zähler anpassen')} user={user} />
          )}
          {view === 'shopping' && (
            <ShoppingView items={shopping}
              onAdd={guard(addShoppingItem, 'Eintrag hinzufügen')}
              onToggle={guard(toggleShoppingItem, 'Eintrag abhaken')}
              onDelete={guard(deleteShoppingItem, 'Eintrag löschen')}
              onClearBought={guard(clearBoughtShoppingItems, 'Liste aufräumen')} />
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
