import oceanTransitionGlsl from "./oceanTransition.glsl";

const skirtFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uReveal;
  uniform float uProgress;
  uniform float uTheme;

  varying vec2 vSkirtUv;
  varying float vLongitudinal;

  ${oceanTransitionGlsl}

  void main() {
    float reveal = riverRevealCoverage(
      uReveal,
      uProgress,
      vLongitudinal
    );
    float depthGradient = mix(0.72, 0.18, vSkirtUv.x);
    vec3 nightDeep = vec3(0.018, 0.021, 0.022);
    vec3 morningDeep = vec3(0.25, 0.32, 0.34);
    vec3 color = mix(nightDeep, morningDeep, uTheme);
    float oceanBlend = riverToOceanBlend(uProgress, vLongitudinal, uTheme);
    float alpha =
      reveal *
      depthGradient *
      mix(0.58, 0.44, uTheme) *
      mix(1.0, 0.025, oceanBlend);

    if (alpha < 0.008) {
      discard;
    }

    gl_FragColor = vec4(color, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default skirtFragmentShader;
