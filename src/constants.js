import {
  Home, Calendar, ListChecks, BarChart3, WashingMachine, ShoppingCart, Settings,
} from 'lucide-react';

export const USERS = {
  Fabian: { name: 'Fabian', accent: '#2563eb', light: '#eff6ff', soft: '#dbeafe', ring: '#bfdbfe' },
  Marie:  { name: 'Marie',  accent: '#db2777', light: '#fdf2f8', soft: '#fce7f3', ring: '#fbcfe8' },
};

export const NAV_ITEMS = [
  { id: 'overview', label: 'Übersicht', icon: Home },
  { id: 'tasks', label: 'Aufgaben', icon: ListChecks },
  { id: 'calendar', label: 'Kalender', icon: Calendar },
  { id: 'laundry', label: 'Waschstatus', shortLabel: 'Wäsche', icon: WashingMachine },
  { id: 'shopping', label: 'Einkaufen', icon: ShoppingCart },
  { id: 'reports', label: 'Berichte', icon: BarChart3 },
  { id: 'settings', label: 'Einstellungen', shortLabel: 'Mehr', icon: Settings },
];
