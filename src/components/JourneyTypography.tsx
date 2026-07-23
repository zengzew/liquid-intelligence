import { useLayoutEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { CHAPTERS } from "../journey/chapters";
import type { JourneyController } from "../journey/useJourneyController";

type JourneyTypographyProps = {
  controller: JourneyController;
  layer: "back" | "front";
};

function opacityForDistance(distance: number) {
  return Math.max(0, Math.min(1, 1 - distance * 1.35));
}

export function JourneyTypography({
  controller,
  layer,
}: JourneyTypographyProps) {
  const nodes = useRef<Array<HTMLElement | null>>([]);

  useLayoutEffect(() => {
    const render = (progress: number) => {
      nodes.current.forEach((node, index) => {
        if (!node) {
          return;
        }

        const offset = progress - index;
        const distance = Math.abs(offset);
        const opacity = opacityForDistance(distance);
        const travel = layer === "back" ? -4.6 : -3.2;
        const scale = layer === "back" ? 1 - Math.min(distance, 1) * 0.035 : 1;

        node.style.setProperty("--chapter-opacity", opacity.toFixed(4));
        node.style.setProperty(
          "--chapter-y",
          `${(offset * travel).toFixed(3)}vh`,
        );
        node.style.setProperty("--chapter-scale", scale.toFixed(4));
        node.setAttribute("aria-hidden", opacity < 0.5 ? "true" : "false");
      });
    };

    render(controller.progressRef.current);
    return controller.subscribe(render);
  }, [controller, layer]);

  return (
    <div
      className={`journey-type journey-type--${layer}`}
      aria-live={layer === "front" ? "polite" : undefined}
    >
      {CHAPTERS.map((chapter, index) => (
        <section
          className={`chapter-composition chapter-composition--${chapter.slug}`}
          data-chapter-index={index}
          key={chapter.slug}
          ref={(node) => {
            nodes.current[index] = node;
          }}
          style={{
            "--chapter-opacity": index === 0 ? 1 : 0,
            "--chapter-scale": 1,
            "--chapter-y": "0vh",
          } as CSSProperties}
          aria-hidden={index === 0 ? "false" : "true"}
        >
          {layer === "back" ? (
            <h2 className="chapter-composition__word">{chapter.title}</h2>
          ) : (
            <>
              <span className="chapter-composition__number">
                {String(index).padStart(2, "0")}
              </span>
              <span className="visually-hidden">{chapter.title}. </span>
              <p className="chapter-composition__line">{chapter.line}</p>
            </>
          )}
        </section>
      ))}
    </div>
  );
}
