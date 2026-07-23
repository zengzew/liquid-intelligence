const glintsFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTheme;

  varying float vAlpha;

  void main() {
    float distanceToCenter = length(gl_PointCoord - vec2(0.5));
    float shape = smoothstep(0.5, 0.08, distanceToCenter);
    vec3 nightColor = vec3(0.72, 0.82, 0.88);
    vec3 morningColor = vec3(0.18, 0.23, 0.25);
    vec3 color = mix(nightColor, morningColor, uTheme);

    gl_FragColor = vec4(color, shape * vAlpha * mix(0.68, 0.44, uTheme));

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default glintsFragmentShader;
