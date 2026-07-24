import { useMemo } from "react";
import type { MutableRefObject } from "react";
import { CatmullRomCurve3, Vector3 } from "three";
import type { ExperienceTheme } from "../App";
import River from "../water/River";
import CameraRig from "./CameraRig";
import Environment from "./Environment";
import type { JourneyProgress } from "./LiquidExperience";

interface ExperienceSceneProps {
  theme: ExperienceTheme;
  progressRef: MutableRefObject<JourneyProgress>;
}

function createRiverCurve() {
  return new CatmullRomCurve3(
    [
      new Vector3(3.2, 0.28, 9.2),
      new Vector3(1.82, 0.25, 5.7),
      new Vector3(3.42, 0.2, 0.2),
      new Vector3(1.02, 0.14, -6.7),
      new Vector3(3.55, 0.08, -14.5),
      new Vector3(0.72, 0, -23.8),
      new Vector3(0.3, -0.1, -35),
      new Vector3(2.4, -0.22, -48),
      new Vector3(-2.8, -0.36, -62.5),
      new Vector3(2.6, -0.52, -80),
      new Vector3(-0.8, -0.72, -112),
      new Vector3(-4, -0.96, -142),
      new Vector3(5.5, -1.18, -178),
    ],
    false,
    "catmullrom",
    0.5,
  );
}

export default function ExperienceScene({
  theme,
  progressRef,
}: ExperienceSceneProps) {
  const curve = useMemo(createRiverCurve, []);

  return (
    <>
      <Environment theme={theme} progressRef={progressRef} />
      <River curve={curve} theme={theme} progressRef={progressRef} />
      <CameraRig curve={curve} progressRef={progressRef} />
    </>
  );
}
