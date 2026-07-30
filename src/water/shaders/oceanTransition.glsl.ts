const oceanTransitionGlsl = /* glsl */ `
  float riverRevealCoverage(
    float revealFrontier,
    float journeyProgress,
    float longitudinal
  ) {
    float oceanApproach = smoothstep(0.68, 0.84, journeyProgress);
    float frontierFeather = mix(0.02, 0.13, oceanApproach);

    return
      (1.0 - smoothstep(
        revealFrontier - frontierFeather,
        revealFrontier,
        longitudinal
      )) *
      smoothstep(0.0, 0.004, longitudinal);
  }

  float riverToOceanBlend(
    float journeyProgress,
    float longitudinal,
    float themeMix
  ) {
    float transitionEnd = mix(0.84, 0.88, themeMix);
    float temporal = smoothstep(0.72, transitionEnd, journeyProgress);
    float downstream = smoothstep(0.42, 0.88, longitudinal);

    // The whole visible river softens as the camera lowers, while the
    // downstream tail leads the handoff into the sea.
    float wholeRiverHandoff = mix(0.94, 0.9, themeMix);
    return temporal * mix(wholeRiverHandoff, 1.0, downstream);
  }
`;

export default oceanTransitionGlsl;
