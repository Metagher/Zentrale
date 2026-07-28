import { Home } from 'lucide-react';
import { USERS } from '../constants.js';

export function Login({ onLogin, onReset }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center">
            <Home size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-50">Zuhause</h1>
          <p className="text-sm text-zinc-400 mt-1">Wer nutzt die App gerade?</p>
        </div>
        <div className="space-y-3">
          {Object.values(USERS).map(u => (
            <button
              key={u.name}
              onClick={() => onLogin(u.name)}
              className="w-full flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 hover:shadow-md transition text-left"
            >
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                style={{ backgroundColor: u.accent }}>
                {u.name[0]}
              </div>
              <div>
                <div className="font-medium text-zinc-50">{u.name}</div>
                <div className="text-xs text-zinc-500">Anmelden</div>
              </div>
            </button>
          ))}
        </div>
        {onReset && (
          <button onClick={onReset} className="w-full text-center text-xs text-zinc-600 hover:text-zinc-400 mt-6">
            Supabase-Zugangsdaten ändern
          </button>
        )}
      </div>
    </div>
  );
}
