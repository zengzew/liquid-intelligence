# AGENTS.md

## Project

Liquid Intelligence is an immersive WebGL personal portfolio experience.

This is not a normal portfolio website. The website itself is the experience.

Core metaphor:

A small stream grows into a river and finally becomes an ocean.

The water represents:

- engineering journey
- AI exploration
- creativity
- continuous learning

Water is the navigation system, the continuous world, and the main storytelling
medium. Do not place decorative WebGL behind a conventional website.

## Creative Direction

Target feeling:

- minimal
- elegant
- cinematic
- premium
- calm
- immersive

The user should feel that they are traveling through one authored world rather
than browsing separate pages or watching a generic Three.js demo.

Avoid:

- generic portfolio and SaaS layouts
- dashboard or HUD styling
- disconnected scenes
- cyberpunk styling
- excessive neon, particles, and decorative effects
- features that weaken the water-led journey

## Prior Reference

Study these two case studies before making major visual or interaction
decisions:

- https://medium.com/%40hello_11138/prior-holdings-experience-case-study-8c4be7a95281
- https://immersive-g.com/projects/prior-holding/?utm_source=chatgpt.com+%22Prior+Holding%22

Representative images:

- https://ig-medias-prod.ams3.digitaloceanspaces.com/medium_desktop_2160x1245_1_71c5662bde.jpg
- https://ig-medias-prod.ams3.digitaloceanspaces.com/medium_desktop_2160x1245_2_af90c09786.jpg
- https://ig-medias-prod.ams3.digitaloceanspaces.com/medium_desktop_2160x1245_4_6fccf3d10d.jpg
- https://ig-medias-prod.ams3.digitaloceanspaces.com/medium_desktop_2160x1245_5_868e96e86d.jpg
- https://ig-medias-prod.ams3.digitaloceanspaces.com/medium_desktop_2160x1245_7_acda1ebbba.jpg

Prior is a reference for experience quality and creative principles, not a
template to copy. Learn from how one central visual element carries motion,
emotion, content, and continuity through an entire journey. Do not copy its
branding, ribbon, or individual compositions.

## Local Source of Truth

Use only the current Portfolio workspace as the local project source:

`/Users/zengze/Documents/portfolio`

Read the current code, Git diff, `README.md`, and evidence under
`design-reviews/`. Historical screenshots explain earlier decisions, but the
current checkout and its live browser rendering are the latest truth.

Do not look for or rely on the deleted `/Users/zengze/Documents/prior` project.

## Experience Rules

Preserve:

- one continuous water world
- a stream growing into a river and ocean
- five clearly authored stages with distinct visual memories
- a downstream screen-space direction that travels from the lower foreground
  toward the upper frame; the water must become visibly broader in that
  forward/upward direction
- a camera journey that begins in a steep source overview and continuously
  raises to a level ocean horizon
- scrolling as the driver of camera, water, and scene progression
- reversible, continuous travel
- water as the main character
- intentional Night and Morning environments
- authored desktop and mobile compositions
- project stories that emerge naturally from the water world

Avoid traditional page transitions and conventional portfolio sections.

Theme changes must affect the 3D environment, not only CSS.

The spatial direction is a narrative contract, not just a world-coordinate
detail. At the five authored focus points (`0.03`, `0.22`, `0.46`, `0.70`,
`0.92`), the viewer must read forward progress toward the top/horizon rather
than a river widening toward the bottom of the screen. Scrolling upward must
reverse the same path without a cut or orientation flip.

## Technical Direction

Use the existing React, TypeScript, Three.js, React Three Fiber, Drei, GSAP, and
GLSL architecture.

Keep WebGL concerns separated, components reusable, and shaders maintainable,
while allowing the implementation approach to follow the strongest creative
solution.

## Working Method

Before editing:

1. Read this file and inspect `git status`.
2. Preserve all existing and uncommitted work.
3. Experience the latest version in a real browser.
4. Review the result against the project purpose and Prior case studies.

Then identify the single issue that most limits the overall experience and
complete one focused, high-impact iteration. Do not stop at recommendations
when the task authorizes implementation, and do not redesign unrelated systems
without evidence.

Never reset, clean, discard, or overwrite existing work. Do not commit, push,
or deploy unless the user explicitly requests it.

## Acceptance Standard

Review the finished result in a real browser across the journey, both themes,
and representative desktop and mobile views.

Separate engineering health from visual quality. A successful build or good
frame rate does not prove that the experience is visually complete.

Before considering a visual task complete, ask:

> Does this feel like an award-level immersive WebGL experience?

If it still feels like a normal Three.js demo, say so honestly, identify the
largest remaining weakness, and continue improving when it is within scope.
