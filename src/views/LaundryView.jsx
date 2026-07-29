import { Fan, WashingMachine } from 'lucide-react';
import { USERS } from '../constants.js';
import { formatDateTime } from '../lib/dateUtils.js';
import { laundryStyle, monthKey, monthLabel } from '../lib/laundry.js';

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

export function LaundryView({ laundry, onCycle, onAdjust }) {
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
