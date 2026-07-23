import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChapterRail } from "./components/ChapterRail";
import { JourneyTypography } from "./components/JourneyTypography";
import { ThemeToggle } from "./components/ThemeToggle";
import { LiquidScene } from "./experience/LiquidScene";
import { useReducedMotion } from "./hooks/useReducedMotion";
import { chapterAt } from "./journey/chapters";
import { useJourneyController } from "./journey/useJourneyController";
import type { ThemeMode } from "./types";

function App() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const experienceRef = useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion();
  const controller = useJourneyController(experienceRef, { reducedMotion });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const themeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    themeColor?.setAttribute("content", theme === "dark" ? "#050607" : "#f2f0ea");
  }, [theme]);

  useLayoutEffect(() => {
    const syncExperience = (progress: number) => {
      const experience = experienceRef.current;
      if (!experience) {
        return;
      }

      const chapter = chapterAt(progress);
      experience.style.setProperty("--journey-progress", progress.toFixed(4));
      experience.dataset.journeyProgress = progress.toFixed(4);
      experience.dataset.chapter = chapter.slug;
    };

    syncExperience(controller.progressRef.current);
    return controller.subscribe(syncExperience);
  }, [controller]);

  return (
    <main
      className="experience"
      data-theme={theme}
      data-chapter="origin"
      data-journey-progress="0.0000"
      ref={experienceRef}
      aria-label="Liquid Intelligence chapter journey"
    >
      <div className="experience__background" aria-hidden="true" />

      <p className="wordmark" aria-label="Liquid Intelligence">
        LIQUID <span>INTELLIGENCE</span>
      </p>

      <JourneyTypography controller={controller} layer="back" />

      <div className="scene-shell" aria-hidden="true">
        <LiquidScene
          controller={controller}
          theme={theme}
          reducedMotion={reducedMotion}
        />
      </div>

      <div className="scene-grade" aria-hidden="true" />
      <div className="scene-grain" aria-hidden="true" />

      <JourneyTypography controller={controller} layer="front" />

      <div className="journey-instruction" aria-hidden="true">
        <span>SCROLL</span>
        <svg viewBox="0 0 12 20">
          <path d="M6 1v16M2 13l4 4 4-4" />
        </svg>
      </div>

      <ThemeToggle
        theme={theme}
        onToggle={() =>
          setTheme((current) => (current === "dark" ? "light" : "dark"))
        }
      />
      <ChapterRail controller={controller} />
    </main>
  );
}

export default App;
