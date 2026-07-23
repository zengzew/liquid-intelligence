import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CatmullRomCurve3,
  MathUtils,
  NormalBlending,
  Points,
  ShaderMaterial,
} from "three";
import type { ExperienceTheme } from "../App";
import type { JourneyProgress } from "../experience/LiquidExperience";
import { createGlintGeometry } from "./riverGeometry";
import glintsFragmentShader from "./shaders/glints.frag";
import glintsVertexShader from "./shaders/glints.vert";

interface WaterGlintsProps {
  curve: CatmullRomCurve3;
  theme: ExperienceTheme;
  progressRef: MutableRefObject<JourneyProgress>;
  reducedMotion: boolean;
}

export default function WaterGlints({
  curve,
  theme,
  progressRef,
  reducedMotion,
}: WaterGlintsProps) {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const smoothedProgress = useRef(0);
  const smoothedTheme = useRef(theme === "morning" ? 1 : 0);
  const geometry = useMemo(() => createGlintGeometry(curve), [curve]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uTheme: { value: theme === "morning" ? 1 : 0 },
      uMotionScale: { value: reducedMotion ? 0.18 : 1 },
    }),
    [reducedMotion, theme],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }, delta) => {
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
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      frustumCulled={false}
      renderOrder={3}
    >
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={glintsVertexShader}
        fragmentShader={glintsFragmentShader}
        transparent
        depthWrite={false}
        depthTest
        blending={NormalBlending}
        toneMapped
      />
    </points>
  );
}
