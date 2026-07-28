import riverRevealFragmentFunctions from "./reveal.glsl";

const depthFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uReveal;
  uniform float uProgress;
  uniform float uTheme;
  uniform float uTime;
  uniform float uFlowEnergy;
  uniform float uFlowPhase;

  varying float vAcross;
  varying float vLongitudinal;
  varying float vDepth;

  #include <fog_pars_fragment>

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

  ${riverRevealFragmentFunctions}

  void main() {
    float reveal = liquidRevealMask(
      vLongitudinal,
      vAcross,
      uReveal,
      uTime,
      uFlowPhase,
      uFlowEnergy
    );

    if (reveal < 0.01) {
      discard;
    }

    float edge = smoothstep(0.0, 0.42, 1.0 - abs(vAcross));
    float broadNoise = noise21(vec2(
      vLongitudinal * 8.0 - uTime * 0.006,
      vAcross * 1.7
    ));
    float depthShade = smoothstep(0.04, 0.3, vDepth);

    vec3 nightShallow = vec3(0.15, 0.18, 0.19);
    vec3 nightDeep = vec3(0.05, 0.072, 0.08);
    vec3 morningShallow = vec3(0.56, 0.64, 0.65);
    vec3 morningDeep = vec3(0.35, 0.46, 0.49);
    vec3 nightColor = mix(nightShallow, nightDeep, depthShade);
    vec3 morningColor = mix(morningShallow, morningDeep, depthShade);
    float oceanBlend =
      smoothstep(0.8, 0.91, uProgress) *
      smoothstep(0.7, 0.92, vLongitudinal);
    nightColor = mix(
      nightColor,
      vec3(0.014, 0.018, 0.02),
      oceanBlend * 0.88
    );
    morningColor = mix(
      morningColor,
      vec3(0.92, 0.91, 0.88),
      oceanBlend * 0.9
    );
    vec3 color = mix(nightColor, morningColor, uTheme);

    color *= mix(0.93, 1.03, broadNoise);
    color *= mix(0.82, 1.0, edge);
    float alpha =
      reveal *
      mix(0.76, 0.7, uTheme) *
      mix(1.0, 0.055, oceanBlend);
    if (alpha < 0.008) {
      discard;
    }
    gl_FragColor = vec4(color, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export default depthFragmentShader;
