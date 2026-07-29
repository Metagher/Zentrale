import { useState } from 'react';
import { Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { uid } from '../lib/recurrence.js';
import { formatDate } from '../lib/dateUtils.js';
import { AccentButton, EmptyState, Field, GhostButton, Modal, inputCls } from '../components/ui.jsx';

function CornerFrame() {
  const style = { borderColor: 'var(--accent)' };
  return (
    <>
      <span className="absolute top-2 left-2 w-2.5 h-2.5 border-t-2 border-l-2" style={style} />
      <span className="absolute top-2 right-2 w-2.5 h-2.5 border-t-2 border-r-2" style={style} />
      <span className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b-2 border-l-2" style={style} />
      <span className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b-2 border-r-2" style={style} />
    </>
  );
}

export function RoomsView({ rooms, instances, onSaveRooms }) {
  const [openRoom, setOpenRoom] = useState(null);
  const [adding, setAdding] = useState(false);

  function lastCompletion(roomId) {
    const done = instances.filter(i => i.roomId === roomId && i.completed)
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
    return done[0] || null;
  }
  function lastCleaning(room) {
    if (!room.cleaningDefId) return null;
    const done = instances.filter(i => i.defId === room.cleaningDefId && i.completed)
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
    return done[0] || null;
  }
  function openCount(roomId) {
    return instances.filter(i => i.roomId === roomId && !i.completed).length;
  }

  function addRoom(data) {
    onSaveRooms([...rooms, { ...data, id: uid() }]);
    setAdding(false);
  }
  function updateRoom(data) {
    onSaveRooms(rooms.map(r => r.id === data.id ? data : r));
    setOpenRoom(data);
  }
  function deleteRoom(room) {
    const inUse = instances.some(i => i.roomId === room.id);
    if (inUse && !window.confirm('Für diesen Raum existieren Aufgaben. Trotzdem löschen?')) return;
    onSaveRooms(rooms.filter(r => r.id !== room.id));
    setOpenRoom(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-50">Räume</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Grundriss und technische Informationen</p>
        </div>
        <AccentButton small onClick={() => setAdding(true)}><Plus size={14} /> Raum</AccentButton>
      </div>

      {rooms.length === 0 ? (
        <EmptyState text="Noch keine Räume angelegt." action={{ label: 'Ersten Raum anlegen', onClick: () => setAdding(true) }} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {rooms.map(r => (
            <button key={r.id} onClick={() => setOpenRoom(r)}
              className="relative rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left hover:shadow-md transition">
              <CornerFrame />
              <div className="font-medium text-zinc-50 text-sm">{r.name}</div>
            </button>
          ))}
        </div>
      )}

      {adding && <RoomForm onCancel={() => setAdding(false)} onSave={addRoom} />}
      {openRoom && (
        <RoomDetail room={openRoom} last={lastCompletion(openRoom.id)} cleaning={lastCleaning(openRoom)} openCount={openCount(openRoom.id)}
          onClose={() => setOpenRoom(null)} onSave={updateRoom} onDelete={deleteRoom} />
      )}
    </div>
  );
}

function RoomForm({ initial, onCancel, onSave }) {
  const [f, setF] = useState(initial || { name: '', technischeInfo: '' });
  return (
    <Modal title={initial ? 'Raum bearbeiten' : 'Neuer Raum'} onClose={onCancel}>
      <Field label="Name">
        <input className={inputCls} value={f.name} onChange={e => setF(v => ({ ...v, name: e.target.value }))} placeholder="z. B. Küche" />
      </Field>
      <Field label="Technische Informationen">
        <textarea className={inputCls} rows={6} value={f.technischeInfo}
          onChange={e => setF(v => ({ ...v, technischeInfo: e.target.value }))}
          placeholder="z. B. Etage, Fläche, Boden, Heizung, sonstige Hinweise" />
      </Field>
      <div className="flex gap-2 justify-end mt-2">
        <GhostButton onClick={onCancel}>Abbrechen</GhostButton>
        <AccentButton disabled={!f.name.trim()} onClick={() => onSave({ id: initial?.id || undefined, ...f })}>Speichern</AccentButton>
      </div>
    </Modal>
  );
}

function RoomDetail({ room, last, cleaning, openCount, onClose, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return <RoomForm initial={room} onCancel={() => setEditing(false)} onSave={data => { onSave(data); setEditing(false); }} />;
  }
  return (
    <Modal title={room.name} onClose={onClose}>
      {room.technischeInfo && (
        <div className="mb-4">
          <div className="text-xs text-zinc-500 mb-1">Technische Informationen</div>
          <div className="text-sm text-zinc-200 whitespace-pre-wrap">{room.technischeInfo}</div>
        </div>
      )}
      {room.cleaningDefId && (
        <div className="rounded-lg px-3 py-2.5 text-xs mb-3 flex items-center gap-2 bg-zinc-800">
          <Sparkles size={13} style={{ color: 'var(--accent)' }} />
          <span className="text-zinc-200">
            Zuletzt geputzt: <strong>{cleaning ? formatDate(cleaning.dueDate) : 'noch nie'}</strong>
          </span>
        </div>
      )}
      <div className="rounded-lg bg-zinc-800 px-3 py-2.5 text-xs text-zinc-300 mb-4">
        {last ? <>Zuletzt erledigt: <strong>{last.title}</strong> am {formatDate(last.dueDate)}</> : 'Für diesen Raum wurde noch keine Aufgabe erledigt.'}
        <br />{openCount} offene Aufgabe{openCount === 1 ? '' : 'n'}
      </div>
      <div className="flex gap-2 justify-end">
        <GhostButton danger onClick={() => onDelete(room)}><Trash2 size={13} /> Löschen</GhostButton>
        <AccentButton onClick={() => setEditing(true)}><Pencil size={13} /> Bearbeiten</AccentButton>
      </div>
    </Modal>
  );
}
