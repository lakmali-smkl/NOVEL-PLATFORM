import React, { createContext, useContext, useState, useEffect } from 'react';

// All available themes — order matters for the picker UI
// Midnight Dark is a genuine dark theme; the rest are light/professional
// and only change navbar color + accent (buttons/links/highlights).
export const THEMES = [
  {
    id: 'midnight',
    name: 'Midnight Dark',
    emoji: '🌙',
    navbar: '#770307',
    bg: '#080a0f',
    card: '#111318',
    accent: '#3b82f6',
    text: '#e2e8f0',
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    emoji: '🌑',
    navbar: '#111827',
    bg: '#0b0f19',
    card: '#161b26',
    accent: '#38bdf8',
    text: '#e5e7eb',
  },
  {
    id: 'snow',
    name: 'Snow Light',
    emoji: '☀️',
    navbar: '#770307',
    bg: '#f3f4f6',
    card: '#ffffff',
    accent: '#2563eb',
    text: '#1f2937',
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    emoji: '🌊',
    navbar: '#0c2d48',
    bg: '#f3f4f6',
    card: '#ffffff',
    accent: '#0e7490',
    text: '#1f2937',
  },
  {
    id: 'forest',
    name: 'Forest Green',
    emoji: '🌿',
    navbar: '#1b4332',
    bg: '#f3f4f6',
    card: '#ffffff',
    accent: '#15803d',
    text: '#1f2937',
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    emoji: '👑',
    navbar: '#2d1854',
    bg: '#f3f4f6',
    card: '#ffffff',
    accent: '#7c3aed',
    text: '#1f2937',
  },
  {
    id: 'sunset',
    name: 'Sunset Warm',
    emoji: '🌅',
    navbar: '#78350f',
    bg: '#f3f4f6',
    card: '#ffffff',
    accent: '#c2410c',
    text: '#1f2937',
  },
];

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('app-theme');
    // Migrate old theme format
    if (!saved) {
      const oldTheme = localStorage.getItem('theme');
      if (oldTheme === 'dark') return 'midnight';
      // New visitors (and anyone previously on 'light') default to the
      // light theme, not dark — Midnight Dark is now an explicit opt-in.
      return 'snow';
    }
    return saved;
  });

  const setTheme = (themeId) => {
    setThemeState(themeId);
    localStorage.setItem('app-theme', themeId);
    // Also keep old key in sync for backward compatibility
    localStorage.setItem('theme', themeId === 'snow' ? 'light' : 'dark');
  };

  // Apply theme class to body whenever theme changes
  useEffect(() => {
    // Remove all theme classes — collect first, since classList is a live
    // list and removing while iterating it directly can skip entries.
    const classesToRemove = Array.from(document.body.classList).filter(
      (cls) => cls.startsWith('theme-') || cls === 'light-theme'
    );
    classesToRemove.forEach((cls) => document.body.classList.remove(cls));

    // Add new theme class
    document.body.classList.add(`theme-${theme}`);

    // Keep backward compatibility with light-theme class
    if (theme === 'snow') {
      document.body.classList.add('light-theme');
    }
  }, [theme]);

  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currentTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
