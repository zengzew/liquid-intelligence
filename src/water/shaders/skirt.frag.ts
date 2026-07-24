const skirtFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uReveal;
  uniform float uTheme;
  uniform float uTime;

  varying vec2 vSkirtUv;
  varying float vLongitudinal;

  void main() {
    float reveal =
      (1.0 - smoothstep(
        uReveal - 0.024,
        uReveal,
        vLongitudinal
      )) *
      smoothstep(0.0, 0.003, vLongitudinal);
    float thicknessVariation =
      0.82 +
      sin(vLongitudinal * 37.0 - uTime * 0.055) * 0.1 +
      sin(vLongitudinal * 81.0 - uTime * 0.1) * 0.045;
    float depthGradient = mix(0.82, 0.16, vSkirtUv.x);
    vec3 nightDeep = vec3(0.055, 0.064, 0.066);
    vec3 morningDeep = vec3(0.24, 0.285, 0.295);
    vec3 color = mix(nightDeep, morningDeep, uTheme);
    float alpha =
      reveal *
      depthGradient *
      thicknessVariation *
      mix(0.58, 0.31, uTheme);

    if (alpha < 0.008) {
      discard;
    }

    gl_FragColor = vec4(color, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default skirtFragmentShader;
