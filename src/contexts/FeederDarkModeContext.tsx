import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ─── PALETTES ───────────────────────────────────────────────────────────────
const LIGHT = {
  orange:  "#E8622A",
  text:    "#111111",
  muted:   "#777777",
  muted2:  "#999999",
  border:  "#EEEEEE",
  track:   "#EEF1F6",
  bg:      "#FFFFFF",
  bgMuted: "#F8F9FA",
  card:    "#FFFFFF",
  surface: "#FFFFFF",
  green:   "#2E7D32",
  greenBg: "#E6F4EA",
  red:     "#C62828",
  redBg:   "#FEF2F2",
  blue:    "#3A7BD5",
  blueBg:  "#EEF4FF",
  white:   "#FFFFFF",
  textLight: "#666666",
  textPrimary: "#1A1A1A",
  textSecondary: "#999999",
  textTertiary: "#9CA3AF",
  inputBg: "#FFFFFF",
  arrowGray: "#C5C5C5",
} as const;

const DARK = {
  orange:  "#E8622A",
  text:    "#F1F1F1",
  muted:   "#A0A0A0",
  muted2:  "#888888",
  border:  "#2E2E2E",
  track:   "#2E2E2E",
  bg:      "#121212",
  bgMuted: "#1E1E1E",
  card:    "#1A1A1A",
  surface: "#1E1E1E",
  green:   "#4CAF50",
  greenBg: "#1B3A1F",
  red:     "#EF5350",
  redBg:   "#3A1A1A",
  blue:    "#5C9CE6",
  blueBg:  "#1A2A3A",
  white:   "#F1F1F1",
  textLight: "#A0A0A0",
  textPrimary: "#F1F1F1",
  textSecondary: "#A0A0A0",
  textTertiary: "#777777",
  inputBg: "#1E1E1E",
  arrowGray: "#555555",
} as const;

export type FeederColors = {
  [K in keyof typeof LIGHT]: string;
};

interface FeederDarkModeContextType {
  isDark: boolean;
  colors: FeederColors;
  toggleDarkMode: () => void;
}

const FeederDarkModeContext = createContext<FeederDarkModeContextType>({
  isDark: false,
  colors: LIGHT,
  toggleDarkMode: () => {},
});

export const FeederDarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem('feeder-dark-mode') === 'true';
    } catch {
      return false;
    }
  });

  // Sync from user metadata on mount
  useEffect(() => {
    const syncFromMetadata = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.app_settings?.darkMode != null) {
          const dbDark = user.user_metadata.app_settings.darkMode;
          setIsDark(dbDark);
          localStorage.setItem('feeder-dark-mode', String(dbDark));
        }
      } catch {
        // ignore
      }
    };
    syncFromMetadata();
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('feeder-dark-mode', String(next));
      return next;
    });
  }, []);

  const colors = isDark ? DARK : LIGHT;

  return (
    <FeederDarkModeContext.Provider value={{ isDark, colors, toggleDarkMode }}>
      {children}
    </FeederDarkModeContext.Provider>
  );
};

export const useFeederDarkMode = () => useContext(FeederDarkModeContext);
