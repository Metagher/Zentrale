import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { addDays, dowSunFirst, formatDate, todayISO, weekStart, WEEKDAYS_FULL } from '../lib/dateUtils.js';
import { byOpenFirstThenTitle } from '../lib/recurrence.js';
import { EmptyState, ToggleSwitch, inputCls } from '../components/ui.jsx';
import { TaskCard } from '../components/TaskCard.jsx';

export function OverviewView({ instances, rooms, user, onlyMine, setOnlyMine, onUpdate, onDelete, onQuickAdd }) {
  const [mode, setMode] = useState('day');
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [roomFilter, setRoomFilter] = useState('all');

  const roomsById = useMemo(() => Object.fromEntries(rooms.map(r => [r.id, r])), [rooms]);

  const filtered = instances.filter(i =>
    (roomFilter === 'all' || i.roomId === roomFilter) &&
    (!onlyMine || i.assignedTo === user.name)
  );

  function shift(n) {
    setSelectedDate(d => addDays(d, mode === 'day' ? n : n * 7));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-50">Übersicht</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Aufgaben nach Tag oder Woche</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ToggleSwitch checked={onlyMine} onChange={setOnlyMine} label="Nur meine Aufgaben anzeigen" />
          <div className="inline-flex rounded-lg border border-zinc-800 p-0.5" style={{ display: 'inline-flex' }}>
            <button onClick={() => setMode('day')}
              className="px-3 py-1.5 text-xs font-medium rounded-md"
              style={{ backgroundColor: mode === 'day' ? 'var(--accent)' : 'transparent', color: mode === 'day' ? '#ffffff' : '#a1a1aa' }}>
              Tag
            </button>
            <button onClick={() => setMode('week')}
              className="px-3 py-1.5 text-xs font-medium rounded-md"
              style={{ backgroundColor: mode === 'week' ? 'var(--accent)' : 'transparent', color: mode === 'week' ? '#ffffff' : '#a1a1aa' }}>
              Woche
            </button>
          </div>
          <select className={inputCls + ' w-auto text-xs py-1.5'} value={roomFilter} onChange={e => setRoomFilter(e.target.value)}>
            <option value="all">Alle Räume</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button onClick={() => shift(-1)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"><ChevronLeft size={18} /></button>
        <div className="text-sm font-medium text-zinc-200 text-center">
          {mode === 'day' ? `${WEEKDAYS_FULL[dowSunFirst(selectedDate)]}, ${formatDate(selectedDate)}` :
            `${formatDate(weekStart(selectedDate))} – ${formatDate(addDays(weekStart(selectedDate), 6))}`}
          <button onClick={() => setSelectedDate(todayISO())} className="ml-2 text-xs underline text-zinc-500">Heute</button>
        </div>
        <button onClick={() => shift(1)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"><ChevronRight size={18} /></button>
      </div>

      {mode === 'day' ? (
        <DayByRoom date={selectedDate} instances={filtered} roomsById={roomsById} rooms={rooms} user={user}
          onUpdate={onUpdate} onDelete={onDelete} onQuickAdd={onQuickAdd} />
      ) : (
        <WeekList start={weekStart(selectedDate)} instances={filtered} roomsById={roomsById} rooms={rooms} user={user}
          onUpdate={onUpdate} onDelete={onDelete} />
      )}
    </div>
  );
}

function DayByRoom({ date, instances, roomsById, rooms, user, onUpdate, onDelete, onQuickAdd }) {
  const dayItems = instances.filter(i => i.dueDate === date);
  const grouped = {};
  dayItems.forEach(i => {
    const key = i.roomId || '_none';
    grouped[key] = grouped[key] || [];
    grouped[key].push(i);
  });
  const roomIds = Object.keys(grouped).sort((a, b) => (roomsById[a]?.name || '').localeCompare(roomsById[b]?.name || ''));

  if (rooms.length === 0) {
    return <EmptyState text="Lege zuerst einen Raum an, um Aufgaben zu planen." />;
  }
  if (roomIds.length === 0) {
    return <EmptyState text="Für diesen Tag sind keine Aufgaben geplant." action={{ label: 'Aufgabe hinzufügen', onClick: () => onQuickAdd(date) }} />;
  }

  return (
    <div className="space-y-6">
      {roomIds.map(rid => (
        <div key={rid}>
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
            {roomsById[rid]?.name || 'Ohne Raum'}
          </div>
          <div className="space-y-2">
            {grouped[rid].sort(byOpenFirstThenTitle).map(inst => (
              <TaskCard key={inst.id} instance={inst} room={roomsById[inst.roomId]} rooms={rooms} user={user}
                onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </div>
        </div>
      ))}
      <button onClick={() => onQuickAdd(date)} className="text-xs text-zinc-500 hover:text-zinc-200 flex items-center gap-1">
        <Plus size={13} /> Aufgabe für diesen Tag hinzufügen
      </button>
    </div>
  );
}

function WeekList({ start, instances, roomsById, rooms, user, onUpdate, onDelete }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="space-y-6">
      {days.map(d => {
        const items = instances.filter(i => i.dueDate === d).sort(byOpenFirstThenTitle);
        return (
          <div key={d}>
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
              {WEEKDAYS_FULL[dowSunFirst(d)]}, {formatDate(d)} {d === todayISO() && <span style={{ color: 'var(--accent)' }}>· heute</span>}
            </div>
            {items.length === 0 ? (
              <div className="text-xs text-zinc-600 pl-1">Keine Aufgaben</div>
            ) : (
              <div className="space-y-2">
                {items.map(inst => (
                  <TaskCard key={inst.id} instance={inst} room={roomsById[inst.roomId]} rooms={rooms} user={user}
                    onUpdate={onUpdate} onDelete={onDelete} compact />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
