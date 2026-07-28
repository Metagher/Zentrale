# Zuhause – Haushalts-App

Eigenständige Version der Haushalts-App (React + Vite), mit Supabase als
gemeinsamem Datenspeicher für Fabian und Marie. Auslieferung als statische
Seite über GitHub Pages.

## 1. Supabase-Projekt anlegen

1. Auf https://supabase.com ein kostenloses Projekt anlegen.
2. Im SQL-Editor des Projekts den Inhalt von `supabase.sql` einmalig ausführen.
3. Unter **Project Settings → API** zwei Werte notieren:
   - **Project URL**, z. B. `https://abcdefghijklmno.supabase.co` – der Teil
     vor `.supabase.co` ist der "Projektname", den die App gleich abfragt.
   - **anon public** Key (langer Text, beginnt mit `eyJ...`).

Hinweis zur Sicherheit: Diese App hat keine eigene Benutzer-Anmeldung, nur die
Profilauswahl Fabian/Marie im Client. Der anon key erlaubt vollen Zugriff auf
die Tabelle `zuhause_kv_store`. Das reicht für eine private Haushalts-App, ist aber
nicht durch echte Authentifizierung geschützt – wer URL und Key kennt, kommt
an die Daten.

## 2. Lokal ausprobieren (optional)

```bash
npm install
npm run dev
```

Beim ersten Start fragt die App nach Projektname und Anon Key (siehe oben).
Die Angaben werden nur lokal im Browser gespeichert (`localStorage`), nicht im
Code. Auf einem anderen Gerät oder Browser einmalig erneut eingeben.

## 3. Auf GitHub veröffentlichen

1. Neues GitHub-Repository anlegen und dieses Projekt hineinpushen:

   ```bash
   git init
   git add .
   git commit -m "Erste Version"
   git branch -M main
   git remote add origin https://github.com/<dein-nutzername>/<dein-repo>.git
   git push -u origin main
   ```

2. Im Repository unter **Settings → Pages** bei "Source" **GitHub Actions**
   auswählen (nicht "Deploy from a branch").
3. Der mitgelieferte Workflow (`.github/workflows/deploy.yml`) baut die App bei
   jedem Push auf `main` automatisch und veröffentlicht sie. Nach dem ersten
   Durchlauf (Reiter **Actions** im Repo) ist die Seite unter
   `https://<dein-nutzername>.github.io/<dein-repo>/` erreichbar.

## 4. Erste Nutzung

Beim ersten Aufruf der veröffentlichten Seite erscheint der
Einrichtungsbildschirm für Projektname und Anon Key. Danach wie gewohnt
Fabian oder Marie auswählen.

Zugangsdaten ändern: Auf dem Login-Bildschirm ganz unten auf
"Supabase-Zugangsdaten ändern" tippen.
