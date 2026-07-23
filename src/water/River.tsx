import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  CatmullRomCurve3,
  DoubleSide,
  MathUtils,
  Mesh,
  NormalBlending,
  ShaderMaterial,
  Vector2,
} from "three";
import type { ExperienceTheme } from "../App";
import type { JourneyProgress } from "../experience/LiquidExperience";
import { createRiverGeometry } from "./riverGeometry";
import waterFragmentShader from "./shaders/water.frag";
import waterVertexShader from "./shaders/water.vert";
import WaterGlints from "./WaterGlints";
import highlightsFragmentShader from "./shaders/highlights.frag";

interface RiverProps {
  curve: CatmullRomCurve3;
  theme: ExperienceTheme;
  progressRef: MutableRefObject<JourneyProgress>;
}

export default function River({
  curve,
  theme,
  progressRef,
}: RiverProps) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const smoothedProgress = useRef(0);
  const smoothedTheme = useRef(theme === "morning" ? 1 : 0);
  const geometry = useMemo(() => createRiverGeometry(curve), [curve]);
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uTheme: { value: theme === "morning" ? 1 : 0 },
      uMotionScale: { value: reducedMotion ? 0.18 : 1 },
      uPointer: { value: new Vector2() },
    }),
    [reducedMotion, theme],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock, pointer }, delta) => {
    const material = materialRef.current;

    if (!material) {
      return;
    }

    smoothedProgress.current = MathUtils.damp(
      smoothedProgress.current,
      progressRef.current.value,
      3.2,
      delta,
    );
    smoothedTheme.current = MathUtils.damp(
      smoothedTheme.current,
      theme === "morning" ? 1 : 0,
      2.2,
      delta,
    );

    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uProgress.value = smoothedProgress.current;
    material.uniforms.uTheme.value = smoothedTheme.current;
    material.uniforms.uPointer.value.lerp(pointer, 1 - Math.exp(-delta * 2.6));
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        frustumCulled={false}
        renderOrder={2}
      >
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={waterVertexShader}
          fragmentShader={waterFragmentShader}
          transparent
          depthWrite={false}
          depthTest
          side={DoubleSide}
          blending={NormalBlending}
          toneMapped
        />
      </mesh>
      <mesh
        geometry={geometry}
        frustumCulled={false}
        renderOrder={3}
      >
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={waterVertexShader}
          fragmentShader={highlightsFragmentShader}
          transparent
          depthWrite={false}
          depthTest
          side={DoubleSide}
          blending={AdditiveBlending}
          toneMapped
        />
      </mesh>
      <WaterGlints
        curve={curve}
        theme={theme}
        progressRef={progressRef}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}
