const waterVertexShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uProgress;
  uniform float uMotionScale;
  uniform vec2 uPointer;

  attribute vec3 aCenter;
  attribute float aLongitudinal;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying float vDisplacement;
  varying float vLongitudinal;

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

    for (int octave = 0; octave < 4; octave++) {
      result += amplitude * noise21(value);
      value = value * 2.03 + vec2(17.1, 11.7);
      amplitude *= 0.5;
    }

    return result;
  }

  void main() {
    vUv = uv;
    vLongitudinal = aLongitudinal;

    float widthScale = mix(0.72, 1.0, smoothstep(0.0, 1.0, uProgress));
    vec3 transformed = aCenter + (position - aCenter) * vec3(widthScale, 1.0, widthScale);
    vec3 lateralVector = position - aCenter;
    lateralVector.y = 0.0;

    float lateralLength = max(length(lateralVector), 0.0001);
    vec3 lateral = lateralVector / lateralLength;
    float flowingNoise = fbm(vec2(uv.y * 10.0 - uTime * 0.08, uv.x * 2.7 + uTime * 0.025));
    float broadWave = sin(uv.y * 41.0 - uTime * 0.72 + flowingNoise * 2.3);
    float crossWave = sin(uv.x * 10.0 + uv.y * 18.0 - uTime * 0.46);
    float fineWave = sin(uv.y * 126.0 - uTime * 1.28 + uv.x * 9.0);
    float downstreamEnergy = mix(0.36, 1.0, smoothstep(0.04, 0.92, uv.y));
    float surfaceWave =
      (broadWave * 0.045 + crossWave * 0.022 + fineWave * 0.008) *
      downstreamEnergy *
      uMotionScale;

    vec2 pointerUv = vec2(
      0.5 + uPointer.x * 0.34,
      mix(0.12, 0.87, uProgress) - uPointer.y * 0.045
    );
    float pointerDistance = distance(uv, pointerUv);
    float pointerRipple =
      sin(pointerDistance * 48.0 - uTime * 2.1) *
      exp(-pointerDistance * 13.0) *
      0.035 *
      uMotionScale;

    float lateralDrift =
      (flowingNoise - 0.5) *
      0.15 *
      downstreamEnergy *
      smoothstep(0.05, 0.95, abs(uv.x * 2.0 - 1.0));

    transformed.y += surfaceWave + pointerRipple;
    transformed += lateral * lateralDrift;

    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vWorldPosition = worldPosition.xyz;
    vDisplacement = surfaceWave + pointerRipple;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export default waterVertexShader;
