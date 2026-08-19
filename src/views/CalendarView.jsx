import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { USERS } from '../constants.js';
import { dowSunFirst, formatDate, todayISO, WEEKDAYS_FULL, WEEKDAYS_SHORT, MONTHS_FULL } from '../lib/dateUtils.js';
import { EmptyState, ToggleSwitch } from '../components/ui.jsx';
import { TaskCard } from '../components/TaskCard.jsx';

export function CalendarView({ instances, rooms, user, onlyMine, setOnlyMine, onUpdate, onDelete, onQuickAdd }) {
  const [monthCursor, setMonthCursor] = useState(() => {
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(todayISO());

  const roomsById = useMemo(() => Object.fromEntries(rooms.map(r => [r.id, r])), [rooms]);
  const filteredInstances = instances.filter(i => i.kind === 'oneTime' && i.dueDate && (!onlyMine || i.assignedTo === user.name));

  const firstOfMonth = new Date(monthCursor.y, monthCursor.m, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Mo=0
  const daysInMonth = new Date(monthCursor.y, monthCursor.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthCursor.y}-${String(monthCursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push(dateStr);
  }

  function shiftMonth(n) {
    let m = monthCursor.m + n, y = monthCursor.y;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonthCursor({ y, m });
  }

  const dayItems = filteredInstances.filter(i => i.dueDate === selectedDate)
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-50">Kalender</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Alle geplanten und erledigten Aufgaben</p>
        </div>
        <ToggleSwitch checked={onlyMine} onChange={setOnlyMine} label="Nur meine Aufgaben anzeigen" />
      </div>

      <div className="flex items-center justify-between mb-3">
        <button onClick={() => shiftMonth(-1)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"><ChevronLeft size={18} /></button>
        <div className="text-sm font-medium text-zinc-200">{MONTHS_FULL[monthCursor.m]} {monthCursor.y}</div>
        <button onClick={() => shiftMonth(1)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"><ChevronRight size={18} /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS_SHORT.map(d => (
          <div key={d} className="text-center text-xs font-medium text-zinc-500 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((dateStr, idx) => {
          if (!dateStr) return <div key={idx} />;
          const items = filteredInstances.filter(i => i.dueDate === dateStr);
          const isToday = dateStr === todayISO();
          const isSelected = dateStr === selectedDate;
          return (
            <button key={dateStr} onClick={() => setSelectedDate(dateStr)}
              className={`aspect-square rounded-lg border text-xs flex flex-col items-center justify-center gap-1 transition
                ${isSelected ? 'border-transparent text-white' : isToday ? 'border-zinc-600' : 'border-zinc-800 hover:border-zinc-800'}`}
              style={isSelected ? { backgroundColor: 'var(--accent)' } : {}}
            >
              <span className={isSelected ? 'text-white' : 'text-zinc-200'}>{parseInt(dateStr.slice(-2))}</span>
              <span className="flex gap-0.5">
                {items.slice(0, 3).map((it, i2) => (
                  <span key={i2} className="w-1 h-1 rounded-full"
                    style={{ backgroundColor: isSelected ? 'white' : (it.completed ? '#71717a' : (it.assignedTo ? USERS[it.assignedTo].accent : '#52525b')) }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
            {WEEKDAYS_FULL[dowSunFirst(selectedDate)]}, {formatDate(selectedDate)}
          </div>
          <button onClick={() => onQuickAdd(selectedDate)} className="text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
            <Plus size={13} /> Hinzufügen
          </button>
        </div>
        {dayItems.length === 0 ? (
          <EmptyState text="Keine Aufgaben an diesem Tag." />
        ) : (
          <div className="space-y-2">
            {dayItems.map(inst => (
              <TaskCard key={inst.id} instance={inst} room={roomsById[inst.roomId]} rooms={rooms} user={user}
                onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
