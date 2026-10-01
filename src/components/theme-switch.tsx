"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

export function ThemeSwitch({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const isDark = hydrated && resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-label="Dark mode"
      aria-checked={isDark}
      disabled={!hydrated}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn("theme-switch", className)}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <span className="theme-switch-track" aria-hidden="true">
        <Sun size={13} className="theme-switch-track-icon theme-switch-light" />
        <Moon size={13} className="theme-switch-track-icon theme-switch-dark" />
        <span className="theme-switch-thumb">
          <Sun size={13} className="theme-switch-thumb-icon theme-switch-sun" />
          <Moon size={13} className="theme-switch-thumb-icon theme-switch-moon" />
        </span>
      </span>
    </button>
  );
}
