import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { formatDate } from '../lib/dateUtils.js';
import { AccentButton, Field, Modal, inputCls } from './ui.jsx';

export function VacationModal({ vacations, onAdd, onDelete, onClose }) {
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
    <Modal title="Urlaub" onClose={onClose}>
      <p className="text-xs text-zinc-500 mb-4">
        In diesen Zeiträumen werden keine neuen Termine für wiederkehrende Aufgaben erzeugt,
        und bereits geplante, noch nicht erledigte Termine in diesem Zeitraum werden ausgesetzt.
      </p>

      {sorted.length > 0 && (
        <div className="space-y-2 mb-4">
          {sorted.map(v => (
            <div key={v.id} className="flex items-center justify-between rounded-lg bg-zinc-800 px-3 py-2.5">
              <span className="text-sm text-zinc-200">{formatDate(v.start)} – {formatDate(v.end)}</span>
              <button onClick={() => onDelete(v.id)} className="p-1 rounded-lg hover:bg-red-950 text-zinc-500 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 items-end mb-3">
        <Field label="Start">
          <input type="date" className={inputCls} value={start} onChange={e => setStart(e.target.value)} />
        </Field>
        <Field label="Ende">
          <input type="date" className={inputCls} value={end} onChange={e => setEnd(e.target.value)} />
        </Field>
      </div>
      <AccentButton full disabled={!start || !end || end < start} onClick={submit}>
        <Plus size={15} /> Zeitraum hinzufügen
      </AccentButton>
    </Modal>
  );
}
