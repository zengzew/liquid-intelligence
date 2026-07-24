# Liquid Intelligence — V1.3 Water Fidelity + Performance Handoff

Date: 2026-07-24

## User decision

V1.2 is **rejected**.

The user’s direct feedback is:

> 和效果图差距还是很明显。同时页面卡顿严重。继续优化。

Do not treat `design-reviews/v1-2-final/review.md` or its previous “Pass”
verdict as current acceptance. The screenshots and metrics remain useful
baseline evidence only.

## Worktree protection

The repository is `/Users/zengze/Documents/portfolio` on branch `main`.

The complete V1.2 implementation is still uncommitted:

```text
 M src/experience/CameraRig.tsx
 M src/experience/Environment.tsx
 M src/experience/ExperienceScene.tsx
 M src/experience/LiquidExperience.tsx
 M src/water/River.tsx
 M src/water/riverGeometry.ts
 D src/water/shaders/flowDetails.frag.ts
 M src/water/shaders/reflection.frag.ts
 M src/water/shaders/shadow.frag.ts
 M src/water/shaders/skirt.frag.ts
 M src/water/shaders/surface.vert.ts
?? design-reviews/v1-2-final/
?? design-reviews/v1-3-handoff/
?? src/water/shaders/film.frag.ts
```

Preserve this working tree. Do not reset, checkout, delete, clean, or discard
any of these files. Continue directly from the local checkout.

The previous dev server was stopped. Start a new local server when beginning
browser validation.

## New visual authority

Primary reference for the next round:

- `design-reviews/v1-3-handoff/approved-progression-reference.png`

This is the user-supplied two-theme, five-stage progression board. Treat its
columns as progress 0.00, 0.25, 0.50, 0.75, and 1.00.

Secondary, older reference:

- `/Users/zengze/Downloads/极简水流式界面设计展示.png`

The new board is more important where the two references differ.

## Largest current visual mismatches

The current V1.2 output still reads as a smooth satin/plastic sheet. It does
not yet read as the shallow, optically complex water in the new reference.

1. **Surface scale is too coarse**
   - Current: large soft highlight blobs and broad smooth gradients.
   - Target: many overlapping fine and medium wavelets, small creases, broken
     refraction cells, and dense but controlled specular variation.

2. **Highlights still form rails**
   - Current: elongated longitudinal responses can read as fibres or a road.
   - Target: interconnected, irregular specular networks that repeatedly turn
     transverse and diagonal across the flow.

3. **The water body lacks optical depth**
   - Current: dark semi-opaque film in night and pale grey film in morning.
   - Target night: clear dark water with visible internal fold structure and
     crisp silver highlights.
   - Target morning: nearly colourless clear water with cool contours, strong
     refraction/caustic structure, and a readable contact shadow.

4. **Progression changes width, not water state**
   - Current: essentially one smooth material stretched wider.
   - Target:
     - 0.00: sparse, broken thread of water and droplets
     - 0.25: narrow coherent stream with transparent raised edges
     - 0.50: braided shallow surface with interacting wave bands
     - 0.75: broad river with dense overlapping wavelets
     - 1.00: continuous water field extending beyond the frame

5. **Edges are too clean and geometric**
   - Current: long smooth banks with a few appended droplets.
   - Target: capillary breakup, beads, thin splashes, small edge folds, and
     irregular wet boundaries. Keep these sparse enough to avoid a particle
     field.

6. **Camera/material relationship is still synthetic**
   - Current close frames amplify stretched highlights.
   - Target cameras reveal a convincing water surface at every stage, with
     grazing angles used to expose refraction and surface texture rather than
     lengthen rails.

## Performance problem

The user reports severe perceived jank even though the V1.2 internal
`FrameMonitor` previously reported high average FPS after optimization.
Therefore:

- Treat `document.documentElement.dataset.fps` as insufficient evidence.
- Profile while slow-scrolling and rapid-reversing, not only while idle.
- Inspect real frame-time distribution, long frames, main-thread work, GPU
  pressure, and scroll/input latency in Chrome.
- Compare idle, slow scroll, rapid scroll, theme transition, and pointer
  movement.
- Test at 1440×900 and 390×844.

Likely areas to inspect, but do not edit before measuring:

- `src/App.tsx`: scroll event, progress damping, and DOM updates.
- `src/experience/CameraRig.tsx`: per-frame interpolation and allocations.
- `src/experience/Environment.tsx`: per-frame light/background updates.
- `src/water/River.tsx`: per-frame arrays/uniform copies and four water passes.
- `src/water/shaders/surface.vert.ts`: multi-noise displacement repeated by
  several surface passes.
- `src/water/shaders/reflection.frag.ts`: fragment cost and overdraw.

Prefer a structural performance fix. A promising direction is to merge the
film and reflection passes into one maintainable water shader, keep at most one
cheap depth/contact layer, precompute stable data, and avoid allocations inside
`useFrame`. Only adopt this after profiling confirms the bottleneck.

Do not claim performance success from triangle count or draw calls alone.
The acceptance signal is smooth interaction plus measured scroll frame times.

## Required workflow

1. Read `AGENTS.md`, this handoff, the original V1.2 request, and
   `design-reviews/v1-2-final/review.md`.
2. Run `git status --short` and preserve all current changes.
3. Inspect the new reference and current final screenshots with `view_image`.
4. Start the app and capture a fresh user-rejected V1.2 baseline.
5. Profile the actual slow/rapid scroll interaction before changing code.
6. Fix the largest performance bottleneck first or in parallel with a shader
   architecture change proven to reduce that bottleneck.
7. Perform at least three visual iterations at matching progress frames.
8. After each iteration, judge the water alone against the new board in both
   themes and both viewports.
9. Store new evidence under `design-reviews/v1-3-final/`.
10. Stop at the water foundation. Do not implement project worlds.

## Acceptance bar

- The material immediately reads as real shallow water, not cloth, satin,
  plastic, metal, fibres, or a road.
- Fine, medium, and broad surface scales are simultaneously visible.
- Specular/refraction details are broken and multidirectional.
- Morning water is clear and structured, with readable caustics/contours.
- Night water retains a visible transparent body between crisp highlights.
- Each of the five progress stages matches the new board’s water-state
  progression, not only its width.
- The same native progress pipeline remains reversible without snapping.
- Slow and rapid scrolling feel smooth to the user.
- Desktop stays at or above 55 FPS during scrolling, with stable frame pacing.
- Mobile stays at or above 30 FPS during scrolling.
- No runtime, shader, or framework-overlay errors.
- Existing approved copy and minimal interface remain unchanged.

## Existing verification commands

```text
npm run check
npm run build
git diff --check
```

The Vite production build currently emits a non-failing large-chunk advisory.
