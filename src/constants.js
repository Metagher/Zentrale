import {
  BarChart3, CircleCheckBig, Calendar, ListChecks, ShoppingCart, Settings, UsersRound,
} from 'lucide-react';

export const USERS = {
  Fabian: { name: 'Fabian', accent: '#2563eb', light: '#eff6ff', soft: '#dbeafe', ring: '#bfdbfe' },
  Marie:  { name: 'Marie',  accent: '#db2777', light: '#fdf2f8', soft: '#fce7f3', ring: '#fbcfe8' },
};

export const NAV_ITEMS = [
  { id: 'tasks', label: 'Haushalt', icon: ListChecks },
  { id: 'oneTime', label: 'Einmalig', icon: CircleCheckBig },
  { id: 'calendar', label: 'Kalender', icon: Calendar },
  { id: 'people', label: 'Personen', icon: UsersRound },
  { id: 'reports', label: 'Bericht', icon: BarChart3 },
  { id: 'shopping', label: 'Einkaufen', icon: ShoppingCart },
  { id: 'settings', label: 'Einstellungen', shortLabel: 'Mehr', icon: Settings },
];
