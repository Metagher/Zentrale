import { useMemo, useState } from 'react';
import { Check, History, Pencil, Plus, Trash2, TrendingUp } from 'lucide-react';
import { addDays, formatDateTime, todayISO } from '../lib/dateUtils.js';
import { isDateInVacation } from '../lib/vacation.js';
import { AccentButton, EmptyState, Field, GhostButton, Modal, inputCls } from '../components/ui.jsx';

function TaskForm({ initial, rooms, onCancel, onSave }) {
  const [form, setForm] = useState({
    title: initial?.title || '', roomId: initial?.roomId || rooms[0]?.id || '',
    greenDays: initial?.greenDays ?? 3, yellowDays: initial?.yellowDays ?? 7,
  });
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
    <div className="flex gap-2 justify-end mt-2"><GhostButton onClick={onCancel}>Abbrechen</GhostButton>
      <AccentButton disabled={!form.title.trim() || !form.roomId || form.greenDays < 0 || form.yellowDays <= form.greenDays} onClick={() => onSave({ ...initial, ...form, title: form.title.trim(), household: true })}>Speichern</AccentButton>
    </div>
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

function HouseholdStatus({ tasks, rooms, completionByDef, vacations }) {
  const { stats, roomStats } = useMemo(() => {
    const calculate = list => {
      const statuses = list.map(task => taskStatus(task, completionByDef[task.id], vacations));
      const result = {
        total: list.length,
        current: statuses.filter(status => status === 'green').length,
        soon: statuses.filter(status => status === 'yellow').length,
        overdue: statuses.filter(status => status === 'red').length,
      };
      const colors = [[16, 185, 129], [245, 158, 11], [239, 68, 68]];
      const counts = [result.current, result.soon, result.overdue];
      const mixed = colors[0].map((_, channel) => Math.round(colors.reduce((sum, color, index) => sum + color[channel] * counts[index], 0) / Math.max(1, result.total)));
      return { ...result, color: `rgb(${mixed.join(',')})` };
    };
    return {
      stats: calculate(tasks),
      roomStats: rooms.map(room => ({ room, ...calculate(tasks.filter(task => task.roomId === room.id)) })).filter(item => item.total),
    };
  }, [tasks, rooms, completionByDef, vacations]);
  if (!tasks.length) return null;
  const segments = item => <div className="h-1.5 flex overflow-hidden rounded-full bg-zinc-800">
    {item.current > 0 && <span className="bg-emerald-500" style={{ width: `${item.current / item.total * 100}%` }} />}
    {item.soon > 0 && <span className="bg-amber-500" style={{ width: `${item.soon / item.total * 100}%` }} />}
    {item.overdue > 0 && <span className="bg-red-500" style={{ width: `${item.overdue / item.total * 100}%` }} />}
  </div>;

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
    <div className="mt-2">{segments(stats)}</div>
    <div className="flex gap-2 overflow-x-auto mt-3 pb-0.5 -mx-1 px-1">
      {roomStats.map(item => <div key={item.room.id} className="min-w-[132px] rounded-lg bg-zinc-950/60 border border-zinc-800 px-2.5 py-2">
        <div className="flex items-center justify-between gap-2 mb-1.5"><span className="text-xs text-zinc-300 truncate">{item.room.name}</span><span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} /></div>
        {segments(item)}
        <div className="text-[10px] text-zinc-600 mt-1.5">{item.current} / {item.soon} / {item.overdue}</div>
      </div>)}
    </div>
  </div>;
}

export function TasksView({ taskDefs, instances, rooms, vacations, user, onAddDef, onEditDef, onDeleteDef, onComplete, onUndo }) {
  const [form, setForm] = useState(null);
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

    <HouseholdStatus tasks={allHouseholdTasks} rooms={rooms} completionByDef={completionByDef} vacations={vacations} />

    {rooms.length > 1 && <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
      <GhostButton small onClick={() => setRoomFilter('all')}>Alle Räume</GhostButton>
      {rooms.map(room => <GhostButton key={room.id} small onClick={() => setRoomFilter(room.id)}>{room.name}</GhostButton>)}
    </div>}

    {!rooms.length ? <EmptyState text="Lege zuerst einen Raum an." /> : grouped.length === 0 ?
      <EmptyState text="Noch keine Haushaltsaufgaben angelegt." action={{ label: 'Erste Aufgabe anlegen', onClick: () => setForm('new') }} /> :
      <div className="space-y-6">{grouped.map(({ room, tasks }) => <section key={room.id}>
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">{room.name}</div>
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
          return <div key={def.id} className="rounded-xl border bg-zinc-900 p-4" style={statusStyle}>
            <div className="flex items-start justify-between gap-3"><div className="min-w-0">
              <div className="font-medium text-sm text-zinc-50 flex items-center gap-2">{def.title}<span className={`text-[10px] uppercase tracking-wide ${statusClass}`}>{statusText}</span></div>
              <div className={`text-xs mt-1 ${statusClass}`}><History size={11} className="inline mr-1" />{ageLabel(last?.completedAt, age)}</div>
              {last && <div className="text-[11px] text-zinc-600 mt-0.5">von {last.completedBy} · {formatDateTime(last.completedAt)}</div>}
            </div><AccentButton small onClick={() => onComplete(def, user.name)}><Check size={14} /> Erledigt</AccentButton></div>
            <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-zinc-800">
              {last && <button onClick={() => onUndo(last)} className="text-xs text-zinc-500 hover:text-zinc-200">Letzte Erledigung zurücknehmen</button>}
              <button onClick={() => setForm(def)} className="ml-auto text-zinc-600 hover:text-zinc-300"><Pencil size={13} /></button>
              <button onClick={() => onDeleteDef(def)} className="text-zinc-600 hover:text-red-400"><Trash2 size={13} /></button>
            </div>
          </div>;
        })}</div>
      </section>)}</div>}
    {form && <TaskForm initial={form === 'new' ? null : form} rooms={rooms} onCancel={() => setForm(null)} onSave={data => { form === 'new' ? onAddDef(data) : onEditDef(data); setForm(null); }} />}
  </div>;
}
