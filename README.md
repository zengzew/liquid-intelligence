# Liquid Intelligence

An immersive WebGL motion prototype built around one persistent liquid sheet.
Wheel, touch, and keyboard input move a reversible master timeline through five
composed chapter states:

`ORIGIN → CURIOSITY → BUILD → CONFLUENCE → OCEAN`

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4173/`. Scroll or swipe to move between chapters, use
the number keys `1`–`5` to jump to a resting state, and use the top-right
control to switch between the night and morning environments.

## Prototype scope

- One persistent subdivided sheet with shallow thickness and five target poses
- One paused GSAP master timeline shared by geometry, camera, typography,
  lighting, and chapter indicator
- Fixed WebGL stage with no native vertical page journey
- Reversible, normalized wheel and touch input with nearest-chapter settling
- Restrained camera reframing instead of a first-person fly-through
- Matte-first dark and light 3D environments
- Responsive desktop/mobile compositions and reduced-motion support

Realistic water rendering, project content, particles, bloom, and portfolio
sections are intentionally excluded until the choreography prototype passes.

The V1 fly-through is preserved at the Git tag
`prototype-v1-water-study`. V2 development lives on
`prototype-v2-prior-motion`.
