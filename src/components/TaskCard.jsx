import { useState } from 'react';
import { Check, MapPin, MessageSquare, Pencil, Trash2, Undo2 } from 'lucide-react';
import { USERS } from '../constants.js';
import { formatDateTime } from '../lib/dateUtils.js';
import { AccentButton, GhostButton, inputCls } from './ui.jsx';

export function TaskCard({ instance, room, rooms, user, onUpdate, onDelete, compact }) {
  const [editing, setEditing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [form, setForm] = useState({
    roomId: instance.roomId, dueDate: instance.dueDate,
  });

  const assignedUser = instance.assignedTo ? USERS[instance.assignedTo] : null;

  function save() {
    onUpdate({ ...instance, ...form });
    setEditing(false);
  }
  function addComment() {
    if (!commentText.trim()) return;
    onUpdate({
      ...instance,
      comments: [...(instance.comments || []), { user: user.name, text: commentText.trim(), ts: new Date().toISOString() }],
    });
    setCommentText('');
  }

  const otherUserName = Object.keys(USERS).find(n => n !== user.name);

  return (
    <div className={`rounded-xl border bg-zinc-900 ${instance.completed ? 'border-zinc-800 opacity-60' : 'border-zinc-800'} px-4 py-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-zinc-50 text-sm">{instance.title}</span>
            {!compact && room && (
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <MapPin size={11} /> {room ? room.name : '–'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
            {compact && room && <span className="flex items-center gap-1"><MapPin size={12} /> {room.name}</span>}
            {assignedUser ? (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: assignedUser.accent }} />
                {assignedUser.name}
              </span>
            ) : (
              <span className="text-zinc-500">Nicht zugewiesen</span>
            )}
          </div>
          {instance.completed && (
            <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
              <Check size={12} /> Erledigt von {instance.completedBy} am {formatDateTime(instance.completedAt)}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {!instance.completed && !instance.assignedTo && (
            <AccentButton small onClick={() => onUpdate({ ...instance, assignedTo: user.name })}>Übernehmen</AccentButton>
          )}
          {!instance.completed && instance.assignedTo === otherUserName && (
            <GhostButton small onClick={() => onUpdate({ ...instance, assignedTo: user.name })}>Zurückholen</GhostButton>
          )}
          {!instance.completed && instance.assignedTo === user.name && (
            <AccentButton small onClick={() => onUpdate({ ...instance, completed: true, completedAt: new Date().toISOString(), completedBy: user.name })}>
              <Check size={13} /> Erledigt
            </AccentButton>
          )}
          {!instance.completed && instance.assignedTo !== otherUserName && (
            <GhostButton small onClick={() => onUpdate({ ...instance, assignedTo: otherUserName })}>
              Delegieren
            </GhostButton>
          )}
          {instance.completed && (
            <GhostButton small onClick={() => onUpdate({ ...instance, completed: false, completedAt: null, completedBy: null })}>
              <Undo2 size={13} /> Rückgängig
            </GhostButton>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-zinc-800">
        <button onClick={() => setEditing(v => !v)} className="text-xs text-zinc-500 hover:text-zinc-200 flex items-center gap-1">
          <Pencil size={11} /> Bearbeiten
        </button>
        <button onClick={() => setShowComments(v => !v)} className="text-xs text-zinc-500 hover:text-zinc-200 flex items-center gap-1">
          <MessageSquare size={11} /> Kommentare {instance.comments?.length ? `(${instance.comments.length})` : ''}
        </button>
        <button onClick={() => onDelete(instance)} className="text-xs text-zinc-600 hover:text-red-400 flex items-center gap-1 ml-auto">
          <Trash2 size={11} />
        </button>
      </div>

      {editing && (
        <div className="mt-3 grid grid-cols-2 gap-2 items-end">
          <select className={inputCls + ' col-span-2'} value={form.roomId}
            onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}>
            <option value="">Kein Raum</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <input type="date" className={inputCls} value={form.dueDate}
            onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          <AccentButton small onClick={save}>Speichern</AccentButton>
        </div>
      )}

      {showComments && (
        <div className="mt-3 space-y-2">
          {(instance.comments || []).map((c, idx) => (
            <div key={idx} className="text-xs bg-zinc-800 rounded-lg px-3 py-2">
              <span className="font-medium" style={{ color: USERS[c.user]?.accent }}>{c.user}:</span>{' '}
              <span className="text-zinc-200">{c.text}</span>
            </div>
          ))}
          <div className="flex gap-2">
            <input className={inputCls} placeholder="Kommentar hinzufügen…" value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addComment(); }} />
            <AccentButton small onClick={addComment}>Senden</AccentButton>
          </div>
        </div>
      )}
    </div>
  );
}
