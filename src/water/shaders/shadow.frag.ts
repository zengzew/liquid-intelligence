const shadowFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uReveal;
  uniform float uProgress;
  uniform float uTheme;
  uniform float uTime;
  uniform sampler2D uNoiseTexture;

  varying float vAcross;
  varying float vLongitudinal;

  void main() {
    if (uTheme < 0.015) {
      discard;
    }

    float edgeDistance = 1.0 - abs(vAcross);
    float reveal =
      (1.0 - smoothstep(
        uReveal - 0.034,
        uReveal,
        vLongitudinal
      )) *
      smoothstep(0.0, 0.003, vLongitudinal);
    float causticStage = smoothstep(0.24, 0.78, uProgress);
    float contactLifecycle =
      1.0 - smoothstep(0.56, 0.72, uProgress);
    vec4 contactNoise = texture2D(
      uNoiseTexture,
      vec2(
        vLongitudinal * 2.7 + vAcross * 0.08 + uTime * 0.0018,
        vLongitudinal * 0.83 - vAcross * 0.17 - uTime * 0.0012
      )
    );
    float edgeUndulation =
      (contactNoise.a - 0.5) * 0.11 +
      (contactNoise.b - 0.5) * 0.07;
    float bodyMask = smoothstep(
      0.015,
      0.095,
      edgeDistance + edgeUndulation
    );
    float causticShadow = smoothstep(
      0.64,
      0.9,
      contactNoise.a * 0.58 + contactNoise.b * 0.42
    );
    float contactVariation = mix(
      0.58,
      1.16,
      smoothstep(0.18, 0.82, contactNoise.b)
    );
    float alpha =
      bodyMask *
      reveal *
      contactLifecycle *
      mix(
        0.006,
        0.012 +
          (1.0 - causticStage) * 0.045 +
          causticShadow * 0.032 * causticStage,
        uTheme
      ) *
      contactVariation *
      mix(0.64, 1.0, smoothstep(0.025, 0.66, vLongitudinal)) *
      mix(0.18, 1.0, smoothstep(0.07, 0.3, uProgress));

    if (alpha < 0.003) {
      discard;
    }

    gl_FragColor = vec4(
      mix(vec3(0.0), vec3(0.045, 0.13, 0.17), uTheme),
      alpha
    );

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default shadowFragmentShader;
