import type { MutableRefObject } from "react";
import { Canvas } from "@react-three/fiber";
import {
  ACESFilmicToneMapping,
  SRGBColorSpace,
  type WebGLRenderer,
} from "three";
import type { ExperienceTheme } from "../App";
import ExperienceScene from "./ExperienceScene";
import FrameMonitor from "./FrameMonitor";

export interface JourneyProgress {
  target: number;
  current: number;
  velocity: number;
}

interface LiquidExperienceProps {
  theme: ExperienceTheme;
  progressRef: MutableRefObject<JourneyProgress>;
}

function configureRenderer(renderer: WebGLRenderer) {
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
}

export default function LiquidExperience({
  theme,
  progressRef,
}: LiquidExperienceProps) {
  return (
    <Canvas
      camera={{ fov: 42, near: 0.08, far: 140, position: [0, 11, -2] }}
      dpr={[1, 1.5]}
      flat={false}
      gl={{
        alpha: false,
        antialias: true,
        depth: true,
        powerPreference: "high-performance",
        stencil: false,
      }}
      performance={{ min: 0.65 }}
      onCreated={({ gl }) => {
        configureRenderer(gl);
        Reflect.set(window, "__LIQUID_RENDERER__", gl);
      }}
    >
      <ExperienceScene theme={theme} progressRef={progressRef} />
      <FrameMonitor />
    </Canvas>
  );
}
