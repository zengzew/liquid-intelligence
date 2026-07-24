import { useEffect, useLayoutEffect, useRef, useState } from "react";
import LiquidExperience from "./experience/LiquidExperience";
import type { JourneyProgress } from "./experience/LiquidExperience";

export type ExperienceTheme = "night" | "morning";

function getInitialTheme(): ExperienceTheme {
  if (typeof window === "undefined") {
    return "night";
  }

  const storedTheme = window.localStorage.getItem("liquid-intelligence-theme");

  if (storedTheme === "night" || storedTheme === "morning") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "morning"
    : "night";
}

export default function App() {
  const runwayRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<JourneyProgress>({
    target: 0,
    current: 0,
    velocity: 0,
  });
  const [theme, setTheme] = useState<ExperienceTheme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("liquid-intelligence-theme", theme);
  }, [theme]);

  useEffect(() => {
    let runtimeErrorCount = 0;

    const recordRuntimeError = (event: ErrorEvent | PromiseRejectionEvent) => {
      runtimeErrorCount += 1;
      document.documentElement.dataset.runtimeErrors = String(
        runtimeErrorCount,
      );
      document.documentElement.dataset.lastRuntimeError =
        event instanceof ErrorEvent
          ? event.message
          : String(event.reason ?? "Unhandled promise rejection");
    };

    document.documentElement.dataset.runtimeErrors = "0";
    delete document.documentElement.dataset.lastRuntimeError;
    window.addEventListener("error", recordRuntimeError);
    window.addEventListener("unhandledrejection", recordRuntimeError);

    return () => {
      window.removeEventListener("error", recordRuntimeError);
      window.removeEventListener("unhandledrejection", recordRuntimeError);
    };
  }, []);

  useLayoutEffect(() => {
    const runway = runwayRef.current;

    if (!runway) {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let frameId = 0;
    let previousTime = performance.now();

    const updateTarget = () => {
      const scrollRange = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      progressRef.current.target = Math.min(
        1,
        Math.max(0, window.scrollY / scrollRange),
      );
    };

    const renderProgress = (time: number) => {
      const delta = Math.min(0.05, Math.max(0.001, (time - previousTime) / 1000));
      const previousProgress = progressRef.current.current;
      const targetProgress = progressRef.current.target;
      const response = reducedMotion ? 1 : 1 - Math.exp(-delta * 9.5);

      progressRef.current.current +=
        (targetProgress - progressRef.current.current) * response;

      if (
        Math.abs(targetProgress - progressRef.current.current) <
        (reducedMotion ? 0.001 : 0.00005)
      ) {
        progressRef.current.current = targetProgress;
      }

      progressRef.current.velocity =
        (progressRef.current.current - previousProgress) / delta;
      previousTime = time;

      const progress = progressRef.current.current;
      runway.style.setProperty("--journey-progress", progress.toFixed(5));
      runway.dataset.progress = progress.toFixed(3);

      frameId = window.requestAnimationFrame(renderProgress);
    };

    updateTarget();
    frameId = window.requestAnimationFrame(renderProgress);
    window.addEventListener("scroll", updateTarget, { passive: true });
    window.addEventListener("resize", updateTarget);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", updateTarget);
      window.removeEventListener("resize", updateTarget);
    };
  }, []);

  const nextTheme: ExperienceTheme =
    theme === "night" ? "morning" : "night";

  return (
    <main className="experience" data-theme={theme}>
      <div className="canvas-shell" aria-hidden="true">
        <LiquidExperience theme={theme} progressRef={progressRef} />
      </div>

      <div ref={runwayRef} className="scroll-runway">
        <header className="interface-header">
          <div className="wordmark" aria-label="Zane">
            ZANE
          </div>

          <button
            className="theme-toggle"
            type="button"
            aria-label={`Switch to ${nextTheme} mode`}
            onClick={() => setTheme(nextTheme)}
          >
            <span className="theme-toggle__label">
              {theme === "night" ? "Night" : "Morning"}
            </span>
            <span className="theme-toggle__orb" aria-hidden="true">
              <span />
            </span>
          </button>
        </header>

        <section className="hero-identity" aria-labelledby="hero-title">
          <h1 id="hero-title">ZANE</h1>
          <p className="hero-identity__role">Software Engineer</p>
          <p className="hero-identity__statement">
            Building with AI, code and creativity.
          </p>
        </section>

        <aside className="journey-index" aria-hidden="true">
          <span>00</span>
          <span className="journey-index__track">
            <span className="journey-index__progress" />
            <span className="journey-index__point journey-index__point--start" />
            <span className="journey-index__point journey-index__point--end" />
          </span>
          <span>01</span>
        </aside>

        <div className="scroll-cue" aria-hidden="true">
          <span>Scroll</span>
          <span className="scroll-cue__line" />
        </div>
      </div>
    </main>
  );
}
