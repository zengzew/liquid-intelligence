# Liquid Intelligence — Visual Foundation V1.1 Review

Date: 2026-07-24

Verdict: the visual foundation passes the V1.1 acceptance criteria. This review
does not approve or begin project nodes, portfolio sections, tributaries, or a
separate ocean scene.

## Review environment

- URL: `http://127.0.0.1:4173/`
- Browser: Google Chrome
- Desktop viewport: 1440 × 900
- Mobile viewport: 390 × 844
- Review methods: Chrome Control and macOS Computer Use
- Themes: night and morning
- Required progress frames: 0.00, 0.25, 0.50, 0.75, 1.00

## What was visually wrong

- The original water read as one flat procedural ribbon with little physical
  depth.
- A large section of an already-wide river was visible at progress zero.
- Width changed mostly as a global scale instead of growing along the river.
- The camera automatically followed the curve and felt like a generic WebGL
  flythrough.
- Reflection lighting was too simple, especially in morning mode.
- Independent progress smoothing in scrolling, camera, and water made reverse
  travel feel delayed and desynchronised.

Baseline evidence:

- [Night opening](before-night-1440x900-p00.png)
- [Night midpoint](before-night-1440x900-p50.png)
- [Morning opening](before-morning-1440x900-p00.png)
- [Morning midpoint](before-morning-1440x900-p50.png)
- [Mobile night opening](before-night-390x844-p00.png)

## What changed

- Rebuilt the river as a layered system: physical water body, edge skirt,
  contact definition, reflected-light layer, and sparse flow-detail layer.
- Reconstructed physical-material normals from the animated surface so the
  PMREM/Lightformer environment reflects from the displaced water rather than
  a static plane.
- Replaced glint particles with neutral, broken longitudinal reflections. Flow
  and reflection animation both move from upstream to downstream.
- Authored five reversible camera shots for source, early stream, growing
  stream, river, and broad downstream reveal.
- Implemented a spatial, nonlinear width profile. The source is almost
  line-like while the downstream half-width grows to 18 world units.
- Added a soft reveal frontier that begins at 1.8% of the path and travels
  downstream with native vertical scroll.
- Consolidated scrolling into one smoothed journey-progress pipeline consumed
  by camera, water, lighting, and DOM.
- Added intentional night and morning environments, exact opening identity,
  mobile camera choreography, reduced-motion handling, and runtime/render
  diagnostics.

Six stored visual iterations follow the baseline:

`v1-1-iteration-1` through `v1-1-iteration-6`.

## Final visual sequence

| Progress | Night | Morning |
| --- | --- | --- |
| 0.00 | [thin source](night-1440x900-p00.png) | [thin source](morning-1440x900-p00.png) |
| 0.25 | [descending stream](night-1440x900-p25.png) | [descending stream](morning-1440x900-p25.png) |
| 0.50 | [growing stream](night-1440x900-p50.png) | [growing stream](morning-1440x900-p50.png) |
| 0.75 | [river](night-1440x900-p75.png) | [river](morning-1440x900-p75.png) |
| 1.00 | [broad downstream water](night-1440x900-p100.png) | [broad downstream water](morning-1440x900-p100.png) |

Mobile evidence is stored for the same five progress values under
`night-390x844-*` and `morning-390x844-*`.

## Interaction audit

Slow desktop scroll was tested in eight equal native-wheel steps:

- Down: 0.121, 0.246, 0.372, 0.496, 0.622, 0.746, 0.872, 0.997
- Up: 0.878, 0.754, 0.629, 0.504, 0.379, 0.254, 0.129, 0.003

Slow mobile scroll was tested the same way:

- Down: 0.121, 0.246, 0.371, 0.496, 0.620, 0.745, 0.871, 0.996
- Up: 0.878, 0.754, 0.628, 0.504, 0.379, 0.255, 0.130, 0.005

The paths are monotonic and reversible. Rapid full-range wheel input was also
tested in both directions on desktop and mobile; it converged to the same
0.000/1.000 endpoints without camera or water desynchronisation.

Night-to-morning transition frames were reviewed at the midpoint. Background,
DOM, water, fog, and lighting transition continuously without a hard scene cut.

## Performance and errors

Conservative measurements were recorded while final screenshots were being
captured:

| View | Theme | FPS |
| --- | --- | ---: |
| 1440 × 900 | Night | 56 |
| 1440 × 900 | Morning | 58 |
| 390 × 844 | Night | 75 |
| 390 × 844 | Morning | 72 |

Render footprint:

- 10 draw calls
- 182,884 triangles
- 16 geometries
- 5 textures

Runtime error count: 0.

WebGL shader-program errors: 0.

## Approved-direction comparison

1. The opening retains the approved large negative space and lightweight,
   widely tracked identity typography.
2. Night uses near-black atmosphere and neutral silver reflections without
   cyan/neon treatment.
3. Morning uses warm off-white space with graphite/cool-grey water definition;
   the water remains visible.
4. Reflections are stretched and broken along the flow rather than presented as
   particles or a uniform glow.
5. The river is now the interface and the only visual journey; no conventional
   portfolio sections were introduced.
6. The approved mockup was treated as art direction. The river orientation was
   deliberately changed to top-to-bottom to satisfy the later hard acceptance
   requirement.

Copy diff: no unapproved copy changes. The opening contains exactly:

- `ZANE`
- `SOFTWARE ENGINEER`
- `Building with AI, code and creativity.`

## Remaining limitations

- The water is intentionally stylised and shader-driven, not a full fluid
  solver or photorealistic simulation.
- Performance was measured in local Chrome on this Mac. Safari, iOS hardware,
  and low-end Android GPU testing remain future compatibility work.
- The final broad reveal suggests an ocean entrance but does not implement a
  separate ocean scene, as required by scope.
