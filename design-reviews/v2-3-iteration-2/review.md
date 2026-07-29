# V2.3 Iteration 2 — Transition, Pointer Life & Theme Grade

Date: 2026-07-29
Scope: `src/water/River.tsx`, `src/water/shaders/flowDetails.frag.ts`,
`src/water/shaders/reflection.frag.ts`,
`src/journey/worlds/OceanWorld.tsx`, `src/experience/Environment.tsx`.
Desktop focus; all prior uncommitted work preserved.

## User-reported problems

1. Tributaries → Ocean transition was abrupt — two water textures
   cross-dissolved instead of the river becoming the sea.
2. Water lacked continuous motion and pointer response (Prior's ribbon is
   always floating and answers the hand).
3. Still far from award-level.
4. Night too black, Morning too white.
5. Mobile deprioritised for now.

## What changed

### 1. River-becomes-sea transition

- Ocean surface now reveals with a **tide advance**: `uAdvance` (progress
  0.75→0.95) drives a radius from the camera, so the sea emerges at the
  horizon first and spreads toward the viewer; the horizon glow leads
  slightly (0.8→0.92), giving a staged arrival.
- River tail dissolution delayed and softened (`smoothstep(0.84, 0.96)`
  progress × `smoothstep(0.72, 0.95)` longitudinal, alpha floor 0.22 instead
  of 0.03) in the physical body, flowDetails and reflection layers — the
  river visibly pours into the glowing sea instead of vanishing first.

### 2. Pointer-reactive water

- CPU raycasts the pointer onto the river surface each frame (two-pass plane
  refine, 144 curve samples → across/longitudinal/halfWidth), strength
  follows pointer speed with a small idle baseline.
- Vertex rings spread from the cursor (`sin(d·3.4 − t·4.2)·e^(−0.3d)`), and
  a fragment sheen gathers light around the pointer so the water visibly
  answers the hand (also exposed on `window.__LIQUID_POINTER_WATER__`).
- Ocean surface has its own world-space cursor rings + subtle glint.
- Idle motion increased: broad-swell and capillary amplitudes up ~20%, plus
  a slow whole-river heave — the water floats even when untouched.

### 3. Theme grade

- Night: background `#020303 → #05090b`, fog 0.013→0.0115, hemisphere
  0.2→0.3, env intensity +7% — the void is no longer dead black.
- Morning: background `#f5f2ec → #eae4d7`, river body deepened
  (`#819396 → #5f7980`, opacity 0.58→0.76, transmission 0.46→0.30,
  clearcoat 0.88→0.74, env 1.44→1.10), reflection env background
  `#aeb9ba → #8fa0a0` so the water mirrors a deeper sky and gains contrast;
  ocean near colour deepened; horizon glow strength 0.5→0.3 in morning.
- New **SkyBackdrop**: camera-following gradient dome (hash-dithered, no
  banding) with a faint luminous horizon band in both themes — spatial depth
  behind the water.

## Evidence

- `before/` — iteration-1 baselines + pre-fix transition strip.
- `transition/` — post-fix strip at 0.72/0.76/0.80/0.84/0.88: glow leads,
  sea advances, river pours in; no pop.
- `pointer/` — calm vs stirred close-up: sheen + agitation around cursor.
- `after/` — full journey, both themes, all `runtimeErrors=0`.

## Engineering

- `npm run check` clean, `npm run build` clean (pre-existing chunk warning).
- Engineering health and visual completeness judged separately.

## Honest status

The four reported issues are all materially improved: the transition is
staged and continuous, the water floats and answers the cursor, and both
themes have depth. Closer to award-level, not there yet. Next candidates:

1. Origin/Source chapters still have no dedicated 3D moment (OriginWorld /
   StreamWorld are dead files) — the first two memories are water-only.
2. Morning sea could take one more contrast pass (near-field still pale).
3. Mobile: contact rail overlaps chapter index; mobile compositions
   unreviewed this round (explicitly deprioritised).
4. Motion richness: ripple rings could refract/distort the glitter path,
   not just displace vertically.
