import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { CinematicCamera } from "./CinematicCamera";
import { LiquidEnvironment } from "./LiquidEnvironment";
import { createRiverCurve } from "./river";
import { WaterStream } from "./WaterStream";
import type { NumericRef, ThemeMode } from "../types";

type LiquidSceneProps = {
  theme: ThemeMode;
  scrollProgress: NumericRef;
  reducedMotion: boolean;
};

function LiquidWorld(props: LiquidSceneProps) {
  const curve = useMemo(() => createRiverCurve(), []);

  return (
    <>
      <LiquidEnvironment
        theme={props.theme}
        reducedMotion={props.reducedMotion}
      />
      <WaterStream curve={curve} {...props} />
      <CinematicCamera
        curve={curve}
        scrollProgress={props.scrollProgress}
        reducedMotion={props.reducedMotion}
      />
    </>
  );
}

export function LiquidScene(props: LiquidSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 1, -17], fov: 42, near: 0.025, far: 80 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = props.theme === "light" ? 0.93 : 1.14;
      }}
      performance={{ min: 0.75 }}
    >
      <LiquidWorld {...props} />
    </Canvas>
  );
}
