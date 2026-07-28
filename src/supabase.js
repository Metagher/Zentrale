import { createClient } from '@supabase/supabase-js';

const PROJECT_KEY = 'hh_supabase_project';
const ANON_KEY_KEY = 'hh_supabase_anon_key';

// Erlaubt, dass die Person entweder nur die Projekt-ID (z. B. "abcdefgh"),
// die volle Domain ("abcdefgh.supabase.co") oder die komplette URL
// ("https://abcdefgh.supabase.co/") einträgt - alles wird auf die reine
// Projekt-ID normalisiert.
function normalizeProjectRef(input) {
  let v = (input || '').trim();
  v = v.replace(/^https?:\/\//i, '');
  v = v.replace(/\/+$/, '');
  v = v.replace(/\.supabase\.co$/i, '');
  return v;
}

export function getStoredConfig() {
  try {
    const project = localStorage.getItem(PROJECT_KEY);
    const anonKey = localStorage.getItem(ANON_KEY_KEY);
    if (project && anonKey) return { project: normalizeProjectRef(project), anonKey };
  } catch (e) {
    // localStorage nicht verfügbar (z. B. privates Fenster ohne Speicherzugriff)
  }
  return null;
}

export function saveConfig(project, anonKey) {
  const cleanProject = normalizeProjectRef(project);
  localStorage.setItem(PROJECT_KEY, cleanProject);
  localStorage.setItem(ANON_KEY_KEY, anonKey.trim());
}

export function clearConfig() {
  localStorage.removeItem(PROJECT_KEY);
  localStorage.removeItem(ANON_KEY_KEY);
}

export function buildClient(config) {
  const url = `https://${normalizeProjectRef(config.project)}.supabase.co`;
  return createClient(url, config.anonKey);
}
