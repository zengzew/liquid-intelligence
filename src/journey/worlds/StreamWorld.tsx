import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, MathUtils, type Group, type PointLight } from "three";
import { getRiverHalfWidth } from "../../water/riverGeometry";
import { JOURNEY_CHAPTERS, getJourneyChapterPresence } from "../chapters";
import {
  createCausticMaterial,
  createLiquidRibbonMaterial,
  createRibbonGeometry,
  dampThemeMix,
  getCurvePosition,
  updateLiquidMaterial,
  type LiquidWorldProps,
} from "./shared";

const NIGHT_LIGHT = new Color("#9eacaa");
const MORNING_LIGHT = new Color("#d1b78f");

export default function StreamWorld({
  curve,
  progressRef,
  reducedMotion,
  theme,
}: LiquidWorldProps) {
  const groupRef = useRef<Group>(null);
  const lightRef = useRef<PointLight>(null);
  const themeMix = useRef(theme === "morning" ? 1 : 0);
  const fieldPosition = useMemo(
    () => getCurvePosition(curve, 0.235, 0, 0.018),
    [curve],
  );
  const leftGeometry = useMemo(
    () =>
      createRibbonGeometry(curve, {
        start: 0.11,
        end: 0.35,
        segments: 86,
        crossSegments: 6,
        lateralOffset: (localProgress, curveProgress) =>
          -(
            getRiverHalfWidth(curveProgress) *
              (0.62 + Math.sin(localProgress * Math.PI) * 0.12) +
            0.025
          ),
        width: (localProgress) =>
          0.025 + Math.sin(localProgress * Math.PI) * 0.095,
        elevation: () => 0.028,
      }),
    [curve],
  );
  const rightGeometry = useMemo(
    () =>
      createRibbonGeometry(curve, {
        start: 0.12,
        end: 0.34,
        segments: 86,
        crossSegments: 6,
        lateralOffset: (localProgress, curveProgress) =>
          getRiverHalfWidth(curveProgress) *
            (0.58 + Math.sin(localProgress * Math.PI) * 0.16) +
          0.03,
        width: (localProgress) =>
          0.02 + Math.sin(localProgress * Math.PI) * 0.082,
        elevation: () => 0.03,
      }),
    [curve],
  );
  const leftMaterial = useMemo(
    () =>
      createLiquidRibbonMaterial({
        nightColor: "#94a6a5",
        morningColor: "#8a857c",
        baseAlpha: 0.055,
        sparkle: 0.48,
        phase: 1.3,
      }),
    [],
  );
  const rightMaterial = useMemo(
    () =>
      createLiquidRibbonMaterial({
        nightColor: "#c4cecb",
        morningColor: "#a3937d",
        baseAlpha: 0.045,
        sparkle: 0.66,
        phase: 3.7,
      }),
    [],
  );
  const fieldMaterial = useMemo(
    () =>
      createCausticMaterial({
        nightColor: "#718481",
        morningColor: "#a99475",
        strength: 0.12,
        phase: 2.4,
      }),
    [],
  );

  useEffect(
    () => () => {
      leftGeometry.dispose();
      rightGeometry.dispose();
      leftMaterial.dispose();
      rightMaterial.dispose();
      fieldMaterial.dispose();
    },
    [
      fieldMaterial,
      leftGeometry,
      leftMaterial,
      rightGeometry,
      rightMaterial,
    ],
  );

  useFrame(({ clock }, delta) => {
    const progress = progressRef.current.current;
    const presence = getJourneyChapterPresence(progress, JOURNEY_CHAPTERS[1]);
    const localReveal = MathUtils.clamp((progress - 0.11) / 0.24 + 0.08, 0, 1);
    const mix = dampThemeMix(themeMix, theme, reducedMotion, delta);
    const time = reducedMotion ? 0 : clock.elapsedTime;

    updateLiquidMaterial(leftMaterial, {
      presence,
      themeMix: mix,
      time,
      motionScale: reducedMotion ? 0.16 : 1,
      reveal: localReveal,
    });
    updateLiquidMaterial(rightMaterial, {
      presence,
      themeMix: mix,
      time,
      motionScale: reducedMotion ? 0.16 : 1,
      reveal: localReveal,
    });
    updateLiquidMaterial(fieldMaterial, {
      presence: presence * 0.72,
      themeMix: mix,
      time,
      motionScale: 0,
    });

    if (groupRef.current) {
      groupRef.current.visible = presence > 0.006;
    }

    if (lightRef.current) {
      lightRef.current.color.copy(NIGHT_LIGHT).lerp(MORNING_LIGHT, mix);
      lightRef.current.intensity = presence * 1.1;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        geometry={leftGeometry}
        material={leftMaterial}
        frustumCulled={false}
        renderOrder={5}
      />
      <mesh
        geometry={rightGeometry}
        material={rightMaterial}
        frustumCulled={false}
        renderOrder={5}
      />
      <mesh
        position={fieldPosition}
        rotation={[-Math.PI / 2, 0, 0.16]}
        scale={[6.8, 12.5, 1]}
        material={fieldMaterial}
        renderOrder={4}
      >
        <planeGeometry args={[1, 1]} />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[fieldPosition.x - 1.4, fieldPosition.y + 3.4, fieldPosition.z]}
        distance={13}
        decay={2}
      />
    </group>
  );
}
