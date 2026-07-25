import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, MathUtils, type Group, type PointLight } from "three";
import { JOURNEY_CHAPTERS, getJourneyChapterPresence } from "../chapters";
import {
  createLiquidRibbonMaterial,
  createRibbonGeometry,
  dampThemeMix,
  getCurvePosition,
  updateLiquidMaterial,
  type LiquidWorldProps,
} from "./shared";

const NIGHT_LIGHT = new Color("#d8e0de");
const MORNING_LIGHT = new Color("#c0925c");

export default function OriginWorld({
  curve,
  progressRef,
  reducedMotion,
  theme,
}: LiquidWorldProps) {
  const groupRef = useRef<Group>(null);
  const lightRef = useRef<PointLight>(null);
  const themeMix = useRef(theme === "morning" ? 1 : 0);
  const sourcePosition = useMemo(
    () => getCurvePosition(curve, 0.028, 0, 0.024),
    [curve],
  );
  const sourceGeometry = useMemo(
    () =>
      createRibbonGeometry(curve, {
        start: 0,
        end: 0.12,
        segments: 64,
        crossSegments: 7,
        width: (localProgress) =>
          MathUtils.lerp(0.055, 0.2, Math.pow(localProgress, 0.72)),
        elevation: () => 0.026,
      }),
    [curve],
  );
  const sourceMaterial = useMemo(
    () =>
      createLiquidRibbonMaterial({
        nightColor: "#d6ddda",
        morningColor: "#8f8577",
        baseAlpha: 0.13,
        sparkle: 0.78,
        phase: 0.4,
      }),
    [],
  );
  useEffect(
    () => () => {
      sourceGeometry.dispose();
      sourceMaterial.dispose();
    },
    [sourceGeometry, sourceMaterial],
  );

  useFrame(({ clock }, delta) => {
    const progress = progressRef.current.current;
    const presence = getJourneyChapterPresence(progress, JOURNEY_CHAPTERS[0]);
    const mix = dampThemeMix(themeMix, theme, reducedMotion, delta);
    const time = reducedMotion ? 0 : clock.elapsedTime;

    updateLiquidMaterial(sourceMaterial, {
      presence: presence * 0.95,
      themeMix: mix,
      time,
      motionScale: reducedMotion ? 0.16 : 1,
      reveal: MathUtils.clamp(progress / 0.12 + 0.08, 0, 1),
    });
    if (groupRef.current) {
      groupRef.current.visible = presence > 0.006;
    }

    if (lightRef.current) {
      lightRef.current.color.copy(NIGHT_LIGHT).lerp(MORNING_LIGHT, mix);
      lightRef.current.intensity = presence * MathUtils.lerp(2.1, 1.35, mix);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        geometry={sourceGeometry}
        material={sourceMaterial}
        frustumCulled={false}
        renderOrder={5}
      />
      <pointLight
        ref={lightRef}
        position={[sourcePosition.x, sourcePosition.y + 1.65, sourcePosition.z]}
        distance={8}
        decay={2}
      />
    </group>
  );
}
