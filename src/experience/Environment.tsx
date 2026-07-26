import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import {
  Environment as ReflectionEnvironment,
  Lightformer,
} from "@react-three/drei";
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
import type { JourneyProgress } from "./LiquidExperience";

interface EnvironmentProps {
  theme: ExperienceTheme;
  progressRef: MutableRefObject<JourneyProgress>;
}

const NIGHT_BACKGROUND = new Color("#020303");
const MORNING_BACKGROUND = new Color("#f5f2ec");
const NIGHT_GROUND = new Color("#020303");
const MORNING_GROUND = new Color("#f1eee8");
const NIGHT_SKY = new Color("#65696b");
const MORNING_SKY = new Color("#fff8ea");
const NIGHT_GROUND_LIGHT = new Color("#010202");
const MORNING_GROUND_LIGHT = new Color("#a8afb0");
const NIGHT_KEY_LIGHT = new Color("#d5d6d2");
const MORNING_KEY_LIGHT = new Color("#ffe9c7");

function SoftboxEnvironment({ theme }: { theme: ExperienceTheme }) {
  const morning = theme === "morning";

  return (
    <ReflectionEnvironment
      resolution={256}
      frames={2}
      environmentIntensity={morning ? 0.96 : 1.08}
    >
      <color attach="background" args={[morning ? "#d8d2c8" : "#050606"]} />
      <Lightformer
        form="rect"
        color={morning ? "#ffd6a0" : "#e3e7e5"}
        intensity={morning ? 2.45 : 2.75}
        position={[0.8, 9, 27]}
        scale={[1.05, 38]}
        target={[0.2, 0, -28]}
      />
      <Lightformer
        form="rect"
        color={morning ? "#aeb9ba" : "#aeb7b8"}
        intensity={morning ? 0.9 : 0.52}
        position={[-12, 6.5, 12]}
        scale={[2.4, 18]}
        target={[-2.5, 0, -35]}
      />
    </ReflectionEnvironment>
  );
}

export default function Environment({
  theme,
  progressRef,
}: EnvironmentProps) {
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
    const fog = new FogExp2(background, theme === "morning" ? 0.01 : 0.014);

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
      2.5,
      delta,
    );

    const mix = themeValue.current;
    const progress = progressRef.current.current;
    targetColor.copy(NIGHT_BACKGROUND).lerp(MORNING_BACKGROUND, mix);

    if (scene.background instanceof Color) {
      scene.background.copy(targetColor);
    }

    if (scene.fog instanceof FogExp2) {
      scene.fog.color.copy(targetColor);
      scene.fog.density =
        MathUtils.lerp(0.014, 0.01, mix) *
        MathUtils.lerp(1, 0.78, progress);
    }

    scene.environmentIntensity =
      MathUtils.lerp(1.08, 0.92, mix) *
      MathUtils.lerp(0.94, 1.08, progress);

    const floorMaterial = floorRef.current?.material;

    if (floorMaterial instanceof MeshStandardMaterial) {
      floorMaterial.color.copy(NIGHT_GROUND).lerp(MORNING_GROUND, mix);
      floorMaterial.roughness = MathUtils.lerp(0.99, 0.94, mix);
    }

    if (hemisphereRef.current) {
      hemisphereRef.current.color.copy(NIGHT_SKY).lerp(MORNING_SKY, mix);
      hemisphereRef.current.groundColor
        .copy(NIGHT_GROUND_LIGHT)
        .lerp(MORNING_GROUND_LIGHT, mix);
      hemisphereRef.current.intensity = MathUtils.lerp(0.18, 0.88, mix);
    }

    if (keyLightRef.current) {
      keyLightRef.current.color
        .copy(NIGHT_KEY_LIGHT)
        .lerp(MORNING_KEY_LIGHT, mix);
      keyLightRef.current.intensity =
        MathUtils.lerp(1.15, 1.85, mix) *
        MathUtils.lerp(0.96, 1.08, progress);
    }
  });

  return (
    <>
      <SoftboxEnvironment key={theme} theme={theme} />

      <hemisphereLight ref={hemisphereRef} args={["#65696b", "#010202", 0.18]} />
      <directionalLight
        ref={keyLightRef}
        color="#d5d6d2"
        intensity={1.15}
        position={[-8, 14, 5]}
      />

      <mesh
        ref={floorRef}
        position={[0, -2.8, -48]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[260, 420, 1, 1]} />
        <meshStandardMaterial color="#020303" roughness={0.99} metalness={0} />
      </mesh>
    </>
  );
}
