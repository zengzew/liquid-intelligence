# Physical Water Production Review

Date: 2026-07-25

## Decision

Physical is now the production water material. A URL without a `material`
parameter resolves to Physical while the explicit regression routes remain
available:

- `?material=current`
- `?material=three-water`
- `?material=physical`

The comparison panel is absent from the production route and only mounts for
`?debug=water`.

## Visual review

- Night keeps readable blue-grey and graphite midtones. The silver reflection
  is offset and broken into irregular patches rather than forming a centered
  road, light strip, or liquid-metal ridge.
- Morning keeps a cool-grey silhouette and visible shallow/deep separation.
  Warm beige reflections are visible in restrained, discontinuous patches, so
  the result reads as water rather than matte plastic or a glass object.
- Both themes retain two downstream-moving normal layers with cross-coupled UV
  breakup. No longitudinal white line was reintroduced.
- The accepted river curve, width, camera, reveal, and scroll direction were
  not redesigned.

## Evidence matrix

| Theme | Progress | Viewport | Evidence |
| --- | ---: | ---: | --- |
| Night | 0.25 | 1440 x 900 | `night-1440x900-p25.jpg` |
| Night | 0.60 | 1440 x 900 | `night-1440x900-p60.jpg` |
| Night | 0.90 | 1440 x 900 | `night-1440x900-p90.jpg` |
| Morning | 0.25 | 1440 x 900 | `morning-1440x900-p25.jpg` |
| Morning | 0.60 | 1440 x 900 | `morning-1440x900-p60.jpg` |
| Morning | 0.90 | 1440 x 900 | `morning-1440x900-p90.jpg` |
| Night | 0.60 | 390 x 844 | `night-390x844-p60.jpg` |
| Morning | 0.60 | 390 x 844 | `morning-390x844-p60.jpg` |
| Night production default | live scroll start | 1440 x 900 | `production-default-1440x900.jpg` |

Every fixed-progress capture reported `material=physical`,
`waterDebug=false`, `runtimeErrors=0`, and
`mirrorRenderTarget=null`. All compiled WebGL programs reported
`runnable=true` with empty program, vertex, and fragment logs.

## Interaction and resource verification

- Clean `?theme=night`: Physical selected, no `material` query inserted, and no
  debug panel.
- `?debug=water`: material, theme, progress, FPS, and typography controls
  visible and operable.
- Theme control changed Night to Morning and updated URL/state.
- Progress control changed the live journey to `0.900` and updated URL/state.
- Typography isolation hid the interface and debug controls; its restore
  control returned them to visible state.
- Current route: no flow-normal texture and no mirror render target.
- Three Water selected: 19 geometries, 7 textures, and a 512 x 512 mirror
  render target.
- Physical selected again: 18 geometries, 6 textures, and no mirror render
  target. This readback verifies the Three Water target and extra resources
  were released on the variant transition.

An actual 1440 x 900 wheel-scroll pass sampled:

- Forward: `0.120, 0.246, 0.373, 0.499, 0.625, 0.751, 0.878, 0.994, 1.000`
- Reverse: `0.880, 0.754, 0.627, 0.501, 0.375, 0.248, 0.122, 0.005, 0.000`

The final state returned to `scrollY=0`, `progress=0.000`, with zero runtime
errors and all shader diagnostics healthy.

## Rendering metrics

Local Chrome on a 120 Hz display reported 120 FPS for the foreground desktop
and mobile evidence captures. A separate clean 1440 x 900 production-default
sample, while the other QA tabs were still rendering, reported 62 FPS.

The steady Physical render readback was:

- 11 draw calls
- 156,968 triangles
- 18 geometries
- 6 textures
- no mirror render target

No app-origin console errors were recorded. The only recurring warning was the
Three.js `Clock` deprecation warning injected through the development tooling;
one unrelated browser-extension error appeared in the long-running QA tab.

## Capture method and residual risk

The in-app browser was used for visual and interaction QA, but its temporary
viewport override did not change the page's actual inner dimensions. Exact
responsive evidence was therefore recaptured in the local Chrome session, with
the page itself reporting 1440 x 900 and 390 x 844 before capture. The saved
files were independently checked for those pixel dimensions.

Performance remains hardware, refresh-rate, and browser dependent. Static
screenshots cannot prove motion cadence on their own, so the downstream motion,
irregular breakup, theme transitions, and full scroll journey were also
inspected live.

The production build passes, but Vite still reports its advisory for the main
JavaScript chunk: 1,185.60 kB minified and 327.87 kB gzip. This is not a
rendering correctness blocker for this pass, but code splitting remains a
future load-performance opportunity.
