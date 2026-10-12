import React, { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
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
  const location = useLocation();

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

  // Dark mode is a school_user feature: the `.dark` class only applies
  // inside /dashboard so landing, browse, and admin stay light.
  useEffect(() => {
    const dark =
      theme === "dark" && location.pathname.startsWith("/dashboard");
    document.documentElement.classList.toggle("dark", dark);
  }, [theme, location.pathname]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
