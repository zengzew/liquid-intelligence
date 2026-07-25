import type { MutableRefObject } from "react";
import { Canvas } from "@react-three/fiber";
import {
  ACESFilmicToneMapping,
  SRGBColorSpace,
  type WebGLRenderer,
} from "three";
import type { ExperienceTheme } from "../App";
import type { WaterMaterialVariant } from "../water/materialVariants";
import ExperienceScene from "./ExperienceScene";
import FrameMonitor from "./FrameMonitor";

export interface JourneyProgress {
  target: number;
  current: number;
  velocity: number;
}

interface LiquidExperienceProps {
  material: WaterMaterialVariant;
  theme: ExperienceTheme;
  progressRef: MutableRefObject<JourneyProgress>;
}

function configureRenderer(renderer: WebGLRenderer) {
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.transmissionResolutionScale = 0.5;
  renderer.info.autoReset = false;
}

export default function LiquidExperience({
  material,
  theme,
  progressRef,
}: LiquidExperienceProps) {
  return (
    <Canvas
      camera={{ fov: 42, near: 0.08, far: 140, position: [0, 11, -2] }}
      dpr={[1, 1.25]}
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
      <ExperienceScene
        material={material}
        theme={theme}
        progressRef={progressRef}
      />
      <FrameMonitor />
    </Canvas>
  );
}
