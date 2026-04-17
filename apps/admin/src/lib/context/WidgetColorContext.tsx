'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface WidgetColors {
  primaryColor: string;
  secondaryColor: string;
}

interface WidgetColorContextValue extends WidgetColors {
  setColors: (primary: string, secondary: string) => void;
  setPrimary: (color: string) => void;
  setSecondary: (color: string) => void;
}

// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULT_PRIMARY = '#1C2541';
const DEFAULT_SECONDARY = '#D2BBFF';
const STORAGE_KEY = 'widget_colors';

function readFromStorage(): WidgetColors {
  if (typeof window === 'undefined') {
    return { primaryColor: DEFAULT_PRIMARY, secondaryColor: DEFAULT_SECONDARY };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as WidgetColors;
  } catch {
    // ignore
  }
  return { primaryColor: DEFAULT_PRIMARY, secondaryColor: DEFAULT_SECONDARY };
}

function writeToStorage(colors: WidgetColors) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  } catch {
    // ignore
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────
const WidgetColorContext = createContext<WidgetColorContextValue>({
  primaryColor: DEFAULT_PRIMARY,
  secondaryColor: DEFAULT_SECONDARY,
  setColors: () => {},
  setPrimary: () => {},
  setSecondary: () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────────
export function WidgetColorProvider({ children }: { children: React.ReactNode }) {
  const [colors, setColorsState] = useState<WidgetColors>({
    primaryColor: DEFAULT_PRIMARY,
    secondaryColor: DEFAULT_SECONDARY,
  });

  // Hydrate from localStorage on mount (client only)
  useEffect(() => {
    setColorsState(readFromStorage());
  }, []);

  const setColors = useCallback((primary: string, secondary: string) => {
    const next = { primaryColor: primary, secondaryColor: secondary };
    setColorsState(next);
    writeToStorage(next);
  }, []);

  const setPrimary = useCallback((color: string) => {
    setColorsState(prev => {
      const next = { ...prev, primaryColor: color };
      writeToStorage(next);
      return next;
    });
  }, []);

  const setSecondary = useCallback((color: string) => {
    setColorsState(prev => {
      const next = { ...prev, secondaryColor: color };
      writeToStorage(next);
      return next;
    });
  }, []);

  return (
    <WidgetColorContext.Provider
      value={{ ...colors, setColors, setPrimary, setSecondary }}
    >
      {children}
    </WidgetColorContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useWidgetColor() {
  return useContext(WidgetColorContext);
}
