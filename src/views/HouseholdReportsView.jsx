import { useMemo, useState } from 'react';
import { BarChart3, Smartphone, TrendingUp } from 'lucide-react';
import { USERS } from '../constants.js';
import { addDays, formatDate, formatDateTime, todayISO, weekStart } from '../lib/dateUtils.js';
import { EmptyState } from '../components/ui.jsx';

export function HouseholdReportsView({ taskDefs, instances, appOpens }) {
  const [period, setPeriod] = useState('90');
  const householdDefs = taskDefs.filter(task => task.household);
  const defIds = new Set(householdDefs.map(task => task.id));
  const allHistory = instances.filter(item => item.completed && item.completedAt && defIds.has(item.defId));
  const cutoff = period === 'all' ? null : addDays(todayISO(), -Number(period));
  const history = cutoff ? allHistory.filter(item => item.completedAt.slice(0, 10) >= cutoff) : allHistory;
  const users = Object.values(USERS);
  const periodOpens = cutoff ? appOpens.filter(event => event.openedAt.slice(0, 10) >= cutoff) : appOpens;

  const stats = useMemo(() => {
    const totals = users.map(person => ({ person, count: history.filter(item => item.completedBy === person.name).length }));
    const byTask = householdDefs.map(task => ({
      task,
      total: history.filter(item => item.defId === task.id).length,
      counts: Object.fromEntries(users.map(person => [person.name, history.filter(item => item.defId === task.id && item.completedBy === person.name).length])),
    })).filter(item => item.total).sort((a, b) => b.total - a.total || a.task.title.localeCompare(b.task.title));
    const currentWeek = weekStart(todayISO());
    const weeks = Array.from({ length: 8 }, (_, index) => {
      const start = addDays(currentWeek, (index - 7) * 7);
      const end = addDays(start, 6);
      const counts = Object.fromEntries(users.map(person => [person.name, allHistory.filter(item => {
        const date = item.completedAt.slice(0, 10);
        return item.completedBy === person.name && date >= start && date <= end;
      }).length]));
      return { start, end, counts, total: Object.values(counts).reduce((sum, value) => sum + value, 0) };
    });
    return { totals, byTask, weeks };
  }, [history, allHistory, householdDefs]);

  const total = stats.totals.reduce((sum, item) => sum + item.count, 0);
  const maxWeek = Math.max(1, ...stats.weeks.map(week => week.total));
  const periodLabel = period === 'all' ? 'Gesamte Zeit' : `Letzte ${period} Tage`;

  return <div>
    <div className="mb-4"><h1 className="text-lg font-semibold text-zinc-50">Haushaltsbericht</h1><p className="text-xs text-zinc-500 mt-0.5">Erledigungen nach Person und Aufgabe</p></div>
    <div className="flex rounded-xl border border-zinc-800 bg-zinc-900 p-1 mb-5">
      {[['30', '30 Tage'], ['90', '90 Tage'], ['all', 'Gesamt']].map(([value, label]) => <button key={value} onClick={() => setPeriod(value)} className="flex-1 min-h-10 rounded-lg text-xs font-medium" style={period === value ? { backgroundColor: 'var(--accent)', color: '#fff' } : { color: '#a1a1aa' }}>{label}</button>)}
    </div>

    {!allHistory.length && !appOpens.length ? <EmptyState text="Noch keine Auswertungsdaten vorhanden." /> : <div className="space-y-5">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center justify-between mb-3"><div className="text-xs font-medium text-zinc-300 flex items-center gap-1.5"><BarChart3 size={14} /> Wer hat wie viel gemacht?</div><span className="text-[11px] text-zinc-600">{periodLabel}</span></div>
        <div className="grid grid-cols-2 gap-3 mb-3">{stats.totals.map(({ person, count }) => <div key={person.name} className="rounded-lg bg-zinc-950/60 p-3"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: person.accent }} /><span className="text-xs text-zinc-400">{person.name}</span></div><div className="text-2xl font-semibold text-zinc-50 mt-1">{count}</div><div className="text-[11px] text-zinc-600">{total ? Math.round(count / total * 100) : 0}% der Erledigungen</div></div>)}</div>
        <div className="h-2.5 rounded-full overflow-hidden bg-zinc-800 flex">{stats.totals.map(({ person, count }) => count > 0 && <span key={person.name} style={{ width: `${count / total * 100}%`, backgroundColor: person.accent }} />)}</div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center justify-between mb-3"><div className="text-xs font-medium text-zinc-300 flex items-center gap-1.5"><Smartphone size={14} /> App-Nutzung</div><span className="text-[11px] text-zinc-600">{periodLabel}</span></div>
        <div className="grid grid-cols-2 gap-3">{users.map(person => {
          const opens = periodOpens.filter(event => event.person === person.name);
          const last = [...appOpens].filter(event => event.person === person.name).sort((a, b) => b.openedAt.localeCompare(a.openedAt))[0];
          const qrCount = opens.filter(event => event.source === 'qr').length;
          return <div key={person.name} className="rounded-lg bg-zinc-950/60 p-3">
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: person.accent }} /><span className="text-xs text-zinc-400">{person.name}</span></div>
            <div className="text-2xl font-semibold text-zinc-50 mt-1">{opens.length}</div><div className="text-[11px] text-zinc-600">Öffnungen · {qrCount} über QR/NFC</div>
            <div className="text-[10px] text-zinc-600 mt-2 leading-tight">Zuletzt: {last ? formatDateTime(last.openedAt) : 'noch nie'}</div>
          </div>;
        })}</div>
        <p className="text-[10px] text-zinc-600 mt-2">Gezählt wird höchstens einmal je Person und Browser-Sitzung.</p>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 mb-4"><TrendingUp size={14} /> Entwicklung · letzte 8 Wochen</div>
        <div className="h-32 flex items-end gap-2">{stats.weeks.map(week => <div key={week.start} className="flex-1 h-full flex flex-col justify-end min-w-0">
          <div className="w-full rounded-t-sm overflow-hidden flex flex-col-reverse" style={{ height: `${Math.max(3, week.total / maxWeek * 100)}%` }} title={`${week.total} Erledigungen`}>
            {users.map(person => week.counts[person.name] > 0 && <span key={person.name} style={{ height: `${week.counts[person.name] / Math.max(1, week.total) * 100}%`, backgroundColor: person.accent }} />)}
          </div><div className="text-[9px] text-zinc-600 text-center mt-1 truncate">{formatDate(week.start).slice(0, 5)}</div>
        </div>)}</div>
        <div className="flex gap-3 mt-3 justify-center">{users.map(person => <span key={person.name} className="text-[10px] text-zinc-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: person.accent }} />{person.name}</span>)}</div>
      </section>

      <section>
        <div className="text-xs font-medium text-zinc-300 mb-2">Aufgaben nach Person</div>
        {!stats.byTask.length ? <div className="text-sm text-zinc-600 py-3">In diesem Zeitraum keine Erledigungen.</div> : <div className="space-y-2">{stats.byTask.map(({ task, total: taskTotal, counts }) => <div key={task.id} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="flex items-center justify-between gap-3 mb-2"><span className="text-sm font-medium text-zinc-100 truncate">{task.title}</span><span className="text-xs text-zinc-500 shrink-0">{taskTotal}× gesamt</span></div>
          <div className="grid grid-cols-2 gap-3">{users.map(person => <div key={person.name} className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: person.accent }} /><span className="text-zinc-500">{person.name}</span><strong className="text-zinc-200 ml-auto">{counts[person.name]}×</strong></div>)}</div>
        </div>)}</div>}
      </section>
    </div>}
  </div>;
}
