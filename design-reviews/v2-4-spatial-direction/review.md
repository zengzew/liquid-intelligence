# V2.4 Spatial Narrative Direction

Date: 2026-07-30

## Approved direction

[`approved-spatial-storyboard.png`](approved-spatial-storyboard.png) is the
approved camera and screen-space direction reference.

The journey remains one continuous, reversible water world with the existing
five focus points:

| Focus | Spatial memory | Camera language |
| ---: | --- | --- |
| `0.03` | narrow source enters from the lower frame and develops upward | steep source overview |
| `0.22` | stream continues upward and begins to broaden | elevated view starts lifting |
| `0.46` | river is the dominant path and opens toward the upper frame | long oblique downstream view |
| `0.70` | broad current and tributaries converge toward the distance | low forward view approaching level |
| `0.92` | river resolves into an open sea | almost level ocean horizon |

The downstream direction must remain in the upper/forward part of the frame.
World-space width growth alone is not sufficient if perspective makes the
water read as widening toward the bottom.

## Baseline diagnosis

The original river geometry already grew from source to ocean, but the camera
was usually placed downstream and aimed back toward the source. That reversed
the geometry in screen space:

- the wider downstream portion occupied the lower foreground;
- the thin source receded toward the upper frame;
- the finale still looked down across a river tail instead of meeting a sea
  horizon.

The `before/` directory records the original result in both themes at all five
desktop focus points and representative mobile stages.

## Implementation

- `src/experience/CameraRig.tsx`
  - camera shots are now authored relative to the river curve rather than as
    unrelated world-space positions;
  - every shot keeps the camera upstream of its target;
  - pitch descends monotonically from steep overview to near-horizontal;
  - desktop and mobile retain separate framing;
  - lightweight camera telemetry exposes direction and pitch for acceptance.
- `src/experience/ExperienceScene.tsx`
  - passes the shared river curve into the camera rig, making water and camera
    use one spatial source of truth.
- `src/journey/worlds/OceanWorld.tsx`
  - sea surface, light path, and horizon glow now face the downstream
    negative-Z journey axis;
  - the ocean plane extends beyond the new forward view;
  - the tide mask now reveals the sea from the horizon toward the camera
    instead of hiding it at the end.
- `src/styles.css`
  - the mobile Ocean contact rail is lifted above the chapter index so the
    final horizon composition and contact actions no longer collide.

## Acceptance evidence

The `after/` directory contains:

- typography-isolated water captures for both themes at all five focus points,
  at actual `1440 × 900` and `390 × 844` viewports;
- complete-page captures with typography at Origin, River, and Ocean for both
  themes and both viewport sizes.

Every fixed-focus capture reported `cameraDirection=downstream`,
`material=physical`, and `runtimeErrors=0`.

### Camera contract readback

| Focus | Desktop downward pitch | Mobile downward pitch |
| ---: | ---: | ---: |
| `0.03` | `63.9°` | `64.6°` |
| `0.22` | `20.5°` | `22.1°` |
| `0.46` | `13.2°` | `14.6°` |
| `0.70` | `8.6°` | `10.1°` |
| `0.92` | `0.3°` | `0.4°` |

This gives a monotonic source-overview-to-horizon lift in both compositions.

### Real scroll and reversibility

An actual desktop wheel-scroll pass, with no progress query override, sampled:

- forward progress / pitch:
  `0.133 / 37.9°`,
  `0.325 / 17.8°`,
  `0.486 / 13.4°`,
  `0.608 / 10.2°`,
  `0.825 / 4.4°`,
  `0.993 / 0.1°`;
- reverse progress / pitch:
  `0.840 / 0.5°`,
  `0.674 / 9.0°`,
  `0.507 / 12.2°`,
  `0.340 / 14.2°`,
  `0.174 / 22.2°`,
  `0.007 / 64.5°`.

The camera direction remained `downstream` throughout, so reverse scrolling
retraced the same world instead of flipping its orientation. Runtime errors
remained zero. Switching Night → Morning at progress `0.46` preserved
`downstream`, `13.2°`, and the same progress.

### WebGL health

Final Night Ocean readback at `0.92`:

- `120 FPS` on this local 120 Hz run;
- `13` draw calls;
- `236,322` triangles;
- `18` geometries and `6` textures;
- `21` WebGL programs, `0` shader failures;
- Physical water selected with `mirrorRenderTarget=null`;
- `0` application runtime errors.

These figures are hardware/run-specific engineering evidence, not a visual
quality score.

### Repository gates

- `npm run check` — pass
- `npm run build` — pass; the existing large-chunk advisory remains
- `git diff --check` — pass

The development server also repeated the existing Three.js `Clock`
deprecation warning. It did not increment the application runtime-error
counter or produce a shader failure.

## Honest visual verdict

The requested spatial narrative direction passes: water now develops toward
the upper frame, the camera continuously lifts, and both Night and Morning end
at a real level sea horizon on desktop and mobile. The experience is materially
more cinematic and the final metaphor now resolves correctly.

This does not by itself make the whole portfolio award-level. The largest
remaining visual weakness is the sparse environmental staging around the early
and middle river in Night, followed by the intentionally pale Morning water
grade. Those are separate atmosphere/material iterations rather than failures
of this spatial-direction contract.
