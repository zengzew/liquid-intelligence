import type { ThemeMode } from "../types";

type ThemeToggleProps = {
  theme: ThemeMode;
  onToggle: () => void;
};

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      data-journey-control
      data-testid="theme-toggle"
    >
      <svg
        className="theme-toggle__icon"
        aria-hidden="true"
        viewBox="0 0 24 24"
      >
        <circle className="theme-toggle__sun-core" cx="12" cy="12" r="3.15" />
        <path
          className="theme-toggle__sun-rays"
          d="M12 2.35v2.1M12 19.55v2.1M2.35 12h2.1M19.55 12h2.1M5.18 5.18l1.49 1.49M17.33 17.33l1.49 1.49M18.82 5.18l-1.49 1.49M6.67 17.33l-1.49 1.49"
        />
        <path
          className="theme-toggle__moon"
          d="M15.82 16.84a7.05 7.05 0 0 1-8.66-8.66 7.08 7.08 0 1 0 8.66 8.66Z"
        />
      </svg>
    </button>
  );
}
