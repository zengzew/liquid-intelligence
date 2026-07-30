import { useCallback, useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Water } from "three/examples/jsm/objects/Water.js";
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Matrix4,
  MathUtils,
  MeshPhysicalMaterial,
  NormalBlending,
  Plane,
  Raycaster,
  ShaderMaterial,
  Texture,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
  Vector4,
  type BufferGeometry,
  type WebGLProgramParametersWithUniforms,
} from "three";
import type { ExperienceTheme } from "../App";
import type { JourneyProgress } from "../experience/LiquidExperience";
import type { WaterMaterialVariant } from "./materialVariants";
import {
  createRiverGeometry,
  createRiverSkirtGeometry,
  getRevealFrontier,
  getRiverHalfWidth,
} from "./riverGeometry";
import depthFragmentShader from "./shaders/depth.frag";
import depthVertexShader from "./shaders/depth.vert";
import flowDetailsFragmentShader from "./shaders/flowDetails.frag";
import reflectionFragmentShader from "./shaders/reflection.frag";
import shadowFragmentShader from "./shaders/shadow.frag";
import skirtFragmentShader from "./shaders/skirt.frag";
import skirtVertexShader from "./shaders/skirt.vert";
import surfaceVertexShader from "./shaders/surface.vert";
import oceanTransitionGlsl from "./shaders/oceanTransition.glsl";
import { createWaterNormalTexture } from "./waterNormals";

interface RiverProps {
  curve: CatmullRomCurve3;
  material: WaterMaterialVariant;
  theme: ExperienceTheme;
  progressRef: MutableRefObject<JourneyProgress>;
}

const NIGHT_BODY = new Color("#2a3437");
const MORNING_BODY = new Color("#7f8b8d");
const NIGHT_ATTENUATION = new Color("#080d0e");
const MORNING_ATTENUATION = new Color("#c4cbca");
const NIGHT_PHYSICAL_BODY = new Color("#3d555d");
const MORNING_PHYSICAL_BODY = new Color("#5f7980");
const NIGHT_PHYSICAL_ATTENUATION = new Color("#10272f");
const MORNING_PHYSICAL_ATTENUATION = new Color("#5c7177");
const NIGHT_PHYSICAL_SPECULAR = new Color("#dfe4e2");
const MORNING_PHYSICAL_SPECULAR = new Color("#edc99e");
const NIGHT_THREE_WATER = new Color("#26353a");
const MORNING_THREE_WATER = new Color("#889598");
const NIGHT_THREE_SUN = new Color("#d8d9d6");
const MORNING_THREE_SUN = new Color("#ffe8c4");
const ZERO_NORMAL_SCALE = new Vector2(0, 0);
const THREE_WATER_ROTATION = new Matrix4().makeRotationX(Math.PI / 2);
const POINTER_RAYCASTER = new Raycaster();
const POINTER_PLANE = new Plane(new Vector3(0, 1, 0), 0);
const RIVER_LENGTH_APPROX = 121;

function replaceThreeWaterNoise(fragmentShader: string) {
  const noiseStart = fragmentShader.indexOf("\t\t\t\tvec4 getNoise");
  const noiseEnd = fragmentShader.indexOf(
    "\n\n\t\t\t\tvoid sunLight",
    noiseStart,
  );

  if (noiseStart < 0 || noiseEnd < 0) {
    return fragmentShader;
  }

  const layeredNoise = /* glsl */ `				vec4 getNoise( vec2 uv ) {
					vec2 flowUvA = vec2(
						vRiverUv.x * 1.7 + time * 0.007,
						vRiverUv.y * 10.5 - time * 0.032
					);
					vec2 flowUvB = vec2(
						vRiverUv.x * 2.9 - time * 0.005 + 0.37,
						vRiverUv.y * 16.5 - time * 0.019 + 0.19
					);
					vec3 layerA = texture2D( normalSampler, flowUvA ).xyz * 2.0 - 1.0;
					vec3 layerB = texture2D( normalSampler, flowUvB ).xyz * 2.0 - 1.0;
					vec2 flow = layerA.xy * 0.58 + layerB.xy * 0.36;
					return vec4( flow.x, flow.y, 1.0, 1.0 );
				}`;

  return (
    fragmentShader.slice(0, noiseStart) +
    layeredNoise +
    fragmentShader.slice(noiseEnd)
  );
}

/**
 * Adapts Three.js' official planar Water mirror to the authored river mesh.
 * The geometry is rotated into Water's local XY plane and the object is
 * rotated back, preserving every world-space vertex while keeping the
 * official mirror plane aligned to world-up.
 */
function createThreeWater(
  sourceGeometry: BufferGeometry,
  normalTexture: ReturnType<typeof createWaterNormalTexture>,
) {
  const planarGeometry = sourceGeometry.clone();
  planarGeometry.applyMatrix4(THREE_WATER_ROTATION);

  const water = new Water(planarGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    clipBias: 0.002,
    alpha: 0.9,
    waterNormals: normalTexture,
    sunDirection: new Vector3(-0.35, 0.82, 0.44).normalize(),
    sunColor: NIGHT_THREE_SUN,
    waterColor: NIGHT_THREE_WATER,
    distortionScale: 1.55,
    side: DoubleSide,
    fog: true,
  });

  water.name = "three-water-river";
  water.rotation.x = -Math.PI / 2;
  water.frustumCulled = false;
  water.renderOrder = 3;

  const { material } = water;
  material.transparent = true;
  material.depthWrite = false;
  material.depthTest = true;
  material.uniforms.uReveal = { value: getRevealFrontier(0) };
  material.uniforms.uTheme = { value: 0 };

  material.vertexShader = material.vertexShader
    .replace(
      "uniform float time;",
      `uniform float time;
				uniform float uReveal;
				attribute float aLongitudinal;
				attribute float aAcross;
				varying vec2 vRiverUv;
				varying float vRiverLongitudinal;
				varying float vRiverAcross;`,
    )
    .replace(
      "void main() {",
      `void main() {
					vRiverUv = vec2(aAcross * 0.5 + 0.5, aLongitudinal);
					vRiverLongitudinal = aLongitudinal;
					vRiverAcross = aAcross;`,
    );

  material.fragmentShader = replaceThreeWaterNoise(
    material.fragmentShader
      .replace(
        "uniform vec3 waterColor;",
        `uniform vec3 waterColor;
				uniform float uReveal;
				uniform float uTheme;
				varying vec2 vRiverUv;
				varying float vRiverLongitudinal;
				varying float vRiverAcross;`,
      )
      .replace(
        "vec4 noise = getNoise( worldPosition.xz * size );",
        "vec4 noise = getNoise( vRiverUv );",
      )
      .replace(
        "vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );",
        `vec3 surfaceNormal = normalize(
						vec3(noise.x * 0.34, 1.0, noise.y * 0.34)
					);`,
      )
      .replace(
        "gl_FragColor = vec4( outgoingLight, alpha );",
        `float edgeTexture = texture2D(
						normalSampler,
						vec2(
							vRiverLongitudinal * 13.0 - time * 0.012,
							vRiverAcross * 2.4
						)
					).r;
					float edgeDistance = 1.0 - abs(vRiverAcross);
					float edgeMask = smoothstep(
						0.008 + edgeTexture * 0.018,
						0.065 + edgeTexture * 0.028,
						edgeDistance
					);
					float revealMask =
						(1.0 - smoothstep(
							uReveal - 0.02,
							uReveal,
							vRiverLongitudinal
						)) *
						smoothstep(0.0, 0.004, vRiverLongitudinal);
					float surfaceAlpha = alpha * edgeMask * revealMask;
					if (surfaceAlpha < 0.006) discard;
					outgoingLight = mix(
						outgoingLight,
						mix(vec3(0.18, 0.23, 0.25), vec3(0.56, 0.61, 0.62), uTheme),
						0.12
					);
					gl_FragColor = vec4( outgoingLight, surfaceAlpha );`,
      ),
  );
  material.needsUpdate = true;

  return water;
}

export default function River({
  curve,
  material: materialVariant,
  theme,
  progressRef,
}: RiverProps) {
  const bodyMaterialRef = useRef<MeshPhysicalMaterial>(null);
  const physicalMaterialRef = useRef<MeshPhysicalMaterial>(null);
  const depthMaterialRef = useRef<ShaderMaterial>(null);
  const shadowMaterialRef = useRef<ShaderMaterial>(null);
  const skirtMaterialRef = useRef<ShaderMaterial>(null);
  const nightReflectionMaterialRef = useRef<ShaderMaterial>(null);
  const morningReflectionMaterialRef = useRef<ShaderMaterial>(null);
  const flowMaterialRef = useRef<ShaderMaterial>(null);
  const bodyShaderRef =
    useRef<WebGLProgramParametersWithUniforms | null>(null);
  const physicalShaderRef =
    useRef<WebGLProgramParametersWithUniforms | null>(null);
  const themeValue = useRef(theme === "morning" ? 1 : 0);
  const flowMotion = useRef({
    energy: 0,
    phase: 0,
    velocity: 0,
  });
  const bodyColor = useMemo(() => new Color(), []);
  const attenuationColor = useMemo(() => new Color(), []);
  const curveSamples = useMemo(() => curve.getSpacedPoints(143), [curve]);
  const pointerHit = useMemo(() => new Vector3(), []);
  const pointerWater = useRef({
    across: 0,
    longitudinal: 0.2,
    strength: 0,
    halfWidth: 1,
  });
  const lastPointerNdc = useMemo(() => new Vector2(), []);
  const surfaceGeometry = useMemo(() => createRiverGeometry(curve), [curve]);
  const skirtGeometry = useMemo(
    () => createRiverSkirtGeometry(curve),
    [curve],
  );
  const normalTexture = useMemo(
    () =>
      materialVariant === "physical" || materialVariant === "three-water"
        ? createWaterNormalTexture()
        : null,
    [materialVariant],
  );
  const threeWater = useMemo(
    () =>
      materialVariant === "three-water" && normalTexture
        ? createThreeWater(surfaceGeometry, normalTexture)
        : null,
    [materialVariant, normalTexture, surfaceGeometry],
  );
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const uniforms = useMemo(
    () => ({
      ...UniformsUtils.clone(UniformsLib.fog),
      uTime: { value: 0 },
      uReveal: { value: getRevealFrontier(0) },
      uProgress: { value: 0 },
      uTheme: { value: theme === "morning" ? 1 : 0 },
      uMotionScale: { value: reducedMotion ? 0.2 : 1 },
      uPointer: { value: new Vector2() },
      uPointerWater: { value: new Vector4(0, 0.2, 0, 1) },
      uFlowDirection: { value: 0 },
      uFlowEnergy: { value: 0 },
      uFlowPhase: { value: 0 },
    }),
    [reducedMotion],
  );
  const nightReflectionUniforms = useMemo(
    () => ({
      ...uniforms,
      uReflectionMode: { value: 0 },
    }),
    [uniforms],
  );
  const morningReflectionUniforms = useMemo(
    () => ({
      ...uniforms,
      uReflectionMode: { value: 1 },
    }),
    [uniforms],
  );

  const configureBodyShader = useCallback(
    (shader: WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uWaterTime = uniforms.uTime;
      shader.uniforms.uReveal = uniforms.uReveal;
      shader.uniforms.uTheme = uniforms.uTheme;
      shader.uniforms.uMotionScale = uniforms.uMotionScale;
      shader.uniforms.uPointer = uniforms.uPointer;
      shader.uniforms.uFlowDirection = uniforms.uFlowDirection;
      shader.uniforms.uFlowEnergy = uniforms.uFlowEnergy;
      shader.uniforms.uFlowPhase = uniforms.uFlowPhase;

      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform float uWaterTime;
          uniform float uReveal;
          uniform float uMotionScale;
          uniform vec2 uPointer;
          uniform float uFlowDirection;
          uniform float uFlowEnergy;
          uniform float uFlowPhase;
          attribute float aLongitudinal;
          attribute float aAcross;
          varying float vRiverLongitudinal;
          varying float vRiverAcross;
          varying vec3 vRiverWorldPosition;

          float riverHash21(vec2 value) {
            value = fract(value * vec2(123.34, 456.21));
            value += dot(value, value + 45.32);
            return fract(value.x * value.y);
          }

          float riverNoise21(vec2 value) {
            vec2 index = floor(value);
            vec2 fraction = fract(value);
            fraction = fraction * fraction * (3.0 - 2.0 * fraction);
            float a = riverHash21(index);
            float b = riverHash21(index + vec2(1.0, 0.0));
            float c = riverHash21(index + vec2(0.0, 1.0));
            float d = riverHash21(index + vec2(1.0, 1.0));
            return mix(mix(a, b, fraction.x), mix(c, d, fraction.x), fraction.y);
          }`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          vRiverLongitudinal = aLongitudinal;
          vRiverAcross = aAcross;
          float downstream = smoothstep(0.05, 0.92, aLongitudinal);
          float riverNoise = riverNoise21(vec2(
            aLongitudinal * 18.0 -
              uWaterTime * 0.12 -
              uFlowPhase * 0.34,
            aAcross * 2.8 +
              uWaterTime * 0.015 +
              uFlowDirection * uFlowEnergy * 0.18
          ));
          float riverWave =
            (
              sin(
                aLongitudinal * 83.0 -
                uWaterTime * 0.72 -
                uFlowPhase * 1.8 +
                aAcross * 3.1 +
                riverNoise * 2.0
              ) * 0.011 +
              sin(
                aLongitudinal * 31.0 -
                uWaterTime * 0.38 -
                uFlowPhase * 0.92 -
                aAcross * 7.0
              ) * 0.006
            ) *
            mix(0.18, 1.0, downstream) *
            uMotionScale;
          float riverImpulse =
            sin(
              aLongitudinal * 27.0 -
              uWaterTime * 0.34 -
              uFlowPhase * 2.6 +
              aAcross * (4.0 + uFlowDirection * 1.15)
            ) *
            0.03 *
            uFlowEnergy *
            mix(0.5, 1.0, 1.0 - abs(aAcross)) *
            downstream *
            uMotionScale;
          float pointerProgress = max(0.02, uReveal - 0.04);
          float pointerDistance = distance(
            vec2(aAcross * 0.5 + 0.5, aLongitudinal),
            vec2(
              0.5 + uPointer.x * 0.16,
              pointerProgress - uPointer.y * 0.018
            )
          );
          float pointerRipple =
            sin(pointerDistance * 46.0 - uWaterTime * 1.65) *
            exp(-pointerDistance * 22.0) *
            0.011 *
            uMotionScale;
          transformed.y += riverWave + riverImpulse + pointerRipple;`,
        );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        `vRiverWorldPosition = (
          modelMatrix * vec4(transformed, 1.0)
        ).xyz;
        #include <project_vertex>`,
      );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform float uWaterTime;
          uniform float uReveal;
          uniform float uTheme;
          varying float vRiverLongitudinal;
          varying float vRiverAcross;
          varying vec3 vRiverWorldPosition;

          float riverFragmentHash21(vec2 value) {
            value = fract(value * vec2(123.34, 456.21));
            value += dot(value, value + 45.32);
            return fract(value.x * value.y);
          }`,
        )
        .replace(
          "#include <normal_fragment_begin>",
          `#include <normal_fragment_begin>
          vec3 riverSurfaceNormal = normalize(cross(
            dFdx(vRiverWorldPosition),
            dFdy(vRiverWorldPosition)
          ));
          if (!gl_FrontFacing) {
            riverSurfaceNormal *= -1.0;
          }
          normal = normalize(
            mat3(viewMatrix) * riverSurfaceNormal
          );`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          float riverEdgeDistance = 1.0 - abs(vRiverAcross);
          float riverEdgeNoise = riverFragmentHash21(vec2(
            floor(vRiverLongitudinal * 82.0 - uWaterTime * 0.035),
            floor(vRiverAcross * 6.0)
          ));
          float riverEdgeMask = smoothstep(
            0.006 + riverEdgeNoise * 0.022,
            0.06 + riverEdgeNoise * 0.032,
            riverEdgeDistance
          );
          float riverRevealMask =
            (1.0 - smoothstep(
              uReveal - 0.018,
              uReveal,
              vRiverLongitudinal
            )) *
            smoothstep(0.0, 0.004, vRiverLongitudinal);
          float riverFlowShade =
            sin(
              vRiverLongitudinal * 48.0 -
              uWaterTime * 0.16 +
              vRiverAcross * 5.0
            ) *
            0.5 +
            0.5;
          diffuseColor.rgb *= mix(
            0.93,
            mix(1.035, 0.975, uTheme),
            riverFlowShade * 0.26
          );
          diffuseColor.a *= riverEdgeMask * riverRevealMask;
          if (diffuseColor.a < 0.004) discard;`,
        );

      bodyShaderRef.current = shader;
    },
    [uniforms],
  );

  const configurePhysicalShader = useCallback(
    (shader: WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uWaterTime = uniforms.uTime;
      shader.uniforms.uReveal = uniforms.uReveal;
      shader.uniforms.uProgress = uniforms.uProgress;
      shader.uniforms.uTheme = uniforms.uTheme;
      shader.uniforms.uMotionScale = uniforms.uMotionScale;
      shader.uniforms.uPointer = uniforms.uPointer;
      shader.uniforms.uPointerWater = uniforms.uPointerWater;
      shader.uniforms.uFlowDirection = uniforms.uFlowDirection;
      shader.uniforms.uFlowEnergy = uniforms.uFlowEnergy;
      shader.uniforms.uFlowPhase = uniforms.uFlowPhase;

      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform float uWaterTime;
          uniform float uReveal;
          uniform float uMotionScale;
          uniform vec2 uPointer;
          uniform vec4 uPointerWater;
          uniform float uFlowDirection;
          uniform float uFlowEnergy;
          uniform float uFlowPhase;
          attribute float aLongitudinal;
          attribute float aAcross;
          varying vec2 vRiverUv;
          varying float vRiverLongitudinal;
          varying float vRiverAcross;
          varying vec3 vRiverWorldPosition;`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          vRiverUv = vec2(aAcross * 0.5 + 0.5, aLongitudinal);
          vRiverLongitudinal = aLongitudinal;
          vRiverAcross = aAcross;
          float riverDownstream = smoothstep(0.12, 0.78, aLongitudinal);
          float riverBroadSwell =
            (
              sin(
                aLongitudinal * 12.8 -
                uWaterTime * 0.16 -
                uFlowPhase * 0.52 +
                aAcross * 1.9
              ) * 0.038 +
              sin(
                aLongitudinal * 6.1 -
                uWaterTime * 0.065 -
                uFlowPhase * 0.21 -
                aAcross * 3.2
              ) * 0.021
            ) *
            mix(0.42, 1.0, 1.0 - abs(aAcross));
          float riverHeave =
            sin(aLongitudinal * 5.4 - uWaterTime * 0.21) *
            0.013 *
            riverDownstream;
          float riverBankRoll =
            sin(
              aLongitudinal * 9.2 -
              uWaterTime * 0.11 -
              uFlowPhase * 0.28 +
              0.65
            ) *
            aAcross *
            0.026;
          float riverCapillary =
            (
              sin(
                aLongitudinal * 91.0 -
                uWaterTime * 0.82 -
                uFlowPhase * 2.3 +
                aAcross * 4.6
              ) * 0.011 +
              sin(
                aLongitudinal * 47.0 -
                uWaterTime * 0.44 -
                uFlowPhase * 1.4 -
                aAcross * 8.0
              ) * 0.007
            ) *
            mix(0.2, 1.0, riverDownstream);
          float riverImpulse =
            sin(
              aLongitudinal * 27.0 -
              uWaterTime * 0.34 -
              uFlowPhase * 2.6 +
              aAcross * (4.0 + uFlowDirection * 1.15)
            ) *
            0.03 *
            uFlowEnergy *
            mix(0.5, 1.0, 1.0 - abs(aAcross)) *
            riverDownstream;
          // Cursor-accurate ripple: the CPU raycasts the pointer onto the
          // river surface and reports (across, longitudinal, strength,
          // halfWidth), so rings spread from the actual cursor position.
          float pointerDx =
            (aAcross - uPointerWater.x) * max(uPointerWater.w, 0.2);
          float pointerDz =
            (aLongitudinal - uPointerWater.y) * ${RIVER_LENGTH_APPROX}.0;
          float pointerDistance = length(vec2(pointerDx, pointerDz));
          float pointerRipple =
            sin(pointerDistance * 3.4 - uWaterTime * 4.2) *
            exp(-pointerDistance * 0.3) *
            0.07 *
            uPointerWater.z *
            riverDownstream;
          transformed.y +=
            (
              riverBroadSwell +
              riverHeave +
              riverBankRoll +
              riverCapillary +
              riverImpulse +
              pointerRipple
            ) *
            riverDownstream *
            uMotionScale;`,
        );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        `vRiverWorldPosition = (
          modelMatrix * vec4(transformed, 1.0)
        ).xyz;
        #include <project_vertex>`,
      );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform float uWaterTime;
          uniform float uReveal;
          uniform float uProgress;
          uniform float uTheme;
          uniform vec4 uPointerWater;
          uniform float uFlowDirection;
          uniform float uFlowEnergy;
          uniform float uFlowPhase;
          varying vec2 vRiverUv;
          varying float vRiverLongitudinal;
          varying float vRiverAcross;
          varying vec3 vRiverWorldPosition;
          ${oceanTransitionGlsl}`,
        )
        .replace(
          "#include <normal_fragment_begin>",
          `#include <normal_fragment_begin>
          vec3 riverSurfaceNormal = normalize(cross(
            dFdx(vRiverWorldPosition),
            dFdy(vRiverWorldPosition)
          ));
          if (!gl_FrontFacing) {
            riverSurfaceNormal *= -1.0;
          }
          normal = normalize(
            mat3(viewMatrix) * riverSurfaceNormal
          );`,
        )
        .replace(
          "#include <roughnessmap_fragment>",
          `#include <roughnessmap_fragment>
          #ifdef USE_NORMALMAP_TANGENTSPACE
            vec2 riverFlowUvA = vec2(
              vRiverUv.x * 1.8 +
                vRiverUv.y * 1.15 +
                uWaterTime * 0.006 +
                uFlowDirection * uFlowEnergy * 0.04,
              vRiverUv.y * 10.8 +
                vRiverUv.x * 1.65 -
                uWaterTime * (0.021 + uFlowEnergy * 0.018) -
                uFlowPhase * 0.36
            );
            vec2 riverFlowUvB = vec2(
              vRiverUv.x * 3.1 -
                vRiverUv.y * 0.86 -
                uWaterTime * 0.004 +
                uFlowDirection * uFlowEnergy * 0.055 +
                0.41,
              vRiverUv.y * 17.2 -
                vRiverUv.x * 2.2 -
                uWaterTime * (0.013 + uFlowEnergy * 0.011) -
                uFlowPhase * 0.24 +
                0.23
            );
            vec3 riverNormalA =
              texture2D(normalMap, riverFlowUvA).xyz * 2.0 - 1.0;
            vec3 riverNormalB =
              texture2D(normalMap, riverFlowUvB).xyz * 2.0 - 1.0;
            vec2 riverBreakUvA = vec2(
              vRiverUv.x * 0.92 + riverNormalB.x * 0.18 + 0.17,
              vRiverUv.y * 5.6 -
                uWaterTime * 0.011 -
                uFlowPhase * 0.15 +
                riverNormalA.y * 0.08
            );
            vec2 riverBreakUvB = vec2(
              vRiverUv.x * 2.15 + vRiverUv.y * 0.73 + 0.53,
              vRiverUv.y * 7.8 -
                uWaterTime * 0.016 -
                uFlowPhase * 0.21
            );
            float riverBreakA = texture2D(normalMap, riverBreakUvA).r;
            float riverBreakB = texture2D(normalMap, riverBreakUvB).g;
            float riverBreakup = smoothstep(
              0.43,
              0.59,
              riverBreakA * 0.62 + riverBreakB * 0.38
            );
            float riverCenterBand = 1.0 - smoothstep(
              0.06,
              0.54,
              abs(
                vRiverAcross +
                (riverBreakB - 0.5) * 0.34 +
                sin(vRiverLongitudinal * 31.0) * 0.055
              )
            );
            float riverCenterBreak =
              riverCenterBand *
              smoothstep(0.48, 0.7, riverBreakup);
            float riverRoughnessNoise =
              riverNormalA.z * 0.58 + riverNormalB.z * 0.42;
            roughnessFactor = clamp(
              roughnessFactor +
                (0.96 - riverRoughnessNoise) * 0.16 +
                (riverBreakup - 0.5) * 0.065 +
                riverCenterBreak * 0.09 +
                uFlowEnergy * 0.018,
              0.085,
              0.26
            );
          #endif`,
        )
        .replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>
          #ifdef USE_NORMALMAP_TANGENTSPACE
            vec2 riverFlowNormal =
              riverNormalA.xy * 0.34 +
              riverNormalB.yx * 0.22 +
              vec2(riverBreakA - 0.5, riverBreakB - 0.5) * 0.14;
            riverFlowNormal *= 1.0 + uFlowEnergy * 0.34;
            vec3 riverMapNormal = normalize(vec3(riverFlowNormal, 1.0));
            normal = normalize(tbn * riverMapNormal);
          #endif`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          float riverEdgeTexture = texture2D(
            normalMap,
            vec2(
              vRiverLongitudinal * 11.0 - uWaterTime * 0.008,
              vRiverAcross * 2.6
            )
          ).r;
          float riverEdgeDistance = 1.0 - abs(vRiverAcross);
          float riverEdgeMask = smoothstep(
            0.008 + riverEdgeTexture * 0.018,
            0.066 + riverEdgeTexture * 0.027,
            riverEdgeDistance
          );
          float riverRevealMask = riverRevealCoverage(
            uReveal,
            uProgress,
            vRiverLongitudinal
          );
          float riverOceanBlend = riverToOceanBlend(
            uProgress,
            vRiverLongitudinal,
            uTheme
          );
          float riverMottle = texture2D(
            normalMap,
            vec2(
              vRiverAcross * 1.7 + 0.31,
              vRiverLongitudinal * 17.0 - uWaterTime * 0.009
            )
          ).g;
          diffuseColor.rgb *=
            1.0 +
            (riverMottle - 0.5) * mix(0.075, 0.055, uTheme);
          diffuseColor.a *=
            riverEdgeMask *
            riverRevealMask *
            mix(1.0, 0.03, riverOceanBlend);
          if (diffuseColor.a < 0.006) discard;`,
        )
        .replace(
          "#include <opaque_fragment>",
          `#ifdef USE_NORMALMAP_TANGENTSPACE
            float riverFresnel = pow(
              1.0 - saturate(dot(normal, geometryViewDir)),
              2.4
            );
            float riverCrossRipple =
              sin(
                vRiverLongitudinal * 73.0 +
                vRiverAcross * 18.0 +
                riverBreakB * 11.0 -
                uWaterTime * 0.19 -
                uFlowPhase * 1.35
              ) *
              0.5 +
              0.5;
            float riverReflectionBreak =
              smoothstep(0.72, 0.92, riverBreakup) *
              smoothstep(0.72, 0.93, riverCrossRipple);
            float riverReflectionEdge = smoothstep(
              0.035,
              0.2,
              1.0 - abs(vRiverAcross)
            );
            float riverReflectionMask =
              riverReflectionBreak *
              riverReflectionEdge *
              (0.24 + riverFresnel * 0.76) *
              (1.0 + uFlowEnergy * 0.22);
            vec3 riverNightReflection = vec3(0.62, 0.68, 0.69);
            vec3 riverMorningReflection = vec3(0.64, 0.46, 0.27);
            outgoingLight +=
              mix(
                riverNightReflection,
                riverMorningReflection,
                uTheme
              ) *
              riverReflectionMask *
              mix(0.32, 0.22, uTheme);
          #endif
          // Cursor sheen: light gathers around the pointer so the water
          // visibly answers the hand, in step with the vertex rings.
          float pointerFragDx =
            (vRiverAcross - uPointerWater.x) * max(uPointerWater.w, 0.2);
          float pointerFragDz =
            (vRiverLongitudinal - uPointerWater.y) * 121.0;
          float pointerFragDistance =
            length(vec2(pointerFragDx, pointerFragDz));
          float pointerRingWave =
            0.5 + 0.5 * sin(pointerFragDistance * 3.4 - uWaterTime * 4.2);
          float pointerGlow =
            exp(-pointerFragDistance * 0.42) *
            (0.35 + pointerRingWave * 0.65) *
            uPointerWater.z;
          outgoingLight +=
            mix(vec3(0.55, 0.62, 0.63), vec3(0.55, 0.42, 0.25), uTheme) *
            pointerGlow *
            mix(0.2, 0.13, uTheme);
          #include <opaque_fragment>`,
        );

      physicalShaderRef.current = shader;
    },
    [uniforms],
  );

  useEffect(
    () => () => {
      surfaceGeometry.dispose();
      skirtGeometry.dispose();
    },
    [skirtGeometry, surfaceGeometry],
  );

  useEffect(() => {
    if (!normalTexture) {
      return;
    }

    return () => normalTexture.dispose();
  }, [normalTexture]);

  useEffect(() => {
    if (!threeWater) {
      return;
    }

    return () => {
      const mirrorTexture = threeWater.material.uniforms.mirrorSampler
        ?.value as Texture | undefined;

      mirrorTexture?.renderTarget?.dispose();
      threeWater.geometry.dispose();
      threeWater.material.dispose();
      threeWater.onBeforeRender = () => undefined;
    };
  }, [threeWater]);

  useEffect(() => {
    const mirrorTexture = threeWater?.material.uniforms.mirrorSampler
      ?.value as Texture | undefined;
    const mirrorRenderTarget = mirrorTexture?.renderTarget;
    const resources = {
      variant: materialVariant,
      normalTexture: normalTexture?.name ?? null,
      mirrorRenderTarget: mirrorRenderTarget
        ? {
            width: mirrorRenderTarget.width,
            height: mirrorRenderTarget.height,
          }
        : null,
    };

    Reflect.set(window, "__LIQUID_WATER_RESOURCES__", resources);
    document.documentElement.dataset.waterResources =
      JSON.stringify(resources);
  }, [materialVariant, normalTexture, threeWater]);

  useEffect(() => {
    const material = bodyMaterialRef.current;

    if (!material) {
      return;
    }

    material.customProgramCacheKey = () => "liquid-water-body-v1-1";
    material.needsUpdate = true;
  }, [materialVariant]);

  useEffect(() => {
    const material = physicalMaterialRef.current;

    if (!material) {
      return;
    }

    material.customProgramCacheKey = () => "liquid-physical-water-v13";
    material.needsUpdate = true;
  }, [materialVariant]);

  useFrame(({ camera, clock, pointer }, delta) => {
    const progress = progressRef.current.current;
    const motion = flowMotion.current;
    const rawVelocity = reducedMotion
      ? 0
      : MathUtils.clamp(progressRef.current.velocity, -2.4, 2.4);
    const isAccelerating =
      Math.abs(rawVelocity) > Math.abs(motion.velocity) ||
      Math.sign(rawVelocity) !== Math.sign(motion.velocity);
    motion.velocity = MathUtils.damp(
      motion.velocity,
      rawVelocity,
      isAccelerating ? 11 : 2.1,
      delta,
    );
    const energyTarget = reducedMotion
      ? 0
      : MathUtils.clamp(Math.abs(motion.velocity) * 0.78, 0, 1);
    motion.energy = MathUtils.damp(
      motion.energy,
      energyTarget,
      energyTarget > motion.energy ? 8 : 1.65,
      delta,
    );
    motion.phase += motion.velocity * delta * 1.15;

    const themeTarget = theme === "morning" ? 1 : 0;
    themeValue.current = MathUtils.damp(
      themeValue.current,
      themeTarget,
      2.5,
      delta,
    );

    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uProgress.value = progress;
    uniforms.uReveal.value = getRevealFrontier(progress);
    uniforms.uTheme.value = themeValue.current;
    uniforms.uPointer.value.lerp(pointer, 1 - Math.exp(-delta * 2.8));

    // Raycast the pointer onto the river surface so the shader can spread
    // ripple rings from the actual cursor position. Strength follows pointer
    // speed with a small idle baseline, so the water always feels alive.
    const water = pointerWater.current;
    if (!reducedMotion) {
      const sampleIndex = MathUtils.clamp(
        Math.round(water.longitudinal * (curveSamples.length - 1)),
        0,
        curveSamples.length - 1,
      );
      POINTER_PLANE.constant = -curveSamples[sampleIndex].y;
      POINTER_RAYCASTER.setFromCamera(pointer, camera);
      const hit = POINTER_RAYCASTER.ray.intersectPlane(
        POINTER_PLANE,
        pointerHit,
      );

      if (hit) {
        let bestDistanceSq = Number.POSITIVE_INFINITY;
        let bestIndex = sampleIndex;

        for (let index = 0; index < curveSamples.length; index += 1) {
          const dx = curveSamples[index].x - hit.x;
          const dz = curveSamples[index].z - hit.z;
          const distanceSq = dx * dx + dz * dz;

          if (distanceSq < bestDistanceSq) {
            bestDistanceSq = distanceSq;
            bestIndex = index;
          }
        }

        const center = curveSamples[bestIndex];
        const next =
          curveSamples[Math.min(curveSamples.length - 1, bestIndex + 1)];
        const prev = curveSamples[Math.max(0, bestIndex - 1)];
        const tangentX = next.x - prev.x;
        const tangentZ = next.z - prev.z;
        const tangentLength = Math.max(
          0.0001,
          Math.hypot(tangentX, tangentZ),
        );
        const lateralX = tangentZ / tangentLength;
        const lateralZ = -tangentX / tangentLength;
        const bestLongitudinal = bestIndex / (curveSamples.length - 1);
        const halfWidth = Math.max(
          0.2,
          getRiverHalfWidth(bestLongitudinal),
        );
        const across = MathUtils.clamp(
          ((hit.x - center.x) * lateralX + (hit.z - center.z) * lateralZ) /
            halfWidth,
          -1.35,
          1.35,
        );
        const pointerSpeed =
          Math.hypot(
            pointer.x - lastPointerNdc.x,
            pointer.y - lastPointerNdc.y,
          ) / Math.max(delta, 0.001);
        const strengthTarget =
          MathUtils.clamp(pointerSpeed * 0.5, 0, 1) + 0.14;

        water.across = MathUtils.damp(water.across, across, 5.5, delta);
        water.longitudinal = MathUtils.damp(
          water.longitudinal,
          bestLongitudinal,
          5.5,
          delta,
        );
        water.halfWidth = MathUtils.damp(
          water.halfWidth,
          halfWidth,
          5.5,
          delta,
        );
        water.strength = MathUtils.damp(
          water.strength,
          strengthTarget,
          strengthTarget > water.strength ? 6.5 : 1.35,
          delta,
        );
      }
    } else {
      water.strength = 0;
    }
    lastPointerNdc.copy(pointer);

    uniforms.uPointerWater.value.set(
      water.across,
      water.longitudinal,
      water.strength,
      water.halfWidth,
    );

    uniforms.uFlowDirection.value = MathUtils.clamp(
      motion.velocity / 2.4,
      -1,
      1,
    );
    uniforms.uFlowEnergy.value = motion.energy;
    uniforms.uFlowPhase.value = motion.phase;

    Reflect.set(window, "__LIQUID_MOTION__", {
      direction: uniforms.uFlowDirection.value,
      energy: motion.energy,
      phase: motion.phase,
      velocity: motion.velocity,
    });
    Reflect.set(window, "__LIQUID_POINTER_WATER__", {
      across: water.across,
      longitudinal: water.longitudinal,
      strength: water.strength,
      halfWidth: water.halfWidth,
    });

    const layerMaterials = [
      depthMaterialRef.current,
      shadowMaterialRef.current,
      skirtMaterialRef.current,
      nightReflectionMaterialRef.current,
      morningReflectionMaterialRef.current,
      flowMaterialRef.current,
    ];

    layerMaterials.forEach((layerMaterial) => {
      if (!layerMaterial) {
        return;
      }

      layerMaterial.uniforms.uTime.value = uniforms.uTime.value;
      layerMaterial.uniforms.uReveal.value = uniforms.uReveal.value;
      layerMaterial.uniforms.uProgress.value = progress;
      layerMaterial.uniforms.uTheme.value = themeValue.current;
      layerMaterial.uniforms.uMotionScale.value = uniforms.uMotionScale.value;
      layerMaterial.uniforms.uPointer.value.copy(uniforms.uPointer.value);
      layerMaterial.uniforms.uFlowDirection.value =
        uniforms.uFlowDirection.value;
      layerMaterial.uniforms.uFlowEnergy.value = uniforms.uFlowEnergy.value;
      layerMaterial.uniforms.uFlowPhase.value = uniforms.uFlowPhase.value;
    });

    if (nightReflectionMaterialRef.current) {
      nightReflectionMaterialRef.current.uniforms.uReflectionMode.value = 0;
    }

    if (morningReflectionMaterialRef.current) {
      morningReflectionMaterialRef.current.uniforms.uReflectionMode.value = 1;
    }

    const material = bodyMaterialRef.current;

    if (material) {
      const mix = themeValue.current;
      material.color.copy(bodyColor.copy(NIGHT_BODY).lerp(MORNING_BODY, mix));
      material.attenuationColor.copy(
        attenuationColor
          .copy(NIGHT_ATTENUATION)
          .lerp(MORNING_ATTENUATION, mix),
      );
      material.opacity = MathUtils.lerp(0.34, 0.13, mix);
      material.roughness = MathUtils.lerp(0.11, 0.25, mix);
      material.transmission = MathUtils.lerp(0.28, 0.72, mix);
      material.thickness = MathUtils.lerp(0.48, 0.28, mix);
      material.envMapIntensity = MathUtils.lerp(1.42, 0.9, mix);
      material.clearcoat = MathUtils.lerp(0.94, 0.82, mix);
      material.clearcoatRoughness = MathUtils.lerp(0.14, 0.19, mix);
    }

    const physicalMaterial = physicalMaterialRef.current;

    if (physicalMaterial) {
      const mix = themeValue.current;
      physicalMaterial.color.copy(
        bodyColor
          .copy(NIGHT_PHYSICAL_BODY)
          .lerp(MORNING_PHYSICAL_BODY, mix),
      );
      physicalMaterial.attenuationColor.copy(
        attenuationColor
          .copy(NIGHT_PHYSICAL_ATTENUATION)
          .lerp(MORNING_PHYSICAL_ATTENUATION, mix),
      );
      physicalMaterial.specularColor
        .copy(NIGHT_PHYSICAL_SPECULAR)
        .lerp(MORNING_PHYSICAL_SPECULAR, mix);
      physicalMaterial.opacity = MathUtils.lerp(0.74, 0.76, mix);
      physicalMaterial.roughness = MathUtils.lerp(0.17, 0.21, mix);
      physicalMaterial.transmission = MathUtils.lerp(0.32, 0.3, mix);
      physicalMaterial.thickness = MathUtils.lerp(0.28, 0.3, mix);
      physicalMaterial.envMapIntensity = MathUtils.lerp(1.55, 1.1, mix);
      physicalMaterial.clearcoat = MathUtils.lerp(0.96, 0.74, mix);
      physicalMaterial.clearcoatRoughness = MathUtils.lerp(0.13, 0.18, mix);
      physicalMaterial.specularIntensity = MathUtils.lerp(0.86, 0.72, mix);
    }

    if (threeWater) {
      const threeWaterUniforms = threeWater.material.uniforms;
      threeWaterUniforms.time.value = clock.elapsedTime;
      threeWaterUniforms.uReveal.value = uniforms.uReveal.value;
      threeWaterUniforms.uTheme.value = themeValue.current;
      threeWaterUniforms.alpha.value = MathUtils.lerp(
        0.91,
        0.86,
        themeValue.current,
      );
      threeWaterUniforms.distortionScale.value = MathUtils.lerp(
        1.55,
        1.18,
        themeValue.current,
      );
      (threeWaterUniforms.waterColor.value as Color)
        .copy(NIGHT_THREE_WATER)
        .lerp(MORNING_THREE_WATER, themeValue.current);
      (threeWaterUniforms.sunColor.value as Color)
        .copy(NIGHT_THREE_SUN)
        .lerp(MORNING_THREE_SUN, themeValue.current);
    }
  });

  return (
    <group>
      <mesh
        geometry={surfaceGeometry}
        frustumCulled={false}
        renderOrder={-1}
      >
        <shaderMaterial
          ref={depthMaterialRef}
          uniforms={uniforms}
          vertexShader={depthVertexShader}
          fragmentShader={depthFragmentShader}
          transparent
          depthWrite={false}
          depthTest
          side={DoubleSide}
          toneMapped
          fog
        />
      </mesh>

      <mesh
        geometry={surfaceGeometry}
        position={[0, -0.075, 0]}
        frustumCulled={false}
        renderOrder={0}
      >
        <shaderMaterial
          ref={shadowMaterialRef}
          uniforms={uniforms}
          vertexShader={surfaceVertexShader}
          fragmentShader={shadowFragmentShader}
          transparent
          depthWrite={false}
          depthTest
          side={DoubleSide}
          blending={NormalBlending}
          toneMapped
        />
      </mesh>

      <mesh
        geometry={skirtGeometry}
        frustumCulled={false}
        renderOrder={1}
      >
        <shaderMaterial
          ref={skirtMaterialRef}
          uniforms={uniforms}
          vertexShader={skirtVertexShader}
          fragmentShader={skirtFragmentShader}
          transparent
          depthWrite={false}
          depthTest
          side={DoubleSide}
          blending={NormalBlending}
          toneMapped
        />
      </mesh>

      {materialVariant === "current" ? (
        <mesh
          geometry={surfaceGeometry}
          frustumCulled={false}
          renderOrder={2}
        >
          <meshPhysicalMaterial
            ref={bodyMaterialRef}
            color="#30383b"
            roughness={0.18}
            metalness={0}
            transmission={0.15}
            thickness={0.42}
            attenuationDistance={10}
            attenuationColor="#151a1c"
            ior={1.333}
            clearcoat={0.94}
            clearcoatRoughness={0.14}
            envMapIntensity={1.05}
            opacity={0.5}
            transparent
            depthWrite={false}
            depthTest
            side={DoubleSide}
            blending={NormalBlending}
            toneMapped
            onBeforeCompile={configureBodyShader}
          />
        </mesh>
      ) : null}

      {materialVariant === "physical" && normalTexture ? (
        <mesh
          geometry={surfaceGeometry}
          frustumCulled={false}
          renderOrder={3}
        >
          <meshPhysicalMaterial
            ref={physicalMaterialRef}
            color="#334248"
            roughness={0.13}
            metalness={0}
            transmission={0.15}
            thickness={0.2}
            attenuationDistance={3.8}
            attenuationColor="#172328"
            ior={1.333}
            clearcoat={0.7}
            clearcoatRoughness={0.15}
            specularColor="#dfe4e2"
            specularIntensity={0.92}
            envMapIntensity={1.82}
            normalMap={normalTexture}
            normalScale={ZERO_NORMAL_SCALE}
            opacity={0.93}
            transparent
            depthWrite={false}
            depthTest
            side={DoubleSide}
            blending={NormalBlending}
            toneMapped
            onBeforeCompile={configurePhysicalShader}
          />
        </mesh>
      ) : null}

      {materialVariant === "current" || materialVariant === "physical" ? (
        <>
          <mesh
            geometry={surfaceGeometry}
            position={[0, 0.009, 0]}
            frustumCulled={false}
            renderOrder={4}
          >
            <shaderMaterial
              ref={nightReflectionMaterialRef}
              uniforms={nightReflectionUniforms}
              vertexShader={surfaceVertexShader}
              fragmentShader={reflectionFragmentShader}
              transparent
              depthWrite={false}
              depthTest={false}
              side={DoubleSide}
              blending={AdditiveBlending}
              toneMapped
            />
          </mesh>

          <mesh
            geometry={surfaceGeometry}
            position={[0, 0.012, 0]}
            frustumCulled={false}
            renderOrder={5}
          >
            <shaderMaterial
              ref={morningReflectionMaterialRef}
              uniforms={morningReflectionUniforms}
              vertexShader={surfaceVertexShader}
              fragmentShader={reflectionFragmentShader}
              transparent
              depthWrite={false}
              depthTest={false}
              side={DoubleSide}
              blending={NormalBlending}
              toneMapped
            />
          </mesh>

          <mesh
            geometry={surfaceGeometry}
            position={[0, 0.016, 0]}
            frustumCulled={false}
            renderOrder={6}
          >
            <shaderMaterial
              ref={flowMaterialRef}
              uniforms={uniforms}
              vertexShader={surfaceVertexShader}
              fragmentShader={flowDetailsFragmentShader}
              transparent
              depthWrite={false}
              depthTest={false}
              side={DoubleSide}
              blending={NormalBlending}
              toneMapped
            />
          </mesh>
        </>
      ) : null}

      {threeWater ? <primitive object={threeWater} dispose={null} /> : null}
    </group>
  );
}
