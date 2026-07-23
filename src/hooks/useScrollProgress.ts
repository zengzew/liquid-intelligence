import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function useScrollProgress() {
  const progress = useRef(0);

  useEffect(() => {
    let frame = 0;

    const readProgress = () => {
      const scrollRange = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      return Math.min(Math.max(window.scrollY / scrollRange, 0), 1);
    };

    const syncIndicator = () => {
      document.documentElement.style.setProperty(
        "--scroll-progress",
        progress.current.toFixed(4),
      );
    };

    progress.current = readProgress();
    syncIndicator();

    const animateProgress = gsap.quickTo(progress, "current", {
      duration: 0.46,
      ease: "power3.out",
      onUpdate: syncIndicator,
    });

    const update = () => {
      frame = 0;
      animateProgress(readProgress());
    };

    const scheduleUpdate = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      gsap.killTweensOf(progress);
    };
  }, []);

  return progress;
}
