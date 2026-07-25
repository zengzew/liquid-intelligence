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

const NIGHT_COOL_LIGHT = new Color("#b7c7c5");
const MORNING_COOL_LIGHT = new Color("#9ca6a2");
const NIGHT_WARM_LIGHT = new Color("#c6a171");
const MORNING_WARM_LIGHT = new Color("#d4a66d");

export default function BookCastWorld({
  curve,
  progressRef,
  reducedMotion,
  theme,
}: LiquidWorldProps) {
  const groupRef = useRef<Group>(null);
  const coolLightRef = useRef<PointLight>(null);
  const warmLightRef = useRef<PointLight>(null);
  const themeMix = useRef(theme === "morning" ? 1 : 0);
  const fieldPosition = useMemo(
    () => getCurvePosition(curve, 0.475, 0, 0.025),
    [curve],
  );
  const coolLightPosition = useMemo(
    () => getCurvePosition(curve, 0.44, -0.9, 1.2),
    [curve],
  );
  const warmLightPosition = useMemo(
    () => getCurvePosition(curve, 0.5, 1.1, 1.3),
    [curve],
  );
  const leftCurrentGeometry = useMemo(
    () =>
      createRibbonGeometry(curve, {
        start: 0.34,
        end: 0.59,
        segments: 112,
        crossSegments: 8,
        lateralOffset: (localProgress, curveProgress) =>
          Math.sin(localProgress * Math.PI * 3.0 + 0.22) *
            getRiverHalfWidth(curveProgress) *
            0.46 -
          0.06,
        width: (localProgress) =>
          MathUtils.lerp(0.11, 0.42, Math.sin(localProgress * Math.PI)),
        elevation: () => 0.04,
      }),
    [curve],
  );
  const rightCurrentGeometry = useMemo(
    () =>
      createRibbonGeometry(curve, {
        start: 0.35,
        end: 0.6,
        segments: 112,
        crossSegments: 8,
        lateralOffset: (localProgress, curveProgress) =>
          Math.sin(localProgress * Math.PI * 3.0 + Math.PI + 0.22) *
            getRiverHalfWidth(curveProgress) *
            0.46 +
          0.06,
        width: (localProgress) =>
          MathUtils.lerp(0.1, 0.38, Math.sin(localProgress * Math.PI)),
        elevation: () => 0.046,
      }),
    [curve],
  );
  const leftCurrentMaterial = useMemo(
    () => {
      const material = createLiquidRibbonMaterial({
        nightColor: "#97c3be",
        morningColor: "#6e8587",
        baseAlpha: 0.5,
        sparkle: 0.46,
        phase: 1.1,
      });
      material.depthTest = false;
      return material;
    },
    [],
  );
  const rightCurrentMaterial = useMemo(
    () => {
      const material = createLiquidRibbonMaterial({
        nightColor: "#d0a16b",
        morningColor: "#a97343",
        baseAlpha: 0.44,
        sparkle: 0.4,
        phase: 4.2,
      });
      material.depthTest = false;
      return material;
    },
    [],
  );
  const fieldMaterial = useMemo(
    () =>
      createCausticMaterial({
        nightColor: "#9aa9a5",
        morningColor: "#a88d68",
        strength: 0.2,
        phase: 1.5,
      }),
    [],
  );

  useEffect(
    () => () => {
      leftCurrentGeometry.dispose();
      rightCurrentGeometry.dispose();
      leftCurrentMaterial.dispose();
      rightCurrentMaterial.dispose();
      fieldMaterial.dispose();
    },
    [
      fieldMaterial,
      leftCurrentGeometry,
      leftCurrentMaterial,
      rightCurrentGeometry,
      rightCurrentMaterial,
    ],
  );

  useFrame(({ clock }, delta) => {
    const progress = progressRef.current.current;
    const presence = getJourneyChapterPresence(progress, JOURNEY_CHAPTERS[2]);
    const localReveal = MathUtils.clamp((progress - 0.34) / 0.26 + 0.08, 0, 1);
    const mix = dampThemeMix(themeMix, theme, reducedMotion, delta);
    const time = reducedMotion ? 0 : clock.elapsedTime;

    updateLiquidMaterial(leftCurrentMaterial, {
      presence,
      themeMix: mix,
      time,
      motionScale: reducedMotion ? 0.16 : 1,
      reveal: localReveal,
    });
    updateLiquidMaterial(rightCurrentMaterial, {
      presence,
      themeMix: mix,
      time,
      motionScale: reducedMotion ? 0.16 : 1,
      reveal: localReveal,
    });
    updateLiquidMaterial(fieldMaterial, {
      presence: presence * 0.9,
      themeMix: mix,
      time,
      motionScale: 0,
    });

    if (groupRef.current) {
      groupRef.current.visible = presence > 0.006;
    }

    if (coolLightRef.current) {
      coolLightRef.current.color
        .copy(NIGHT_COOL_LIGHT)
        .lerp(MORNING_COOL_LIGHT, mix);
      coolLightRef.current.intensity = presence * MathUtils.lerp(1.9, 1.15, mix);
    }

    if (warmLightRef.current) {
      warmLightRef.current.color
        .copy(NIGHT_WARM_LIGHT)
        .lerp(MORNING_WARM_LIGHT, mix);
      warmLightRef.current.intensity = presence * MathUtils.lerp(1.45, 1.2, mix);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh
        geometry={leftCurrentGeometry}
        material={leftCurrentMaterial}
        frustumCulled={false}
        renderOrder={6}
      />
      <mesh
        geometry={rightCurrentGeometry}
        material={rightCurrentMaterial}
        frustumCulled={false}
        renderOrder={7}
      />
      <mesh
        position={fieldPosition}
        rotation={[-Math.PI / 2, 0, -0.12]}
        scale={[8.8, 13.2, 1]}
        material={fieldMaterial}
        renderOrder={4}
      >
        <planeGeometry args={[1, 1]} />
      </mesh>
      <pointLight
        ref={coolLightRef}
        position={coolLightPosition}
        distance={11}
        decay={2}
      />
      <pointLight
        ref={warmLightRef}
        position={warmLightPosition}
        distance={10}
        decay={2}
      />
    </group>
  );
}
