import React, { createContext, useContext, useState, useEffect } from "react";

export type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("mobasher_theme");
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    // Default to light mode as requested by user for crisp white background
    return "light";
  });

  useEffect(() => {
    localStorage.setItem("mobasher_theme", theme);
    const root = document.documentElement;
    const body = document.body;

    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      body.classList.add("dark-theme");
      body.classList.remove("light-theme");
      body.style.backgroundColor = "#0a0a0a";
      body.style.color = "#ffffff";
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      body.classList.remove("dark-theme");
      body.classList.add("light-theme");
      body.style.backgroundColor = "#f8fafc";
      body.style.color = "#0f172a";
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
