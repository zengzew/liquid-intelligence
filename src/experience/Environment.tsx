import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, MathUtils } from "three";
import type { ExperienceTheme } from "../App";
import type { JourneyProgress } from "./LiquidExperience";

interface EnvironmentProps {
  theme: ExperienceTheme;
  progressRef: MutableRefObject<JourneyProgress>;
}

const NIGHT_BACKGROUND = new Color("#020303");
const MORNING_BACKGROUND = new Color("#f3f0e9");

export default function Environment({
  theme,
  progressRef,
}: EnvironmentProps) {
  const { scene } = useThree();
  const themeValue = useRef(theme === "morning" ? 1 : 0);
  const targetColor = useMemo(() => new Color(), []);

  useEffect(() => {
    const background = NIGHT_BACKGROUND.clone().lerp(
      MORNING_BACKGROUND,
      themeValue.current,
    );

    scene.background = background;

    return () => {
      scene.background = null;
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
    const progress = progressRef.current.current;
    targetColor.copy(NIGHT_BACKGROUND).lerp(MORNING_BACKGROUND, mix);

    if (scene.background instanceof Color) {
      scene.background.copy(targetColor);
    }
    scene.environmentIntensity = MathUtils.lerp(1, 0.9, mix) *
      MathUtils.lerp(0.98, 1.02, progress);
  });

  return null;
}
