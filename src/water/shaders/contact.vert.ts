const contactVertexShader = /* glsl */ `
  precision highp float;

  attribute float aLongitudinal;
  attribute float aAcross;

  varying vec3 vWorldPosition;
  varying float vAcross;
  varying float vLongitudinal;

  void main() {
    vec3 transformed = position;
    transformed.y -= 0.052;
    transformed.x -= 0.018;
    transformed.z += 0.026;

    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vWorldPosition = worldPosition.xyz;
    vAcross = aAcross;
    vLongitudinal = aLongitudinal;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export default contactVertexShader;
