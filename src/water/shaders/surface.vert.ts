const surfaceVertexShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uMotionScale;
  uniform vec2 uPointer;
  uniform float uReveal;
  uniform float uFlowDirection;
  uniform float uFlowEnergy;
  uniform float uFlowPhase;

  attribute float aLongitudinal;
  attribute float aAcross;

  varying vec2 vRiverUv;
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
      value = value * 2.03 + vec2(13.1, 9.7);
      amplitude *= 0.5;
    }

    return result;
  }

  void main() {
    vec3 transformed = position;
    float downstream = smoothstep(0.05, 0.92, aLongitudinal);
    float broadSwell =
      (
        sin(
          aLongitudinal * 12.8 -
          uTime * 0.16 -
          uFlowPhase * 0.52 +
          aAcross * 1.9
        ) * 0.032 +
        sin(
          aLongitudinal * 6.1 -
          uTime * 0.065 -
          uFlowPhase * 0.21 -
          aAcross * 3.2
        ) * 0.018
      ) *
      mix(0.42, 1.0, 1.0 - abs(aAcross));
    float bankRoll =
      sin(
        aLongitudinal * 9.2 -
        uTime * 0.11 -
        uFlowPhase * 0.28 +
        0.65
      ) *
      aAcross *
      0.026;
    float capillary =
      (
        sin(
          aLongitudinal * 91.0 -
          uTime * 0.82 -
          uFlowPhase * 2.3 +
          aAcross * 4.6
        ) * 0.009 +
        sin(
          aLongitudinal * 47.0 -
          uTime * 0.44 -
          uFlowPhase * 1.4 -
          aAcross * 8.0
        ) * 0.006
      ) *
      mix(0.2, 1.0, downstream);
    float flowImpulse =
      sin(
        aLongitudinal * 27.0 -
        uTime * 0.34 -
        uFlowPhase * 2.6 +
        aAcross * (4.0 + uFlowDirection * 1.15)
      ) *
      0.03 *
      uFlowEnergy *
      mix(0.5, 1.0, 1.0 - abs(aAcross)) *
      downstream;

    float pointerProgress = max(0.02, uReveal - 0.04);
    float pointerDistance = distance(
      vec2(aAcross * 0.5 + 0.5, aLongitudinal),
      vec2(0.5 + uPointer.x * 0.16, pointerProgress - uPointer.y * 0.018)
    );
    float pointerRipple =
      sin(pointerDistance * 46.0 - uTime * 1.65) *
      exp(-pointerDistance * 22.0) *
      0.011 *
      uMotionScale;

    float wave =
      (
        broadSwell +
        bankRoll +
        capillary +
        flowImpulse +
        pointerRipple
      ) *
      smoothstep(0.12, 0.78, aLongitudinal) *
      uMotionScale;
    transformed.y += wave;

    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vRiverUv = vec2(aAcross * 0.5 + 0.5, aLongitudinal);
    vWorldPosition = worldPosition.xyz;
    vAcross = aAcross;
    vLongitudinal = aLongitudinal;
    vWave = wave;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export default surfaceVertexShader;
