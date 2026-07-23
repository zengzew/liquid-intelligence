# Liquid Intelligence V2 — Prior-style motion diagnosis

## Reference evidence

- V1 was preserved at tag `prototype-v1-water-study`; V2 work is on
  `prototype-v2-prior-motion`.
- The requested `references/prior/` directory is not present in this checkout or
  in `HEAD`, so there were no local screenshots or recordings to inspect.
- The supplied Immersive Garden case study was inspected in Chrome. It describes
  the Prior experience as one ribbon motif with seamless, organic interaction,
  and its embedded motion assets show the ribbon repeatedly becoming the
  composition rather than behaving as scenery.
- The newly supplied portfolio montage is the visual target and is preserved at
  `design-reviews/v2/reference-portfolio-target.jpg`. It locks the quiet black /
  warm-white themes, sparse editorial typography, left-side chapter rail, and
  the liquid occupying the central/right visual field.
- The original live Prior site currently closes the connection from this
  environment, so the case study and supplied montage are the available visual
  authorities for this pass.

## Why V1 is structurally wrong

V1 is not merely using the wrong shader. Its scene model is the inverse of the
target choreography:

1. `LiquidScene` gives the same long Catmull–Rom curve to both the water and the
   camera.
2. `CinematicCamera` advances along that curve and looks farther down it, which
   creates a first-person journey through a landscape.
3. `WaterStream` builds the entire track up front as closed `2π` radial
   cross-sections. Scroll only reveals and thickens that fixed track; it never
   changes into a new pose.
4. Native `500vh` document scrolling is the timeline. There are no chapters,
   reversible state transitions, gesture normalization, or nearest-state
   settling.
5. Camera, reveal, material motion, droplets, and lighting each smooth
   independently. There is no single playhead controlling the composition.
6. Typography does not participate in the WebGL composition.

That is why polishing V1 would preserve the unwanted feeling: the river remains
the world and the viewer travels through it. Prior-style choreography keeps the
viewer comparatively still while one persistent object stretches, folds,
crosses the frame, and becomes each new composition.

## V2 structural replacement

V2 will use one master journey playhead from `0` to `4`, with labels:

| Time | Chapter | Temporary line | Liquid pose |
| ---: | --- | --- | --- |
| 0 | ORIGIN | Every journey begins with a question. | Thin vertical S-stream, receding but fully in-frame |
| 1 | CURIOSITY | Questions pull the current forward. | Long lateral sweep that crosses the chapter word |
| 2 | BUILD | Ideas take form through making. | Wider folded sheet, turned toward the viewer |
| 3 | CONFLUENCE | Different paths become one direction. | Broad overlapping fan / confluence pose |
| 4 | OCEAN | Keep building beyond the horizon. | The same topology flattened into a wide tilted surface |

Wheel and touch input will retarget that playhead, clamp large deltas, and settle
to the nearest integer after input stops. Retargeting overwrites the current
settle motion so reversing remains immediate. Native page scrolling is removed;
the fixed stage is the gesture surface.

Every animated system reads the same playhead:

- one persistent open sheet mesh with shallow thickness and identical topology
  in all states;
- restrained keyed camera poses;
- chapter typography and its front/behind layering;
- light intensity, fog response, and background grade;
- the five-step chapter rail.

There will be no independent component timelines.

## Matte-first visual system

- Dark environment: near-black background, neutral white sheet, restrained
  gray typography.
- Light environment: warm-white morning background, pale neutral sheet, soft
  graphite typography.
- Editorial sans-serif typography with wide tracking, large chapter word, small
  number, and one supporting sentence.
- The large word sits behind the transparent WebGL canvas so the liquid can
  naturally cover it; essential small copy stays above the canvas.
- No project cards, navbar sections, particles, bloom, realistic water,
  transmission, sparkles, or ocean content in this prototype.

The motion prototype passes only if all five resting states are visibly distinct,
the same mesh remains mounted, forward and reverse input are smooth, and the
matte geometry already reads as an intentional premium composition.
