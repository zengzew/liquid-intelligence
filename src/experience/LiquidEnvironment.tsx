import { useEffect, useRef } from "react";
import { Environment, Lightformer } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ThemeMode } from "../types";

type LiquidEnvironmentProps = {
  theme: ThemeMode;
  reducedMotion: boolean;
};

const DARK_BACKGROUND = new THREE.Color("#030405");
const LIGHT_BACKGROUND = new THREE.Color("#f2eee7");
const DARK_SKY = new THREE.Color("#8795a0");
const LIGHT_SKY = new THREE.Color("#fff6e8");
const DARK_GROUND_LIGHT = new THREE.Color("#0a0c0e");
const LIGHT_GROUND_LIGHT = new THREE.Color("#aab2b6");
const DARK_KEY = new THREE.Color("#dce8ee");
const LIGHT_KEY = new THREE.Color("#fff1d8");
const DARK_FILL = new THREE.Color("#728594");
const LIGHT_FILL = new THREE.Color("#93a4ad");

export function LiquidEnvironment({
  theme,
  reducedMotion,
}: LiquidEnvironmentProps) {
  const { scene, gl } = useThree();
  const themeMix = useRef(theme === "light" ? 1 : 0);
  const hemisphere = useRef<THREE.HemisphereLight>(null);
  const keyLight = useRef<THREE.DirectionalLight>(null);
  const fillLight = useRef<THREE.SpotLight>(null);

  useEffect(() => {
    const previousBackground = scene.background;
    const previousFog = scene.fog;

    scene.background = new THREE.Color(
      theme === "light" ? LIGHT_BACKGROUND : DARK_BACKGROUND,
    );
    scene.fog = new THREE.FogExp2(
      theme === "light" ? LIGHT_BACKGROUND : DARK_BACKGROUND,
      theme === "light" ? 0.024 : 0.032,
    );

    return () => {
      scene.background = previousBackground;
      scene.fog = previousFog;
    };
  }, [scene]);

  useFrame((_, delta) => {
    const target = theme === "light" ? 1 : 0;
    themeMix.current = THREE.MathUtils.damp(
      themeMix.current,
      target,
      reducedMotion ? 12 : 2.4,
      delta,
    );
    const mix = themeMix.current;

    if (scene.background instanceof THREE.Color) {
      scene.background.lerpColors(DARK_BACKGROUND, LIGHT_BACKGROUND, mix);
    }

    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.lerpColors(DARK_BACKGROUND, LIGHT_BACKGROUND, mix);
      scene.fog.density = THREE.MathUtils.lerp(0.032, 0.024, mix);
    }

    gl.toneMappingExposure = THREE.MathUtils.lerp(1.14, 0.93, mix);

    if (hemisphere.current) {
      hemisphere.current.color.lerpColors(DARK_SKY, LIGHT_SKY, mix);
      hemisphere.current.groundColor.lerpColors(
        DARK_GROUND_LIGHT,
        LIGHT_GROUND_LIGHT,
        mix,
      );
      hemisphere.current.intensity = THREE.MathUtils.lerp(0.14, 0.92, mix);
    }

    if (keyLight.current) {
      keyLight.current.color.lerpColors(DARK_KEY, LIGHT_KEY, mix);
      keyLight.current.intensity = THREE.MathUtils.lerp(1.25, 2.45, mix);
    }

    if (fillLight.current) {
      fillLight.current.color.lerpColors(DARK_FILL, LIGHT_FILL, mix);
      fillLight.current.intensity = THREE.MathUtils.lerp(8, 9, mix);
    }
  });

  const isLight = theme === "light";

  return (
    <>
      <Environment key={theme} resolution={256}>
        <Lightformer
          form="rect"
          intensity={isLight ? 3.2 : 9}
          color={isLight ? "#fff4df" : "#eaf6ff"}
          position={[0, 8, -2]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[13, isLight ? 1.1 : 0.42, 1]}
        />
        <Lightformer
          form="rect"
          intensity={isLight ? 1.4 : 5.2}
          color={isLight ? "#b8c6cc" : "#8097a8"}
          position={[-7, 2.5, 4]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[8, isLight ? 0.76 : 0.28, 1]}
        />
        <Lightformer
          form="rect"
          intensity={isLight ? 1.8 : 4.1}
          color={isLight ? "#ffe7bf" : "#ffffff"}
          position={[6, 1.5, 13]}
          rotation={[0, -Math.PI / 2.7, 0]}
          scale={[5, isLight ? 0.68 : 0.32, 1]}
        />
      </Environment>

      <hemisphereLight ref={hemisphere} intensity={0.14} />
      <directionalLight
        ref={keyLight}
        position={[-4, 9, -2]}
        intensity={1.25}
      />
      <spotLight
        ref={fillLight}
        position={[7, 4, 8]}
        angle={0.42}
        penumbra={0.95}
        distance={30}
        decay={1.45}
        intensity={8}
      />

    </>
  );
}
