import oceanTransitionGlsl from "./oceanTransition.glsl";

const shadowFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uReveal;
  uniform float uProgress;
  uniform float uTheme;
  uniform float uTime;

  varying float vAcross;
  varying float vLongitudinal;

  ${oceanTransitionGlsl}

  float hash21(vec2 value) {
    value = fract(value * vec2(123.34, 456.21));
    value += dot(value, value + 45.32);
    return fract(value.x * value.y);
  }

  void main() {
    float edgeDistance = 1.0 - abs(vAcross);
    float edgeNoise = hash21(vec2(
      floor(vLongitudinal * 90.0 - uTime * 0.025),
      floor(vAcross * 7.0)
    ));
    float bodyMask = smoothstep(
      0.0,
      0.1 + edgeNoise * 0.035,
      edgeDistance
    );
    float reveal = riverRevealCoverage(
      uReveal,
      uProgress,
      vLongitudinal
    );
    float alpha =
      bodyMask *
      reveal *
      mix(0.022, 0.1, uTheme) *
      smoothstep(0.04, 0.72, vLongitudinal) *
      mix(
        1.0,
        0.025,
        riverToOceanBlend(uProgress, vLongitudinal, uTheme)
      );

    if (alpha < 0.004) {
      discard;
    }

    vec3 nightShadow = vec3(0.0);
    vec3 morningShadow = vec3(0.17, 0.19, 0.2);
    gl_FragColor = vec4(mix(nightShadow, morningShadow, uTheme), alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default shadowFragmentShader;
