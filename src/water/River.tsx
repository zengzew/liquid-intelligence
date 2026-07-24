import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import {
  CatmullRomCurve3,
  FrontSide,
  MathUtils,
  NormalBlending,
  ShaderMaterial,
  Vector2,
} from "three";
import type { ExperienceTheme } from "../App";
import type { JourneyProgress } from "../experience/LiquidExperience";
import RiverGuideSimulation from "./guideSimulation";
import {
  createRiverGeometry,
  getRevealFrontier,
} from "./riverGeometry";
import { createWaterNormalTexture } from "./waterTextures";
import filmFragmentShader from "./shaders/film.frag";
import contactVertexShader from "./shaders/contact.vert";
import shadowFragmentShader from "./shaders/shadow.frag";
import surfaceVertexShader from "./shaders/surface.vert";

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
  const contactMeshRef = useRef<Mesh>(null);
  const contactWarmupFrames = useRef(2);
  const contactMaterialRef = useRef<ShaderMaterial>(null);
  const waterMaterialRef = useRef<ShaderMaterial>(null);
  const themeValue = useRef(theme === "morning" ? 1 : 0);
  const surfaceGeometry = useMemo(() => createRiverGeometry(curve), [curve]);
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const guideSimulation = useMemo(
    () => new RiverGuideSimulation(curve, reducedMotion),
    [curve, reducedMotion],
  );
  const waterNormalTexture = useMemo(createWaterNormalTexture, []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uReveal: { value: getRevealFrontier(0) },
      uProgress: { value: 0 },
      uTheme: { value: theme === "morning" ? 1 : 0 },
      uMotionScale: { value: reducedMotion ? 0.2 : 1 },
      uPointer: { value: new Vector2() },
      uGuideTexture: { value: guideSimulation.texture },
      uGuideCount: { value: guideSimulation.count },
      uNoiseTexture: { value: waterNormalTexture },
    }),
    [guideSimulation, reducedMotion, waterNormalTexture],
  );
  useEffect(
    () => () => {
      surfaceGeometry.dispose();
      guideSimulation.dispose();
      waterNormalTexture.dispose();
    },
    [guideSimulation, surfaceGeometry, waterNormalTexture],
  );

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
    guideSimulation.update(
      uniforms.uReveal.value,
      progressRef.current.velocity,
      delta,
    );

    const contactMaterial = contactMaterialRef.current;
    const contactMesh = contactMeshRef.current;

    if (contactMesh) {
      if (contactWarmupFrames.current > 0) {
        contactWarmupFrames.current -= 1;
        contactMesh.visible = true;
      } else {
        contactMesh.visible =
          themeValue.current > 0.015 && progress < 0.735;
      }
    }

    if (contactMaterial) {
      contactMaterial.uniforms.uTime.value = uniforms.uTime.value;
      contactMaterial.uniforms.uReveal.value = uniforms.uReveal.value;
      contactMaterial.uniforms.uProgress.value = progress;
      contactMaterial.uniforms.uTheme.value = themeValue.current;
      contactMaterial.uniforms.uMotionScale.value =
        uniforms.uMotionScale.value;
      contactMaterial.uniforms.uPointer.value.copy(uniforms.uPointer.value);
    }

    const waterMaterial = waterMaterialRef.current;

    if (waterMaterial) {
      waterMaterial.uniforms.uTime.value = uniforms.uTime.value;
      waterMaterial.uniforms.uReveal.value = uniforms.uReveal.value;
      waterMaterial.uniforms.uProgress.value = progress;
      waterMaterial.uniforms.uTheme.value = themeValue.current;
      waterMaterial.uniforms.uMotionScale.value = uniforms.uMotionScale.value;
      waterMaterial.uniforms.uPointer.value.copy(uniforms.uPointer.value);
    }
  });

  return (
    <group>
      <mesh
        ref={contactMeshRef}
        geometry={surfaceGeometry}
        position={[0, -0.075, 0]}
        frustumCulled={false}
        renderOrder={0}
      >
        <shaderMaterial
          ref={contactMaterialRef}
          uniforms={uniforms}
          vertexShader={contactVertexShader}
          fragmentShader={shadowFragmentShader}
          transparent
          depthWrite={false}
          depthTest={false}
          side={FrontSide}
          blending={NormalBlending}
          toneMapped
        />
      </mesh>

      <mesh
        geometry={surfaceGeometry}
        frustumCulled={false}
        renderOrder={1}
      >
        <shaderMaterial
          ref={waterMaterialRef}
          uniforms={uniforms}
          vertexShader={surfaceVertexShader}
          fragmentShader={filmFragmentShader}
          transparent
          depthWrite={false}
          depthTest={false}
          side={FrontSide}
          blending={NormalBlending}
          toneMapped
        />
      </mesh>
    </group>
  );
}
