const highlightsFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uProgress;
  uniform float uTheme;

  varying vec2 vUv;
  varying float vLongitudinal;

  float hash21(vec2 value) {
    value = fract(value * vec2(123.34, 456.21));
    value += dot(value, value + 45.32);
    return fract(value.x * value.y);
  }

  float noise21(vec2 value) {
    vec2 index = floor(value);
    vec2 fraction = fract(value);
    fraction = fraction * fraction * (3.0 - 2.0 * fraction);

    float a = hash21(index);
    float b = hash21(index + vec2(1.0, 0.0));
    float c = hash21(index + vec2(0.0, 1.0));
    float d = hash21(index + vec2(1.0, 1.0));

    return mix(mix(a, b, fraction.x), mix(c, d, fraction.x), fraction.y);
  }

  float fbm(vec2 value) {
    float result = 0.0;
    float amplitude = 0.5;

    for (int octave = 0; octave < 4; octave++) {
      result += amplitude * noise21(value);
      value = value * 2.03 + vec2(11.8, 15.1);
      amplitude *= 0.5;
    }

    return result;
  }

  void main() {
    vec2 flowCoordinates = vec2(
      vUv.y * 25.0 - uTime * 0.3,
      vUv.x * 5.2
    );
    float warp = fbm(
      flowCoordinates * 0.46 + vec2(uTime * 0.018, -uTime * 0.012)
    );
    float current = fbm(
      flowCoordinates + vec2(warp * 3.7, -warp * 1.6)
    );
    float microCurrent = noise21(vec2(
      vUv.y * 142.0 - uTime * 0.9 + warp * 7.0,
      vUv.x * 24.0 + warp * 3.0
    ));
    float brokenFilament =
      smoothstep(0.68, 0.9, current) *
      smoothstep(0.58, 0.88, microCurrent);

    float edgeDistance = min(vUv.x, 1.0 - vUv.x);
    float edgeHighlight =
      (1.0 - smoothstep(0.025, 0.13, edgeDistance)) *
      smoothstep(0.54, 0.86, current);

    float reveal = mix(0.34, 0.865, smoothstep(0.0, 1.0, uProgress));
    float revealMask =
      (1.0 - smoothstep(reveal - 0.05, reveal + 0.04, vLongitudinal)) *
      smoothstep(0.0, 0.025, vLongitudinal);
    float themeStrength = mix(1.0, 0.16, uTheme);
    float alpha =
      (brokenFilament * 0.42 + edgeHighlight * 0.24) *
      revealMask *
      themeStrength;

    if (alpha < 0.008) {
      discard;
    }

    vec3 nightColor = vec3(0.66, 0.79, 0.87);
    vec3 morningColor = vec3(0.42, 0.48, 0.5);
    vec3 color = mix(nightColor, morningColor, uTheme);
    gl_FragColor = vec4(color, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default highlightsFragmentShader;
