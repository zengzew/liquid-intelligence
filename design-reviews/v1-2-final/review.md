# Liquid Intelligence — Water Art Direction Rebuild V1.2 Review

Date: 2026-07-24
Verdict: **Pass — water visual foundation accepted for V1.2**

## Scope and reference handling

This pass changes only the visual foundation of the existing 0.00–1.00
journey. The supplied image
`/Users/zengze/Downloads/极简水流式界面设计展示.png` was used as art direction
for material, transparency, fragmented reflections, lighting, composition, and
restraint. It was not used as a texture and its page layout was not reproduced.

No project nodes, Source/River/Tributaries content, portfolio cards, navigation
menu, separate ocean scene, bloom layer, or particle field were added.

The approved copy is unchanged:

- `ZANE`
- `SOFTWARE ENGINEER`
- `Building with AI, code and creativity.`

## Preserved foundation

- Native vertical document scrolling.
- One reversible journey progress value for scroll, camera, reveal, and width.
- Top-to-bottom travel and nonlinear thin-to-wide growth.
- Separate authored desktop and mobile camera systems.
- Current minimal DOM interface and pointer restraint.
- Dark and morning themes.
- Reduced-motion support.

## Rebuilt water foundation

### Material and motion

- Removed the former fibre-detail shader layer and its continuous filament
  language.
- Replaced the physical road-like body with a dedicated translucent film
  shader whose alpha and colour vary with local surface density, fold phase,
  Fresnel response, and irregular edges.
- Rebuilt highlights as broad softbox responses constrained by noisy clusters,
  short transverse/diagonal ridges, packet masks, and guaranteed longitudinal
  gaps.
- Reduced fragment-noise cost by carrying broad multi-scale density from the
  displaced surface vertices and using cheaper local breakup in the reflection
  pass.
- Kept motion slow and downstream. Broad fields evolve slowly; smaller ripple
  and edge phases move slightly faster without becoming a particle sparkle.

### Silhouette and geometry

- Added independent left/right bank modulation, local width bulges, internal
  folds, narrow secondary lanes, and high-frequency edge irregularity.
- Added five disconnected thin edge tendrils and 22 deterministic sparse
  droplets directly to the water geometry.
- Extended the centre path beyond the final camera so progress 1.00 continues
  outside the viewport with no visible lower cutoff.
- Retessellated the final surface to 240 longitudinal by 30 cross segments.
  This preserves the smooth silhouette while reducing the rendered footprint
  from the early V1.2 pass to 45,148 triangles.

### Camera and lighting

- Authored distinct oblique compositions for 0.00, 0.25, 0.50, 0.75, and 1.00
  instead of repeating a centred one-point perspective.
- The opening source sits in the upper centre-right and occupies approximately
  22% of the desktop viewport height.
- Replaced theme-swapped reflection environments with one stable neutral
  softbox environment.
- Background, fog, hemisphere, key, fill, back light, body density, contours,
  and reflections now crossfade continuously between independently tuned night
  and morning targets.
- Removed the floor plane that produced a morning horizon and washed-out grey
  band.

## Largest mismatch ledger

| Baseline mismatch | Structural correction | Final evidence |
| --- | --- | --- |
| Glowing longitudinal fibres | Removed the fibre layer; packetised clustered reflections and transverse/diagonal details | [night 0.50](night-1440x900-p50.png), [night 1.00](night-1440x900-p100.png) |
| Metallic road body | Dedicated transparent film body remains visible between highlights | [night 0.75](night-1440x900-p75.png), [morning 0.75](morning-1440x900-p75.png) |
| Centred triangular funnel | Independent banks, local bulges, oblique cameras, and an extended curve | [night 1.00](night-1440x900-p100.png), [morning 1.00](morning-1440x900-p100.png) |
| Smooth ribbon with uniform thickness | Multi-scale vertex folds, local density, tendrils, droplets, and edge breakup | [mobile night 1.00](night-390x844-p100.png), [mobile morning 1.00](morning-390x844-p100.png) |
| Opening looked like a scratch | Deliberately framed source at the required scale and position | [night 0.00](night-1440x900-p00.png), [morning 0.00](morning-1440x900-p00.png) |
| Morning disappeared into grey | Clear film body, graphite contours, contact shadow, and no floor horizon | [morning 0.50](morning-1440x900-p50.png), [morning 1.00](morning-1440x900-p100.png) |
| Theme swap caused environment discontinuity | Stable PMREM plus continuously damped scene and material targets | [night start](theme-transition-night-start-1440x900.png), [300 ms midpoint](theme-transition-mid-300ms-1440x900.png), [morning end](theme-transition-morning-end-1440x900.png) |

## Visual iterations

Five captured iterations were completed before the final performance hardening:

1. [Iteration 01](iterations/01/) — established asymmetric geometry, new
   reflection language, environment, and camera shots. The source was oversized
   and morning retained a horizon.
2. [Iteration 02](iterations/02/) — improved source scale, morning transparency,
   and reflection visibility. The horizon and grey wash remained.
3. [Iteration 03](iterations/03/) — removed the floor/horizon and clarified the
   opening. A material rail still dominated the middle frame.
4. [Iteration 04](iterations/04/) — reduced body specular response and split
   reflection fields into independent packets.
5. [Iteration 05](iterations/05/) — added explicit segment gaps and restrained
   highlight strength.

The final uncaptured hardening pass replaced the remaining expensive physical
body with the film shader, guaranteed shorter packet duty cycles, fixed the
WebGL pixel ratio at 1, and reduced tessellation without visible faceting.

## Baseline and final comparisons

| State | Night baseline | Night final | Morning baseline | Morning final |
| --- | --- | --- | --- | --- |
| 0.00 | [baseline](baseline/night-1440x900-p00.png) | [final](night-1440x900-p00.png) | [baseline](baseline/morning-1440x900-p00.png) | [final](morning-1440x900-p00.png) |
| 0.50 | [baseline](baseline/night-1440x900-p50.png) | [final](night-1440x900-p50.png) | [baseline](baseline/morning-1440x900-p50.png) | [final](morning-1440x900-p50.png) |
| 1.00 | [baseline](baseline/night-1440x900-p100.png) | [final](night-1440x900-p100.png) | [baseline](baseline/morning-1440x900-p100.png) | [final](morning-1440x900-p100.png) |

Complete final matrices:

- Desktop night:
  [0.00](night-1440x900-p00.png),
  [0.25](night-1440x900-p25.png),
  [0.50](night-1440x900-p50.png),
  [0.75](night-1440x900-p75.png),
  [1.00](night-1440x900-p100.png)
- Desktop morning:
  [0.00](morning-1440x900-p00.png),
  [0.25](morning-1440x900-p25.png),
  [0.50](morning-1440x900-p50.png),
  [0.75](morning-1440x900-p75.png),
  [1.00](morning-1440x900-p100.png)
- Mobile night:
  [0.00](night-390x844-p00.png),
  [0.50](night-390x844-p50.png),
  [1.00](night-390x844-p100.png)
- Mobile morning:
  [0.00](morning-390x844-p00.png),
  [0.50](morning-390x844-p50.png),
  [1.00](morning-390x844-p100.png)

All 19 final root captures are true PNG files at the dimensions encoded in
their names.

## Scroll and reversibility checks

Native wheel/trackpad input was used; progress was read back from the live
journey state.

| Viewport/theme | Slow downward checkpoints | Slow upward checkpoints | Rapid endpoints |
| --- | --- | --- | --- |
| 1440×900 night | .112, .236, .364, .488, .611, .737, .861, .987 | .887, .759, .640, .518, .386, .262, .132, .000 | 1.000 → .002 |
| 1440×900 morning | .125, .242, .364, .488, .612, .737, .864, .990 | .884, .760, .636, .508, .388, .264, .140, .015 | 1.000 → .001 |
| 390×844 night | .117, .233, .364, .486, .613, .732, .861, .980 | .890, .765, .639, .512, .386, .261, .135, .010 | .999 → .001 |
| 390×844 morning | .111, .237, .361, .482, .611, .743, .866, .985 | .884, .767, .636, .512, .390, .268, .138, .012 | .999 → .001 |

All four slow sequences were monotonic in both directions. Rapid direction
changes returned through the same progress pipeline without snapping or
creating a second journey state.

## Performance and runtime validation

Measured in Chrome at the material-focused middle journey:

| Viewport/theme | FPS samples | Draw calls | Triangles | Result |
| --- | ---: | ---: | ---: | --- |
| 1440×900 night | 85–106 uncapped | 4 | 45,148 | Exceeds 55–60 target |
| 1440×900 morning | 95–105 uncapped | 4 | 45,148 | Exceeds 55–60 target |
| 390×844 night | 68 | 4 | 45,148 | Exceeds 30 target |
| 390×844 morning | 74 | 4 | 45,148 | Exceeds 30 target |

The machine uses a high-refresh display, so the uncapped desktop readings may
exceed 60. Seven WebGL programs were inspected; all were runnable with empty
program, vertex, and fragment logs. Chrome reported zero page runtime errors.

Repository gates:

- `python3 /Users/zengze/.codex/skills/repo-verification-evidence/scripts/discover_verification.py /Users/zengze/Documents/portfolio` — pass
- `npm run check` — pass
- `npm run build` — pass
- `git diff --check` — pass

The production build retains Vite's existing advisory that the main Three.js
bundle is larger than 500 kB; it is not a runtime failure.

## Remaining limitations

- The WebGL canvas intentionally renders at a pixel ratio of 1 for predictable
  frame time. DOM typography remains device-resolution sharp; the liquid layer
  trades a small amount of Retina micro-detail for a substantially safer GPU
  budget.
- Responsive validation covered desktop Chrome and the 390×844 Chrome viewport,
  not physical iOS Safari or Android hardware.
- Progress 1.00 only implies water continuing beyond the frame. The separate
  ocean and project-world layers remain intentionally unimplemented.

No project-world implementation was started.
