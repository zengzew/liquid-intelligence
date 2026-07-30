# Liquid Intelligence

An immersive WebGL personal portfolio built as one continuous water world. A
thin source grows into a river and finally an ocean through an authored,
reversible camera journey.

## Run locally

```bash
npm install
npm run dev
```

Native vertical scrolling drives one shared journey progress used by the
camera, reveal frontier, water layers, lighting, and DOM. The theme control
transitions the Three.js environment between a night river and a soft morning
atmosphere.

## Spatial narrative

The five authored focus points are `0.03`, `0.22`, `0.46`, `0.70`, and `0.92`.
At every point the camera faces downstream, so the river travels from the lower
foreground toward the upper frame and becomes visibly broader in that
direction. Camera pitch continuously rises from a steep source overview to an
almost level ocean horizon; reverse scrolling retraces the same path.

The approved storyboard, before/after captures, and acceptance record are in
[`design-reviews/v2-4-spatial-direction/review.md`](design-reviews/v2-4-spatial-direction/review.md).
