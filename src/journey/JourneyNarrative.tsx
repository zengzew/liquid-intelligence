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
                aria-label={`Go to ${chapter.label}, chapter ${chapter.index + 1} of ${JOURNEY_CHAPTERS.length}`}
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
        <p className="chapter__label">01</p>
        <h2 id="stream-title">Source</h2>
        <p className="chapter__body">
          Every journey begins
          <br />
          with curiosity.
        </p>
      </section>

      <section
        className="chapter chapter--bookcast"
        aria-labelledby="bookcast-title"
        aria-hidden={activeChapterId !== "bookcast"}
      >
        <div className="chapter__intro">
          <p className="chapter__label">02</p>
          <h2 id="bookcast-title">River</h2>
          <p className="chapter__body">
            Ideas connect.
            <br />
            Systems take shape.
            <br />
            Projects flow.
          </p>
        </div>

        <div className="project-rail" aria-label="Featured project">
          <span className="project-rail__node" aria-hidden="true" />
          <div>
            <h3>BookCast AI</h3>
            <p>
              Local-first AI system
              <br />
              Structured dialogue
              <br />
              Playable MP3
            </p>
            <span>LangGraph · FastAPI · React</span>
          </div>
        </div>
      </section>

      <section
        className="chapter chapter--confluence"
        aria-labelledby="confluence-title"
        aria-hidden={activeChapterId !== "confluence"}
      >
        <div className="chapter__intro">
          <p className="chapter__label">03</p>
          <h2 id="confluence-title">Tributaries</h2>
          <p className="chapter__body">
            Different paths,
            <br />
            one direction.
          </p>
        </div>

        <div className="tributary-grid" aria-label="Project currents">
          <article>
            <span className="tributary-grid__node" aria-hidden="true" />
            <h3>XiaoBaiKing</h3>
            <p>
              WeChat mini program
              <br />
              Real-time sync
              <br />
              Game systems
            </p>
          </article>
          <article>
            <span className="tributary-grid__node" aria-hidden="true" />
            <h3>WebGL Lab</h3>
            <p>
              Creative coding
              <br />
              Three.js
              <br />
              Visual systems
            </p>
          </article>
          <article>
            <span className="tributary-grid__node" aria-hidden="true" />
            <h3>Open Source</h3>
            <p>
              Tools &amp; libraries
              <br />
              Sharing
              <br />
              Learning
            </p>
          </article>
        </div>
      </section>

      <section
        className="chapter chapter--ocean"
        aria-labelledby="ocean-title"
        aria-hidden={!oceanIsActive}
      >
        <div className="chapter__intro">
          <p className="chapter__label">04</p>
          <h2 id="ocean-title">Ocean</h2>
          <p className="chapter__body">
            Keep building.
            <br />
            Beyond the horizon.
          </p>
        </div>
        <div className="chapter__links contact-rail" aria-label="Contact links">
          <a
            href="https://github.com/zengzew"
            target="_blank"
            rel="noreferrer"
            tabIndex={oceanIsActive ? 0 : -1}
          >
            GitHub
            <span aria-hidden="true">↗</span>
          </a>
          <a
            href="mailto:wzengze@163.com"
            tabIndex={oceanIsActive ? 0 : -1}
          >
            Email
            <span aria-hidden="true">↗</span>
          </a>
          <span className="contact-rail__location">Shanghai, China</span>
        </div>
      </section>
    </>
  );
}
