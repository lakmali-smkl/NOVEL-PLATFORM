import React, { createContext, useContext, useState, useEffect } from 'react';

// All available themes — order matters for the picker UI
// Content is always light/professional — only the navbar color and
// accent (buttons/links/highlights) differ between themes.
export const THEMES = [
  {
    id: 'midnight',
    name: 'Midnight Dark',
    emoji: '🌙',
    navbar: '#770307',
    bg: '#f3f4f6',
    card: '#ffffff',
    accent: '#2563eb',
    text: '#1f2937',
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
      if (oldTheme === 'light') return 'snow';
      return 'midnight';
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
