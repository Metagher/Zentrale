import { useState } from 'react';
import { Check, MapPin, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { addDays, todayISO, WEEKDAYS_SHORT } from '../lib/dateUtils.js';
import { recurrenceLabel } from '../lib/recurrence.js';
import { AccentButton, EmptyState, Field, GhostButton, Modal, inputCls } from '../components/ui.jsx';

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

export function TasksView({ taskDefs, rooms, onAddDef, onEditDef, onDeleteDef, onCreateFromTemplate }) {
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
