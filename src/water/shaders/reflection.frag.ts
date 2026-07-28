import riverRevealFragmentFunctions from "./reveal.glsl";

const reflectionFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uReveal;
  uniform float uProgress;
  uniform float uTheme;
  uniform float uReflectionMode;
  uniform float uFlowDirection;
  uniform float uFlowEnergy;
  uniform float uFlowPhase;

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

  ${riverRevealFragmentFunctions}

  float revealMask() {
    return liquidRevealMask(
      vLongitudinal,
      vAcross,
      uReveal,
      uTime,
      uFlowPhase,
      uFlowEnergy
    );
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

    float channelCore =
      1.0 - smoothstep(0.18, 0.96, abs(vAcross));
    float shearSpeed = mix(0.68, 1.16, channelCore);
    float advectedPhase = uFlowPhase * shearSpeed;
    float downstreamNoise = fbm(vec2(
      vLongitudinal * 7.5 -
        uTime * 0.055 -
        advectedPhase * 0.18,
      vAcross * 1.55 +
        uTime * 0.006 +
        uFlowDirection *
          uFlowEnergy *
          mix(0.15, 0.055, channelCore)
    ));
    float slowWarp =
      sin(
        vLongitudinal * 11.0 -
        uTime * 0.075 -
        advectedPhase * 0.24
      ) * 0.045 +
      (downstreamNoise - 0.5) * 0.22 +
      sign(vAcross) *
        (1.0 - channelCore) *
        uFlowDirection *
        uFlowEnergy *
        0.035;
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
      fbm(vec2(
        vLongitudinal * 6.2 -
          uTime * 0.06 -
          advectedPhase * 0.2,
        vAcross * 1.3
      ))
    );
    float lineBreak = smoothstep(
      0.5,
      0.74,
      noise21(vec2(
        vLongitudinal * 19.0 - uTime * 0.13,
        vAcross * 3.4
      ))
    );
    float threadBreak = smoothstep(
      0.56,
      0.79,
      noise21(vec2(
        vLongitudinal * 43.0 - uTime * 0.16,
        streamCoordinate * 6.7 + 0.31
      ))
    );
    float mesoBreak = smoothstep(
      0.44,
      0.7,
      fbm(vec2(
        vLongitudinal * 15.0 -
          uTime * 0.105 -
          advectedPhase * 0.48,
        streamCoordinate * 4.4
      ))
    );
    float crestBreak = smoothstep(
      0.55,
      0.79,
      noise21(vec2(
        vLongitudinal * 68.0 -
          uTime * 0.21 -
          advectedPhase * 0.92,
        streamCoordinate * 8.6 + 0.27
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
      softBand * broadPatch * mesoBreak * 0.36 +
      sideBand * broadPatch * lineBreak * 0.2 +
      narrowBand * lineBreak * crestBreak * 0.22;
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
            uTime * 0.58 -
            advectedPhase * 2.4 +
            downstreamNoise * 8.0 +
            streamCoordinate * 3.0
          ),
      22.0
    );
    float rippleBreak = smoothstep(
      0.5,
      0.72,
      noise21(vec2(
        vLongitudinal * 25.0 -
          uTime * 0.11 -
          advectedPhase * 0.42,
        vAcross * 2.4
      ))
    );
    float transverseBreak = smoothstep(
      0.46,
      0.69,
      fbm(vec2(
        vLongitudinal * 34.0 -
          uTime * 0.1 -
          advectedPhase * 0.54,
        vAcross * 5.8 + uTime * 0.008
      ))
    );
    float brokenRipples =
      rippleRidge *
      rippleBreak *
      mix(0.08, 1.0, transverseBreak) *
      (0.12 + softBand * 0.46 + sideBand * 0.2);
    float capillaryGlints =
      pow(
        0.5 +
          0.5 *
            sin(
              vLongitudinal * 194.0 -
              uTime * 0.71 -
              advectedPhase * 3.1 -
              streamCoordinate * 21.0 +
              downstreamNoise * 9.0
            ),
        18.0
      ) *
      crestBreak *
      rippleBreak *
      (0.14 + channelCore * 0.56) *
      (0.22 + mesoBreak * 0.78);
    float reflection =
      bands * mix(0.5, 0.32, uTheme) +
      glassThread *
        lineBreak *
        threadBreak *
        mesoBreak *
        mix(0.48, 0.28, uTheme) +
      secondaryThread *
        broadPatch *
        threadBreak *
        crestBreak *
        mix(0.24, 0.15, uTheme) +
      brokenRipples * mix(0.92, 0.58, uTheme) +
      capillaryGlints * mix(0.62, 0.36, uTheme) +
      edgeSheen * mix(0.14, 0.095, uTheme);
    reflection *=
      mix(0.58, 1.2, fresnel) *
      (1.0 + uFlowEnergy * 0.18);
    reflection +=
      abs(vWave) *
      mix(0.58, 0.34, uTheme) *
      (0.18 + mesoBreak * 0.82);
    reflection *= mix(1.45, 1.08, uTheme);

    float baseSheen =
      mix(0.012, 0.028, uTheme) *
      mix(0.45, 1.0, fresnel);
    float sourceSheen =
      (1.0 - smoothstep(0.015, 0.11, vLongitudinal)) *
      mix(0.27, 0.14, uTheme);
    float alpha =
      (baseSheen + sourceSheen + reflection) *
      edgeMask *
      revealMask();
    float oceanBlend =
      smoothstep(0.8, 0.91, uProgress) *
      smoothstep(0.7, 0.92, vLongitudinal);
    float oceanPath = exp(-pow(streamCoordinate / 0.085, 2.0));
    alpha *= mix(1.0, oceanPath * 0.26, oceanBlend);

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
