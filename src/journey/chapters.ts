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
    index: 0,
    label: "Origin",
    start: 0,
    focus: 0.03,
    end: 0.17,
  },
  {
    id: "stream",
    index: 1,
    label: "Source",
    start: 0.11,
    focus: 0.22,
    end: 0.37,
  },
  {
    id: "bookcast",
    index: 2,
    label: "River",
    start: 0.3,
    focus: 0.46,
    end: 0.63,
  },
  {
    id: "confluence",
    index: 3,
    label: "Tributaries",
    start: 0.56,
    focus: 0.7,
    end: 0.83,
  },
  {
    id: "ocean",
    index: 4,
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

/**
 * Sharp text-legibility window, decoupled from the wide 3D water presence.
 *
 * The 3D worlds overlap heavily so the water morphs continuously between
 * stages. DOM narrative text must NOT overlap that way — otherwise two or
 * three headings ghost over each other during every handoff. This returns a
 * plateau of full opacity near each chapter focus with fast shoulders that
 * reach zero well before the neighbour appears, leaving a quiet band where
 * only the water carries the transition.
 */
export function getJourneyChapterTextPresence(
  progress: number,
  chapter: JourneyChapter,
) {
  const previous = JOURNEY_CHAPTERS[chapter.index - 1];
  const next = JOURNEY_CHAPTERS[chapter.index + 1];

  const fadeBefore = previous
    ? (chapter.focus - previous.focus) * 0.42
    : 0.12;
  const fadeAfter = next ? (next.focus - chapter.focus) * 0.42 : 0.14;
  const plateauBefore = fadeBefore * 0.34;
  const plateauAfter = fadeAfter * 0.34;

  if (progress <= chapter.focus) {
    if (progress >= chapter.focus - plateauBefore) {
      return 1;
    }

    return smoothstep(
      (progress - (chapter.focus - fadeBefore)) /
        Math.max(0.0001, fadeBefore - plateauBefore),
    );
  }

  if (progress <= chapter.focus + plateauAfter) {
    return 1;
  }

  return (
    1 -
    smoothstep(
      (progress - (chapter.focus + plateauAfter)) /
        Math.max(0.0001, fadeAfter - plateauAfter),
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
