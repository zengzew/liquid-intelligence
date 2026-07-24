const skirtFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uReveal;
  uniform float uTheme;

  varying vec2 vSkirtUv;
  varying float vLongitudinal;

  void main() {
    float reveal =
      (1.0 - smoothstep(
        uReveal - 0.018,
        uReveal,
        vLongitudinal
      )) *
      smoothstep(0.0, 0.004, vLongitudinal);
    float depthGradient = mix(0.72, 0.18, vSkirtUv.x);
    vec3 nightDeep = vec3(0.018, 0.021, 0.022);
    vec3 morningDeep = vec3(0.35, 0.39, 0.4);
    vec3 color = mix(nightDeep, morningDeep, uTheme);
    float alpha = reveal * depthGradient * mix(0.54, 0.28, uTheme);

    if (alpha < 0.008) {
      discard;
    }

    gl_FragColor = vec4(color, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default skirtFragmentShader;
