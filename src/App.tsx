import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import LiquidExperience from "./experience/LiquidExperience";

export type ExperienceTheme = "night" | "morning";

gsap.registerPlugin(ScrollTrigger);

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
  const progressRef = useRef({ value: 0 });
  const [theme, setTheme] = useState<ExperienceTheme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("liquid-intelligence-theme", theme);
  }, [theme]);

  useLayoutEffect(() => {
    const runway = runwayRef.current;

    if (!runway) {
      return;
    }

    const context = gsap.context(() => {
      gsap.set(progressRef.current, { value: 0 });

      gsap.to(progressRef.current, {
        value: 1,
        ease: "none",
        scrollTrigger: {
          trigger: runway,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.65,
          invalidateOnRefresh: true,
          onUpdate: ({ progress }) => {
            runway.style.setProperty("--journey-progress", progress.toString());
          },
        },
      });
    }, runway);

    return () => context.revert();
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
          <div className="wordmark" aria-label="Liquid Intelligence">
            <span>LIQUID</span>
            <span>INTELLIGENCE</span>
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
