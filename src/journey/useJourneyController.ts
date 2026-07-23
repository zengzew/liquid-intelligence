import {
  useLayoutEffect,
  useRef,
  type RefObject,
} from "react";
import { gsap } from "gsap";
import {
  CHAPTERS,
  LAST_CHAPTER_INDEX,
  clampJourneyProgress,
  nearestChapterIndex,
  type ChapterIndex,
} from "./chapters";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const JOURNEY_CONTROL_SELECTOR = "[data-journey-control]";
const DEFAULT_SETTLE_DELAY_MS = 210;
const DEFAULT_WHEEL_PIXELS_PER_CHAPTER = 520;
const DEFAULT_TOUCH_PIXELS_PER_CHAPTER = 240;
const MAX_WHEEL_DELTA_PX = 88;
const MAX_TOUCH_DELTA_PX = 36;
const MIN_TRANSPORT_DURATION_SECONDS = 0.24;
const MAX_TRANSPORT_DURATION_SECONDS = 0.68;
const TRANSPORT_SECONDS_PER_CHAPTER = 0.14;
const DIRECTION_EPSILON = 0.0001;
const WHEEL_BURST_GAP_MS = 170;
const MAX_CHAPTERS_PER_WHEEL_BURST = 1;

export type JourneyProgressListener = (progress: number) => void;

export interface JourneyControllerOptions {
  /**
   * Overrides the operating-system preference when supplied. When omitted,
   * the controller follows `prefers-reduced-motion`.
   */
  readonly reducedMotion?: boolean;
  /** Delay after the final gesture before settling to a chapter. */
  readonly settleDelayMs?: number;
}

export interface JourneyController {
  /** Current master-timeline time, expressed in chapter units from 0 to 4. */
  readonly progressRef: RefObject<number>;
  /** The destination currently being pursued by the transport tween. */
  readonly targetRef: RefObject<number>;
  /** The single paused GSAP timeline shared by the complete composition. */
  readonly timelineRef: RefObject<gsap.core.Timeline | null>;
  /** Nearest chapter to the current rendered progress. */
  readonly chapterIndex: ChapterIndex;
  /**
   * Moves to one of the five chapter states. Non-integer values are rounded
   * and all values are clamped to the valid range.
   */
  goTo(index: number): void;
  /**
   * Receives the current progress immediately and after every transport
   * update. Returns an unsubscribe function.
   */
  subscribe(listener: JourneyProgressListener): () => void;
}

interface JourneyRuntime {
  reducedMotion: boolean;
  settleTimer: number | null;
  transportTween: gsap.core.Tween | null;
}

function createMasterTimeline(initialProgress: number): gsap.core.Timeline {
  const durationAnchor = { progress: 0 };
  const timeline = gsap.timeline({ paused: true });

  // The inert anchor guarantees an exact 0..4 duration before composition
  // tracks are registered by the scene, typography, lighting, and camera.
  timeline.to(
    durationAnchor,
    {
      progress: 1,
      duration: LAST_CHAPTER_INDEX,
      ease: "none",
    },
    0,
  );

  for (const chapter of CHAPTERS) {
    timeline.addLabel(chapter.name, chapter.index);
  }

  timeline.time(clampJourneyProgress(initialProgress), false).pause();
  return timeline;
}

function isJourneyControl(target: EventTarget | null): boolean {
  return target instanceof Element
    ? target.closest(JOURNEY_CONTROL_SELECTOR) !== null
    : false;
}

function normalizeWheelPixels(
  event: WheelEvent,
  viewportHeight: number,
): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * 16;
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * Math.max(viewportHeight, 1);
  }

  return event.deltaY;
}

function findTouch(touches: TouchList, identifier: number): Touch | null {
  for (let index = 0; index < touches.length; index += 1) {
    const touch = touches.item(index);

    if (touch?.identifier === identifier) {
      return touch;
    }
  }

  return null;
}

function transportDuration(distance: number): number {
  return Math.min(
    MAX_TRANSPORT_DURATION_SECONDS,
    Math.max(
      MIN_TRANSPORT_DURATION_SECONDS,
      MIN_TRANSPORT_DURATION_SECONDS +
        distance * TRANSPORT_SECONDS_PER_CHAPTER,
    ),
  );
}

function chapterDestination(index: number): ChapterIndex {
  return nearestChapterIndex(index);
}

/**
 * Owns the reversible 0..4 journey playhead without storing animation progress
 * in React state. The supplied surface receives all navigation listeners.
 */
export function useJourneyController<TElement extends HTMLElement>(
  surfaceRef: RefObject<TElement | null>,
  options: JourneyControllerOptions = {},
): JourneyController {
  const progressRef = useRef(0);
  const targetRef = useRef(0);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const listenersRef = useRef(new Set<JourneyProgressListener>());
  const goToRef = useRef<(index: number) => void>(() => undefined);
  const controllerRef = useRef<JourneyController | null>(null);

  if (controllerRef.current === null) {
    controllerRef.current = {
      progressRef,
      targetRef,
      timelineRef,
      get chapterIndex() {
        return nearestChapterIndex(progressRef.current);
      },
      goTo(index) {
        goToRef.current(index);
      },
      subscribe(listener) {
        listenersRef.current.add(listener);
        listener(progressRef.current);

        return () => {
          listenersRef.current.delete(listener);
        };
      },
    };
  }

  const reducedMotionOverride = options.reducedMotion;
  const settleDelayMs = Math.max(
    0,
    options.settleDelayMs ?? DEFAULT_SETTLE_DELAY_MS,
  );

  useLayoutEffect(() => {
    const timeline = createMasterTimeline(progressRef.current);
    const runtime: JourneyRuntime = {
      reducedMotion: reducedMotionOverride ?? false,
      settleTimer: null,
      transportTween: null,
    };
    const surface = surfaceRef.current;
    let activeTouchIdentifier: number | null = null;
    let lastTouchY = 0;
    let touchStartedOnControl = false;
    let lastWheelTimestamp = Number.NEGATIVE_INFINITY;
    let wheelBurstDirection = 0;
    let wheelBurstAnchor: ChapterIndex = nearestChapterIndex(
      progressRef.current,
    );

    timelineRef.current = timeline;

    const publishProgress = () => {
      const progress = clampJourneyProgress(timeline.time());
      progressRef.current = progress;

      for (const listener of listenersRef.current) {
        listener(progress);
      }
    };

    const clearSettleTimer = () => {
      if (runtime.settleTimer !== null) {
        window.clearTimeout(runtime.settleTimer);
        runtime.settleTimer = null;
      }
    };

    const killTransport = () => {
      runtime.transportTween?.kill();
      runtime.transportTween = null;
    };

    const setProgressImmediately = (nextProgress: number) => {
      killTransport();
      const clampedProgress = clampJourneyProgress(nextProgress);
      targetRef.current = clampedProgress;
      timeline.time(clampedProgress, false);
      publishProgress();
    };

    const transportTo = (nextProgress: number) => {
      const clampedProgress = clampJourneyProgress(nextProgress);
      const distance = Math.abs(clampedProgress - progressRef.current);

      targetRef.current = clampedProgress;
      killTransport();

      if (runtime.reducedMotion || distance <= DIRECTION_EPSILON) {
        setProgressImmediately(clampedProgress);
        return;
      }

      runtime.transportTween = gsap.to(timeline, {
        time: clampedProgress,
        duration: transportDuration(distance),
        ease: "power3.out",
        overwrite: true,
        onUpdate: publishProgress,
        onComplete: () => {
          runtime.transportTween = null;
          publishProgress();
        },
      });
    };

    const goTo = (index: number) => {
      clearSettleTimer();
      transportTo(chapterDestination(index));
    };

    goToRef.current = goTo;

    const settleToNearestChapter = () => {
      clearSettleTimer();
      transportTo(nearestChapterIndex(targetRef.current));
    };

    const scheduleSettle = () => {
      clearSettleTimer();
      runtime.settleTimer = window.setTimeout(() => {
        runtime.settleTimer = null;
        settleToNearestChapter();
      }, settleDelayMs);
    };

    const pushProgress = (
      delta: number,
      minimum: number = 0,
      maximum: number = LAST_CHAPTER_INDEX,
    ) => {
      if (!Number.isFinite(delta) || Math.abs(delta) <= DIRECTION_EPSILON) {
        return;
      }

      const direction = Math.sign(delta);
      const pendingDirection = Math.sign(
        targetRef.current - progressRef.current,
      );
      const isImmediateReversal =
        pendingDirection !== 0 && pendingDirection !== direction;
      const baseProgress = isImmediateReversal
        ? progressRef.current
        : targetRef.current;

      transportTo(
        gsap.utils.clamp(minimum, maximum, baseProgress + delta),
      );
      scheduleSettle();
    };

    let mediaQuery: MediaQueryList | null = null;
    const handleMotionPreference = (event: MediaQueryListEvent) => {
      runtime.reducedMotion = event.matches;

      if (event.matches) {
        setProgressImmediately(targetRef.current);
      }
    };

    if (reducedMotionOverride === undefined) {
      mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
      runtime.reducedMotion = mediaQuery.matches;
      mediaQuery.addEventListener("change", handleMotionPreference);
    }

    if (surface === null) {
      publishProgress();

      return () => {
        clearSettleTimer();
        killTransport();
        mediaQuery?.removeEventListener("change", handleMotionPreference);
        timeline.kill();
        timelineRef.current = null;
        goToRef.current = () => undefined;
      };
    }

    const previousOverscrollBehavior = surface.style.overscrollBehavior;
    const previousTabIndex = surface.getAttribute("tabindex");
    surface.style.overscrollBehavior = "none";

    if (previousTabIndex === null) {
      surface.setAttribute("tabindex", "0");
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!isJourneyControl(event.target)) {
        surface.focus({ preventScroll: true });
      }
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.defaultPrevented || event.ctrlKey || isJourneyControl(event.target)) {
        return;
      }

      event.preventDefault();

      const normalizedPixels = normalizeWheelPixels(
        event,
        surface.clientHeight || window.innerHeight,
      );
      const clampedPixels = gsap.utils.clamp(
        -MAX_WHEEL_DELTA_PX,
        MAX_WHEEL_DELTA_PX,
        normalizedPixels,
      );
      const direction = Math.sign(clampedPixels);
      const startsNewBurst =
        event.timeStamp - lastWheelTimestamp > WHEEL_BURST_GAP_MS ||
        direction !== wheelBurstDirection;

      if (startsNewBurst) {
        wheelBurstAnchor = nearestChapterIndex(progressRef.current);
        wheelBurstDirection = direction;
      }

      lastWheelTimestamp = event.timeStamp;

      const minimum =
        direction < 0
          ? Math.max(
              0,
              wheelBurstAnchor - MAX_CHAPTERS_PER_WHEEL_BURST,
            )
          : wheelBurstAnchor;
      const maximum =
        direction > 0
          ? Math.min(
              LAST_CHAPTER_INDEX,
              wheelBurstAnchor + MAX_CHAPTERS_PER_WHEEL_BURST,
            )
          : wheelBurstAnchor;

      pushProgress(
        clampedPixels / DEFAULT_WHEEL_PIXELS_PER_CHAPTER,
        minimum,
        maximum,
      );
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        activeTouchIdentifier = null;
        touchStartedOnControl = false;
        return;
      }

      const touch = event.touches.item(0);

      if (touch === null) {
        return;
      }

      activeTouchIdentifier = touch.identifier;
      lastTouchY = touch.clientY;
      touchStartedOnControl = isJourneyControl(event.target);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (
        activeTouchIdentifier === null ||
        touchStartedOnControl ||
        event.touches.length !== 1
      ) {
        return;
      }

      const touch = findTouch(event.touches, activeTouchIdentifier);

      if (touch === null) {
        return;
      }

      event.preventDefault();
      const pixelDelta = lastTouchY - touch.clientY;
      lastTouchY = touch.clientY;

      const clampedPixels = gsap.utils.clamp(
        -MAX_TOUCH_DELTA_PX,
        MAX_TOUCH_DELTA_PX,
        pixelDelta,
      );

      pushProgress(clampedPixels / DEFAULT_TOUCH_PIXELS_PER_CHAPTER);
    };

    const finishTouch = (event: TouchEvent) => {
      if (
        activeTouchIdentifier !== null &&
        findTouch(event.changedTouches, activeTouchIdentifier) !== null
      ) {
        const shouldSettle = !touchStartedOnControl;
        activeTouchIdentifier = null;
        touchStartedOnControl = false;

        if (shouldSettle) {
          scheduleSettle();
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        isJourneyControl(event.target)
      ) {
        return;
      }

      const currentDestination = nearestChapterIndex(targetRef.current);
      let destination: number | null = null;

      switch (event.key) {
        case "ArrowDown":
        case "ArrowRight":
        case "PageDown":
          destination = currentDestination + 1;
          break;
        case "ArrowUp":
        case "ArrowLeft":
        case "PageUp":
          destination = currentDestination - 1;
          break;
        case " ":
          destination = currentDestination + (event.shiftKey ? -1 : 1);
          break;
        case "Home":
          destination = 0;
          break;
        case "End":
          destination = LAST_CHAPTER_INDEX;
          break;
        default:
          if (/^[1-5]$/.test(event.key)) {
            destination = Number(event.key) - 1;
          }
      }

      if (destination === null) {
        return;
      }

      event.preventDefault();
      goTo(destination);
    };

    surface.addEventListener("pointerdown", handlePointerDown);
    surface.addEventListener("wheel", handleWheel, { passive: false });
    surface.addEventListener("touchstart", handleTouchStart, { passive: true });
    surface.addEventListener("touchmove", handleTouchMove, { passive: false });
    surface.addEventListener("touchend", finishTouch);
    surface.addEventListener("touchcancel", finishTouch);
    surface.addEventListener("keydown", handleKeyDown);
    publishProgress();

    return () => {
      clearSettleTimer();
      killTransport();
      mediaQuery?.removeEventListener("change", handleMotionPreference);
      surface.removeEventListener("pointerdown", handlePointerDown);
      surface.removeEventListener("wheel", handleWheel);
      surface.removeEventListener("touchstart", handleTouchStart);
      surface.removeEventListener("touchmove", handleTouchMove);
      surface.removeEventListener("touchend", finishTouch);
      surface.removeEventListener("touchcancel", finishTouch);
      surface.removeEventListener("keydown", handleKeyDown);
      surface.style.overscrollBehavior = previousOverscrollBehavior;

      if (previousTabIndex === null) {
        surface.removeAttribute("tabindex");
      } else {
        surface.setAttribute("tabindex", previousTabIndex);
      }

      timeline.kill();
      timelineRef.current = null;
      goToRef.current = () => undefined;
    };
  }, [reducedMotionOverride, settleDelayMs, surfaceRef]);

  return controllerRef.current;
}
