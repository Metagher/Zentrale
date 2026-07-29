import { useState } from 'react';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { formatDateTime } from '../lib/dateUtils.js';
import { AccentButton, EmptyState, GhostButton, inputCls } from '../components/ui.jsx';

function formatCurrency(amount) {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '–';
  return amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function BalanceCard({ balance, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(balance?.amount ?? '');

  function submit() {
    const amount = parseFloat(String(value).replace(',', '.'));
    if (Number.isNaN(amount)) return;
    onSave(amount);
    setEditing(false);
  }
  function startEditing() {
    setValue(balance?.amount ?? '');
    setEditing(true);
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 mb-5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs text-zinc-500">Kontostand Haushaltskonto</div>
        {editing ? (
          <div className="flex items-center gap-2 mt-1.5">
            <input type="number" step="0.01" inputMode="decimal" className={inputCls + ' w-32'} value={value} autoFocus
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
            <span className="text-sm text-zinc-500">€</span>
            <AccentButton small onClick={submit}>Speichern</AccentButton>
            <GhostButton small onClick={() => setEditing(false)}>Abbrechen</GhostButton>
          </div>
        ) : (
          <div className="text-xl font-semibold text-zinc-50 mt-0.5">{formatCurrency(balance?.amount)}</div>
        )}
        {!editing && balance?.updatedBy && (
          <div className="text-xs text-zinc-600 mt-0.5">
            Zuletzt aktualisiert von {balance.updatedBy}{balance.updatedAt ? `, ${formatDateTime(balance.updatedAt)}` : ''}
          </div>
        )}
      </div>
      {!editing && (
        <button onClick={startEditing} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 shrink-0">
          <Pencil size={14} />
        </button>
      )}
    </div>
  );
}

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

export function ShoppingView({ items, onAdd, onToggle, onDelete, onClearBought, balance, onSaveBalance }) {
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

      <BalanceCard balance={balance} onSave={onSaveBalance} />

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
