const reflectionFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uReveal;
  uniform float uTheme;

  varying vec3 vWorldPosition;
  varying float vAcross;
  varying float vLongitudinal;
  varying float vWave;
  varying float vSurfaceDensity;

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

  float revealMask() {
    return
      (1.0 - smoothstep(
        uReveal - 0.024,
        uReveal,
        vLongitudinal
      )) *
      smoothstep(0.0, 0.003, vLongitudinal);
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
      1.55
    );

    float localField = noise21(vec2(
      vLongitudinal * 5.1 - uTime * 0.032,
      vAcross * 1.45 + vLongitudinal * 0.31
    ));
    float broadField = clamp(
      mix(vSurfaceDensity, localField, 0.22),
      0.0,
      1.0
    );
    float foldedNoise = noise21(vec2(
      vLongitudinal * 9.2 - uTime * 0.051,
      vAcross * 2.65 - vLongitudinal * 0.43
    ));
    float foldedField = mix(broadField, foldedNoise, 0.48);
    float clusterBreak = noise21(vec2(
      vLongitudinal * 17.0 - uTime * 0.075,
      vAcross * 4.1 + vLongitudinal * 0.22
    ));
    float quietNoise = noise21(vec2(
      vLongitudinal * 3.4 - uTime * 0.018,
      vAcross * 0.9 - vLongitudinal * 0.16
    ));
    float quietField = mix(vSurfaceDensity, quietNoise, 0.24);
    float fragmentField = noise21(vec2(
      vLongitudinal * 22.0 - uTime * 0.09,
      vAcross * 5.7 - vLongitudinal * 0.82
    ));
    float packetField = noise21(vec2(
      vLongitudinal * 29.0 - uTime * 0.08,
      vAcross * 6.4 - vLongitudinal * 1.15
    ));

    float largeCluster =
      smoothstep(0.37, 0.61, broadField) *
      smoothstep(0.32, 0.58, foldedField);
    float foldedCluster =
      smoothstep(0.4, 0.64, foldedField) *
      (1.0 - smoothstep(0.7, 0.86, broadField)) *
      smoothstep(0.36, 0.63, clusterBreak);
    float scatteredCluster =
      smoothstep(0.5, 0.72, clusterBreak) *
      smoothstep(0.31, 0.58, quietField);
    float downstream = smoothstep(0.16, 0.72, vLongitudinal);
    float packetGate = smoothstep(
      mix(0.52, 0.35, downstream),
      mix(0.72, 0.66, downstream),
      fragmentField
    );
    float segmentPulse =
      0.5 +
      0.5 *
        sin(
          vLongitudinal * 157.0 -
          uTime * 0.1 +
          packetField * 4.0
        );
    float segmentGate = mix(
      0.0,
      1.0,
      smoothstep(0.36, 0.7, segmentPulse)
    );
    float packetPhase = fract(
      vLongitudinal * 124.0 -
      uTime * 0.008 +
      packetField * 0.12
    );
    float longitudinalPacket =
      smoothstep(0.12, 0.22, packetPhase) *
      (1.0 - smoothstep(0.42, 0.54, packetPhase));

    vec3 softboxA = normalize(vec3(-0.26, 0.91, 0.31));
    vec3 softboxB = normalize(vec3(0.64, 0.72, -0.28));
    float softboxResponse =
      pow(max(dot(normal, softboxA), 0.0), 15.0) * 0.74 +
      pow(max(dot(normal, softboxB), 0.0), 26.0) * 0.42;
    softboxResponse = mix(0.34, 1.08, softboxResponse);

    float transverseRidge = pow(
      0.5 +
        0.5 *
          sin(
            vLongitudinal * 156.0 -
            uTime * 0.42 +
            vAcross * 17.0 +
            broadField * 8.0
          ),
      19.0
    );
    float diagonalRidge = pow(
      0.5 +
        0.5 *
          sin(
            vLongitudinal * 91.0 -
            uTime * 0.28 -
            vAcross * 24.0 +
            foldedField * 7.0
          ),
      23.0
    );
    float shortRippleMask =
      smoothstep(0.43, 0.67, clusterBreak) *
      (1.0 - smoothstep(0.77, 0.88, quietField));
    float brokenRipples =
      (
        transverseRidge * 0.66 +
        diagonalRidge * 0.4
      ) *
      shortRippleMask;

    float edgeDistance = 1.0 - abs(vAcross);
    float edgeNoise = noise21(vec2(
      vLongitudinal * 47.0 - uTime * 0.082,
      vAcross * 5.4 + vLongitudinal * 0.6
    ));
    float edgeMask = smoothstep(
      0.004 + edgeNoise * 0.018,
      0.072 + edgeNoise * 0.038,
      edgeDistance
    );
    float edgeFragment =
      (1.0 - smoothstep(0.015, 0.145, edgeDistance)) *
      smoothstep(0.59, 0.81, edgeNoise) *
      smoothstep(0.42, 0.69, foldedField);

    float broadReflection =
      (
        largeCluster * 0.86 +
        foldedCluster * 0.62 +
        scatteredCluster * 0.34
      ) *
      softboxResponse *
      2.0 *
      mix(0.015, 1.0, packetGate) *
      mix(0.45, 1.0, smoothstep(0.38, 0.65, packetField)) *
      segmentGate *
      longitudinalPacket;
    float surfaceVariation = mix(
      0.62,
      1.16,
      smoothstep(0.24, 0.78, vSurfaceDensity)
    );
    float reflection =
      (
        broadReflection +
        brokenRipples *
          mix(0.22, 0.72, packetGate) *
          smoothstep(0.4, 0.64, packetField) *
          segmentGate *
          longitudinalPacket +
        edgeFragment * 0.55
      ) *
      surfaceVariation *
      mix(0.68, 1.22, fresnel);
    reflection +=
      abs(vWave) *
      smoothstep(0.5, 0.75, clusterBreak) *
      mix(1.3, 0.82, uTheme) *
      longitudinalPacket *
      segmentGate;

    float baseFilm =
      mix(0.064, 0.085, uTheme) *
      mix(0.7, 1.16, quietField) *
      mix(0.68, 1.0, fresnel);
    float sourceDefinition =
      (1.0 - smoothstep(0.025, 0.12, vLongitudinal)) *
      mix(0.42, 0.44, uTheme) *
      (0.58 + broadField * 0.42);
    float alpha =
      (
        baseFilm +
        sourceDefinition +
        reflection * mix(0.72, 1.04, uTheme)
      ) *
      edgeMask *
      revealMask();

    if (alpha < 0.006) {
      discard;
    }

    vec3 nightSilver = vec3(0.92, 0.925, 0.9);
    vec3 morningGraphite = vec3(0.14, 0.17, 0.18);
    vec3 color = mix(nightSilver, morningGraphite, uTheme);
    color = mix(
      color,
      mix(vec3(0.98), vec3(0.34, 0.38, 0.39), uTheme),
      clamp(broadReflection * 0.26, 0.0, 0.18)
    );
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.72));

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default reflectionFragmentShader;
