import { useMemo, useState } from 'react';
import { BarChart3, CalendarPlus, Check, History, Pencil, Plus, Trash2, TrendingUp } from 'lucide-react';
import { addDays, formatDateTime, todayISO } from '../lib/dateUtils.js';
import { isDateInVacation } from '../lib/vacation.js';
import { USERS } from '../constants.js';
import { AccentButton, EmptyState, Field, GhostButton, Modal, inputCls } from '../components/ui.jsx';

function TaskForm({ initial, rooms, history, user, onCancel, onSave, onAddHistory, onDeleteHistory }) {
  const [form, setForm] = useState({
    title: initial?.title || '', roomId: initial?.roomId || rooms[0]?.id || '',
    greenDays: initial?.greenDays ?? 3, yellowDays: initial?.yellowDays ?? 7,
  });
  const [historyDate, setHistoryDate] = useState(todayISO());
  const [historyUser, setHistoryUser] = useState(user.name);
  const sortedHistory = [...(history || [])].sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
  return <Modal title={initial ? 'Haushaltsaufgabe bearbeiten' : 'Neue Haushaltsaufgabe'} onClose={onCancel}>
    <Field label="Was ist zu tun?"><input autoFocus className={inputCls} value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} placeholder="z. B. Waschbecken putzen" /></Field>
    <Field label="Raum"><select className={inputCls} value={form.roomId} onChange={e => setForm(v => ({ ...v, roomId: e.target.value }))}>
      {rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
    </select></Field>
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 mb-3">
      <div className="text-xs font-medium text-zinc-300 mb-3">Wann wechselt der Status?</div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Super bis (Tage)"><input type="number" min="0" inputMode="numeric" className={inputCls + ' text-base'} value={form.greenDays} onChange={e => setForm(v => ({ ...v, greenDays: Number(e.target.value) }))} /></Field>
        <Field label="Okay bis (Tage)"><input type="number" min="1" inputMode="numeric" className={inputCls + ' text-base'} value={form.yellowDays} onChange={e => setForm(v => ({ ...v, yellowDays: Number(e.target.value) }))} /></Field>
      </div>
      <div className="flex gap-3 text-[11px] text-zinc-500"><span className="text-emerald-400">● Super</span><span className="text-amber-400">● Okay</span><span className="text-red-400">● Danach zu lange</span></div>
    </div>
    {initial && <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 mb-3">
      <div className="text-xs font-medium text-zinc-300 mb-3">Historische Erledigungen</div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input type="date" max={todayISO()} className={inputCls + ' text-base'} value={historyDate} onChange={e => setHistoryDate(e.target.value)} />
        <select className={inputCls + ' text-base'} value={historyUser} onChange={e => setHistoryUser(e.target.value)}>
          {Object.values(USERS).map(person => <option key={person.name} value={person.name}>{person.name}</option>)}
        </select>
      </div>
      <GhostButton small disabled={!historyDate} onClick={() => onAddHistory(initial, historyDate, historyUser)}><CalendarPlus size={13} /> Eintrag hinzufügen</GhostButton>
      {sortedHistory.length > 0 && <div className="mt-3 max-h-40 overflow-y-auto space-y-1.5">
        {sortedHistory.map(entry => <div key={entry.id} className="flex items-center justify-between gap-2 rounded-lg bg-zinc-900 px-2.5 py-2 text-xs">
          <span className="text-zinc-400">{formatDateTime(entry.completedAt)} · {entry.completedBy}</span>
          <button type="button" onClick={() => { if (window.confirm('Diesen historischen Eintrag löschen?')) onDeleteHistory(entry); }} className="min-w-8 min-h-8 flex items-center justify-center text-zinc-600 hover:text-red-400"><Trash2 size={13} /></button>
        </div>)}
      </div>}
    </div>}
    <div className="flex gap-2 justify-end mt-2"><GhostButton onClick={onCancel}>Abbrechen</GhostButton>
      <AccentButton disabled={!form.title.trim() || !form.roomId || form.greenDays < 0 || form.yellowDays <= form.greenDays} onClick={() => onSave({ ...initial, ...form, title: form.title.trim(), household: true })}>Speichern</AccentButton>
    </div>
  </Modal>;
}

function TaskReport({ task, history, onClose, onEdit }) {
  const sorted = [...history].sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
  const chronological = [...sorted].reverse();
  const intervals = chronological.slice(1).map((entry, index) => (new Date(entry.completedAt) - new Date(chronological[index].completedAt)) / 86400000);
  const average = intervals.length ? intervals.reduce((sum, days) => sum + days, 0) / intervals.length : null;
  const byUser = Object.values(USERS).map(person => ({ person, count: history.filter(entry => entry.completedBy === person.name).length }));
  return <Modal title={task.title} onClose={onClose}>
    <div className="grid grid-cols-2 gap-2 mb-4">
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3"><div className="text-xl font-semibold text-zinc-50">{history.length}</div><div className="text-[11px] text-zinc-500">Erledigungen gesamt</div></div>
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3"><div className="text-xl font-semibold text-zinc-50">{average === null ? '–' : `${average.toLocaleString('de-DE', { maximumFractionDigits: 1 })} T.`}</div><div className="text-[11px] text-zinc-500">Ø Abstand</div></div>
    </div>
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 mb-4">
      <div className="text-xs text-zinc-500 mb-2">Nach Person</div>
      <div className="grid grid-cols-2 gap-3">{byUser.map(({ person, count }) => <div key={person.name} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: person.accent }} /><span className="text-sm text-zinc-300">{person.name}</span><strong className="text-sm text-zinc-50 ml-auto">{count}</strong></div>)}</div>
    </div>
    <div className="text-xs text-zinc-500 mb-2">Letzte Erledigungen</div>
    {sorted.length ? <div className="space-y-1.5 max-h-52 overflow-y-auto">{sorted.slice(0, 12).map(entry => <div key={entry.id} className="flex justify-between gap-3 rounded-lg bg-zinc-900 px-3 py-2 text-xs"><span className="text-zinc-300">{entry.completedBy}</span><span className="text-zinc-500">{formatDateTime(entry.completedAt)}</span></div>)}</div> : <div className="text-sm text-zinc-600 py-3">Noch keine Erledigung erfasst.</div>}
    <div className="flex justify-end mt-4"><AccentButton onClick={onEdit}><Pencil size={14} /> Bearbeiten & Historie</AccentButton></div>
  </Modal>;
}

function taskAge(task, completion, vacations) {
  const reference = completion?.completedAt || task.createdAt || `${task.startDate || new Date().toISOString().slice(0, 10)}T00:00:00`;
  const start = reference.slice(0, 10);
  const today = todayISO();
  let days = 0;
  for (let cursor = addDays(start, 1); cursor <= today; cursor = addDays(cursor, 1)) {
    if (!isDateInVacation(cursor, vacations)) days += 1;
  }
  return days;
}

function taskStatus(task, completion, vacations) {
  const age = taskAge(task, completion, vacations);
  if (age <= (task.greenDays ?? 3)) return 'green';
  if (age <= (task.yellowDays ?? 7)) return 'yellow';
  return 'red';
}

function ageLabel(iso, days) {
  if (!iso) return days ? `Noch nie erledigt · seit ${days} Tagen` : 'Noch nie erledigt';
  if (days === 0) return 'Heute erledigt';
  if (days === 1) return 'Seit gestern nicht erledigt';
  return `Seit ${days} Tagen nicht erledigt`;
}

function statusSummary(tasks, completionByDef, vacations) {
  const statuses = tasks.map(task => taskStatus(task, completionByDef[task.id], vacations));
  const result = {
    total: tasks.length,
    current: statuses.filter(status => status === 'green').length,
    soon: statuses.filter(status => status === 'yellow').length,
    overdue: statuses.filter(status => status === 'red').length,
  };
  const colors = [[16, 185, 129], [245, 158, 11], [239, 68, 68]];
  const counts = [result.current, result.soon, result.overdue];
  const mixed = colors[0].map((_, channel) => Math.round(colors.reduce((sum, color, index) => sum + color[channel] * counts[index], 0) / Math.max(1, result.total)));
  return { ...result, color: `rgb(${mixed.join(',')})` };
}

function StatusSegments({ stats }) {
  return <div className="h-1.5 flex overflow-hidden rounded-full bg-zinc-800">
    {stats.current > 0 && <span className="bg-emerald-500" style={{ width: `${stats.current / stats.total * 100}%` }} />}
    {stats.soon > 0 && <span className="bg-amber-500" style={{ width: `${stats.soon / stats.total * 100}%` }} />}
    {stats.overdue > 0 && <span className="bg-red-500" style={{ width: `${stats.overdue / stats.total * 100}%` }} />}
  </div>;
}

function HouseholdStatus({ tasks, completionByDef, vacations }) {
  const stats = useMemo(() => statusSummary(tasks, completionByDef, vacations), [tasks, completionByDef, vacations]);
  if (!tasks.length) return null;

  return <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 mb-5">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full border-2 border-zinc-800 shrink-0" style={{ backgroundColor: stats.color }} />
        <div>
        <div className="text-xs text-zinc-500 flex items-center gap-1.5"><TrendingUp size={12} /> Gesamt</div>
        <div className="text-sm font-semibold" style={{ color: stats.color }}>{stats.total} Aufgaben</div>
        </div>
      </div>
      <div className="text-[11px] text-zinc-500 flex gap-2"><span className="text-emerald-400">● {stats.current}</span><span className="text-amber-400">● {stats.soon}</span><span className="text-red-400">● {stats.overdue}</span></div>
    </div>
    <div className="mt-2"><StatusSegments stats={stats} /></div>
  </div>;
}

export function TasksView({ taskDefs, instances, rooms, vacations, user, onAddDef, onEditDef, onDeleteDef, onComplete, onUndo, onAddHistory, onDeleteHistory }) {
  const [form, setForm] = useState(null);
  const [reportDef, setReportDef] = useState(null);
  const [roomFilter, setRoomFilter] = useState('all');
  const completionByDef = useMemo(() => {
    const result = {};
    instances.filter(item => item.completed).forEach(item => {
      if (!result[item.defId] || (item.completedAt || '') > (result[item.defId].completedAt || '')) result[item.defId] = item;
    });
    return result;
  }, [instances]);
  const visible = taskDefs.filter(def => def.household && def.id && def.roomId && (roomFilter === 'all' || def.roomId === roomFilter));
  const allHouseholdTasks = taskDefs.filter(def => def.household && def.id && def.roomId);
  const grouped = rooms.map(room => ({ room, tasks: visible.filter(def => def.roomId === room.id).sort((a, b) => {
    const aTime = completionByDef[a.id]?.completedAt || '';
    const bTime = completionByDef[b.id]?.completedAt || '';
    return aTime.localeCompare(bTime) || a.title.localeCompare(b.title);
  }) })).filter(group => group.tasks.length);

  return <div>
    <div className="flex items-start justify-between mb-4 gap-3"><div>
      <h1 className="text-lg font-semibold text-zinc-50">Haushalt</h1>
      <p className="text-xs text-zinc-500 mt-0.5">Immer da. Erledigen, wenn es gemacht wurde.</p>
    </div><AccentButton small disabled={!rooms.length} onClick={() => setForm('new')}><Plus size={14} /> Aufgabe</AccentButton></div>

    <HouseholdStatus tasks={allHouseholdTasks} completionByDef={completionByDef} vacations={vacations} />

    {rooms.length > 1 && <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
      <GhostButton small onClick={() => setRoomFilter('all')}>Alle Räume</GhostButton>
      {rooms.map(room => <GhostButton key={room.id} small onClick={() => setRoomFilter(room.id)}>{room.name}</GhostButton>)}
    </div>}

    {!rooms.length ? <EmptyState text="Lege zuerst einen Raum an." /> : grouped.length === 0 ?
      <EmptyState text="Noch keine Haushaltsaufgaben angelegt." action={{ label: 'Erste Aufgabe anlegen', onClick: () => setForm('new') }} /> :
      <div className="space-y-6">{grouped.map(({ room, tasks }) => {
        const roomStats = statusSummary(tasks, completionByDef, vacations);
        return <section key={room.id}>
        <div className="mb-2 rounded-lg bg-zinc-900/60 border border-zinc-800 px-3 py-2">
          <div className="flex items-center gap-2 mb-1.5"><span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: roomStats.color }} /><span className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">{room.name}</span><span className="ml-auto text-[10px] flex gap-2"><span className="text-emerald-400">● {roomStats.current}</span><span className="text-amber-400">● {roomStats.soon}</span><span className="text-red-400">● {roomStats.overdue}</span></span></div>
          <StatusSegments stats={roomStats} />
        </div>
        <div className="grid gap-2 md:grid-cols-2">{tasks.map(def => {
          const last = completionByDef[def.id];
          const age = taskAge(def, last, vacations);
          const status = taskStatus(def, last, vacations);
          const statusStyle = {
            green: { borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.07)' },
            yellow: { borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,.07)' },
            red: { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,.07)' },
          }[status];
          const statusText = { green: 'Super', yellow: 'Okay', red: 'Zu lange' }[status];
          const statusClass = { green: 'text-emerald-400', yellow: 'text-amber-400', red: 'text-red-400' }[status];
          return <div key={def.id} role="button" tabIndex={0} onClick={() => setReportDef(def)} className="rounded-xl border bg-zinc-900 p-4 cursor-pointer" style={statusStyle}>
            <div className="flex items-start justify-between gap-3"><div className="min-w-0">
              <div className="font-medium text-sm text-zinc-50 flex items-center gap-2">{def.title}<span className={`text-[10px] uppercase tracking-wide ${statusClass}`}>{statusText}</span></div>
              <div className={`text-xs mt-1 ${statusClass}`}><History size={11} className="inline mr-1" />{ageLabel(last?.completedAt, age)}</div>
              {last && <div className="text-[11px] text-zinc-600 mt-0.5">von {last.completedBy} · {formatDateTime(last.completedAt)}</div>}
            </div><AccentButton small onClick={event => { event.stopPropagation(); onComplete(def, user.name); }}><Check size={14} /> Erledigt</AccentButton></div>
            <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-zinc-800">
              <span className="text-xs text-zinc-500 flex items-center gap-1"><BarChart3 size={12} /> Statistik</span>
              {last && <button onClick={event => { event.stopPropagation(); onUndo(last); }} className="text-xs text-zinc-500 hover:text-zinc-200">Letzte zurücknehmen</button>}
              <button onClick={event => { event.stopPropagation(); setForm(def); }} className="ml-auto min-w-8 min-h-8 flex items-center justify-center text-zinc-600 hover:text-zinc-300"><Pencil size={13} /></button>
              <button onClick={event => { event.stopPropagation(); onDeleteDef(def); }} className="min-w-8 min-h-8 flex items-center justify-center text-zinc-600 hover:text-red-400"><Trash2 size={13} /></button>
            </div>
          </div>;
        })}</div>
      </section>})}</div>}
    {reportDef && <TaskReport task={reportDef} history={instances.filter(item => item.defId === reportDef.id && item.completed)} onClose={() => setReportDef(null)} onEdit={() => { setForm(reportDef); setReportDef(null); }} />}
    {form && <TaskForm initial={form === 'new' ? null : form} rooms={rooms} user={user} history={form === 'new' ? [] : instances.filter(item => item.defId === form.id && item.completed)} onAddHistory={onAddHistory} onDeleteHistory={onDeleteHistory} onCancel={() => setForm(null)} onSave={data => { form === 'new' ? onAddDef(data) : onEditDef(data); setForm(null); }} />}
  </div>;
}
