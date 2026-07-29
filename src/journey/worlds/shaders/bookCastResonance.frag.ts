const bookCastResonanceFragmentShader = /* glsl */ `
  uniform vec3 uMorningColor;
  uniform float uMotionScale;
  uniform vec3 uNightColor;
  uniform float uPresence;
  uniform float uTheme;
  uniform float uTime;

  varying vec2 vResonanceUv;

  #include <common>
  #include <fog_pars_fragment>

  float resonanceBand(float coordinate, float center, float width) {
    return 1.0 - smoothstep(
      width,
      width * 2.35,
      abs(coordinate - center)
    );
  }

  void main() {
    float across = vResonanceUv.x * 2.0 - 1.0;
    float slowDrift =
      sin(across * 2.7 + uTime * 0.16) *
      0.008 *
      uMotionScale;
    float bandCoordinate = vResonanceUv.y + slowDrift;
    float bands =
      resonanceBand(bandCoordinate, 0.22, 0.018) +
      resonanceBand(bandCoordinate, 0.5, 0.021) +
      resonanceBand(bandCoordinate, 0.78, 0.017);

    float interruptionA =
      sin(
        across * 5.8 +
        vResonanceUv.y * 8.0 -
        uTime * 0.13
      ) *
      0.5 +
      0.5;
    float interruptionB =
      sin(
        across * 9.6 -
        vResonanceUv.y * 5.0 +
        uTime * 0.07
      ) *
      0.5 +
      0.5;
    float broken =
      smoothstep(
        0.26,
        0.66,
        interruptionA * 0.68 + interruptionB * 0.32
      );
    float edgeFade =
      1.0 - smoothstep(0.64, 0.98, abs(across));
    float lengthFade =
      smoothstep(0.02, 0.13, vResonanceUv.y) *
      (1.0 - smoothstep(0.87, 0.98, vResonanceUv.y));

    vec3 color = mix(uNightColor, uMorningColor, uTheme);
    float alpha =
      uPresence *
      bands *
      edgeFade *
      lengthFade *
      (0.028 + broken * mix(0.15, 0.095, uTheme));

    if (alpha < 0.003) {
      discard;
    }

    gl_FragColor = vec4(color, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export default bookCastResonanceFragmentShader;
