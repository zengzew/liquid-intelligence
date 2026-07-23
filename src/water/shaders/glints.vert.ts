const glintsVertexShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uProgress;
  uniform float uMotionScale;

  attribute float aPathProgress;
  attribute float aSeed;
  attribute float aSize;

  varying float vAlpha;

  void main() {
    float reveal = mix(0.34, 0.865, smoothstep(0.0, 1.0, uProgress));
    float revealMask = 1.0 - smoothstep(
      reveal - 0.025,
      reveal + 0.025,
      aPathProgress
    );
    float shimmer = pow(
      sin(uTime * (0.34 + aSeed * 0.2) + aSeed * 18.0) * 0.5 + 0.5,
      5.0
    );
    vec3 transformed = position;
    transformed.y +=
      sin(uTime * 0.42 + aSeed * 16.0) *
      0.018 *
      uMotionScale;

    vec4 modelViewPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
    gl_PointSize = clamp(
      (0.8 + aSize * 1.35) * (18.0 / max(-modelViewPosition.z, 0.1)),
      0.75,
      4.6
    );
    vAlpha = revealMask * mix(0.12, 0.64, shimmer) * aSize;
  }
`;

export default glintsVertexShader;
