const depthFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uReveal;
  uniform float uTheme;
  uniform float uTime;

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

  void main() {
    float reveal =
      (1.0 - smoothstep(
        uReveal - 0.02,
        uReveal,
        vLongitudinal
      )) *
      smoothstep(0.0, 0.004, vLongitudinal);

    if (reveal < 0.01) {
      discard;
    }

    float edge = smoothstep(0.0, 0.42, 1.0 - abs(vAcross));
    float broadNoise = noise21(vec2(
      vLongitudinal * 8.0 - uTime * 0.006,
      vAcross * 1.7
    ));
    float depthShade = smoothstep(0.04, 0.3, vDepth);

    vec3 nightShallow = vec3(0.125, 0.151, 0.16);
    vec3 nightDeep = vec3(0.042, 0.058, 0.065);
    vec3 morningShallow = vec3(0.69, 0.72, 0.71);
    vec3 morningDeep = vec3(0.43, 0.52, 0.535);
    vec3 nightColor = mix(nightShallow, nightDeep, depthShade);
    vec3 morningColor = mix(morningShallow, morningDeep, depthShade);
    vec3 color = mix(nightColor, morningColor, uTheme);

    color *= mix(0.93, 1.03, broadNoise);
    color *= mix(0.82, 1.0, edge);
    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export default depthFragmentShader;
