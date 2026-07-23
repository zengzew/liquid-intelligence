export type ChapterIndex = 0 | 1 | 2 | 3 | 4;

export type ChapterName =
  | "ORIGIN"
  | "CURIOSITY"
  | "BUILD"
  | "CONFLUENCE"
  | "OCEAN";

export interface JourneyChapter {
  readonly index: ChapterIndex;
  readonly slug: Lowercase<ChapterName>;
  readonly title: ChapterName;
  readonly name: ChapterName;
  readonly line: string;
}

export const CHAPTERS = [
  {
    index: 0,
    slug: "origin",
    title: "ORIGIN",
    name: "ORIGIN",
    line: "Every journey begins with a question.",
  },
  {
    index: 1,
    slug: "curiosity",
    title: "CURIOSITY",
    name: "CURIOSITY",
    line: "Questions pull the current forward.",
  },
  {
    index: 2,
    slug: "build",
    title: "BUILD",
    name: "BUILD",
    line: "Ideas take form through making.",
  },
  {
    index: 3,
    slug: "confluence",
    title: "CONFLUENCE",
    name: "CONFLUENCE",
    line: "Different paths become one direction.",
  },
  {
    index: 4,
    slug: "ocean",
    title: "OCEAN",
    name: "OCEAN",
    line: "Keep building beyond the horizon.",
  },
] as const satisfies readonly JourneyChapter[];

export const FIRST_CHAPTER_INDEX: ChapterIndex = 0;
export const LAST_CHAPTER_INDEX: ChapterIndex = 4;

export function clampJourneyProgress(progress: number): number {
  if (!Number.isFinite(progress)) {
    return FIRST_CHAPTER_INDEX;
  }

  return Math.min(
    Math.max(progress, FIRST_CHAPTER_INDEX),
    LAST_CHAPTER_INDEX,
  );
}

export function nearestChapterIndex(progress: number): ChapterIndex {
  return Math.round(clampJourneyProgress(progress)) as ChapterIndex;
}

export function chapterAt(progress: number): JourneyChapter {
  return CHAPTERS[nearestChapterIndex(progress)];
}
