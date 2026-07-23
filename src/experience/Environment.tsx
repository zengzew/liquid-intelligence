import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
} from "three";
import type { ExperienceTheme } from "../App";

interface EnvironmentProps {
  theme: ExperienceTheme;
}

const NIGHT_BACKGROUND = new Color("#030506");
const MORNING_BACKGROUND = new Color("#f5f1e9");
const NIGHT_GROUND = new Color("#030607");
const MORNING_GROUND = new Color("#eeebe5");
const NIGHT_SKY = new Color("#7890a2");
const MORNING_SKY = new Color("#fffdf7");
const NIGHT_GROUND_LIGHT = new Color("#020304");
const MORNING_GROUND_LIGHT = new Color("#bdc8cc");
const NIGHT_KEY_LIGHT = new Color("#b9d8ed");
const MORNING_KEY_LIGHT = new Color("#fff4df");

export default function Environment({ theme }: EnvironmentProps) {
  const { scene } = useThree();
  const floorRef = useRef<Mesh>(null);
  const hemisphereRef = useRef<HemisphereLight>(null);
  const keyLightRef = useRef<DirectionalLight>(null);
  const themeValue = useRef(theme === "morning" ? 1 : 0);
  const targetColor = useMemo(() => new Color(), []);

  useEffect(() => {
    const background = (
      theme === "morning" ? MORNING_BACKGROUND : NIGHT_BACKGROUND
    ).clone();
    const fog = new FogExp2(background, theme === "morning" ? 0.022 : 0.028);

    scene.background = background;
    scene.fog = fog;

    return () => {
      scene.fog = null;
    };
  }, [scene]);

  useFrame((_, delta) => {
    themeValue.current = MathUtils.damp(
      themeValue.current,
      theme === "morning" ? 1 : 0,
      2.2,
      delta,
    );

    const mix = themeValue.current;
    targetColor.copy(NIGHT_BACKGROUND).lerp(MORNING_BACKGROUND, mix);

    if (scene.background instanceof Color) {
      scene.background.copy(targetColor);
    }

    if (scene.fog instanceof FogExp2) {
      scene.fog.color.copy(targetColor);
      scene.fog.density = MathUtils.lerp(0.028, 0.022, mix);
    }

    const floorMaterial = floorRef.current?.material;

    if (floorMaterial instanceof MeshStandardMaterial) {
      floorMaterial.color.copy(NIGHT_GROUND).lerp(MORNING_GROUND, mix);
    }

    if (hemisphereRef.current) {
      hemisphereRef.current.color.copy(NIGHT_SKY).lerp(MORNING_SKY, mix);
      hemisphereRef.current.groundColor
        .copy(NIGHT_GROUND_LIGHT)
        .lerp(MORNING_GROUND_LIGHT, mix);
      hemisphereRef.current.intensity = MathUtils.lerp(0.32, 1.05, mix);
    }

    if (keyLightRef.current) {
      keyLightRef.current.color
        .copy(NIGHT_KEY_LIGHT)
        .lerp(MORNING_KEY_LIGHT, mix);
      keyLightRef.current.intensity = MathUtils.lerp(1.6, 2.35, mix);
    }
  });

  return (
    <>
      <hemisphereLight ref={hemisphereRef} args={["#7890a2", "#020304", 0.32]} />
      <directionalLight
        ref={keyLightRef}
        color="#b9d8ed"
        intensity={1.6}
        position={[-7, 12, 5]}
      />
      <mesh
        ref={floorRef}
        position={[0, -1.65, -28]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[120, 150, 1, 1]} />
        <meshStandardMaterial color="#030607" roughness={0.98} metalness={0} />
      </mesh>
    </>
  );
}
