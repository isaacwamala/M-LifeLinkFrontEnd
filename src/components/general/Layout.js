import React, { useState, useEffect } from "react";
import { Nav } from "../nav/Nav";

export function Layout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState(() => {

    // Check for saved theme in localStorage or system preference
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  useEffect(() => {
    // Apply theme class to <html>
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Nav
        isCollapsed={isCollapsed}
        toggleSidebar={toggleSidebar}
        toggleTheme={toggleTheme}
        theme={theme}
      />

      <div
        className={`flex-1 transition-all duration-300 pt-16 min-h-screen overflow-x-hidden ${isCollapsed ? "ml-20 md:ml-24" : "ml-72 md:ml-80"
          }`}
      >
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          {React.isValidElement(children)
            ? React.cloneElement(children, { isCollapsed, theme })
            : children}
        </div>
      </div>

    </div>
  );
}
