import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/features/theme/ThemeContext";

/**
 * Sun / moon switch (64 × 32 pill). The knob carries the active icon and slides across;
 * the opposite icon stays visible, muted, at the other end of the track.
 * It is a real <button role="switch">, so Enter and Space work and screen readers announce the state.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Mode sombre"
      title={isDark ? "Passer au mode clair" : "Passer au mode sombre"}
      className={`bo-theme-toggle${isDark ? " is-dark" : ""}${className ? ` ${className}` : ""}`}
      onClick={toggleTheme}
    >
      <Sun className="bo-theme-toggle-ghost is-sun" size={16} aria-hidden="true" />
      <Moon className="bo-theme-toggle-ghost is-moon" size={16} aria-hidden="true" />
      <span className="bo-theme-toggle-knob" aria-hidden="true">
        {isDark ? <Moon size={16} strokeWidth={2} /> : <Sun size={16} strokeWidth={2} />}
      </span>
    </button>
  );
}
