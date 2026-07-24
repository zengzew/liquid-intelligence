const reflectionFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uReveal;
  uniform float uTheme;
  uniform float uReflectionMode;

  varying vec3 vWorldPosition;
  varying float vAcross;
  varying float vLongitudinal;
  varying float vWave;

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

    for (int octave = 0; octave < 3; octave++) {
      result += amplitude * noise21(value);
      value = value * 2.03 + vec2(12.8, 17.1);
      amplitude *= 0.5;
    }

    return result;
  }

  float revealMask() {
    return
      (1.0 - smoothstep(
        uReveal - 0.018,
        uReveal,
        vLongitudinal
      )) *
      smoothstep(0.0, 0.004, vLongitudinal);
  }

  void main() {
    vec3 tangentX = dFdx(vWorldPosition);
    vec3 tangentY = dFdy(vWorldPosition);
    vec3 normal = normalize(cross(tangentX, tangentY));

    if (!gl_FrontFacing) {
      normal *= -1.0;
    }

    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(
      1.0 - clamp(dot(normal, viewDirection), 0.0, 1.0),
      1.72
    );

    float downstreamNoise = fbm(vec2(
      vLongitudinal * 7.5 - uTime * 0.055,
      vAcross * 1.55 + uTime * 0.006
    ));
    float slowWarp =
      sin(vLongitudinal * 11.0 - uTime * 0.075) * 0.045 +
      (downstreamNoise - 0.5) * 0.22;
    float streamCoordinate = vAcross + slowWarp;

    float softBand =
      exp(-pow((streamCoordinate - 0.14) / 0.26, 2.0));
    float sideBand =
      exp(-pow((streamCoordinate + 0.48) / 0.16, 2.0));
    float narrowBand =
      1.0 -
      smoothstep(0.012, 0.05, abs(streamCoordinate - 0.43));

    float broadPatch = smoothstep(
      0.32,
      0.68,
      fbm(vec2(vLongitudinal * 6.2 - uTime * 0.06, vAcross * 1.3))
    );
    float lineBreak = smoothstep(
      0.5,
      0.74,
      noise21(vec2(
        vLongitudinal * 19.0 - uTime * 0.13,
        vAcross * 3.4
      ))
    );

    float edgeDistance = 1.0 - abs(vAcross);
    float edgeNoise = noise21(vec2(
      vLongitudinal * 42.0 - uTime * 0.08,
      vAcross * 5.0
    ));
    float edgeMask = smoothstep(
      0.006 + edgeNoise * 0.026,
      0.064 + edgeNoise * 0.034,
      edgeDistance
    );
    float edgeSheen =
      (1.0 - smoothstep(0.0, 0.13, edgeDistance)) *
      smoothstep(0.62, 0.86, edgeNoise);

    float bands =
      softBand * (0.12 + broadPatch * 0.3) +
      sideBand * (0.08 + broadPatch * 0.18) +
      narrowBand * lineBreak * 0.24;
    float glassThread = pow(
      0.5 +
        0.5 *
          sin(
            streamCoordinate * 24.0 +
            downstreamNoise * 6.5 +
            vLongitudinal * 1.7
          ),
      24.0
    );
    float secondaryThread = pow(
      0.5 +
        0.5 *
          sin(
            streamCoordinate * 37.0 -
            downstreamNoise * 5.0 -
            vLongitudinal * 2.4
          ),
      30.0
    );
    float rippleRidge = pow(
      0.5 +
        0.5 *
          sin(
            vLongitudinal * 276.0 -
            uTime * 0.58 +
            downstreamNoise * 8.0 +
            streamCoordinate * 3.0
          ),
      22.0
    );
    float rippleBreak = smoothstep(
      0.5,
      0.72,
      noise21(vec2(
        vLongitudinal * 25.0 - uTime * 0.11,
        vAcross * 2.4
      ))
    );
    float transverseBreak = smoothstep(
      0.46,
      0.69,
      fbm(vec2(
        vLongitudinal * 34.0 - uTime * 0.1,
        vAcross * 5.8 + uTime * 0.008
      ))
    );
    float brokenRipples =
      rippleRidge *
      rippleBreak *
      mix(0.08, 1.0, transverseBreak) *
      (softBand * 0.32 + sideBand * 0.16);
    float reflection =
      bands * mix(0.95, 0.7, uTheme) +
      glassThread * lineBreak * mix(0.32, 0.2, uTheme) +
      secondaryThread *
        broadPatch *
        mix(0.18, 0.12, uTheme) +
      brokenRipples * mix(0.58, 0.36, uTheme) +
      edgeSheen * mix(0.16, 0.11, uTheme);
    reflection *= mix(0.58, 1.2, fresnel);
    reflection += abs(vWave) * mix(0.9, 0.5, uTheme);
    reflection *= mix(1.45, 1.08, uTheme);

    float baseSheen =
      mix(0.022, 0.055, uTheme) *
      mix(0.45, 1.0, fresnel);
    float sourceSheen =
      (1.0 - smoothstep(0.015, 0.11, vLongitudinal)) *
      mix(0.27, 0.14, uTheme);
    float alpha =
      (baseSheen + sourceSheen + reflection) *
      edgeMask *
      revealMask();

    if (alpha < 0.008) {
      discard;
    }

    float themeWeight = mix(1.0 - uTheme, uTheme, uReflectionMode);
    vec3 nightSilver = vec3(0.91, 0.92, 0.89);
    vec3 morningGraphite = vec3(0.17, 0.2, 0.21);
    vec3 color = mix(nightSilver, morningGraphite, uReflectionMode);
    gl_FragColor = vec4(
      color,
      clamp(alpha * themeWeight, 0.0, 0.62)
    );

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default reflectionFragmentShader;
