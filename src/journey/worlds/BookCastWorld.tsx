import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  MathUtils,
  MeshPhysicalMaterial,
  NormalBlending,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  type Group,
  type PointLight,
  type WebGLProgramParametersWithUniforms,
} from "three";
import { getRiverHalfWidth } from "../../water/riverGeometry";
import {
  createRibbonGeometry,
  dampThemeMix,
  getCurvePosition,
  type LiquidWorldProps,
} from "./shared";
import bookCastResonanceFragmentShader from "./shaders/bookCastResonance.frag";
import bookCastResonanceVertexShader from "./shaders/bookCastResonance.vert";

const NIGHT_NEAR_LIGHT = new Color("#afc1c0");
const MORNING_NEAR_LIGHT = new Color("#9ca9a5");
const NIGHT_FAR_LIGHT = new Color("#a6aeab");
const MORNING_FAR_LIGHT = new Color("#c3a77d");
const NIGHT_NEAR_WATER = new Color("#536f76");
const MORNING_NEAR_WATER = new Color("#76898b");
const NIGHT_FAR_WATER = new Color("#48646b");
const MORNING_FAR_WATER = new Color("#847f74");
const NIGHT_ATTENUATION = new Color("#10272f");
const MORNING_ATTENUATION = new Color("#6e8083");
const NIGHT_SPECULAR = new Color("#d8e1df");
const MORNING_SPECULAR = new Color("#d4b88e");

function getProjectWorldPresence(progress: number) {
  return (
    MathUtils.smoothstep(progress, 0.355, 0.405) *
    (1 - MathUtils.smoothstep(progress, 0.56, 0.615))
  );
}

function createResonanceMaterial() {
  return new ShaderMaterial({
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      uMorningColor: { value: new Color("#8f8678") },
      uMotionScale: { value: 1 },
      uNightColor: { value: new Color("#b8c6c5") },
      uPresence: { value: 0 },
      uTheme: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: bookCastResonanceVertexShader,
    fragmentShader: bookCastResonanceFragmentShader,
    blending: NormalBlending,
    depthTest: false,
    depthWrite: false,
    fog: true,
    side: DoubleSide,
    toneMapped: true,
    transparent: true,
  });
}

function createFoldMaterial(
  cacheKey: string,
  onShaderReady: (shader: WebGLProgramParametersWithUniforms) => void,
) {
  const material = new MeshPhysicalMaterial({
    color: NIGHT_NEAR_WATER,
    attenuationColor: NIGHT_ATTENUATION,
    attenuationDistance: 2.8,
    clearcoat: 0.94,
    clearcoatRoughness: 0.14,
    depthTest: true,
    depthWrite: false,
    envMapIntensity: 1.62,
    ior: 1.333,
    metalness: 0,
    opacity: 0,
    roughness: 0.18,
    side: DoubleSide,
    specularColor: NIGHT_SPECULAR,
    specularIntensity: 0.82,
    thickness: 0.28,
    toneMapped: true,
    transmission: 0.24,
    transparent: true,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFoldTime = { value: 0 };
    shader.uniforms.uFoldMotionScale = { value: 1 };
    shader.uniforms.uFoldDirection = { value: 0 };
    shader.uniforms.uFoldEnergy = { value: 0 };
    shader.uniforms.uFoldPhase = { value: 0 };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uFoldTime;
        uniform float uFoldMotionScale;
        uniform float uFoldDirection;
        uniform float uFoldEnergy;
        uniform float uFoldPhase;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float foldEnvelope = sin(uv.y * 3.14159265);
        float foldIdle =
          sin(
            uv.y * 18.0 -
            uFoldTime * 0.18 -
            uFoldPhase * 0.72 +
            uv.x * 3.2
          ) * 0.012 +
          sin(
            uv.y * 7.0 -
            uFoldTime * 0.07 -
            uFoldPhase * 0.28 -
            uv.x * 4.7
          ) * 0.007;
        float foldImpulse =
          sin(
            uv.y * 25.0 -
            uFoldTime * 0.42 -
            uFoldPhase * 2.35 +
            uv.x * (5.2 + uFoldDirection * 1.8)
          ) *
          0.046 *
          uFoldEnergy;
        transformed.y +=
          (foldIdle + foldImpulse) *
          foldEnvelope *
          uFoldMotionScale;`,
      );
    onShaderReady(shader);
  };
  material.customProgramCacheKey = () => cacheKey;

  return material;
}

export default function BookCastWorld({
  curve,
  progressRef,
  reducedMotion,
  theme,
}: LiquidWorldProps) {
  const groupRef = useRef<Group>(null);
  const nearLightRef = useRef<PointLight>(null);
  const farLightRef = useRef<PointLight>(null);
  const nearFoldShaderRef =
    useRef<WebGLProgramParametersWithUniforms | null>(null);
  const farFoldShaderRef =
    useRef<WebGLProgramParametersWithUniforms | null>(null);
  const themeMix = useRef(theme === "morning" ? 1 : 0);
  const foldMotion = useRef({
    energy: 0,
    phase: 0,
    velocity: 0,
  });
  const nearLightPosition = useMemo(
    () => getCurvePosition(curve, 0.43, -0.3, 1.15),
    [curve],
  );
  const farLightPosition = useMemo(
    () => getCurvePosition(curve, 0.525, 0.45, 1),
    [curve],
  );
  const nearFoldGeometry = useMemo(
    () =>
      createRibbonGeometry(curve, {
        start: 0.355,
        end: 0.555,
        segments: 92,
        crossSegments: 14,
        lateralOffset: (localProgress, curveProgress) =>
          Math.sin((localProgress - 0.58) * Math.PI) *
          getRiverHalfWidth(curveProgress) *
          0.24,
        width: (localProgress, curveProgress) =>
          Math.min(
            1.9,
            getRiverHalfWidth(curveProgress) *
              MathUtils.lerp(
                0.4,
                0.58,
                Math.pow(Math.sin(localProgress * Math.PI), 1.15),
              ),
          ),
        elevation: (localProgress) =>
          0.08 +
          Math.pow(Math.sin(localProgress * Math.PI), 1.18) * 0.72,
        verticalOffset: (localProgress, _curveProgress, across) => {
          const crossLift = Math.pow(
            Math.sin(((across + 1) * Math.PI) / 2),
            1.2,
          );
          const lift = Math.sin(localProgress * Math.PI);
          const crossRoll =
            across *
            Math.sin(localProgress * Math.PI * 1.35 - 0.45) *
            0.17;

          return crossLift * lift * 0.38 + crossRoll * lift;
        },
      }),
    [curve],
  );
  const farFoldGeometry = useMemo(
    () =>
      createRibbonGeometry(curve, {
        start: 0.355,
        end: 0.555,
        segments: 88,
        crossSegments: 12,
        lateralOffset: (localProgress, curveProgress) =>
          -Math.sin((localProgress - 0.5) * Math.PI) *
          getRiverHalfWidth(curveProgress) *
          0.32,
        width: (localProgress, curveProgress) =>
          Math.min(
            1.18,
            getRiverHalfWidth(curveProgress) *
              MathUtils.lerp(
                0.24,
                0.38,
                Math.pow(Math.sin(localProgress * Math.PI), 1.2),
              ),
          ),
        elevation: (localProgress) =>
          0.22 +
          Math.pow(Math.sin(localProgress * Math.PI), 1.28) * 0.92,
        verticalOffset: (localProgress, _curveProgress, across) => {
          const crossLift = Math.pow(
            Math.sin(((across + 1) * Math.PI) / 2),
            1.3,
          );
          const lift = Math.sin(localProgress * Math.PI);
          const crossRoll =
            -across *
            Math.sin(localProgress * Math.PI * 1.2 + 0.3) *
            0.22;

          return crossLift * lift * 0.3 + crossRoll * lift;
        },
      }),
    [curve],
  );
  const resonanceGeometry = useMemo(
    () =>
      createRibbonGeometry(curve, {
        start: 0.385,
        end: 0.565,
        segments: 82,
        crossSegments: 18,
        lateralOffset: (localProgress, curveProgress) =>
          Math.sin(localProgress * Math.PI * 1.4) *
          getRiverHalfWidth(curveProgress) *
          0.018,
        width: (_localProgress, curveProgress) =>
          getRiverHalfWidth(curveProgress) * 0.88,
        elevation: () => 0.15,
      }),
    [curve],
  );
  const nearFoldMaterial = useMemo(
    () =>
      createFoldMaterial("bookcast-near-fold-v2", (shader) => {
        nearFoldShaderRef.current = shader;
      }),
    [],
  );
  const farFoldMaterial = useMemo(
    () =>
      createFoldMaterial("bookcast-far-fold-v2", (shader) => {
        farFoldShaderRef.current = shader;
      }),
    [],
  );
  const resonanceMaterial = useMemo(createResonanceMaterial, []);

  useEffect(
    () => () => {
      nearFoldGeometry.dispose();
      farFoldGeometry.dispose();
      resonanceGeometry.dispose();
      nearFoldMaterial.dispose();
      farFoldMaterial.dispose();
      resonanceMaterial.dispose();
    },
    [
      farFoldGeometry,
      farFoldMaterial,
      nearFoldGeometry,
      nearFoldMaterial,
      resonanceGeometry,
      resonanceMaterial,
    ],
  );

  useFrame(({ clock, size }, delta) => {
    const progress = progressRef.current.current;
    const presence = getProjectWorldPresence(progress);
    const mix = dampThemeMix(themeMix, theme, reducedMotion, delta);
    const time = reducedMotion ? 0 : clock.elapsedTime;
    const motionScale = reducedMotion ? 0.14 : 1;
    const motion = foldMotion.current;
    const rawVelocity = reducedMotion
      ? 0
      : MathUtils.clamp(progressRef.current.velocity, -2.4, 2.4);
    const isAccelerating =
      Math.abs(rawVelocity) > Math.abs(motion.velocity) ||
      Math.sign(rawVelocity) !== Math.sign(motion.velocity);
    motion.velocity = MathUtils.damp(
      motion.velocity,
      rawVelocity,
      isAccelerating ? 10.5 : 2,
      delta,
    );
    const energyTarget = reducedMotion
      ? 0
      : MathUtils.clamp(Math.abs(motion.velocity) * 0.82, 0, 1);
    motion.energy = MathUtils.damp(
      motion.energy,
      energyTarget,
      energyTarget > motion.energy ? 7.5 : 1.55,
      delta,
    );
    motion.phase += motion.velocity * delta * 1.2;
    const motionDirection = MathUtils.clamp(motion.velocity / 2.4, -1, 1);
    const mobileWorldScale = size.width < 700 ? 1.45 : 1;
    const mobileOpacity = size.width < 700 ? 1.08 : 1;

    nearFoldMaterial.color
      .copy(NIGHT_NEAR_WATER)
      .lerp(MORNING_NEAR_WATER, mix);
    nearFoldMaterial.attenuationColor
      .copy(NIGHT_ATTENUATION)
      .lerp(MORNING_ATTENUATION, mix);
    nearFoldMaterial.specularColor
      .copy(NIGHT_SPECULAR)
      .lerp(MORNING_SPECULAR, mix);
    nearFoldMaterial.opacity =
      presence *
      MathUtils.lerp(0.56, 0.46, mix) *
      (1 + motion.energy * 0.08) *
      mobileOpacity;
    nearFoldMaterial.roughness = MathUtils.lerp(0.19, 0.25, mix);
    nearFoldMaterial.envMapIntensity = MathUtils.lerp(1.58, 1.28, mix);

    farFoldMaterial.color
      .copy(NIGHT_FAR_WATER)
      .lerp(MORNING_FAR_WATER, mix);
    farFoldMaterial.attenuationColor
      .copy(NIGHT_ATTENUATION)
      .lerp(MORNING_ATTENUATION, mix);
    farFoldMaterial.specularColor
      .copy(NIGHT_SPECULAR)
      .lerp(MORNING_SPECULAR, mix);
    farFoldMaterial.opacity =
      presence *
      MathUtils.smoothstep(progress, 0.39, 0.47) *
      MathUtils.lerp(0.48, 0.39, mix) *
      (1 + motion.energy * 0.08) *
      mobileOpacity;
    farFoldMaterial.roughness = MathUtils.lerp(0.2, 0.26, mix);
    farFoldMaterial.envMapIntensity = MathUtils.lerp(1.5, 1.22, mix);

    if (nearFoldShaderRef.current) {
      nearFoldShaderRef.current.uniforms.uFoldTime.value = time;
      nearFoldShaderRef.current.uniforms.uFoldMotionScale.value = motionScale;
      nearFoldShaderRef.current.uniforms.uFoldDirection.value = motionDirection;
      nearFoldShaderRef.current.uniforms.uFoldEnergy.value = motion.energy;
      nearFoldShaderRef.current.uniforms.uFoldPhase.value = motion.phase;
    }

    if (farFoldShaderRef.current) {
      farFoldShaderRef.current.uniforms.uFoldTime.value = time * 0.86;
      farFoldShaderRef.current.uniforms.uFoldMotionScale.value = motionScale;
      farFoldShaderRef.current.uniforms.uFoldDirection.value = -motionDirection;
      farFoldShaderRef.current.uniforms.uFoldEnergy.value = motion.energy * 0.86;
      farFoldShaderRef.current.uniforms.uFoldPhase.value = motion.phase * 0.82;
    }

    resonanceMaterial.uniforms.uPresence.value = presence;
    resonanceMaterial.uniforms.uTheme.value = mix;
    resonanceMaterial.uniforms.uTime.value = time + motion.phase * 0.32;
    resonanceMaterial.uniforms.uMotionScale.value =
      motionScale * (1 + motion.energy * 1.25);

    if (groupRef.current) {
      groupRef.current.visible = presence > 0.004;
      groupRef.current.scale.y = mobileWorldScale;
    }

    if (nearLightRef.current) {
      nearLightRef.current.color
        .copy(NIGHT_NEAR_LIGHT)
        .lerp(MORNING_NEAR_LIGHT, mix);
      nearLightRef.current.intensity =
        presence *
        MathUtils.lerp(1.05, 0.58, mix) *
        (1 + motion.energy * 0.12);
    }

    if (farLightRef.current) {
      farLightRef.current.color
        .copy(NIGHT_FAR_LIGHT)
        .lerp(MORNING_FAR_LIGHT, mix);
      farLightRef.current.intensity =
        presence *
        MathUtils.lerp(0.72, 0.64, mix) *
        (1 + motion.energy * 0.1);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        geometry={nearFoldGeometry}
        material={nearFoldMaterial}
        frustumCulled={false}
        renderOrder={7}
      />
      <mesh
        geometry={farFoldGeometry}
        material={farFoldMaterial}
        frustumCulled={false}
        renderOrder={7}
      />
      <mesh
        geometry={resonanceGeometry}
        material={resonanceMaterial}
        frustumCulled={false}
        renderOrder={8}
      />
      <pointLight
        ref={nearLightRef}
        position={nearLightPosition}
        distance={9}
        decay={2}
      />
      <pointLight
        ref={farLightRef}
        position={farLightPosition}
        distance={8}
        decay={2}
      />
    </group>
  );
}
