import type { MutableRefObject } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  MathUtils,
  NormalBlending,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from "three";
import type { ExperienceTheme } from "../../App";
import type { JourneyProgress } from "../../experience/LiquidExperience";

export interface LiquidWorldProps {
  curve: CatmullRomCurve3;
  progressRef: MutableRefObject<JourneyProgress>;
  reducedMotion: boolean;
  theme: ExperienceTheme;
}

interface RibbonGeometryOptions {
  crossSegments?: number;
  elevation?: (localProgress: number, curveProgress: number) => number;
  end?: number;
  lateralOffset?: (localProgress: number, curveProgress: number) => number;
  segments?: number;
  start?: number;
  verticalOffset?: (
    localProgress: number,
    curveProgress: number,
    across: number,
  ) => number;
  width: (localProgress: number, curveProgress: number) => number;
}

interface LiquidRibbonMaterialOptions {
  baseAlpha?: number;
  morningColor: string;
  nightColor: string;
  phase?: number;
  sparkle?: number;
}

interface CausticMaterialOptions {
  morningColor: string;
  nightColor: string;
  phase?: number;
  strength?: number;
}

const UP = new Vector3(0, 1, 0);

const liquidRibbonVertexShader = /* glsl */ `
  uniform float uMotionScale;
  uniform float uTime;

  varying vec2 vLiquidUv;
  varying vec3 vLiquidWorldPosition;

  #include <fog_pars_vertex>

  void main() {
    vLiquidUv = uv;

    vec3 transformed = position;
    float crossCurrent =
      sin(uv.y * 48.0 - uTime * 0.34 + uv.x * 7.0) * 0.004 +
      sin(uv.y * 21.0 - uTime * 0.17 - uv.x * 11.0) * 0.0025;
    transformed.y += crossCurrent * uMotionScale;

    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vLiquidWorldPosition = worldPosition.xyz;

    vec4 mvPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`;

const liquidRibbonFragmentShader = /* glsl */ `
  uniform float uBaseAlpha;
  uniform vec3 uMorningColor;
  uniform float uPhase;
  uniform float uPresence;
  uniform float uReveal;
  uniform float uSparkle;
  uniform float uTheme;
  uniform float uTime;
  uniform vec3 uNightColor;

  varying vec2 vLiquidUv;
  varying vec3 vLiquidWorldPosition;

  #include <common>
  #include <fog_pars_fragment>

  void main() {
    float across = abs(vLiquidUv.x * 2.0 - 1.0);
    float softEdge = 1.0 - smoothstep(0.54, 1.0, across);
    float lengthFade =
      smoothstep(0.0, 0.1, vLiquidUv.y) *
      (1.0 - smoothstep(0.86, 1.0, vLiquidUv.y));
    float revealMask =
      1.0 -
      smoothstep(
        clamp(uReveal - 0.075, 0.0, 1.0),
        clamp(uReveal, 0.001, 1.0),
        vLiquidUv.y
      );

    float longCurrent =
      sin(
        vLiquidUv.y * 143.0 -
        uTime * 0.62 +
        vLiquidUv.x * 18.0 +
        sin(vLiquidUv.y * 17.0 + vLiquidUv.x * 9.0) * 1.8 +
        uPhase
      ) *
      0.5 +
      0.5;
    float crossCurrent =
      sin(
        vLiquidUv.y * 57.0 -
        uTime * 0.29 -
        vLiquidUv.x * 41.0 +
        uPhase * 1.7
      ) *
      0.5 +
      0.5;
    float brokenLight = pow(
      smoothstep(0.6, 0.96, longCurrent * 0.68 + crossCurrent * 0.32),
      2.7
    );
    float filament =
      pow(max(0.0, 1.0 - across), 7.0) *
      smoothstep(
        0.64,
        0.95,
        sin(vLiquidUv.y * 91.0 - uTime * 0.38 + uPhase) * 0.5 + 0.5
      );

    vec3 baseColor = mix(uNightColor, uMorningColor, uTheme);
    vec3 highlightColor = mix(
      vec3(0.92, 0.95, 0.94),
      vec3(0.74, 0.68, 0.58),
      uTheme
    );
    vec3 color = mix(
      baseColor,
      highlightColor,
      clamp(
        brokenLight * uSparkle * 0.86 + filament * (0.12 + uSparkle * 0.2),
        0.0,
        0.82
      )
    );

    float alpha =
      uPresence *
      softEdge *
      lengthFade *
      revealMask *
      (
        uBaseAlpha +
        brokenLight * (0.015 + uSparkle * 0.34) +
        filament * (0.035 + uSparkle * 0.11)
      );

    if (alpha < 0.004) {
      discard;
    }

    gl_FragColor = vec4(color, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

const causticVertexShader = /* glsl */ `
  varying vec2 vCausticUv;

  #include <fog_pars_vertex>

  void main() {
    vCausticUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`;

const causticFragmentShader = /* glsl */ `
  uniform vec3 uMorningColor;
  uniform vec3 uNightColor;
  uniform float uPhase;
  uniform float uPresence;
  uniform float uStrength;
  uniform float uTheme;
  uniform float uTime;

  varying vec2 vCausticUv;

  #include <common>
  #include <fog_pars_fragment>

  void main() {
    vec2 point = (vCausticUv - 0.5) * 2.0;
    float vignette =
      smoothstep(1.0, 0.12, length(point * vec2(0.78, 1.08)));

    float warpA =
      sin(point.x * 15.0 + sin(point.y * 11.0 + uTime * 0.12 + uPhase));
    float warpB =
      sin(
        point.y * 21.0 -
        point.x * 6.4 -
        uTime * 0.18 +
        uPhase * 1.9
      );
    float warpC =
      sin(
        (point.x + point.y) * 18.5 -
        uTime * 0.1 -
        uPhase * 0.7
      );
    float network = abs(warpA * 0.46 + warpB * 0.34 + warpC * 0.2);
    float caustic = pow(smoothstep(0.38, 0.92, network), 3.2);

    vec3 color = mix(uNightColor, uMorningColor, uTheme);
    float alpha =
      vignette *
      uPresence *
      uStrength *
      (0.05 + caustic * 0.42);

    if (alpha < 0.003) {
      discard;
    }

    gl_FragColor = vec4(color, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function createRibbonGeometry(
  curve: CatmullRomCurve3,
  {
    crossSegments = 8,
    elevation = () => 0.012,
    end = 1,
    lateralOffset = () => 0,
    segments = 88,
    start = 0,
    verticalOffset = () => 0,
    width,
  }: RibbonGeometryOptions,
) {
  const geometry = new BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const center = new Vector3();
  const tangent = new Vector3();
  const lateral = new Vector3();
  const vertex = new Vector3();

  for (let row = 0; row <= segments; row += 1) {
    const localProgress = row / segments;
    const curveProgress = MathUtils.lerp(start, end, localProgress);
    curve.getPointAt(curveProgress, center);
    curve.getTangentAt(curveProgress, tangent).normalize();
    lateral.crossVectors(UP, tangent).normalize();
    center
      .addScaledVector(lateral, lateralOffset(localProgress, curveProgress))
      .addScaledVector(UP, elevation(localProgress, curveProgress));

    for (let column = 0; column <= crossSegments; column += 1) {
      const across = (column / crossSegments) * 2 - 1;
      const bankVariation =
        1 +
        Math.sin(localProgress * 37.0 + across * 3.2) * 0.035 +
        Math.sin(localProgress * 81.0 - across * 2.1) * 0.015;
      const surfaceContour =
        Math.sin(localProgress * 28.0 + across * 4.0) *
        0.0025 *
        Math.sin(localProgress * Math.PI);

      vertex
        .copy(center)
        .addScaledVector(
          lateral,
          across * width(localProgress, curveProgress) * bankVariation,
        )
        .addScaledVector(
          UP,
          surfaceContour +
            verticalOffset(localProgress, curveProgress, across),
        );

      positions.push(vertex.x, vertex.y, vertex.z);
      uvs.push(column / crossSegments, localProgress);
    }
  }

  const rowSize = crossSegments + 1;

  for (let row = 0; row < segments; row += 1) {
    for (let column = 0; column < crossSegments; column += 1) {
      const current = row * rowSize + column;
      const next = current + rowSize;

      indices.push(current, next, current + 1);
      indices.push(next, next + 1, current + 1);
    }
  }

  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

export function createLiquidRibbonMaterial({
  baseAlpha = 0.08,
  morningColor,
  nightColor,
  phase = 0,
  sparkle = 0.55,
}: LiquidRibbonMaterialOptions) {
  return new ShaderMaterial({
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      uBaseAlpha: { value: baseAlpha },
      uMorningColor: { value: new Color(morningColor) },
      uMotionScale: { value: 1 },
      uNightColor: { value: new Color(nightColor) },
      uPhase: { value: phase },
      uPresence: { value: 0 },
      uReveal: { value: 1 },
      uSparkle: { value: sparkle },
      uTheme: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: liquidRibbonVertexShader,
    fragmentShader: liquidRibbonFragmentShader,
    blending: NormalBlending,
    depthTest: true,
    depthWrite: false,
    fog: true,
    side: DoubleSide,
    toneMapped: true,
    transparent: true,
  });
}

export function createCausticMaterial({
  morningColor,
  nightColor,
  phase = 0,
  strength = 0.22,
}: CausticMaterialOptions) {
  return new ShaderMaterial({
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      uMorningColor: { value: new Color(morningColor) },
      uNightColor: { value: new Color(nightColor) },
      uPhase: { value: phase },
      uPresence: { value: 0 },
      uStrength: { value: strength },
      uTheme: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: causticVertexShader,
    fragmentShader: causticFragmentShader,
    blending: NormalBlending,
    depthTest: true,
    depthWrite: false,
    fog: true,
    side: DoubleSide,
    toneMapped: true,
    transparent: true,
  });
}

export function updateLiquidMaterial(
  material: ShaderMaterial,
  {
    motionScale,
    presence,
    reveal = 1,
    themeMix,
    time,
  }: {
    motionScale: number;
    presence: number;
    reveal?: number;
    themeMix: number;
    time: number;
  },
) {
  material.uniforms.uPresence.value = presence;
  material.uniforms.uTheme.value = themeMix;
  material.uniforms.uTime.value = time;

  if (material.uniforms.uMotionScale) {
    material.uniforms.uMotionScale.value = motionScale;
  }

  if (material.uniforms.uReveal) {
    material.uniforms.uReveal.value = MathUtils.clamp(reveal, 0.001, 1);
  }
}

export function dampThemeMix(
  current: MutableRefObject<number>,
  theme: ExperienceTheme,
  reducedMotion: boolean,
  delta: number,
) {
  const target = theme === "morning" ? 1 : 0;
  current.current = reducedMotion
    ? target
    : MathUtils.damp(current.current, target, 2.8, delta);

  return current.current;
}

export function getCurvePosition(
  curve: CatmullRomCurve3,
  progress: number,
  lateralOffset = 0,
  elevation = 0,
) {
  const position = curve.getPointAt(progress);
  const tangent = curve.getTangentAt(progress).normalize();
  const lateral = new Vector3().crossVectors(UP, tangent).normalize();

  return position
    .addScaledVector(lateral, lateralOffset)
    .addScaledVector(UP, elevation);
}
