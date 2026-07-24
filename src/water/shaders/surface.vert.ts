const surfaceVertexShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uMotionScale;
  uniform float uProgress;
  uniform vec2 uPointer;
  uniform float uReveal;
  uniform sampler2D uGuideTexture;
  uniform sampler2D uNoiseTexture;
  uniform float uGuideCount;

  attribute float aLongitudinal;
  attribute float aAcross;
  attribute vec3 aLocalOffset;
  attribute float aFeature;

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

  vec3 readGuidePosition(float guideIndex) {
    float clampedIndex = clamp(guideIndex, 0.0, uGuideCount - 1.0);
    float guideU = (clampedIndex + 0.5) / uGuideCount;
    return texture2D(uGuideTexture, vec2(guideU, 0.25)).xyz;
  }

  vec3 readGuideVelocity(float guideIndex) {
    float clampedIndex = clamp(guideIndex, 0.0, uGuideCount - 1.0);
    float guideU = (clampedIndex + 0.5) / uGuideCount;
    return texture2D(uGuideTexture, vec2(guideU, 0.75)).xyz;
  }

  vec3 interpolateGuidePosition(float guidePosition) {
    float lowerGuide = floor(guidePosition);
    float guideMix = fract(guidePosition);
    return mix(
      readGuidePosition(lowerGuide),
      readGuidePosition(lowerGuide + 1.0),
      guideMix
    );
  }

  void main() {
    float guidePosition =
      clamp(aLongitudinal, 0.0, 1.0) * (uGuideCount - 1.0);
    float lowerGuide = floor(guidePosition);
    float guideMix = fract(guidePosition);
    vec3 guideCenter = interpolateGuidePosition(guidePosition);
    vec3 previousCenter = readGuidePosition(lowerGuide - 1.0);
    vec3 nextCenter = readGuidePosition(lowerGuide + 2.0);
    vec3 guideVelocity = mix(
      readGuideVelocity(lowerGuide),
      readGuideVelocity(lowerGuide + 1.0),
      guideMix
    );
    vec3 guideTangent = normalize(nextCenter - previousCenter);
    vec3 guideLateral = normalize(cross(vec3(0.0, 1.0, 0.0), guideTangent));
    vec3 guideNormal = normalize(cross(guideTangent, guideLateral));
    vec3 transformed =
      guideCenter +
      guideTangent * aLocalOffset.x +
      guideLateral * aLocalOffset.y +
      guideNormal * aLocalOffset.z;

    float downstream = smoothstep(0.025, 0.82, aLongitudinal);
    float narrowStage = smoothstep(0.08, 0.42, uProgress);
    float riverStage = smoothstep(0.38, 0.88, uProgress);
    float broadNoise = texture2D(
      uNoiseTexture,
      vec2(
        aLongitudinal * 1.76 - uTime * 0.0026,
        aAcross * 0.18 + aLongitudinal * 0.37
      )
    ).b;
    float foldNoise = texture2D(
      uNoiseTexture,
      vec2(
        aLongitudinal * 3.82 - uTime * 0.0052,
        aAcross * 0.43 - aLongitudinal * 0.61
      )
    ).a;
    vec2 flowCoordinate = vec2(
      aLocalOffset.y,
      aLongitudinal * 188.0
    );

    float broadFold =
      (broadNoise - 0.5) * mix(0.03, 0.075, riverStage) +
      sin(
        flowCoordinate.y * 0.17 +
        flowCoordinate.x * 0.46 -
        uTime * 0.16 +
        foldNoise * 3.7
      ) *
        mix(0.007, 0.026, riverStage) *
        mix(0.32, 1.0, smoothstep(0.28, 0.72, broadNoise));
    float mediumRipple =
      sin(
        flowCoordinate.y * 0.53 -
        flowCoordinate.x * 1.12 -
        uTime * 0.31 +
        broadNoise * 5.4
      ) *
      mix(0.002, 0.013, narrowStage) *
      mix(0.24, 1.0, smoothstep(0.3, 0.7, foldNoise));
    float diagonalRipple =
      sin(
        flowCoordinate.y * 0.37 +
        flowCoordinate.x * 1.46 -
        uTime * 0.24 +
        foldNoise * 4.6
      ) *
      mix(0.0015, 0.009, riverStage) *
      mix(0.28, 1.0, smoothstep(0.32, 0.74, broadNoise));
    float edgeFold =
      smoothstep(0.58, 1.0, abs(aAcross)) *
      sin(
        flowCoordinate.y * 0.29 -
        aAcross * 8.0 -
        uTime * 0.21
      ) *
      mix(0.004, 0.018, narrowStage);
    float propagationLift = clamp(
      dot(guideVelocity, guideNormal) * 0.018,
      -0.006,
      0.008
    );
    float surfaceWave =
      (
        broadFold +
        mediumRipple +
        diagonalRipple +
        edgeFold
      ) *
      mix(0.34, 1.0, downstream) *
      uMotionScale;

    float pointerProgress = max(0.05, uReveal - 0.045);
    float pointerDistance = distance(
      vec2(aAcross * 0.5 + 0.5, aLongitudinal),
      vec2(0.5 + uPointer.x * 0.14, pointerProgress - uPointer.y * 0.016)
    );
    float pointerRipple =
      sin(pointerDistance * 36.0 - uTime * 0.78) *
      exp(-pointerDistance * 25.0) *
      0.0025 *
      uMotionScale;

    transformed +=
      guideNormal * (surfaceWave + pointerRipple + propagationLift);

    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vWorldPosition = worldPosition.xyz;
    vGuideNormal = normalize(mat3(modelMatrix) * guideNormal);
    vGuideTangent = normalize(mat3(modelMatrix) * guideTangent);
    vGuideLateral = normalize(mat3(modelMatrix) * guideLateral);
    vFlowCoordinate = flowCoordinate;
    vAcross = aAcross;
    vLongitudinal = aLongitudinal;
    vWave = surfaceWave + pointerRipple + propagationLift;
    vSurfaceDensity = mix(broadNoise, foldNoise, 0.42);
    vFeature = aFeature;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export default surfaceVertexShader;
