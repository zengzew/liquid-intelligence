import { useEffect, useState } from "react";
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
  profilingEnabled: boolean;
}

function configureRenderer(renderer: WebGLRenderer) {
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
}

export default function LiquidExperience({
  theme,
  progressRef,
  profilingEnabled,
}: LiquidExperienceProps) {
  const [renderDpr, setRenderDpr] = useState(() =>
    window.innerWidth <= 640 ? 0.82 : 0.6,
  );

  useEffect(() => {
    const updateRenderDpr = () => {
      const nextDpr = window.innerWidth <= 640 ? 0.82 : 0.6;
      setRenderDpr((currentDpr) =>
        currentDpr === nextDpr ? currentDpr : nextDpr,
      );
    };

    window.addEventListener("resize", updateRenderDpr);

    return () => {
      window.removeEventListener("resize", updateRenderDpr);
    };
  }, []);

  return (
    <Canvas
      camera={{ fov: 42, near: 0.08, far: 260, position: [0, 11, -2] }}
      dpr={renderDpr}
      flat={false}
      gl={{
        alpha: false,
        antialias: false,
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
      <FrameMonitor enabled={profilingEnabled} />
    </Canvas>
  );
}
