const riverRevealFragmentFunctions = /* glsl */ `
  float liquidRevealHash21(vec2 value) {
    value = fract(value * vec2(127.1, 311.7));
    value += dot(value, value + 34.53);
    return fract(value.x * value.y);
  }

  float liquidRevealNoise21(vec2 value) {
    vec2 index = floor(value);
    vec2 fraction = fract(value);
    fraction = fraction * fraction * (3.0 - 2.0 * fraction);

    float a = liquidRevealHash21(index);
    float b = liquidRevealHash21(index + vec2(1.0, 0.0));
    float c = liquidRevealHash21(index + vec2(0.0, 1.0));
    float d = liquidRevealHash21(index + vec2(1.0, 1.0));

    return mix(mix(a, b, fraction.x), mix(c, d, fraction.x), fraction.y);
  }

  float liquidRevealMask(
    float longitudinal,
    float across,
    float reveal,
    float time,
    float flowPhase,
    float flowEnergy
  ) {
    float bankLag = pow(abs(across), 1.55) * 0.018;
    float frontNoise = liquidRevealNoise21(vec2(
      across * 2.7 + flowPhase * 0.045,
      reveal * 12.0 - time * 0.018 - flowPhase * 0.07
    ));
    float frontPulse = sin(
      across * 4.8 +
      reveal * 22.0 -
      time * 0.16 -
      flowPhase * 0.28
    ) * (0.0035 + flowEnergy * 0.0045);
    float frontier =
      reveal -
      bankLag +
      (frontNoise - 0.5) * 0.012 +
      frontPulse;
    float feather = mix(0.042, 0.03, clamp(flowEnergy, 0.0, 1.0));

    return
      (1.0 - smoothstep(
        frontier - feather,
        frontier,
        longitudinal
      )) *
      smoothstep(0.0, 0.006, longitudinal);
  }
`;

export default riverRevealFragmentFunctions;
