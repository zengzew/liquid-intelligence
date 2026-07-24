const skirtVertexShader = /* glsl */ `
  precision highp float;

  attribute float aLongitudinal;

  varying vec2 vSkirtUv;
  varying float vLongitudinal;

  void main() {
    vSkirtUv = uv;
    vLongitudinal = aLongitudinal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export default skirtVertexShader;
