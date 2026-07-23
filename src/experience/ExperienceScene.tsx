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
      new Vector3(-0.15, 0, 7.5),
      new Vector3(0.15, 0, 4.8),
      new Vector3(-0.75, 0, 1.7),
      new Vector3(1.05, 0, -2.4),
      new Vector3(0.45, 0, -7.1),
      new Vector3(-1.65, 0, -12.5),
      new Vector3(-0.2, 0, -18.6),
      new Vector3(2.45, 0, -25.6),
      new Vector3(0.75, 0, -33.4),
      new Vector3(-2.8, 0, -42.2),
      new Vector3(-0.5, 0, -51.6),
      new Vector3(3.5, 0, -62.5),
    ],
    false,
    "catmullrom",
    0.42,
  );
}

export default function ExperienceScene({
  theme,
  progressRef,
}: ExperienceSceneProps) {
  const curve = useMemo(createRiverCurve, []);

  return (
    <>
      <Environment theme={theme} />
      <River curve={curve} theme={theme} progressRef={progressRef} />
      <CameraRig curve={curve} progressRef={progressRef} />
    </>
  );
}
