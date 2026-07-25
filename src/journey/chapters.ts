export type JourneyChapterId =
  | "origin"
  | "stream"
  | "bookcast"
  | "confluence"
  | "ocean";

export interface JourneyChapter {
  id: JourneyChapterId;
  index: number;
  label: string;
  start: number;
  focus: number;
  end: number;
}

export const JOURNEY_CHAPTERS = [
  {
    id: "origin",
    index: 1,
    label: "Origin",
    start: 0,
    focus: 0.03,
    end: 0.17,
  },
  {
    id: "stream",
    index: 2,
    label: "Stream",
    start: 0.11,
    focus: 0.22,
    end: 0.37,
  },
  {
    id: "bookcast",
    index: 3,
    label: "BookCast AI",
    start: 0.3,
    focus: 0.46,
    end: 0.63,
  },
  {
    id: "confluence",
    index: 4,
    label: "Confluence",
    start: 0.56,
    focus: 0.7,
    end: 0.83,
  },
  {
    id: "ocean",
    index: 5,
    label: "Ocean",
    start: 0.77,
    focus: 0.92,
    end: 1,
  },
] as const satisfies readonly JourneyChapter[];

function smoothstep(value: number) {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
}

export function getJourneyChapterPresence(
  progress: number,
  chapter: JourneyChapter,
) {
  if (progress <= chapter.focus) {
    if (chapter.start === 0) {
      return 1;
    }

    return smoothstep(
      (progress - chapter.start) /
        Math.max(0.0001, chapter.focus - chapter.start),
    );
  }

  if (chapter.end === 1) {
    return 1;
  }

  return (
    1 -
    smoothstep(
      (progress - chapter.focus) /
        Math.max(0.0001, chapter.end - chapter.focus),
    )
  );
}

export function getActiveJourneyChapter(progress: number) {
  let activeChapter: JourneyChapter = JOURNEY_CHAPTERS[0];
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const chapter of JOURNEY_CHAPTERS) {
    const distance = Math.abs(progress - chapter.focus);

    if (distance < closestDistance) {
      activeChapter = chapter;
      closestDistance = distance;
    }
  }

  return activeChapter;
}
