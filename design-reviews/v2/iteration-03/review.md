# Liquid Intelligence V2 — iteration 03 review

## Reference and scope

- Visual target: `design-reviews/v2/reference-portfolio-target.jpg`
- Motion reference: the supplied Prior Holdings case study and its embedded
  screenshots.
- The requested `references/prior/` directory was not present in the checkout
  or in `HEAD`; that gap is recorded in `docs/prototype-v2-plan.md`.
- This review intentionally stops at an opaque matte liquid sheet. Realistic
  water, projects, particles, bloom, and portfolio content remain out of scope.

## Review loop

### Iteration 01 — 1920 × 1080

Largest problems:

1. A high-resolution wheel burst could skip two chapters.
2. BUILD read as a bulky slab and covered too much of the word.
3. The sheet ends were visibly rectangular.

Fixes:

- Clamped one wheel burst to a maximum of one chapter while retaining immediate
  reversal.
- Reduced BUILD width, shifted the pose, and moved its text composition lower.
- Added tapered ends to every pose without changing mesh topology.

Forward/reverse transition evidence is in
`iteration-01/1920x1080/forward-transition.png`,
`reverse-transition.png`, and `reverse-rest.png`.

### Iteration 02 — all target viewports

Largest problems:

1. ORIGIN crossed too much mobile supporting copy.
2. OCEAN was a blank, overly flat band.
3. The chapter rail lost contrast where the white sheet passed behind it.

Fixes:

- Shifted and narrowed the initial stream while preserving the target's
  right-side vertical composition.
- Added broad ocean undulation and restrained ripples to the same mesh.
- Added theme-aware rail rings and contrast treatment.

### Iteration 03 — acceptance pass

At every resting state, the journey settled to the exact integer playhead and
returned through the same states in reverse:

| Viewport | Forward | Reverse | Native `scrollY` | Document height |
| --- | --- | --- | ---: | --- |
| 1920 × 1080 | 0 → 1 → 2 → 3 → 4 | 4 → 3 → 2 → 1 → 0 | 0 | 1080 |
| 1440 × 900 | 0 → 1 → 2 → 3 → 4 | 4 → 3 → 2 → 1 → 0 | 0 | 900 |
| 390 × 844 | 0 → 1 → 2 → 3 → 4 | 4 → 3 → 2 → 1 → 0 | 0 | 844 |

The mobile pass also measured `overflowX = 0`; fixed-body and `touch-action`
rules prevented page bounce or native section movement.

The final light-theme pass repeated all five resting states at 1440 × 900 and
saved them under `iteration-03/1440x900-light/`. Every state again reported
`scrollY = 0`, `overflowX = 0`, and an exact integer playhead.

Chrome reported no console errors. The only warning is React Three Fiber's
current use of deprecated `THREE.Clock` inside the Vite client dependency path;
it does not originate in the prototype source.

## Fidelity ledger

| Reference characteristic | V2 response |
| --- | --- |
| Quiet black / warm-white environments | Theme variables, fog, exposure, lights, reflection response, and material all change together. |
| Sparse editorial typography | One number, one large word, and one short line per chapter; no cards or conventional sections. |
| Left-side vertical journey indicator | Five-state rail remains fixed and reflects the same master playhead. |
| Liquid concentrated in the central/right field | State poses frame, cross, or reveal the large chapter words. |
| Persistent organic protagonist | One 32 × 12 subdivided shallow sheet morphs in place through all five poses. |
| Motion inside the viewport | Geometry deformation carries the transition; camera changes are limited to small keyed reframes. |
| Dark/light composition parity | The same choreography and layout are used for both themes. |
| Mobile adaptation | Camera FOV/reframe and responsive typography change composition without changing the timeline model. |

Intentional deviations are the matte opaque material and temporary chapter copy.
They keep this pass focused on choreography, as required, before realistic water
or portfolio content is introduced.
