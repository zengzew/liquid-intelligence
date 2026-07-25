import type { CSSProperties } from "react";
import {
  JOURNEY_CHAPTERS,
  type JourneyChapter,
  type JourneyChapterId,
} from "./chapters";

interface JourneyNarrativeProps {
  activeChapterId: JourneyChapterId;
  onNavigate: (chapter: JourneyChapter) => void;
}

function ChapterIndex({
  activeChapterId,
  onNavigate,
}: JourneyNarrativeProps) {
  return (
    <nav className="journey-index" aria-label="Journey chapters">
      <span className="journey-index__start" aria-hidden="true">
        01
      </span>
      <span className="journey-index__track" aria-hidden="true">
        <span className="journey-index__progress" />
      </span>

      <ol>
        {JOURNEY_CHAPTERS.map((chapter) => {
          const isActive = chapter.id === activeChapterId;
          const style = {
            "--chapter-position": chapter.focus,
          } as CSSProperties;

          return (
            <li key={chapter.id} style={style}>
              <button
                type="button"
                aria-current={isActive ? "step" : undefined}
                aria-label={`Go to ${chapter.label}, chapter ${chapter.index} of ${JOURNEY_CHAPTERS.length}`}
                onClick={() => onNavigate(chapter)}
              >
                <span className="journey-index__dot" aria-hidden="true" />
                <span className="journey-index__number" aria-hidden="true">
                  {String(chapter.index).padStart(2, "0")}
                </span>
                <span className="journey-index__label" aria-hidden="true">
                  {chapter.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <span className="journey-index__end" aria-hidden="true">
        05
      </span>
    </nav>
  );
}

export default function JourneyNarrative({
  activeChapterId,
  onNavigate,
}: JourneyNarrativeProps) {
  const oceanIsActive = activeChapterId === "ocean";

  return (
    <>
      <ChapterIndex
        activeChapterId={activeChapterId}
        onNavigate={onNavigate}
      />

      <section
        className="chapter chapter--origin"
        aria-labelledby="origin-title"
        aria-hidden={activeChapterId !== "origin"}
      >
        <h1 id="origin-title">ZANE</h1>
        <p className="chapter__role">Software Engineer</p>
        <p className="chapter__body">
          I build calm, resilient software where AI, systems and human
          experience meet.
        </p>
      </section>

      <section
        className="chapter chapter--stream"
        aria-labelledby="stream-title"
        aria-hidden={activeChapterId !== "stream"}
      >
        <p className="chapter__label">Stream · 02</p>
        <h2 id="stream-title">Engineering the current</h2>
        <p className="chapter__body">
          I turn complex systems into clear, resilient experiences — across AI,
          backend architecture and creative code.
        </p>
      </section>

      <section
        className="chapter chapter--bookcast"
        aria-labelledby="bookcast-title"
        aria-hidden={activeChapterId !== "bookcast"}
      >
        <p className="chapter__label">River · 03</p>
        <h2 id="bookcast-title">BookCast AI</h2>
        <p className="chapter__body">
          A local-first AI systems project exploring how a manuscript becomes a
          structured two-host conversation. The proven slice runs from upload
          to a playable MP3; provider-backed validation is still in progress.
        </p>
        <p className="chapter__meta">
          LangGraph · FastAPI · React · PostgreSQL
        </p>
      </section>

      <section
        className="chapter chapter--confluence"
        aria-labelledby="confluence-title"
        aria-hidden={activeChapterId !== "confluence"}
      >
        <p className="chapter__label">Confluence · 04</p>
        <h2 id="confluence-title">More currents meet here</h2>
        <p className="chapter__body">
          The next tributaries are forming around agent reliability,
          human-centered AI and creative systems.
        </p>
      </section>

      <section
        className="chapter chapter--ocean"
        aria-labelledby="ocean-title"
        aria-hidden={!oceanIsActive}
      >
        <p className="chapter__label">Ocean · 05</p>
        <h2 id="ocean-title">The river opens</h2>
        <p className="chapter__body">
          I’m open to thoughtful teams building useful AI and durable digital
          experiences.
        </p>
        <p className="chapter__location">Shanghai, China</p>
        <div className="chapter__links" aria-label="Contact links">
          <a
            href="mailto:wzengze@163.com"
            tabIndex={oceanIsActive ? 0 : -1}
          >
            Email
            <span aria-hidden="true">↗</span>
          </a>
          <a
            href="https://github.com/zengzew"
            target="_blank"
            rel="noreferrer"
            tabIndex={oceanIsActive ? 0 : -1}
          >
            GitHub
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
    </>
  );
}
