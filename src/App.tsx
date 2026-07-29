import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import LiquidExperience from "./experience/LiquidExperience";
import type { JourneyProgress } from "./experience/LiquidExperience";
import JourneyNarrative from "./journey/JourneyNarrative";
import {
  JOURNEY_CHAPTERS,
  getActiveJourneyChapter,
  getJourneyChapterTextPresence,
  type JourneyChapter,
} from "./journey/chapters";
import MaterialDebugPanel from "./MaterialDebugPanel";
import {
  isWaterMaterialVariant,
  type WaterMaterialVariant,
} from "./water/materialVariants";

export type ExperienceTheme = "night" | "morning";

function getInitialTheme(): ExperienceTheme {
  if (typeof window === "undefined") {
    return "night";
  }

  const queryTheme = new URLSearchParams(window.location.search).get("theme");

  if (queryTheme === "night" || queryTheme === "morning") {
    return queryTheme;
  }

  const storedTheme = window.localStorage.getItem("liquid-intelligence-theme");

  if (storedTheme === "night" || storedTheme === "morning") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "morning"
    : "night";
}

function getInitialMaterial(): WaterMaterialVariant {
  if (typeof window === "undefined") {
    return "physical";
  }

  const material = new URLSearchParams(window.location.search).get("material");
  return isWaterMaterialVariant(material) ? material : "physical";
}

function getInitialProgress() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = Number.parseFloat(
    new URLSearchParams(window.location.search).get("progress") ?? "",
  );

  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}

function getInitialTypographyState() {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("typography") === "hidden" || params.get("capture") === "1";
}

function getInitialDebugState() {
  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("debug") === "water";
}

export default function App() {
  const [initialProgress] = useState(getInitialProgress);
  const runwayRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<JourneyProgress>({
    target: initialProgress ?? 0,
    current: initialProgress ?? 0,
    velocity: 0,
  });
  const progressOverrideRef = useRef<number | null>(initialProgress);
  const explicitMaterialRef = useRef(
    typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("material"),
  );
  const [theme, setTheme] = useState<ExperienceTheme>(getInitialTheme);
  const [material, setMaterial] =
    useState<WaterMaterialVariant>(getInitialMaterial);
  const [progressOverride, setProgressOverride] =
    useState<number | null>(initialProgress);
  const [typographyHidden, setTypographyHidden] = useState(
    getInitialTypographyState,
  );
  const [debugWater] = useState(getInitialDebugState);
  const [activeChapterId, setActiveChapterId] = useState(
    () => getActiveJourneyChapter(initialProgress ?? 0).id,
  );
  const activeChapterRef = useRef(activeChapterId);
  const captureMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("capture") === "1";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.material = material;
    document.documentElement.dataset.waterDebug = String(debugWater);
    window.localStorage.setItem("liquid-intelligence-theme", theme);

    const url = new URL(window.location.href);

    if (explicitMaterialRef.current || material !== "physical") {
      url.searchParams.set("material", material);
    } else {
      url.searchParams.delete("material");
    }

    url.searchParams.set("theme", theme);

    if (progressOverride === null) {
      url.searchParams.delete("progress");
    } else {
      url.searchParams.set("progress", progressOverride.toFixed(2));
    }

    if (typographyHidden) {
      url.searchParams.set("typography", "hidden");
    } else {
      url.searchParams.delete("typography");
    }

    window.history.replaceState({}, "", url);
  }, [debugWater, material, progressOverride, theme, typographyHidden]);

  useEffect(() => {
    document.documentElement.dataset.chapter = activeChapterId;
  }, [activeChapterId]);

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
      if (progressOverrideRef.current !== null) {
        progressRef.current.target = progressOverrideRef.current;
        return;
      }

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
      const response =
        reducedMotion || progressOverrideRef.current !== null
          ? 1
          : 1 - Math.exp(-delta * 9.5);

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

      for (const chapter of JOURNEY_CHAPTERS) {
        const presence = getJourneyChapterTextPresence(progress, chapter);
        runway.style.setProperty(
          `--chapter-${chapter.id}-presence`,
          presence.toFixed(5),
        );
      }

      const activeChapter = getActiveJourneyChapter(progress);

      if (activeChapter.id !== activeChapterRef.current) {
        activeChapterRef.current = activeChapter.id;
        setActiveChapterId(activeChapter.id);
      }

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

  const selectProgress = (progress: number) => {
    progressOverrideRef.current = progress;
    progressRef.current.target = progress;
    progressRef.current.current = progress;
    progressRef.current.velocity = 0;
    setProgressOverride(progress);
  };

  const selectMaterial = (nextMaterial: WaterMaterialVariant) => {
    explicitMaterialRef.current = true;
    setMaterial(nextMaterial);
  };

  const restoreTypography = () => setTypographyHidden(false);

  const navigateToChapter = useCallback((chapter: JourneyChapter) => {
    progressOverrideRef.current = null;
    progressRef.current.target = chapter.focus;
    setProgressOverride(null);

    const scrollRange = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    window.scrollTo({
      top: chapter.focus * scrollRange,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, []);

  return (
    <main
      className="experience"
      data-theme={theme}
      data-material={material}
      data-typography-hidden={typographyHidden}
      data-capture={captureMode}
      data-water-debug={debugWater}
    >
      <div className="canvas-shell" aria-hidden="true">
        <LiquidExperience
          material={material}
          showJourneyWorlds={!debugWater}
          theme={theme}
          progressRef={progressRef}
        />
      </div>

      <div
        ref={runwayRef}
        className="scroll-runway"
        data-chapter={activeChapterId}
      >
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

        <JourneyNarrative
          activeChapterId={activeChapterId}
          onNavigate={navigateToChapter}
        />

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          Now entering{" "}
          {
            JOURNEY_CHAPTERS.find(
              (chapter) => chapter.id === activeChapterId,
            )?.label
          }
          .
        </p>

        <div className="scroll-cue" aria-hidden="true">
          <span>Scroll</span>
          <span className="scroll-cue__line" />
        </div>
      </div>

      {debugWater ? (
        <MaterialDebugPanel
          material={material}
          theme={theme}
          progress={progressOverride}
          onMaterialChange={selectMaterial}
          onThemeChange={setTheme}
          onProgressChange={selectProgress}
          onHideTypography={() => setTypographyHidden(true)}
        />
      ) : null}

      {debugWater && typographyHidden && !captureMode ? (
        <button
          className="material-debug-restore"
          type="button"
          aria-label="Show DOM typography and comparison controls"
          onClick={restoreTypography}
        >
          <span aria-hidden="true" />
        </button>
      ) : null}
    </main>
  );
}
