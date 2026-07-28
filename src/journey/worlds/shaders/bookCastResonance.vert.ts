const bookCastResonanceVertexShader = /* glsl */ `
  uniform float uMotionScale;
  uniform float uTime;

  varying vec2 vResonanceUv;

  #include <fog_pars_vertex>

  void main() {
    vResonanceUv = uv;

    vec3 transformed = position;
    transformed.y +=
      (
        sin(uv.x * 13.0 + uv.y * 5.0 - uTime * 0.18) * 0.0028 +
        sin(uv.x * 27.0 - uv.y * 9.0 + uTime * 0.11) * 0.0016
      ) *
      uMotionScale;

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`;

export default bookCastResonanceVertexShader;
