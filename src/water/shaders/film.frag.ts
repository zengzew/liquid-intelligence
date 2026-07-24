const filmFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uReveal;
  uniform float uProgress;
  uniform float uTheme;
  uniform sampler2D uNoiseTexture;

  varying vec3 vWorldPosition;
  varying vec3 vGuideNormal;
  varying vec3 vGuideTangent;
  varying vec3 vGuideLateral;
  varying vec2 vFlowCoordinate;
  varying float vAcross;
  varying float vLongitudinal;
  varying float vWave;
  varying float vSurfaceDensity;
  varying float vFeature;

  float revealMask() {
    return
      (1.0 - smoothstep(
        uReveal - 0.028,
        uReveal,
        vLongitudinal
      )) *
      smoothstep(0.0, 0.003, vLongitudinal);
  }

  void main() {
    float narrowStage = smoothstep(0.08, 0.4, uProgress);
    float confluenceStage = smoothstep(0.28, 0.68, uProgress);
    float riverStage = smoothstep(0.34, 0.82, uProgress);
    float fieldStage = smoothstep(0.82, 1.0, uProgress);
    float narrowFlowWeight =
      narrowStage *
      (1.0 - smoothstep(0.34, 0.62, uProgress));
    vec2 waterPosition = vFlowCoordinate;
    vec2 detailUvA =
      waterPosition * vec2(0.075, 0.058) +
      vec2(uTime * 0.006, -uTime * 0.004);
    vec2 detailUvB =
      vec2(waterPosition.y * 0.056, -waterPosition.x * 0.082) +
      vec2(-uTime * 0.0045, uTime * 0.0055);
    vec4 detailB = texture2D(uNoiseTexture, detailUvB);
    detailUvA += (detailB.rg - 0.5) * 0.38;
    vec4 detailA = texture2D(uNoiseTexture, detailUvA);
    float threadStage =
      1.0 - smoothstep(0.045, 0.28, uProgress);
    float threadCore =
      (1.0 - smoothstep(0.12, 0.82, abs(vAcross))) *
      threadStage *
      mix(
        0.18,
        1.0,
        smoothstep(0.38, 0.68, detailA.a)
      );
    float dropletFeature = smoothstep(0.82, 0.98, vFeature);
    float tendrilFeature =
      smoothstep(0.25, 0.62, vFeature) *
      (1.0 - dropletFeature);
    float dropletVisibility =
      dropletFeature *
      (1.0 - smoothstep(0.24, 0.68, uProgress));
    float tendrilVisibility =
      tendrilFeature *
      smoothstep(0.12, 0.42, uProgress) *
      (1.0 - smoothstep(0.72, 0.96, uProgress));
    float warp =
      (vSurfaceDensity - 0.5) * 2.2 +
      (detailA.a - 0.5) * 1.15 +
      (detailB.b - 0.5) * 0.72;

    vec2 broadDirectionA = vec2(0.42, 0.075);
    vec2 broadDirectionB = vec2(-0.31, 0.11);
    float broadPhaseA =
      dot(waterPosition, broadDirectionA) +
      warp * 0.58 +
      uTime * 0.055;
    float broadPhaseB =
      dot(waterPosition, broadDirectionB) -
      warp * 0.46 -
      uTime * 0.041;
    vec2 broadWaves = sin(vec2(broadPhaseA, broadPhaseB));

    vec2 mediumDirectionA = vec2(3.35, 2.18);
    vec2 mediumDirectionB = vec2(-2.68, 3.08);
    float mediumPhaseA =
      dot(waterPosition, mediumDirectionA) +
      broadWaves.x * 2.05 +
      broadWaves.y * 1.32 +
      warp * 0.72 +
      (detailB.b - 0.5) * 3.2 +
      uTime * 0.135;
    float mediumPhaseB =
      dot(waterPosition, mediumDirectionB) -
      broadWaves.y * 1.86 +
      broadWaves.x * 1.14 -
      warp * 0.68 +
      (detailA.b - 0.5) * 3.6 -
      uTime * 0.105;
    vec2 mediumWaves = sin(vec2(mediumPhaseA, mediumPhaseB));

    vec2 detailSlope =
      (detailA.rg * 2.0 - 1.0) * 0.58 +
      vec2(detailB.g * 2.0 - 1.0, detailB.r * 2.0 - 1.0) * 0.42;
    vec2 broadSlope =
      broadDirectionA * broadWaves.y * 0.105 -
      broadDirectionB * broadWaves.x * 0.09;
    vec2 mediumSlope =
      mediumDirectionA * mediumWaves.y * 0.028 -
      mediumDirectionB * mediumWaves.x * 0.025;
    vec2 surfaceSlope =
      broadSlope * mix(0.42, 0.92, riverStage) +
      mediumSlope * mix(0.08, 0.78, confluenceStage) +
      detailSlope * mix(0.045, 0.235, riverStage);
    vec3 rippleNormal = normalize(
      vGuideNormal -
      vGuideLateral * surfaceSlope.x -
      vGuideTangent * surfaceSlope.y
    );

    vec3 tangentX = dFdx(vWorldPosition);
    vec3 tangentY = dFdy(vWorldPosition);
    vec3 derivativeNormal = normalize(cross(tangentX, tangentY));

    if (dot(derivativeNormal, vGuideNormal) < 0.0) {
      derivativeNormal *= -1.0;
    }

    vec3 normal = normalize(mix(
      derivativeNormal,
      rippleNormal,
      mix(0.48, 0.72, riverStage)
    ));
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 keyHalf = normalize(
      viewDirection +
      normalize(vec3(-0.44, 0.84, 0.3))
    );
    vec3 fillHalf = normalize(
      viewDirection +
      normalize(vec3(0.58, 0.76, -0.29))
    );
    float fresnel =
      1.0 - clamp(dot(normal, viewDirection), 0.0, 1.0);
    fresnel *= fresnel;
    float keyDot = max(dot(normal, keyHalf), 0.0);
    float keyDot2 = keyDot * keyDot;
    float keyDot4 = keyDot2 * keyDot2;
    float keyDot8 = keyDot4 * keyDot4;
    float keyDot16 = keyDot8 * keyDot8;
    float keyDot32 = keyDot16 * keyDot16;
    float keySpecular = keyDot32 * keyDot32 * keyDot32 * keyDot16;
    float fillDot = max(dot(normal, fillHalf), 0.0);
    float fillDot2 = fillDot * fillDot;
    float fillDot4 = fillDot2 * fillDot2;
    float fillDot8 = fillDot4 * fillDot4;
    float fillDot16 = fillDot8 * fillDot8;
    float fillSpecular = fillDot16 * fillDot16 * fillDot16 * fillDot16;

    float crestA = smoothstep(
      mix(0.72, 0.79, confluenceStage),
      0.99,
      clamp(0.5 + mediumWaves.x * 0.5, 0.0, 1.0)
    );
    float crestB = smoothstep(
      mix(0.74, 0.81, confluenceStage),
      0.99,
      clamp(0.5 + mediumWaves.y * 0.5, 0.0, 1.0)
    );
    float troughA = smoothstep(
      0.72,
      0.98,
      clamp(0.5 - mediumWaves.x * 0.5, 0.0, 1.0)
    );
    float segmentGateA =
      smoothstep(
        0.42,
        0.68,
        detailA.b * 0.54 +
        (0.5 + broadWaves.y * 0.5) * 0.46
      ) *
      smoothstep(
        0.38,
        0.64,
        detailB.b
      ) *
      smoothstep(
        0.36,
        0.74,
        0.5 + mediumWaves.y * 0.38 + (detailA.b - 0.5) * 0.5
      );
    float segmentGateB =
      smoothstep(
        0.52,
        0.76,
        detailB.b * 0.62 +
        (0.5 - broadWaves.x * 0.5) * 0.38
      ) *
      smoothstep(
        0.42,
        0.67,
        detailA.b
      ) *
      smoothstep(
        0.4,
        0.76,
        0.5 - mediumWaves.x * 0.36 + (detailB.b - 0.5) * 0.52
      );
    float secondaryBandWeight = mix(
      0.78,
      0.88,
      riverStage
    );
    float fragmentGateA = smoothstep(0.38, 0.76, detailA.a);
    float fragmentGateB = smoothstep(0.4, 0.78, detailB.a);
    float specularFragmentGate = clamp(
      fragmentGateA * 0.58 + fragmentGateB * 0.42,
      0.0,
      1.0
    );
    float brokenWaveBands =
      crestA *
        segmentGateA *
        mix(0.2, 1.0, fragmentGateA) +
      crestB *
        segmentGateB *
        secondaryBandWeight *
        mix(0.2, 1.0, fragmentGateB);
    float microCrest = smoothstep(
      0.72,
      0.96,
      clamp(detailA.b * 0.58 + detailB.b * 0.42, 0.0, 1.0)
    );
    microCrest *= smoothstep(0.42, 0.74, detailA.a);
    float fineFold =
      smoothstep(
        0.34,
        0.82,
        abs(detailA.r - detailA.g) +
        abs(detailB.r - detailB.g) * 0.72
      ) *
      smoothstep(0.34, 0.68, detailA.b);
    float causticNetwork = max(
      smoothstep(0.5, 0.86, detailA.a),
      smoothstep(0.54, 0.88, detailB.a) * 0.78
    );
    causticNetwork *= mix(
      0.3,
      1.0,
      smoothstep(0.12, 0.34, length(detailA.rg - detailB.gr))
    );
    causticNetwork *= mix(
      0.22,
      1.0,
      smoothstep(
        0.43,
        0.72,
        detailA.b * 0.56 + detailB.b * 0.44
      )
    );
    float brokenSpecular =
      (
        keySpecular * 1.38 +
        fillSpecular * 0.64
      ) *
      mix(0.34, 1.0, segmentGateA * 0.58 + segmentGateB * 0.42) *
      mix(0.24, 1.0, specularFragmentGate) *
      mix(0.7, 1.22, fresnel);
    float surfaceComplexity = max(confluenceStage, riverStage);
    float causticStructure =
      brokenWaveBands * mix(0.16, 0.7, confluenceStage) +
      microCrest * mix(0.1, 0.66, surfaceComplexity) +
      fineFold * mix(0.04, 0.54, surfaceComplexity) +
      causticNetwork * mix(0.025, 0.2, surfaceComplexity);
    float refractionStructure =
      troughA * segmentGateB * mix(0.18, 0.82, confluenceStage) +
      abs(vWave) * mix(0.32, 0.68, riverStage);

    float edgeDistance = 1.0 - abs(vAcross);
    float edgeVariation =
      detailA.a * 0.58 +
      detailB.a * 0.42;
    float edgeUndulation =
      (detailA.a - 0.5) * 0.13 +
      (detailB.a - 0.5) * 0.085;
    float edgeSoftness = confluenceStage * 0.065;
    float edgeMask = smoothstep(
      0.018 + edgeVariation * 0.016 + edgeSoftness,
      0.092 + edgeVariation * 0.064 + edgeSoftness * 1.4,
      edgeDistance +
        edgeUndulation * (1.0 - fieldStage * 0.84)
    );
    edgeMask = mix(edgeMask, 1.0, fieldStage * 0.92);
    float edgeRim =
      (1.0 - smoothstep(0.018, 0.17, edgeDistance)) *
      mix(0.48, 1.0, edgeVariation);
    edgeRim *= mix(
      0.3 + segmentGateA * 0.7,
      1.0,
      smoothstep(0.06, 0.22, edgeDistance)
    );
    edgeRim *= mix(
      0.32,
      1.0,
      smoothstep(0.38, 0.68, detailB.a)
    );
    edgeRim *= mix(1.0, 0.36, confluenceStage);
    edgeRim *= 1.0 - fieldStage * 0.84;
    float sourceContinuity = mix(
      0.28 + smoothstep(0.42, 0.66, detailA.a) * 0.72,
      1.0,
      smoothstep(0.06, 0.29, uProgress)
    );
    float density = smoothstep(0.14, 0.84, vSurfaceDensity);
    float broadShade = clamp(
      0.5 +
      broadWaves.x * 0.27 +
      broadWaves.y * 0.18,
      0.0,
      1.0
    );
    float bodyVariation =
      mix(0.82, 1.16, density) *
      mix(0.88, 1.08, broadShade);

    vec3 nightBody = mix(
      vec3(0.018, 0.037, 0.044),
      vec3(0.09, 0.135, 0.15),
      broadShade
    );
    vec3 nightSilver = vec3(0.95, 0.96, 0.94);
    float nightOpticsRaw = clamp(
        brokenSpecular * 0.46 +
        causticStructure * 1.24 +
        edgeRim * 0.68 +
        refractionStructure * 0.18 +
        threadCore * 0.84 +
        narrowFlowWeight * (
          segmentGateA * 0.34 +
          microCrest * 0.2 +
          fineFold * 0.25 +
          edgeRim * 0.12
        ) +
        dropletVisibility * 0.92 +
        tendrilVisibility * 0.28,
        0.0,
        1.0
    );
    float nightOptics =
      nightOpticsRaw *
      mix(1.0, nightOpticsRaw, riverStage * 0.72);
    vec3 nightColor = mix(
      nightBody,
      nightSilver,
      nightOptics
    );

    vec3 morningClear = vec3(0.58, 0.72, 0.75);
    vec3 morningContour = vec3(0.12, 0.27, 0.32);
    vec3 morningHighlight = vec3(0.96, 0.98, 0.97);
    float morningRefraction = clamp(
      refractionStructure * 0.42 +
      causticStructure * 0.84 +
      causticNetwork * 0.36 +
      edgeRim * 0.9 +
      threadCore * 0.96 +
      narrowFlowWeight * (
        segmentGateA * 0.3 +
        microCrest * 0.2 +
        fineFold * 0.24 +
        edgeRim * 0.16
      ) +
      dropletVisibility * 0.86 +
      tendrilVisibility * 0.24,
      0.0,
      1.0
    );
    float morningSpecular = clamp(
      brokenSpecular * 0.88 +
      causticStructure * 0.22,
      0.0,
      1.0
    );
    vec3 morningColor = mix(
      morningClear,
      morningContour,
      morningRefraction * 0.94
    );
    morningColor = mix(
      morningColor,
      morningHighlight,
      morningSpecular * 0.48
    );

    vec3 color = mix(nightColor, morningColor, uTheme);
    float nightBodyOpacity =
      mix(0.012, 0.058, confluenceStage) +
      threadStage * 0.012;
    float nightAlpha =
      nightBodyOpacity * bodyVariation +
      nightOptics * 0.82 +
      causticStructure * 0.12 +
      threadCore * 0.36 +
      dropletVisibility * 0.42 +
      tendrilVisibility * 0.12;
    float morningAlpha =
      0.0035 * bodyVariation +
      morningRefraction * 0.66 +
      morningSpecular * 0.06 +
      edgeRim * 0.18 +
      threadCore * 0.42 +
      dropletVisibility * 0.48 +
      tendrilVisibility * 0.14;
    float alpha =
      mix(nightAlpha, morningAlpha, uTheme) *
      edgeMask *
      sourceContinuity *
      revealMask();

    if (alpha < 0.004) {
      discard;
    }

    gl_FragColor = vec4(
      color,
      clamp(alpha, 0.0, mix(0.88, 0.5, uTheme))
    );

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default filmFragmentShader;
