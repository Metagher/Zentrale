import { useState } from 'react';
import { Cake, Pencil, Plus, Trash2 } from 'lucide-react';
import { formatDate, todayISO } from '../lib/dateUtils.js';
import { AccentButton, EmptyState, Field, GhostButton, Modal, inputCls } from '../components/ui.jsx';

function PersonForm({ initial, onClose, onSave }) {
  const [form, setForm] = useState({ name: initial?.name || '', birthday: initial?.birthday || '' });
  return <Modal title={initial ? 'Person bearbeiten' : 'Person hinzufügen'} onClose={onClose}>
    <Field label="Name"><input autoFocus className={inputCls + ' text-base'} value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} placeholder="Vor- und Nachname" /></Field>
    <Field label="Geburtstag"><input type="date" max={todayISO()} className={inputCls + ' text-base'} value={form.birthday} onChange={e => setForm(v => ({ ...v, birthday: e.target.value }))} /></Field>
    <div className="flex justify-end gap-2 mt-3"><GhostButton onClick={onClose}>Abbrechen</GhostButton><AccentButton disabled={!form.name.trim() || !form.birthday} onClick={() => onSave({ ...initial, ...form, name: form.name.trim() })}>Speichern</AccentButton></div>
  </Modal>;
}

function nextBirthdayInfo(birthday) {
  const today = todayISO();
  const [todayYear, todayMonth, todayDay] = today.split('-').map(Number);
  const [, month, day] = birthday.split('-').map(Number);
  const todayUtc = Date.UTC(todayYear, todayMonth - 1, todayDay);
  let year = todayYear;
  let candidate;
  while (year < todayYear + 8) {
    const date = new Date(Date.UTC(year, month - 1, day));
    const validDate = date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    if (validDate && date.getTime() >= todayUtc) { candidate = date; break; }
    year += 1;
  }
  const days = Math.round((candidate.getTime() - todayUtc) / 86400000);
  return { days, year };
}

export function PeopleView({ people, onAdd, onEdit, onDelete }) {
  const [form, setForm] = useState(null);
  const sorted = [...people].map(person => ({ ...person, nextBirthday: nextBirthdayInfo(person.birthday) }))
    .sort((a, b) => a.nextBirthday.days - b.nextBirthday.days || a.name.localeCompare(b.name));
  return <div>
    <div className="flex items-start justify-between gap-3 mb-5"><div><h1 className="text-lg font-semibold text-zinc-50">Personen</h1><p className="text-xs text-zinc-500 mt-0.5">Geburtstage im Blick behalten</p></div><AccentButton small onClick={() => setForm('new')}><Plus size={15} /> Person</AccentButton></div>
    {!sorted.length ? <EmptyState text="Noch keine Personen eingetragen." action={{ label: 'Person hinzufügen', onClick: () => setForm('new') }} /> : <div className="space-y-2">{sorted.map(person => {
      const today = todayISO();
      const age = Number(today.slice(0, 4)) - Number(person.birthday.slice(0, 4)) - (today.slice(5) < person.birthday.slice(5) ? 1 : 0);
      const countdown = person.nextBirthday.days === 0 ? 'Heute Geburtstag' : person.nextBirthday.days === 1 ? 'Morgen Geburtstag' : `Noch ${person.nextBirthday.days} Tage`;
      return <div key={person.id} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0" style={{ color: 'var(--accent)' }}><Cake size={18} /></span>
        <div className="min-w-0 flex-1"><div className="text-sm font-medium text-zinc-50 truncate">{person.name}</div><div className="text-xs mt-0.5" style={{ color: person.nextBirthday.days <= 7 ? 'var(--accent)' : '#a1a1aa' }}>{countdown}</div><div className="text-[11px] text-zinc-600 mt-0.5">{formatDate(person.birthday)} · Jahrgang {person.birthday.slice(0, 4)} · {age} Jahre</div></div>
        <button onClick={() => setForm(person)} className="min-w-11 min-h-11 flex items-center justify-center text-zinc-500"><Pencil size={15} /></button>
        <button onClick={() => onDelete(person)} className="min-w-11 min-h-11 flex items-center justify-center text-zinc-600 hover:text-red-400"><Trash2 size={15} /></button>
      </div>;
    })}</div>}
    {form && <PersonForm initial={form === 'new' ? null : form} onClose={() => setForm(null)} onSave={data => { form === 'new' ? onAdd(data) : onEdit(data); setForm(null); }} />}
  </div>;
}
