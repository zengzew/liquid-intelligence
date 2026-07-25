const depthVertexShader = /* glsl */ `
  precision highp float;

  attribute float aLongitudinal;
  attribute float aAcross;

  varying float vAcross;
  varying float vLongitudinal;
  varying float vDepth;

  #include <fog_pars_vertex>

  void main() {
    vec3 transformed = position;
    float downstream = smoothstep(0.04, 0.96, aLongitudinal);
    float depth =
      mix(0.045, 0.24, downstream) +
      pow(abs(aAcross), 1.8) * mix(0.018, 0.065, downstream);

    transformed.y -= depth;
    vAcross = aAcross;
    vLongitudinal = aLongitudinal;
    vDepth = depth;

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`;

export default depthVertexShader;
