import { useCallback, useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  MathUtils,
  MeshPhysicalMaterial,
  NormalBlending,
  ShaderMaterial,
  Vector2,
  type WebGLProgramParametersWithUniforms,
} from "three";
import type { ExperienceTheme } from "../App";
import type { JourneyProgress } from "../experience/LiquidExperience";
import {
  createRiverGeometry,
  createRiverSkirtGeometry,
  getRevealFrontier,
} from "./riverGeometry";
import flowDetailsFragmentShader from "./shaders/flowDetails.frag";
import reflectionFragmentShader from "./shaders/reflection.frag";
import shadowFragmentShader from "./shaders/shadow.frag";
import skirtFragmentShader from "./shaders/skirt.frag";
import skirtVertexShader from "./shaders/skirt.vert";
import surfaceVertexShader from "./shaders/surface.vert";

interface RiverProps {
  curve: CatmullRomCurve3;
  theme: ExperienceTheme;
  progressRef: MutableRefObject<JourneyProgress>;
}

const NIGHT_BODY = new Color("#2a3437");
const MORNING_BODY = new Color("#7f8b8d");
const NIGHT_ATTENUATION = new Color("#080d0e");
const MORNING_ATTENUATION = new Color("#c4cbca");

export default function River({
  curve,
  theme,
  progressRef,
}: RiverProps) {
  const bodyMaterialRef = useRef<MeshPhysicalMaterial>(null);
  const shadowMaterialRef = useRef<ShaderMaterial>(null);
  const skirtMaterialRef = useRef<ShaderMaterial>(null);
  const nightReflectionMaterialRef = useRef<ShaderMaterial>(null);
  const morningReflectionMaterialRef = useRef<ShaderMaterial>(null);
  const flowMaterialRef = useRef<ShaderMaterial>(null);
  const bodyShaderRef =
    useRef<WebGLProgramParametersWithUniforms | null>(null);
  const themeValue = useRef(theme === "morning" ? 1 : 0);
  const bodyColor = useMemo(() => new Color(), []);
  const attenuationColor = useMemo(() => new Color(), []);
  const surfaceGeometry = useMemo(() => createRiverGeometry(curve), [curve]);
  const skirtGeometry = useMemo(
    () => createRiverSkirtGeometry(curve),
    [curve],
  );
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uReveal: { value: getRevealFrontier(0) },
      uProgress: { value: 0 },
      uTheme: { value: theme === "morning" ? 1 : 0 },
      uMotionScale: { value: reducedMotion ? 0.2 : 1 },
      uPointer: { value: new Vector2() },
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

      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform float uWaterTime;
          uniform float uReveal;
          uniform float uMotionScale;
          uniform vec2 uPointer;
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
            aLongitudinal * 18.0 - uWaterTime * 0.12,
            aAcross * 2.8 + uWaterTime * 0.015
          ));
          float riverWave =
            (
              sin(
                aLongitudinal * 83.0 -
                uWaterTime * 0.72 +
                aAcross * 3.1 +
                riverNoise * 2.0
              ) * 0.016 +
              sin(
                aLongitudinal * 31.0 -
                uWaterTime * 0.38 -
                aAcross * 7.0
              ) * 0.009
            ) *
            mix(0.18, 1.0, downstream) *
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
          transformed.y += riverWave + pointerRipple;`,
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

  useEffect(
    () => () => {
      surfaceGeometry.dispose();
      skirtGeometry.dispose();
    },
    [skirtGeometry, surfaceGeometry],
  );

  useEffect(() => {
    const material = bodyMaterialRef.current;

    if (!material) {
      return;
    }

    material.customProgramCacheKey = () => "liquid-water-body-v1-1";
    material.needsUpdate = true;
  }, []);

  useFrame(({ clock, pointer }, delta) => {
    const progress = progressRef.current.current;
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

    const layerMaterials = [
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
  });

  return (
    <group>
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

      <mesh
        geometry={surfaceGeometry}
        position={[0, 0.009, 0]}
        frustumCulled={false}
        renderOrder={3}
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
        renderOrder={4}
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
        renderOrder={5}
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
    </group>
  );
}
