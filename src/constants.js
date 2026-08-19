import {
  Home, Calendar, ListChecks, BarChart3, WashingMachine, ShoppingCart, Settings,
} from 'lucide-react';

export const USERS = {
  Fabian: { name: 'Fabian', accent: '#2563eb', light: '#eff6ff', soft: '#dbeafe', ring: '#bfdbfe' },
  Marie:  { name: 'Marie',  accent: '#db2777', light: '#fdf2f8', soft: '#fce7f3', ring: '#fbcfe8' },
};

// Startbelegung für die Schnellerfassungs-Aktivitäten (Waschstatus-Seite -> Übersicht).
// Nutzer können darüber hinaus eigene Aktivitäten unter Einstellungen anlegen/löschen;
// die tatsächlich aktive Liste liegt dann im 'activityTypes'-KV-Eintrag.
export const DEFAULT_ACTIVITY_TYPES = [
  { id: 'dishwasher_in', label: 'Spülmaschine einräumen' },
  { id: 'dishwasher_out', label: 'Spülmaschine ausräumen' },
  { id: 'cooking', label: 'Kochen' },
];

export const NAV_ITEMS = [
  { id: 'tasks', label: 'Haushalt', icon: ListChecks },
  { id: 'overview', label: 'Planung', icon: Home },
  { id: 'calendar', label: 'Kalender', icon: Calendar },
  { id: 'laundry', label: 'Waschstatus', shortLabel: 'Wäsche', icon: WashingMachine },
  { id: 'shopping', label: 'Einkaufen', icon: ShoppingCart },
  { id: 'reports', label: 'Berichte', icon: BarChart3 },
  { id: 'settings', label: 'Einstellungen', shortLabel: 'Mehr', icon: Settings },
];
