import React, { useCallback, useEffect, useState } from "react";
import { ThemeContext, type Theme } from "@/context/theme-context";

const LOCAL_STORAGE_THEME_KEY = "foundit_theme";

function getStoredTheme(): Theme {
  try {
    return localStorage.getItem(LOCAL_STORAGE_THEME_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(LOCAL_STORAGE_THEME_KEY, next);
      } catch {
        // Storage unavailable (private mode) — theme still applies.
      }
      return next;
    });
  }, []);

  // Apply `.dark` across all routes (landing, browse, dashboard, admin).
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
