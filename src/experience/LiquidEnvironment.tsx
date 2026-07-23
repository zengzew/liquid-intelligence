import { useEffect, useRef } from "react";
import { Environment, Lightformer } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { JourneyController } from "../journey/useJourneyController";
import type { ThemeMode } from "../types";

type LiquidEnvironmentProps = {
  controller: JourneyController;
  theme: ThemeMode;
  reducedMotion: boolean;
};

const DARK_FOG = new THREE.Color("#050607");
const LIGHT_FOG = new THREE.Color("#f2f0ea");
const DARK_SKY = new THREE.Color("#dfe5e7");
const LIGHT_SKY = new THREE.Color("#fffaf0");
const DARK_GROUND = new THREE.Color("#08090a");
const LIGHT_GROUND = new THREE.Color("#7f8587");
const DARK_KEY = new THREE.Color("#ffffff");
const LIGHT_KEY = new THREE.Color("#fff5e6");
const DARK_FILL = new THREE.Color("#75828a");
const LIGHT_FILL = new THREE.Color("#b2bdc1");

export function LiquidEnvironment({
  controller,
  theme,
  reducedMotion,
}: LiquidEnvironmentProps) {
  const { scene, gl } = useThree();
  const themeMix = useRef(theme === "light" ? 1 : 0);
  const hemisphere = useRef<THREE.HemisphereLight>(null);
  const keyLight = useRef<THREE.DirectionalLight>(null);
  const fillLight = useRef<THREE.SpotLight>(null);
  const rimLight = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    const previousBackground = scene.background;
    const previousFog = scene.fog;

    scene.background = null;
    scene.fog = new THREE.FogExp2(
      theme === "light" ? LIGHT_FOG : DARK_FOG,
      theme === "light" ? 0.017 : 0.022,
    );
    gl.setClearColor(0x000000, 0);

    return () => {
      scene.background = previousBackground;
      scene.fog = previousFog;
    };
  }, [gl, scene, theme]);

  useFrame((_, delta) => {
    const themeTarget = theme === "light" ? 1 : 0;
    themeMix.current = THREE.MathUtils.damp(
      themeMix.current,
      themeTarget,
      reducedMotion ? 16 : 3.2,
      delta,
    );

    const mix = themeMix.current;
    const journey = controller.progressRef.current / 4;
    const chapterLift = Math.sin(journey * Math.PI) * 0.16;

    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.lerpColors(DARK_FOG, LIGHT_FOG, mix);
      scene.fog.density = THREE.MathUtils.lerp(0.022, 0.017, mix) -
        journey * 0.003;
    }

    gl.toneMappingExposure =
      THREE.MathUtils.lerp(1.02, 0.9, mix) + chapterLift * 0.08;

    if (hemisphere.current) {
      hemisphere.current.color.lerpColors(DARK_SKY, LIGHT_SKY, mix);
      hemisphere.current.groundColor.lerpColors(
        DARK_GROUND,
        LIGHT_GROUND,
        mix,
      );
      hemisphere.current.intensity =
        THREE.MathUtils.lerp(0.54, 1.72, mix) + chapterLift;
    }

    if (keyLight.current) {
      keyLight.current.color.lerpColors(DARK_KEY, LIGHT_KEY, mix);
      keyLight.current.intensity =
        THREE.MathUtils.lerp(4.2, 3.2, mix) + chapterLift * 1.8;
      keyLight.current.position.x = THREE.MathUtils.lerp(
        -4.8,
        3.6,
        journey,
      );
      keyLight.current.position.y = THREE.MathUtils.lerp(7.8, 9.5, journey);
    }

    if (fillLight.current) {
      fillLight.current.color.lerpColors(DARK_FILL, LIGHT_FILL, mix);
      fillLight.current.intensity = THREE.MathUtils.lerp(18, 10, mix);
      fillLight.current.position.z = THREE.MathUtils.lerp(7, 4, journey);
    }

    if (rimLight.current) {
      rimLight.current.intensity =
        THREE.MathUtils.lerp(2.6, 1.4, mix) + journey * 0.8;
      rimLight.current.position.x = THREE.MathUtils.lerp(6, -5, journey);
    }
  });

  const isLight = theme === "light";

  return (
    <>
      <Environment resolution={128}>
        <Lightformer
          form="rect"
          intensity={isLight ? 1.8 : 3.6}
          color={isLight ? "#fff4e5" : "#ffffff"}
          position={[0, 7, 4]}
          rotation={[-Math.PI / 2.3, 0, 0]}
          scale={[10, 1.3, 1]}
        />
        <Lightformer
          form="rect"
          intensity={isLight ? 0.9 : 2.4}
          color={isLight ? "#c3ccd0" : "#8598a2"}
          position={[-6, 1, 4]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[7, 0.8, 1]}
        />
      </Environment>

      <hemisphereLight ref={hemisphere} intensity={0.54} />
      <directionalLight
        ref={keyLight}
        position={[-4.8, 7.8, 5]}
        intensity={4.2}
      />
      <spotLight
        ref={fillLight}
        position={[5.8, 2.4, 7]}
        angle={0.48}
        penumbra={0.92}
        distance={28}
        decay={1.5}
        intensity={18}
      />
      <directionalLight
        ref={rimLight}
        color="#d9e3e7"
        position={[6, -1, 2]}
        intensity={2.6}
      />
    </>
  );
}
