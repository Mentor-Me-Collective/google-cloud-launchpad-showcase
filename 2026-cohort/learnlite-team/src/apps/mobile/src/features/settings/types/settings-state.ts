export type Density = 'compact' | 'cozy' | 'spacious';
export type ThemeChoice = 'light' | 'dark' | 'system';
export type Locale = 'es' | 'en';

export interface SettingsState {
  density: Density;
  theme: ThemeChoice;
  locale: Locale;
  setDensity: (density: Density) => void;
  setTheme: (theme: ThemeChoice) => void;
  setLocale: (locale: Locale) => void;
}
