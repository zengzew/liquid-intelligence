const waterFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uProgress;
  uniform float uTheme;

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
      value = value * 2.04 + vec2(13.6, 9.3);
      amplitude *= 0.5;
    }

    return result;
  }

  void main() {
    vec3 tangentX = dFdx(vWorldPosition);
    vec3 tangentY = dFdy(vWorldPosition);
    vec3 normal = normalize(cross(tangentX, tangentY));

    if (!gl_FrontFacing) {
      normal *= -1.0;
    }

    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float viewFacing = max(dot(normal, viewDirection), 0.0);
    float fresnel = pow(1.0 - viewFacing, 2.65);

    vec3 nightLight = normalize(vec3(-0.38, 0.82, 0.42));
    vec3 morningLight = normalize(vec3(-0.24, 0.91, 0.34));
    vec3 lightDirection = normalize(mix(nightLight, morningLight, uTheme));
    vec3 reflectedLight = reflect(-lightDirection, normal);
    float specularPower = mix(108.0, 72.0, uTheme);
    float specular = pow(max(dot(reflectedLight, viewDirection), 0.0), specularPower);

    vec2 flowCoordinates = vec2(
      vUv.y * 22.0 - uTime * 0.22,
      vUv.x * 4.2
    );
    float domainWarp = fbm(
      flowCoordinates * 0.48 + vec2(uTime * 0.018, -uTime * 0.012)
    );
    float secondaryWarp = fbm(
      flowCoordinates * 0.92 + vec2(domainWarp * 2.4, -domainWarp * 1.1)
    );
    float detail = fbm(
      flowCoordinates + vec2(domainWarp * 3.2, secondaryWarp * 1.7)
    );
    float fineDetail = noise21(vec2(
      vUv.y * 103.0 - uTime * 0.68 + secondaryWarp * 5.0,
      vUv.x * 17.0 + domainWarp * 3.4
    ));
    float filamentMask =
      smoothstep(0.62, 0.87, detail) *
      smoothstep(0.46, 0.9, fineDetail);
    float refractionRidge = 1.0 - abs(detail * 2.0 - 1.0);
    float refractionVein =
      smoothstep(0.79, 0.97, refractionRidge) *
      smoothstep(0.34, 0.82, secondaryWarp);

    float edgeDistance = min(vUv.x, 1.0 - vUv.x);
    float edgeNoise = mix(0.025, 0.13, detail);
    float edgeMask = smoothstep(edgeNoise, edgeNoise + 0.055, edgeDistance);
    float edgeHighlight = 1.0 - smoothstep(0.0, 0.16, edgeDistance);

    float reveal = mix(0.34, 0.865, smoothstep(0.0, 1.0, uProgress));
    float revealMask = 1.0 - smoothstep(reveal - 0.055, reveal + 0.045, vLongitudinal);
    float sourceFade = smoothstep(0.0, 0.02, vLongitudinal);

    vec3 nightDeep = vec3(0.018, 0.032, 0.043);
    vec3 nightSurface = vec3(0.56, 0.67, 0.74);
    vec3 morningDeep = vec3(0.16, 0.21, 0.23);
    vec3 morningSurface = vec3(0.7, 0.77, 0.79);
    vec3 nightRefraction = vec3(0.005, 0.012, 0.017);
    vec3 morningRefraction = vec3(0.08, 0.115, 0.13);
    vec3 deepColor = mix(nightDeep, morningDeep, uTheme);
    vec3 surfaceColor = mix(nightSurface, morningSurface, uTheme);
    vec3 refractionColor = mix(nightRefraction, morningRefraction, uTheme);

    float luminance =
      fresnel * mix(0.82, 0.52, uTheme) +
      specular * mix(2.15, 1.38, uTheme) +
      filamentMask * mix(0.38, 0.22, uTheme) +
      edgeHighlight * mix(0.2, 0.09, uTheme) +
      abs(vDisplacement) * 1.8;

    vec3 color = mix(deepColor, surfaceColor, clamp(luminance, 0.0, 1.0));
    color += surfaceColor * specular * mix(1.2, 0.72, uTheme);
    color += surfaceColor * filamentMask * mix(0.48, 0.08, uTheme);
    float morningRefractionStrength =
      0.18 +
      detail * 0.27 +
      refractionVein * 0.38;
    float refractionStrength = mix(
      refractionVein * 0.12,
      morningRefractionStrength,
      uTheme
    );
    color = mix(color, refractionColor, refractionStrength);
    color = mix(
      color,
      morningRefraction,
      edgeHighlight * uTheme * 0.34
    );

    float baseAlpha = mix(0.24, 0.19, uTheme);
    float alpha =
      baseAlpha +
      fresnel * mix(0.4, 0.17, uTheme) +
      specular * mix(0.52, 0.34, uTheme) +
      filamentMask * mix(0.25, 0.07, uTheme) +
      edgeHighlight * mix(0.09, 0.045, uTheme);

    alpha *= edgeMask * revealMask * sourceFade;
    alpha *= mix(0.58, 1.04, smoothstep(0.24, 0.82, detail));
    alpha *= mix(0.82, 1.0, smoothstep(0.0, 0.82, vUv.y));

    if (alpha < 0.012) {
      discard;
    }

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.94));

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default waterFragmentShader;
