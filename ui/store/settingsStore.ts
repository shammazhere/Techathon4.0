import { create } from 'zustand';

interface SettingsState {
  mapStyle: string;
  setMapStyle: (style: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  mapStyle: "Dark Tactical",
  setMapStyle: (style) => set({ mapStyle: style }),
}));
