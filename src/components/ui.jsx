import { X } from 'lucide-react';

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-6"
      onClick={onClose}>
      <div
        className={`bg-zinc-900 w-full ${wide ? 'md:max-w-2xl' : 'md:max-w-md'} overflow-y-auto rounded-t-2xl md:rounded-2xl shadow-xl`}
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-900">
          <h2 className="text-base font-semibold text-zinc-50">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export const inputCls = "w-full border border-zinc-700 bg-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-offset-0";

export function AccentButton({ children, onClick, type = 'button', full, small, disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium text-white transition disabled:opacity-40 ${full ? 'w-full' : ''} ${small ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'}`}
      style={{ backgroundColor: 'var(--accent)' }}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, small, danger }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium border transition ${small ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'} ${danger ? 'border-red-900 text-red-400 hover:bg-red-950' : 'border-zinc-800 text-zinc-200 hover:bg-zinc-800'}`}
    >
      {children}
    </button>
  );
}

export function EmptyState({ text, action }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 py-10 text-center">
      <p className="text-sm text-zinc-500">{text}</p>
      {action && (
        <button onClick={action.onClick} className="mt-3 text-xs font-medium" style={{ color: 'var(--accent)' }}>
          {action.label}
        </button>
      )}
    </div>
  );
}

export function ToggleSwitch({ checked, onChange, label }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex items-center gap-2">
      <span className="relative inline-block w-9 h-5 rounded-full transition"
        style={{ backgroundColor: checked ? 'var(--accent)' : '#3f3f46' }}>
        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
          style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }} />
      </span>
      <span className="text-xs text-zinc-400">{label}</span>
    </button>
  );
}
