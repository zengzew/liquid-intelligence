import { useLayoutEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { CHAPTERS } from "../journey/chapters";
import type { JourneyController } from "../journey/useJourneyController";

type ChapterRailProps = {
  controller: JourneyController;
};

export function ChapterRail({ controller }: ChapterRailProps) {
  const rail = useRef<HTMLDivElement>(null);
  const markers = useRef<Array<HTMLSpanElement | null>>([]);

  useLayoutEffect(() => {
    const render = (progress: number) => {
      const root = rail.current;
      if (!root) {
        return;
      }

      const activeIndex = Math.max(
        0,
        Math.min(CHAPTERS.length - 1, Math.round(progress)),
      );

      root.style.setProperty(
        "--journey-ratio",
        (progress / (CHAPTERS.length - 1)).toFixed(4),
      );
      root.setAttribute("aria-valuenow", progress.toFixed(2));
      root.setAttribute(
        "aria-valuetext",
        `${String(activeIndex).padStart(2, "0")} ${CHAPTERS[activeIndex].title}`,
      );

      markers.current.forEach((marker, index) => {
        if (!marker) {
          return;
        }

        const proximity = Math.max(0, 1 - Math.abs(progress - index));
        marker.style.setProperty("--marker-focus", proximity.toFixed(4));
      });
    };

    render(controller.progressRef.current);
    return controller.subscribe(render);
  }, [controller]);

  return (
    <div
      className="chapter-rail"
      ref={rail}
      role="progressbar"
      aria-label="Journey chapter"
      aria-valuemin={0}
      aria-valuemax={4}
      aria-valuenow={0}
      aria-valuetext="00 ORIGIN"
    >
      <span className="chapter-rail__track" aria-hidden="true">
        <span className="chapter-rail__fill" />
      </span>
      <ol className="chapter-rail__markers">
        {CHAPTERS.map((chapter, index) => (
          <li className="chapter-rail__marker" key={chapter.slug}>
            <span className="chapter-rail__label" aria-hidden="true">
              {String(index).padStart(2, "0")}
            </span>
            <span
              className="chapter-rail__dot"
              ref={(node) => {
                markers.current[index] = node;
              }}
              style={{
                "--marker-focus": index === 0 ? 1 : 0,
              } as CSSProperties}
              aria-hidden="true"
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
