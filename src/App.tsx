import { useEffect, useLayoutEffect, useRef, useState } from "react";
import LiquidExperience from "./experience/LiquidExperience";
import type { JourneyProgress } from "./experience/LiquidExperience";

export type ExperienceTheme = "night" | "morning";

interface MetricBuffer {
  count: number;
  values: Float32Array;
  writeIndex: number;
}

interface MetricSummary {
  count: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

function createMetricBuffer(capacity = 256): MetricBuffer {
  return {
    count: 0,
    values: new Float32Array(capacity),
    writeIndex: 0,
  };
}

function pushMetric(buffer: MetricBuffer, value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return;
  }

  buffer.values[buffer.writeIndex] = value;
  buffer.writeIndex = (buffer.writeIndex + 1) % buffer.values.length;
  buffer.count = Math.min(buffer.count + 1, buffer.values.length);
}

function resetMetricBuffer(buffer: MetricBuffer) {
  buffer.count = 0;
  buffer.writeIndex = 0;
}

function summarizeMetric(buffer: MetricBuffer): MetricSummary {
  if (buffer.count === 0) {
    return {
      count: 0,
      max: 0,
      p50: 0,
      p95: 0,
      p99: 0,
    };
  }

  const values = new Array<number>(buffer.count);
  const start =
    buffer.count === buffer.values.length ? buffer.writeIndex : 0;

  for (let index = 0; index < buffer.count; index += 1) {
    values[index] =
      buffer.values[(start + index) % buffer.values.length];
  }

  values.sort((left, right) => left - right);

  const percentile = (ratio: number) =>
    values[Math.min(values.length - 1, Math.floor((values.length - 1) * ratio))];

  return {
    count: values.length,
    max: Number(values[values.length - 1].toFixed(2)),
    p50: Number(percentile(0.5).toFixed(2)),
    p95: Number(percentile(0.95).toFixed(2)),
    p99: Number(percentile(0.99).toFixed(2)),
  };
}

function getInitialTheme(): ExperienceTheme {
  if (typeof window === "undefined") {
    return "night";
  }

  const searchParams = new URLSearchParams(window.location.search);
  const captureTheme =
    searchParams.get("profile") === "1"
      ? searchParams.get("captureTheme")
      : null;

  if (captureTheme === "night" || captureTheme === "morning") {
    return captureTheme;
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
  const profilingEnabled = useRef(
    typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("profile") === "1",
  ).current;
  const profileScenario = useRef(
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("scenario")
      : null,
  ).current;
  const profileCaptureProgress = useRef((() => {
    if (typeof window === "undefined" || !profilingEnabled) {
      return null;
    }

    const value = Number(
      new URLSearchParams(window.location.search).get("captureProgress"),
    );

    return Number.isFinite(value)
      ? Math.min(1, Math.max(0, value))
      : null;
  })()).current;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("liquid-intelligence-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (profileCaptureProgress === null || profileScenario) {
      return;
    }

    const captureDelay = window.setTimeout(() => {
      const scrollRange = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      window.scrollTo(0, scrollRange * profileCaptureProgress);
      document.documentElement.dataset.profileCapture =
        profileCaptureProgress.toFixed(2);
    }, 120);

    return () => {
      window.clearTimeout(captureDelay);
      delete document.documentElement.dataset.profileCapture;
    };
  }, [profileCaptureProgress, profileScenario]);

  useEffect(() => {
    if (
      !profilingEnabled ||
      (profileScenario !== "slow" && profileScenario !== "reverse")
    ) {
      return;
    }

    let frameId = 0;
    let startTime = 0;
    const duration = profileScenario === "slow" ? 4200 : 3600;
    const startDelay = window.setTimeout(() => {
      const scrollRange = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      document.documentElement.dataset.profileScenario =
        `${profileScenario}-running`;
      window.dispatchEvent(new Event("liquid-profile-reset"));
      window.scrollTo(
        0,
        profileScenario === "slow" ? 0 : scrollRange * 0.18,
      );

      const runScenario = (time: number) => {
        startTime ||= time;
        const elapsed = time - startTime;

        if (profileScenario === "slow") {
          const linearProgress = Math.min(1, elapsed / duration);
          const smoothProgress =
            linearProgress *
            linearProgress *
            (3 - 2 * linearProgress);
          window.scrollTo(0, scrollRange * smoothProgress);
        } else {
          const leg = elapsed / 600;
          const phase = leg % 2;
          const triangle = phase <= 1 ? phase : 2 - phase;
          window.scrollTo(0, scrollRange * (0.18 + triangle * 0.64));
        }

        if (elapsed < duration) {
          frameId = window.requestAnimationFrame(runScenario);
          return;
        }

        document.documentElement.dataset.profileScenario =
          `${profileScenario}-complete`;
        window.dispatchEvent(new Event("liquid-profile-snapshot"));
      };

      frameId = window.requestAnimationFrame(runScenario);
    }, 2600);

    return () => {
      window.clearTimeout(startDelay);
      window.cancelAnimationFrame(frameId);
      delete document.documentElement.dataset.profileScenario;
    };
  }, [profileScenario, profilingEnabled]);

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
    const scrollInputLatency = createMetricBuffer();
    const pointerInputLatency = createMetricBuffer();
    const themeInputLatency = createMetricBuffer(32);
    const longAnimationFrames = createMetricBuffer();
    const longAnimationBlocking = createMetricBuffer();
    const longTasks = createMetricBuffer();
    const eventDurations = createMetricBuffer();
    const observers: PerformanceObserver[] = [];
    let frameId = 0;
    let previousTime = performance.now();
    let previousPublishTime = previousTime;
    let profileWindowStart = previousTime;
    let lastProfileResetToken = "";
    let profileWarmupPending = profilingEnabled;
    const profileWarmupDeadline = previousTime + 2000;
    let lastCssProgress = "";
    let lastDatasetProgress = "";
    let lastDomProgressWriteTime = 0;
    let pendingScrollInputAt: number | null = null;
    let pendingPointerInputAt: number | null = null;
    let pendingThemeInputAt: number | null = null;
    let forceProfilePublish = false;
    const metricBuffers = [
      scrollInputLatency,
      pointerInputLatency,
      themeInputLatency,
      longAnimationFrames,
      longAnimationBlocking,
      longTasks,
      eventDurations,
    ];

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

    const markScrollInput = (event: WheelEvent | TouchEvent | KeyboardEvent) => {
      pendingScrollInputAt ??= event.timeStamp;
    };

    const markPointerInput = (event: PointerEvent) => {
      pendingPointerInputAt ??= event.timeStamp;
    };

    const markThemeInput = (event: Event) => {
      const target = event.target;

      if (
        target instanceof Element &&
        target.closest(".theme-toggle")
      ) {
        pendingThemeInputAt ??= event.timeStamp;
      }
    };

    const resetProfileMetrics = () => {
      metricBuffers.forEach(resetMetricBuffer);
      pendingScrollInputAt = null;
      pendingPointerInputAt = null;
      pendingThemeInputAt = null;
      profileWindowStart = performance.now();
      previousPublishTime = profileWindowStart;
      delete document.documentElement.dataset.interactionMetrics;
    };
    const snapshotProfileMetrics = () => {
      forceProfilePublish = true;
    };

    if (profilingEnabled) {
      delete document.documentElement.dataset.interactionMetrics;
      Reflect.set(window, "__LIQUID_JOURNEY__", progressRef.current);
      Reflect.set(window, "__LIQUID_PROFILE_RESET__", () => {
        window.dispatchEvent(new Event("liquid-profile-reset"));
      });
    }

    if (profilingEnabled && "PerformanceObserver" in window) {
      const supportedTypes = PerformanceObserver.supportedEntryTypes;
      const observe = (
        type: string,
        onEntry: (entry: PerformanceEntry) => void,
        options: PerformanceObserverInit,
      ) => {
        if (!supportedTypes.includes(type)) {
          return;
        }

        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.startTime >= profileWindowStart) {
              onEntry(entry);
            }
          });
        });
        observer.observe(options);
        observers.push(observer);
      };

      observe(
        "long-animation-frame",
        (entry) => {
          pushMetric(longAnimationFrames, entry.duration);
          pushMetric(
            longAnimationBlocking,
            Number(Reflect.get(entry, "blockingDuration") ?? 0),
          );
        },
        { type: "long-animation-frame", buffered: false },
      );
      observe(
        "longtask",
        (entry) => pushMetric(longTasks, entry.duration),
        { type: "longtask", buffered: false },
      );
      observe(
        "event",
        (entry) => pushMetric(eventDurations, entry.duration),
        {
          type: "event",
          buffered: false,
          durationThreshold: 16,
        } as PerformanceObserverInit,
      );
    }

    const renderProgress = (time: number) => {
      const delta = Math.min(0.05, Math.max(0.001, (time - previousTime) / 1000));
      const currentProgress = progressRef.current.current;
      const currentVelocity = progressRef.current.velocity;
      const targetProgress = progressRef.current.target;

      if (reducedMotion) {
        progressRef.current.current = targetProgress;
        progressRef.current.velocity = 0;
      } else {
        const angularFrequency = 10.5;
        const displacement = currentProgress - targetProgress;
        const springVelocity =
          currentVelocity + angularFrequency * displacement;
        const decay = Math.exp(-angularFrequency * delta);
        let nextProgress =
          targetProgress +
          (displacement + springVelocity * delta) * decay;
        let nextVelocity =
          (currentVelocity -
            angularFrequency * springVelocity * delta) *
          decay;

        if (nextProgress <= 0) {
          nextProgress = 0;
          nextVelocity = Math.max(0, nextVelocity);
        } else if (nextProgress >= 1) {
          nextProgress = 1;
          nextVelocity = Math.min(0, nextVelocity);
        }

        if (
          Math.abs(targetProgress - nextProgress) < 0.00004 &&
          Math.abs(nextVelocity) < 0.0005
        ) {
          nextProgress = targetProgress;
          nextVelocity = 0;
        }

        progressRef.current.current = nextProgress;
        progressRef.current.velocity = nextVelocity;
      }
      previousTime = time;

      const progress = progressRef.current.current;

      if (
        lastCssProgress === "" ||
        time - lastDomProgressWriteTime >= 32
      ) {
        const cssProgress = progress.toFixed(4);
        const datasetProgress = progress.toFixed(3);

        if (cssProgress !== lastCssProgress) {
          runway.style.setProperty("--journey-progress", cssProgress);
          lastCssProgress = cssProgress;
        }

        if (datasetProgress !== lastDatasetProgress) {
          runway.dataset.progress = datasetProgress;
          lastDatasetProgress = datasetProgress;
        }

        lastDomProgressWriteTime = time;
      }

      if (profilingEnabled) {
        if (profileWarmupPending && time >= profileWarmupDeadline) {
          resetProfileMetrics();
          profileWarmupPending = false;
        }

        if (profileWarmupPending) {
          frameId = window.requestAnimationFrame(renderProgress);
          return;
        }

        const profileResetToken =
          document.documentElement.dataset.profileResetRequest ?? "";

        if (
          profileResetToken &&
          profileResetToken !== lastProfileResetToken
        ) {
          lastProfileResetToken = profileResetToken;
          resetProfileMetrics();
        }

        if (pendingScrollInputAt !== null) {
          pushMetric(scrollInputLatency, time - pendingScrollInputAt);
          pendingScrollInputAt = null;
        }

        if (pendingPointerInputAt !== null) {
          pushMetric(pointerInputLatency, time - pendingPointerInputAt);
          pendingPointerInputAt = null;
        }

        if (pendingThemeInputAt !== null) {
          pushMetric(themeInputLatency, time - pendingThemeInputAt);
          pendingThemeInputAt = null;
        }

        if (time - previousPublishTime >= 1500 || forceProfilePublish) {
          document.documentElement.dataset.interactionMetrics = JSON.stringify({
            scrollInputToFrame: summarizeMetric(scrollInputLatency),
            pointerInputToFrame: summarizeMetric(pointerInputLatency),
            themeInputToFrame: summarizeMetric(themeInputLatency),
            longAnimationFrames: summarizeMetric(longAnimationFrames),
            longAnimationBlocking: summarizeMetric(longAnimationBlocking),
            longTasks: summarizeMetric(longTasks),
            eventDurations: summarizeMetric(eventDurations),
          });
          previousPublishTime = time;
          forceProfilePublish = false;
        }
      }

      frameId = window.requestAnimationFrame(renderProgress);
    };

    updateTarget();
    frameId = window.requestAnimationFrame(renderProgress);
    window.addEventListener("scroll", updateTarget, { passive: true });
    window.addEventListener("resize", updateTarget);

    if (profilingEnabled) {
      window.addEventListener("wheel", markScrollInput, { passive: true });
      window.addEventListener("touchmove", markScrollInput, { passive: true });
      window.addEventListener("keydown", markScrollInput, { passive: true });
      window.addEventListener("pointermove", markPointerInput, {
        passive: true,
      });
      window.addEventListener("pointerdown", markThemeInput, {
        passive: true,
      });
      window.addEventListener("liquid-profile-reset", resetProfileMetrics);
      window.addEventListener(
        "liquid-profile-snapshot",
        snapshotProfileMetrics,
      );
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", updateTarget);
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("wheel", markScrollInput);
      window.removeEventListener("touchmove", markScrollInput);
      window.removeEventListener("keydown", markScrollInput);
      window.removeEventListener("pointermove", markPointerInput);
      window.removeEventListener("pointerdown", markThemeInput);
      window.removeEventListener("liquid-profile-reset", resetProfileMetrics);
      window.removeEventListener(
        "liquid-profile-snapshot",
        snapshotProfileMetrics,
      );
      observers.forEach((observer) => observer.disconnect());

      if (profilingEnabled) {
        Reflect.deleteProperty(window, "__LIQUID_JOURNEY__");
        Reflect.deleteProperty(window, "__LIQUID_PROFILE_RESET__");
      }
    };
  }, [profilingEnabled]);

  const nextTheme: ExperienceTheme =
    theme === "night" ? "morning" : "night";

  return (
    <main className="experience" data-theme={theme}>
      <div className="canvas-shell" aria-hidden="true">
        <LiquidExperience
          theme={theme}
          progressRef={progressRef}
          profilingEnabled={profilingEnabled}
        />
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
