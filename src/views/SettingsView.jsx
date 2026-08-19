import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { formatDate } from '../lib/dateUtils.js';
import { resolveDryerTaskRoomId } from '../lib/laundry.js';
import { AccentButton, EmptyState, Field, inputCls } from '../components/ui.jsx';
import { RoomsView } from './RoomsView.jsx';

function SectionHeading({ children }) {
  return <h2 className="text-base font-semibold text-zinc-50 mb-1">{children}</h2>;
}

function VacationSection({ vacations, onAdd, onDelete }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  function submit() {
    if (!start || !end || end < start) return;
    onAdd({ start, end });
    setStart('');
    setEnd('');
  }

  const sorted = [...vacations].sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div>
      <SectionHeading>Urlaub</SectionHeading>
      <p className="text-xs text-zinc-500 mb-3 max-w-xl">
        In diesen Zeiträumen werden keine neuen Termine für wiederkehrende Aufgaben erzeugt,
        und bereits geplante, noch nicht erledigte Termine in diesem Zeitraum werden ausgesetzt.
      </p>

      {sorted.length > 0 && (
        <div className="space-y-2 mb-4 max-w-xl">
          {sorted.map(v => (
            <div key={v.id} className="flex items-center justify-between rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2.5">
              <span className="text-sm text-zinc-200">{formatDate(v.start)} – {formatDate(v.end)}</span>
              <button onClick={() => onDelete(v.id)} className="p-1 rounded-lg hover:bg-red-950 text-zinc-500 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 max-w-xl">
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <Field label="Start">
            <input type="date" className={inputCls} value={start} onChange={e => setStart(e.target.value)} />
          </Field>
          <Field label="Ende">
            <input type="date" className={inputCls} value={end} onChange={e => setEnd(e.target.value)} />
          </Field>
        </div>
        <AccentButton small disabled={!start || !end || end < start} onClick={submit}>
          <Plus size={14} /> Zeitraum hinzufügen
        </AccentButton>
      </div>
    </div>
  );
}

function DryerTaskSection({ dryerTask, rooms, onSave }) {
  const [title, setTitle] = useState(dryerTask?.title || '');
  const [roomId, setRoomId] = useState(() => resolveDryerTaskRoomId(dryerTask, rooms));
  const [saved, setSaved] = useState(false);

  function submit() {
    onSave({ title: title.trim(), roomId });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div>
      <SectionHeading>Waschstatus: Automatische Aufgabe</SectionHeading>
      <p className="text-xs text-zinc-500 mb-3 max-w-xl">Wird angelegt, sobald der Trockner auf "Fertig" gestellt wird.</p>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 max-w-xl">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Titel">
            <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="z. B. Wäsche falten und verräumen" />
          </Field>
          <Field label="Raum">
            <select className={inputCls} value={roomId} onChange={e => setRoomId(e.target.value)} disabled={rooms.length === 0}>
              {rooms.length === 0 && <option value="">Kein Raum vorhanden</option>}
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <AccentButton small disabled={!title.trim() || !roomId} onClick={submit}>Speichern</AccentButton>
          {saved && <span className="text-xs text-emerald-400">Gespeichert</span>}
        </div>
      </div>
    </div>
  );
}

function DataValidationSection({ issues, onCleanup }) {
  return <div>
    <SectionHeading>Datenprüfung</SectionHeading>
    <p className="text-xs text-zinc-500 mb-3 max-w-xl">Prüft alle gespeicherten Daten und Verknüpfungen auf ungültige oder unvollständige Einträge.</p>
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 max-w-xl">
      {issues.length === 0 ? <div className="flex items-center gap-2 text-sm text-emerald-400">
        <CheckCircle2 size={17} /> Keine beschädigten Daten gefunden.
      </div> : <>
        <div className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-3">
          <AlertTriangle size={17} /> {issues.length} Datenproblem{issues.length === 1 ? '' : 'e'} gefunden
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
          {issues.map((issue, index) => <div key={`${issue.collection}-${issue.id}-${index}`} className="rounded-lg bg-zinc-800 px-3 py-2 text-xs">
            <div className="text-zinc-200 font-medium">{issue.collection} · {issue.id}</div>
            <div className="text-zinc-500 mt-0.5">{issue.message}</div>
          </div>)}
        </div>
        <AccentButton small onClick={onCleanup}><Trash2 size={14} /> Korrupte Daten löschen</AccentButton>
        <p className="text-[11px] text-zinc-600 mt-2">Es werden ausschließlich beanstandete Einträge entfernt oder ungültige Bereiche zurückgesetzt.</p>
      </>}
    </div>
  </div>;
}

export function SettingsView({ rooms, instances, onSaveRooms, vacations, onAddVacation, onDeleteVacation, dryerTask, onSaveDryerTask,
  dataIssues, onCleanupData }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-50">Einstellungen</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Räume, Urlaub und weitere Grundeinstellungen</p>
      </div>

      <div className="space-y-8">
        <DataValidationSection issues={dataIssues} onCleanup={onCleanupData} />
        <RoomsView rooms={rooms} instances={instances} onSaveRooms={onSaveRooms} />
        <VacationSection vacations={vacations} onAdd={onAddVacation} onDelete={onDeleteVacation} />
        <DryerTaskSection dryerTask={dryerTask} rooms={rooms} onSave={onSaveDryerTask} />
      </div>
    </div>
  );
}
