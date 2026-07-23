import type { MutableRefObject } from "react";
import { Canvas } from "@react-three/fiber";
import {
  ACESFilmicToneMapping,
  SRGBColorSpace,
  type WebGLRenderer,
} from "three";
import type { ExperienceTheme } from "../App";
import ExperienceScene from "./ExperienceScene";

export interface JourneyProgress {
  value: number;
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
      camera={{ fov: 44, near: 0.08, far: 95, position: [0, 2.6, 10] }}
      dpr={[1, 1.75]}
      flat={false}
      gl={{
        alpha: false,
        antialias: true,
        depth: true,
        powerPreference: "high-performance",
        stencil: false,
      }}
      onCreated={({ gl }) => configureRenderer(gl)}
    >
      <ExperienceScene theme={theme} progressRef={progressRef} />
    </Canvas>
  );
}
