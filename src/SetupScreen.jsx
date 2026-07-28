import React, { useState } from 'react';
import { Home, Loader2 } from 'lucide-react';
import { buildClient } from './supabase.js';

export default function SetupScreen({ onSave }) {
  const [project, setProject] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);

  async function submit() {
    if (!project.trim() || !anonKey.trim()) {
      setError('Bitte Projektname und Anon Key eingeben.');
      return;
    }
    setError('');
    setTesting(true);
    try {
      const client = buildClient({ project: project.trim(), anonKey: anonKey.trim() });
      const { error: dbError } = await client.from('zuhause_kv_store').select('key').limit(1);

      if (dbError) {
        const msg = (dbError.message || '').toLowerCase();
        if (msg.includes('does not exist') || dbError.code === '42P01') {
          setError('Verbindung zum Projekt klappt, aber die Tabelle "zuhause_kv_store" fehlt. Wurde supabase.sql im SQL-Editor ausgeführt?');
        } else if (msg.includes('jwt') || dbError.code === 'PGRST301' || dbError.status === 401) {
          setError('Verbindung abgelehnt: Anon Key prüfen (Project Settings → API → "anon public").');
        } else {
          setError('Verbindung fehlgeschlagen: ' + dbError.message);
        }
        setTesting(false);
        return;
      }

      // Verbindung + Tabelle vorhanden -> Zugangsdaten übernehmen
      onSave(project.trim(), anonKey.trim());
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
        setError('Projekt nicht erreichbar. Bitte Projektname prüfen (nur der Teil vor ".supabase.co", ohne https:// und ohne Schrägstrich).');
      } else {
        setError('Verbindung fehlgeschlagen: ' + msg);
      }
      setTesting(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center">
            <Home size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-50">Einrichtung</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Einmalig mit deinem Supabase-Projekt verbinden.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Supabase Projektname
          </label>
          <input
            className="w-full border border-zinc-700 bg-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-offset-0"
            placeholder="z. B. abcdefghijklmno"
            value={project}
            onChange={e => setProject(e.target.value)}
          />
          <p className="text-xs text-zinc-600 mt-1">
            Das ist der Teil der Projekt-URL vor ".supabase.co" (Project Settings → API).
            Eine komplette URL funktioniert auch, wird automatisch bereinigt.
          </p>
        </div>

        <div className="mb-2">
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Anon Key
          </label>
          <textarea
            className="w-full border border-zinc-700 bg-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-offset-0"
            rows={3}
            placeholder="eyJhbGciOi..."
            value={anonKey}
            onChange={e => setAnonKey(e.target.value)}
          />
          <p className="text-xs text-zinc-600 mt-1">
            Project Settings → API → "anon public" Key.
          </p>
        </div>

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        <button
          onClick={submit}
          disabled={testing}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-medium py-2.5 mt-2 disabled:opacity-60"
        >
          {testing && <Loader2 size={15} className="animate-spin" />}
          {testing ? 'Verbindung wird geprüft…' : 'Verbinden'}
        </button>

        <p className="text-xs text-zinc-600 mt-4 text-center">
          Wird nur auf diesem Gerät im Browser gespeichert. Auf einem anderen Gerät
          einmalig erneut eingeben.
        </p>
      </div>
    </div>
  );
}
