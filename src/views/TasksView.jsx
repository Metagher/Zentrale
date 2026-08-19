import { useMemo, useState } from 'react';
import { Check, History, Pencil, Plus, Trash2 } from 'lucide-react';
import { formatDateTime } from '../lib/dateUtils.js';
import { AccentButton, EmptyState, Field, GhostButton, Modal, inputCls } from '../components/ui.jsx';

function TaskForm({ initial, rooms, onCancel, onSave }) {
  const [form, setForm] = useState({ title: initial?.title || '', roomId: initial?.roomId || rooms[0]?.id || '' });
  return <Modal title={initial ? 'Haushaltsaufgabe bearbeiten' : 'Neue Haushaltsaufgabe'} onClose={onCancel}>
    <Field label="Was ist zu tun?"><input autoFocus className={inputCls} value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} placeholder="z. B. Waschbecken putzen" /></Field>
    <Field label="Raum"><select className={inputCls} value={form.roomId} onChange={e => setForm(v => ({ ...v, roomId: e.target.value }))}>
      {rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
    </select></Field>
    <div className="flex gap-2 justify-end mt-2"><GhostButton onClick={onCancel}>Abbrechen</GhostButton>
      <AccentButton disabled={!form.title.trim() || !form.roomId} onClick={() => onSave({ ...initial, ...form, title: form.title.trim(), household: true })}>Speichern</AccentButton>
    </div>
  </Modal>;
}

function ageLabel(iso) {
  if (!iso) return 'Noch nie erledigt';
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
  if (days === 0) return 'Heute erledigt';
  if (days === 1) return 'Seit gestern nicht erledigt';
  return `Seit ${days} Tagen nicht erledigt`;
}

export function TasksView({ taskDefs, instances, rooms, user, onAddDef, onEditDef, onDeleteDef, onComplete, onUndo }) {
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
          return <div key={def.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0">
              <div className="font-medium text-sm text-zinc-50">{def.title}</div>
              <div className={`text-xs mt-1 ${last ? 'text-zinc-400' : 'text-amber-400'}`}><History size={11} className="inline mr-1" />{ageLabel(last?.completedAt)}</div>
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
