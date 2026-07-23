import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { JourneyController } from "../journey/useJourneyController";
import type { ThemeMode } from "../types";
import { ChapterCamera } from "./ChapterCamera";
import { LiquidEnvironment } from "./LiquidEnvironment";
import { LiquidSheet } from "./LiquidSheet";

type LiquidSceneProps = {
  controller: JourneyController;
  theme: ThemeMode;
  reducedMotion: boolean;
};

function LiquidWorld(props: LiquidSceneProps) {
  return (
    <>
      <LiquidEnvironment {...props} />
      <LiquidSheet {...props} />
      <ChapterCamera controller={props.controller} />
    </>
  );
}

export function LiquidScene(props: LiquidSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.08, 9.45], fov: 42, near: 0.05, far: 40 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = props.theme === "light" ? 0.9 : 1.02;
        gl.setClearColor(0x000000, 0);
      }}
      performance={{ min: 0.72 }}
    >
      <LiquidWorld {...props} />
    </Canvas>
  );
}
