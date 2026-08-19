import { useState } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { USERS } from '../constants.js';
import { formatDate, todayISO } from '../lib/dateUtils.js';
import { AccentButton, EmptyState, Field, GhostButton, Modal, inputCls } from '../components/ui.jsx';
import { TaskCard } from '../components/TaskCard.jsx';

function OneTimeForm({ rooms, onClose, onSave }) {
  const [form, setForm] = useState({ title: '', assignedTo: '', dueDate: '', roomId: '' });
  return <Modal title="Einmalige Aufgabe" onClose={onClose}>
    <Field label="Was ist zu tun?"><input autoFocus className={inputCls + ' text-base'} value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} placeholder="z. B. Personalausweis abholen" /></Field>
    <Field label="Person (optional)"><select className={inputCls + ' text-base'} value={form.assignedTo} onChange={e => setForm(v => ({ ...v, assignedTo: e.target.value }))}>
      <option value="">Noch nicht zuweisen</option>{Object.values(USERS).map(person => <option key={person.name} value={person.name}>{person.name}</option>)}
    </select></Field>
    <Field label="Termin (optional)"><input type="date" min={todayISO()} className={inputCls + ' text-base'} value={form.dueDate} onChange={e => setForm(v => ({ ...v, dueDate: e.target.value }))} /></Field>
    <Field label="Raum (optional)"><select className={inputCls + ' text-base'} value={form.roomId} onChange={e => setForm(v => ({ ...v, roomId: e.target.value }))}>
      <option value="">Kein Raum</option>{rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
    </select></Field>
    <div className="flex gap-2 justify-end mt-3"><GhostButton onClick={onClose}>Abbrechen</GhostButton><AccentButton disabled={!form.title.trim()} onClick={() => onSave({ ...form, title: form.title.trim() })}>Anlegen</AccentButton></div>
  </Modal>;
}

export function OneTimeTasksView({ instances, rooms, user, onAdd, onUpdate, onDelete }) {
  const [adding, setAdding] = useState(false);
  const roomsById = Object.fromEntries(rooms.map(room => [room.id, room]));
  const tasks = instances.filter(item => item.kind === 'oneTime' && !item.completed).sort((a, b) => {
    if (!a.dueDate && b.dueDate) return 1;
    if (a.dueDate && !b.dueDate) return -1;
    return (a.dueDate || '').localeCompare(b.dueDate || '') || a.title.localeCompare(b.title);
  });
  return <div>
    <div className="flex items-start justify-between gap-3 mb-5"><div><h1 className="text-lg font-semibold text-zinc-50">Einmalig</h1><p className="text-xs text-zinc-500 mt-0.5">Erledigungen, Termine und kleine Besorgungen</p></div>
      <AccentButton small onClick={() => setAdding(true)}><Plus size={15} /> Aufgabe</AccentButton>
    </div>
    {!tasks.length ? <EmptyState text="Keine offenen einmaligen Aufgaben." action={{ label: 'Aufgabe anlegen', onClick: () => setAdding(true) }} /> : <div className="space-y-3">
      {tasks.map(task => <div key={task.id}>
        {task.dueDate && <div className="text-[11px] text-zinc-500 mb-1.5 ml-1 flex items-center gap-1"><CalendarDays size={11} /> {formatDate(task.dueDate)}</div>}
        <TaskCard instance={task} room={roomsById[task.roomId]} rooms={rooms} user={user} onUpdate={onUpdate} onDelete={onDelete} compact />
      </div>)}
    </div>}
    {adding && <OneTimeForm rooms={rooms} onClose={() => setAdding(false)} onSave={data => { onAdd(data); setAdding(false); }} />}
  </div>;
}
