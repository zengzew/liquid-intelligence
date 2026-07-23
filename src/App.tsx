import { useEffect, useState } from "react";
import { LiquidScene } from "./experience/LiquidScene";
import { ScrollRail } from "./components/ScrollRail";
import { ThemeToggle } from "./components/ThemeToggle";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { useScrollProgress } from "./hooks/useScrollProgress";
import type { ThemeMode } from "./types";

function App() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const scrollProgress = useScrollProgress();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const themeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    themeColor?.setAttribute("content", theme === "dark" ? "#030405" : "#f2eee7");
  }, [theme]);

  return (
    <main className="experience" data-theme={theme}>
      <div className="scene-shell" aria-hidden="true">
        <LiquidScene
          theme={theme}
          scrollProgress={scrollProgress}
          reducedMotion={reducedMotion}
        />
      </div>

      <div className="scene-grade" aria-hidden="true" />
      <div className="scene-grain" aria-hidden="true" />

      <ThemeToggle
        theme={theme}
        onToggle={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      />
      <ScrollRail />
    </main>
  );
}

export default App;
