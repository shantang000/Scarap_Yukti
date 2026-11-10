import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function getPreferredTheme() {
  try {
    const saved = localStorage.getItem("scarap_theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  if (typeof window !== "undefined" && window.matchMedia) {
    if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
  }
  return "dark";
}

export function applyTheme(theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("scarap_theme", theme);
  } catch {}
}

export function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState(getPreferredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Keep synced if modified across tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "scarap_theme" && (e.newValue === "light" || e.newValue === "dark")) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? (
        <>
          <Sun size={17} className="theme-toggle-icon" />
          <span className="theme-toggle-label">Light</span>
        </>
      ) : (
        <>
          <Moon size={17} className="theme-toggle-icon" />
          <span className="theme-toggle-label">Dark</span>
        </>
      )}
    </button>
  );
}
