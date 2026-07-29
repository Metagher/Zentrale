import { useState } from 'react';
import { Fan, Sparkles, WashingMachine } from 'lucide-react';
import { ACTIVITY_TYPES, USERS } from '../constants.js';
import { formatDate, todayISO, weekStart } from '../lib/dateUtils.js';
import { monthLabel } from '../lib/laundry.js';
import { EmptyState, Modal } from '../components/ui.jsx';

export function ReportsView({ rooms, instances, laundry, activities }) {
  const [tab, setTab] = useState('rooms');
  const [detailMachine, setDetailMachine] = useState(null);

  const roomStats = rooms.map(r => {
    const roomInstances = instances.filter(i => i.roomId === r.id);
    const done = roomInstances.filter(i => i.completed).sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
    const open = roomInstances.filter(i => !i.completed).length;
    const cleaningDone = r.cleaningDefId
      ? instances.filter(i => i.defId === r.cleaningDefId && i.completed).sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
      : [];
    return { room: r, last: done[0] || null, open, cleaning: cleaningDone[0] || null };
  }).sort((a, b) => {
    const av = a.last ? a.last.completedAt : '';
    const bv = b.last ? b.last.completedAt : '';
    return av.localeCompare(bv); // längste Zeit ohne Erledigung zuerst
  });

  const userStats = Object.values(USERS).map(u => {
    const done = instances.filter(i => i.completed && i.completedBy === u.name)
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
    const thisWeekStart = weekStart(todayISO());
    const thisWeek = done.filter(i => i.completedAt && i.completedAt.slice(0, 10) >= thisWeekStart).length;
    return { user: u, total: done.length, thisWeek, recent: done.slice(0, 8) };
  });

  const thisWeekStart = weekStart(todayISO());
  const activityStats = ACTIVITY_TYPES.map(activity => {
    const events = activities.filter(a => a.type === activity.id);
    const perUser = Object.values(USERS).map(u => {
      const userEvents = events.filter(e => e.user === u.name);
      const thisWeek = userEvents.filter(e => e.ts.slice(0, 10) >= thisWeekStart).length;
      return { user: u, total: userEvents.length, thisWeek };
    });
    return { activity, total: events.length, perUser };
  });

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-zinc-50">Berichte</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Status je Raum und Auswertung je Person</p>
      </div>

      <div className="inline-flex rounded-lg border border-zinc-800 p-0.5 mb-5">
        <button onClick={() => setTab('rooms')}
          className="px-4 py-1.5 text-xs font-medium rounded-md"
          style={{ backgroundColor: tab === 'rooms' ? 'var(--accent)' : 'transparent', color: tab === 'rooms' ? '#ffffff' : '#a1a1aa' }}>
          Raumstatus
        </button>
        <button onClick={() => setTab('users')}
          className="px-4 py-1.5 text-xs font-medium rounded-md"
          style={{ backgroundColor: tab === 'users' ? 'var(--accent)' : 'transparent', color: tab === 'users' ? '#ffffff' : '#a1a1aa' }}>
          Nutzer
        </button>
        <button onClick={() => setTab('laundry')}
          className="px-4 py-1.5 text-xs font-medium rounded-md"
          style={{ backgroundColor: tab === 'laundry' ? 'var(--accent)' : 'transparent', color: tab === 'laundry' ? '#ffffff' : '#a1a1aa' }}>
          Waschstatus
        </button>
        <button onClick={() => setTab('household')}
          className="px-4 py-1.5 text-xs font-medium rounded-md"
          style={{ backgroundColor: tab === 'household' ? 'var(--accent)' : 'transparent', color: tab === 'household' ? '#ffffff' : '#a1a1aa' }}>
          Haushalt
        </button>
      </div>

      {tab === 'rooms' && (
        rooms.length === 0 ? <EmptyState text="Noch keine Räume angelegt." /> : (
          <div className="space-y-2">
            {roomStats.map(({ room, last, open, cleaning }) => (
              <div key={room.id} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm text-zinc-50">{room.name}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {last ? <>Zuletzt: <strong>{last.title}</strong>, {formatDate(last.dueDate)}</> : 'Noch keine Aufgabe erledigt'}
                  </div>
                  {room.cleaningDefId && (
                    <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                      <Sparkles size={11} />
                      Zuletzt geputzt: {cleaning ? formatDate(cleaning.dueDate) : 'noch nie'}
                    </div>
                  )}
                </div>
                {open > 0 && <div className="text-xs font-medium shrink-0" style={{ color: 'var(--accent)' }}>{open} offen</div>}
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'users' && (
        <div className="grid md:grid-cols-2 gap-4">
          {userStats.map(({ user: u, total, thisWeek, recent }) => (
            <div key={u.name} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: u.accent }} />
                <span className="font-medium text-sm text-zinc-50">{u.name}</span>
              </div>
              <div className="flex gap-4 mb-3">
                <div>
                  <div className="text-xl font-semibold text-zinc-50">{total}</div>
                  <div className="text-xs text-zinc-500">Insgesamt erledigt</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-zinc-50">{thisWeek}</div>
                  <div className="text-xs text-zinc-500">Diese Woche</div>
                </div>
              </div>
              {recent.length > 0 && (
                <div className="space-y-1.5 pt-3 border-t border-zinc-800">
                  {recent.map(r => (
                    <div key={r.id} className="text-xs text-zinc-400 flex justify-between">
                      <span className="truncate">{r.title}</span>
                      <span className="shrink-0 ml-2">{formatDate(r.dueDate)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'laundry' && (
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { key: 'waschmaschine', label: 'Waschmaschine', Icon: WashingMachine },
            { key: 'trockner', label: 'Trockner', Icon: Fan },
          ].map(({ key, label, Icon }) => {
            const counts = (laundry && laundry[key] && laundry[key].counts) || {};
            const year = new Date().getFullYear();
            const yearTotal = Object.entries(counts)
              .filter(([k]) => k.startsWith(String(year)))
              .reduce((sum, [, v]) => sum + v, 0);
            const months = Object.keys(counts).sort().reverse().slice(0, 4);
            return (
              <button key={key} onClick={() => setDetailMachine(key)}
                className="text-left rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:shadow-md transition">
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={16} className="text-zinc-300" />
                  <span className="font-medium text-sm text-zinc-50">{label}</span>
                </div>
                <div className="mb-3">
                  <div className="text-xl font-semibold text-zinc-50">{yearTotal}</div>
                  <div className="text-xs text-zinc-500">Läufe {year} gesamt</div>
                </div>
                {months.length === 0 ? (
                  <div className="text-xs text-zinc-500">Noch keine Läufe erfasst.</div>
                ) : (
                  <div className="space-y-1.5 pt-3 border-t border-zinc-800">
                    {months.map(k => (
                      <div key={k} className="text-xs text-zinc-400 flex justify-between">
                        <span>{monthLabel(k)}</span>
                        <span>{counts[k]}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-xs mt-3" style={{ color: 'var(--accent)' }}>Details ansehen</div>
              </button>
            );
          })}
        </div>
      )}

      {tab === 'household' && (
        activities.length === 0 ? <EmptyState text="Noch keine Aktivitäten erfasst." /> : (
          <div className="space-y-3">
            {activityStats.map(({ activity, total, perUser }) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={16} className="text-zinc-300" />
                    <span className="font-medium text-sm text-zinc-50">{activity.label}</span>
                    <span className="text-xs text-zinc-500 ml-auto">{total} gesamt</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {perUser.map(({ user: u, total: userTotal, thisWeek }) => (
                      <div key={u.name}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: u.accent }} />
                          <span className="text-xs text-zinc-400">{u.name}</span>
                        </div>
                        <div className="text-xl font-semibold text-zinc-50">{userTotal}</div>
                        <div className="text-xs text-zinc-500">{thisWeek} diese Woche</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {detailMachine && (() => {
        const info = { waschmaschine: { label: 'Waschmaschine', Icon: WashingMachine }, trockner: { label: 'Trockner', Icon: Fan } }[detailMachine];
        const counts = (laundry && laundry[detailMachine] && laundry[detailMachine].counts) || {};
        const byYear = {};
        Object.entries(counts).forEach(([k, v]) => {
          const y = k.split('-')[0];
          byYear[y] = byYear[y] || { total: 0, months: [] };
          byYear[y].total += v;
          byYear[y].months.push([k, v]);
        });
        const years = Object.keys(byYear).sort().reverse();
        return (
          <Modal title={`${info.label} · Läufe im Detail`} onClose={() => setDetailMachine(null)}>
            {years.length === 0 ? (
              <div className="text-sm text-zinc-500">Noch keine Läufe erfasst.</div>
            ) : (
              <div className="space-y-5">
                {years.map(y => (
                  <div key={y}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-zinc-50">{y}</div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{byYear[y].total} gesamt</div>
                    </div>
                    <div className="space-y-1.5">
                      {byYear[y].months.sort((a, b) => b[0].localeCompare(a[0])).map(([k, v]) => (
                        <div key={k} className="text-xs text-zinc-400 flex justify-between rounded-lg bg-zinc-800 px-3 py-2">
                          <span>{monthLabel(k)}</span>
                          <span className="text-zinc-200 font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Modal>
        );
      })()}
    </div>
  );
}
