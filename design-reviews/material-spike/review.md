# Water Material Reference Spike

## Controlled setup

- River curve, width profile, reveal progression, scroll direction, and camera shots are unchanged.
- Every capture uses a 1440 × 900 viewport with DOM typography hidden.
- The comparison state is reproducible through `material`, `theme`, and `progress` query parameters.
- The contact sheet contains all 18 combinations: 3 materials × 2 themes × 3 progress values.

## Evaluation

| Approach | Reads as water | Premium appearance | Dark-mode quality | Light-mode quality | Performance | Custom river suitability |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Current | 3 | 5 | 4 | 5 | 8 | 9 |
| Three.js Water | 7 | 7 | 7 | 6 | 6 | 7 |
| Physical water | 8 | 8 | 8 | 7 | 8 | 9 |

Performance is scored comparatively from render-path cost: the official Water
variant adds a 512 × 512 mirror render pass, while the Physical variant uses the
shared environment plus a single physical surface. The debug panel exposes live
device FPS for interactive confirmation.

## Findings

### Current

The baseline preserves the existing look and performs well, but its repeated
longitudinal filaments still read as illuminated lanes or fibre-optic strands.
The problem becomes strongest at progress 0.60 and 0.90 in night mode.

### Three.js Water

The official mirror and Fresnel pipeline gives the surface real reflected scene
content. Its broken central highlight reads more like water than the baseline,
especially at night. The trade-off is the extra mirror pass and the fact that
the official implementation models one reflection plane while the authored
river has small height changes along its length.

### Physical water

The Physical surface has the best balance of irregular reflected light, visible
charcoal/blue-grey midtones, restrained transmission, and a readable under-water
bed. It remains outlined against the morning background without becoming a
glass object. Its two downstream normal layers interrupt the highlight rather
than drawing parallel white lines.

## Selection

**Select Physical water for the next water-polish round.**

It reads most clearly as calm, premium water while preserving the current
journey geometry and scroll experience. It is also the less expensive runtime
choice than the technically more complex mirror-render approach.

## References

- [Three.js Water documentation](https://threejs.org/docs/pages/Water.html)
- [Three.js Water source](https://github.com/mrdoob/three.js/blob/r185/examples/jsm/objects/Water.js)
- [thaslle/stylized-water](https://github.com/thaslle/stylized-water)
