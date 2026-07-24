# Liquid Intelligence — V1.3 Water, Camera, and Performance Review

Date: 2026-07-24

## Verdict

- **V1.3 motion architecture:** PASS
- **Desktop and mobile scroll-performance gates:** PASS
- **Runtime, shader, and React-overlay error gates:** PASS
- **Five-stage water-state progression:** PASS
- **Exact photoreal / award-level parity with the approved board:** FAIL
- **Overall:** CONDITIONAL PASS for this water-and-motion foundation; not a
  claim of final visual parity.

V1.2's rejected `Pass` conclusion was not reused. V1.2 is treated only as the
before baseline.

## What changed

### Native scroll and continuous camera

- Replaced the first-order progress lerp with a delta-time-independent,
  critically damped second-order spring that keeps `target`, `current`, and
  `velocity`.
- Kept native document scrolling as the only product input. The profile-only
  query scenarios do not ship an alternate scrolling system.
- Reduced-motion bypasses or rapidly settles the spring.
- DOM progress writes are throttled and skipped when the rounded value did not
  change.
- Removed the five segmented camera shots. `CameraRig` now follows the same
  arc-length-normalized `CatmullRomCurve3` as the water, looks ahead on that
  curve, derives a local frame from tangent/lateral/up, and independently damps
  position, quaternion, and FOV.
- Progress velocity only contributes restrained lead, lateral lag, and roll.
  The camera no longer decelerates at 0.25, 0.50, or 0.75 boundaries.

### Anchored propagation

- Added a 112-section CPU guide simulation anchored to the equilibrium river
  curve.
- Each section stores position and velocity. The reveal frontier leads, and
  downstream sections follow through critically damped propagation.
- Direction reverses from the same progress velocity and settles without
  turning the river into an unconstrained cloth ribbon.
- Guide positions and velocities are packed into one reusable float
  `DataTexture`. The vertex shader samples neighbouring sections and rebuilds
  tangent, lateral direction, and local normal.

### Water optics and state progression

- Reduced the material architecture to one principal water pass plus one cheap
  morning contact pass.
- The contact pass fades from progress 0.56 to 0.72 and stops drawing after it
  becomes transparent. Both shader programs are warmed during the monitor
  grace period so the first theme switch does not compile a shader on input.
- Replaced per-fragment procedural noise with one generated and reused
  128×128 periodic normal/height/caustic texture.
- Combined broad undulation, crossing medium bands, and fragmented fine detail
  in local river coordinates.
- Rebuilt highlights with two soft-box responses, Fresnel, texture-gated
  segments, short multidirectional crests, shallow absorption, approximate
  refraction, and broken caustic structure.
- Fragmented the long Voronoi-like loops found in late iterations and reduced
  continuous early-stage body opacity, which removed most of the road/satin
  read.
- Added irregular independent banks, five sparse tendrils, and 22 deterministic
  droplets while retaining one continuous world curve.
- The five stages are continuously blended:
  - 0.00: broken source thread and sparse beads
  - 0.25: transparent narrow stream with capillary edge response
  - 0.50: shallow confluence with crossing bands
  - 0.75: broad river with denser multiscale structure
  - 1.00: full water field continuing outside the frame

## Visual evidence

All final desktop files are real 1440×900 PNGs. All final mobile files are real
390×844 PNGs.

### Desktop night

- [0.00](final/desktop/night-1440x900-p00.png)
- [0.25](final/desktop/night-1440x900-p25.png)
- [0.50](final/desktop/night-1440x900-p50.png)
- [0.75](final/desktop/night-1440x900-p75.png)
- [1.00](final/desktop/night-1440x900-p100.png)

### Desktop morning

- [0.00](final/desktop/morning-1440x900-p00.png)
- [0.25](final/desktop/morning-1440x900-p25.png)
- [0.50](final/desktop/morning-1440x900-p50.png)
- [0.75](final/desktop/morning-1440x900-p75.png)
- [1.00](final/desktop/morning-1440x900-p100.png)

### Mobile

- Night:
  [0.00](final/mobile/night-390x844-p00.png),
  [0.50](final/mobile/night-390x844-p50.png),
  [1.00](final/mobile/night-390x844-p100.png)
- Morning:
  [0.00](final/mobile/morning-390x844-p00.png),
  [0.50](final/mobile/morning-390x844-p50.png),
  [1.00](final/mobile/morning-390x844-p100.png)

### Before / after

| State | Rejected V1.2 baseline | V1.3 release |
| --- | --- | --- |
| Night 0.50 | [before](baseline/night-1440x900-p50.png) | [after](final/desktop/night-1440x900-p50.png) |
| Night 1.00 | [before](baseline/night-1440x900-p100.png) | [after](final/desktop/night-1440x900-p100.png) |
| Morning 0.50 | [before](baseline/morning-1440x900-p50.png) | [after](final/desktop/morning-1440x900-p50.png) |
| Morning 1.00 | [before](baseline/morning-1440x900-p100.png) | [after](final/desktop/morning-1440x900-p100.png) |

Seventeen visual tuning rounds were performed. The required minimum of three
matching-progress comparisons is exceeded; representative evidence is retained
under [iterations/](iterations/), including the final narrow-stream, full-field,
and bank-softening rounds 13–17.

## Performance evidence

Source of truth:
[release-metrics.json](final/performance/release-metrics.json).

These are production-preview measurements during active slow scroll, rapid
direction reversal, native wheel input, and theme switching. They are not idle
average FPS readings.

| Scenario | FPS | p50 | p95 | p99 | Max | >18 / >33 / >50 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Desktop night slow | 120 | 8.3 | 11.4 | 14.7 | 18.6 | 1 / 0 / 0 |
| Desktop night reverse | 119 | 8.3 | 13.4 | 18.1 | 34.8 | 4 / 1 / 0 |
| Desktop morning slow | 118 | 8.2 | 13.5 | 15.4 | 17.1 | 0 / 0 / 0 |
| Desktop morning reverse | 116 | 8.4 | 13.9 | 18.0 | 42.4 | 4 / 1 / 0 |
| Mobile night slow | 120 | 8.4 | 13.4 | 15.2 | 20.5 | 2 / 0 / 0 |
| Mobile morning reverse | 120 | 8.2 | 14.0 | 17.8 | 27.1 | 3 / 0 / 0 |

Native rapid reverse input:

| Viewport | Scroll input-to-frame p50 | p95 | p99 | Max | Render p95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1440×900 | 1.8 ms | 8.2 ms | 9.8 ms | 11.2 ms | 15.2 ms |
| 390×844 | 0.7 ms | 7.0 ms | 10.8 ms | 21.8 ms | 14.7 ms |

Theme switch input-to-frame was 4.1 ms. Its sampled render window was 104 FPS,
p95 17.1 ms, max 36.6 ms, and zero render frames above 50 ms.

All final scenarios reported zero runtime errors. The water shader programs
were runnable with empty program, vertex, and fragment logs. No React error
overlay appeared.

An early release run taken while two experimental headless Chrome processes and
bulk screenshot conversion were still competing for resources missed the
target. It is retained as outlier evidence rather than being hidden. The
experimental processes were stopped, the fill-rate bottleneck was addressed,
and the clean production repeats above are the release measurements.

## Performance architecture

- Desktop water renders internally at 864×540 (`0.60`) and composites into the
  1440×900 CSS viewport; mobile uses 319×692 (`0.82`) in the 390×844 viewport.
  DOM copy and controls remain native-resolution.
- Antialiasing is disabled and the renderer requests high-performance power
  preference.
- Surface tessellation is 184×22 plus sparse edge features: 8,452 triangles for
  the principal pass.
- Night and late-morning use one draw call. The early morning contact layer
  makes two draw calls only while it is visually useful.
- Per-frame curve reconstruction, arrays, repeated texture creation, and
  periodic monitor logging were removed.
- Profiling and `PerformanceObserver` collection only run with `?profile=1`.

## Verification

- `python3 /Users/zengze/.codex/skills/repo-verification-evidence/scripts/discover_verification.py /Users/zengze/Documents/portfolio` — PASS
- `npm run check` — PASS
- `npm run build` — PASS
- `git diff --check` — PASS

The production build retains Vite's non-failing warning that the main Three.js
bundle is larger than 500 kB.

## Remaining visual and platform risks

- The result is materially closer to shallow water than V1.2, especially at
  0.75–1.00, but it does not match the approved board's photoreal optical
  richness. At some 0.25–0.50 camera angles a single bank can still read more
  graphically than natural water.
- Morning water is intentionally near-colourless. On low-contrast displays,
  its middle stage may be too restrained.
- The desktop 0.60 render scale trades Retina micro-detail for stable frame
  pacing.
- Mobile checks use Chrome's exact 390×844 viewport, not physical iOS Safari or
  Android GPU hardware.
- The requested scope boundary is intact: no project worlds, cards, menu,
  separate ocean, bloom, particle field, post-processing, or audio work was
  added.
- The worktree remains uncommitted by request.
