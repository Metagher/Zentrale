-- Haushalt-App: Supabase-Schema
-- Im SQL-Editor des Supabase-Projekts einmalig ausführen.

create table if not exists zuhause_kv_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table zuhause_kv_store enable row level security;

-- Diese App hat keine eigene Benutzer-Anmeldung (nur Profilauswahl Fabian/Marie
-- im Client). Der anon key erlaubt daher vollen Lese-/Schreibzugriff auf diese
-- eine Tabelle. Das ist für eine private Haushalts-App ausreichend, aber
-- ausdrücklich nicht durch eine echte Authentifizierung abgesichert: Jeder,
-- der Projekt-URL und anon key kennt, kann Daten lesen und ändern.

create policy "anon select" on zuhause_kv_store
  for select using (true);

create policy "anon insert" on zuhause_kv_store
  for insert with check (true);

create policy "anon update" on zuhause_kv_store
  for update using (true) with check (true);

create policy "anon delete" on zuhause_kv_store
  for delete using (true);
