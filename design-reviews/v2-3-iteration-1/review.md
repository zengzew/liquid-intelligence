# V2.3 Iteration 1 — Ocean Finale Rebuild

Date: 2026-07-29
Scope: `src/journey/worlds/OceanWorld.tsx` only. All prior uncommitted work preserved.

## Review verdict before iteration

The journey reads as one continuous water world through Origin → Source →
River → Tributaries, but the **Ocean finale was the weakest memory of the
experience**, exactly where the stream-to-sea metaphor should peak:

- Night: the sea was a defocused grey blob with a hard plane edge, no
  horizon, no scale — it read as fog, not water.
- Morning: white-on-white void; the water vanished entirely.
- The camera far-plane (140) clipped the old 170×224 plane before fog could
  fully hide the boundary.

## What changed

Replaced the blurred `MeshPhysicalMaterial` sea with a purpose-built GLSL
ocean (single surface pass + one horizon glow sprite):

- Distance-graded body colour with manual fog that melts into the exact
  scene background and is forced to complete before the far-plane — the
  horizon always reads, no clip edge can ever appear.
- Moon/sun glitter path computed in world space (view azimuth vs journey
  axis), with **anisotropic** sparkle stretched along the view direction so
  highlights read as moonlight streaks on swell, not isotropic grain.
- Sinus-smoothed, hash-dithered horizon glow (Prior's gradient trick) that
  anchors the final composition and gives the eye a destination.
- Gentle long swells in the vertex stage that flatten with distance.
- Presence ramp and theme damping identical to the previous implementation;
  render order and depth behaviour unchanged, so the river→ocean merge at
  progress 0.8–0.9 is untouched.

## Evidence

- `before/` — 15 baseline captures (5 chapters + river-close, night/morning,
  mobile), zero runtime errors.
- `after-tuned/` — ocean scenes at progress 0.84 / 0.92 / 1.0, both themes +
  mobile night, zero runtime errors.
- `journey-after/` — full 15-scene journey re-capture; Origin → Tributaries
  pixel-identical to baseline, confirming no regression upstream.

## Engineering

- `npm run check` (tsc) — clean.
- `npm run build` — clean (pre-existing chunk-size warning only).
- `dataset.runtimeErrors = 0` on every captured scene.

## Honest status

The finale now delivers a real night sea with a moon path and a morning
horizon with a sun glow — the closing memory finally matches the metaphor.
Remaining known gaps, in priority order:

1. Morning theme globally washes the water out — the river stages lose
   materiality on the cream background. Needs a morning-specific water grade
   (deeper body, stronger specular path), not just lighter colours.
2. Mobile Ocean chapter: contact links overlap the chapter index rail
   (pre-existing DOM layout issue).
3. The night world beyond the water is still a pure void; a faint far-shore
   silhouette or star field could give the black more spatial depth.
