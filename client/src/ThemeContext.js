import React, { createContext, useContext, useState, useEffect } from 'react';

// All available themes — order matters for the picker UI
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
    id: 'snow',
    name: 'Snow Light',
    emoji: '☀️',
    navbar: '#770307',
    bg: '#f3f4f6',
    card: '#ffffff',
    accent: '#3b82f6',
    text: '#1f2937',
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    emoji: '🌊',
    navbar: '#0c2d48',
    bg: '#0a1628',
    card: '#112240',
    accent: '#64ffda',
    text: '#ccd6f6',
  },
  {
    id: 'forest',
    name: 'Forest Green',
    emoji: '🌿',
    navbar: '#1b4332',
    bg: '#0d1f17',
    card: '#132a1e',
    accent: '#52b788',
    text: '#d4e7d9',
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    emoji: '👑',
    navbar: '#2d1854',
    bg: '#120b24',
    card: '#1c1035',
    accent: '#a78bfa',
    text: '#ddd6fe',
  },
  {
    id: 'sunset',
    name: 'Sunset Warm',
    emoji: '🌅',
    navbar: '#78350f',
    bg: '#1a0f05',
    card: '#27180c',
    accent: '#fb923c',
    text: '#fde8d0',
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
    // Remove all theme classes
    document.body.classList.forEach((cls) => {
      if (cls.startsWith('theme-') || cls === 'light-theme') {
        document.body.classList.remove(cls);
      }
    });

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
