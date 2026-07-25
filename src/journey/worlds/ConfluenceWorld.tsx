import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CatmullRomCurve3,
  Color,
  MathUtils,
  Vector3,
  type Group,
  type PointLight,
} from "three";
import { JOURNEY_CHAPTERS, getJourneyChapterPresence } from "../chapters";
import {
  createCausticMaterial,
  createLiquidRibbonMaterial,
  createRibbonGeometry,
  dampThemeMix,
  updateLiquidMaterial,
  type LiquidWorldProps,
} from "./shared";

const NIGHT_LIGHT = new Color("#a9b9b7");
const MORNING_LIGHT = new Color("#c7aa7e");

export default function ConfluenceWorld({
  curve,
  progressRef,
  reducedMotion,
  theme,
}: LiquidWorldProps) {
  const groupRef = useRef<Group>(null);
  const lightRef = useRef<PointLight>(null);
  const themeMix = useRef(theme === "morning" ? 1 : 0);
  const tributaries = useMemo(() => {
    const merge = curve.getPointAt(0.695);
    merge.y += 0.018;

    return {
      merge,
      left: new CatmullRomCurve3(
        [
          new Vector3(-12.5, merge.y + 0.14, merge.z + 8.4),
          new Vector3(-9, merge.y + 0.09, merge.z + 5.6),
          new Vector3(-5.7, merge.y + 0.05, merge.z + 2.6),
          new Vector3(-2.8, merge.y + 0.025, merge.z + 0.6),
          merge.clone(),
        ],
        false,
        "catmullrom",
        0.45,
      ),
      right: new CatmullRomCurve3(
        [
          new Vector3(13, merge.y + 0.16, merge.z + 7.6),
          new Vector3(9.2, merge.y + 0.1, merge.z + 5.2),
          new Vector3(5.6, merge.y + 0.055, merge.z + 2.4),
          new Vector3(2.75, merge.y + 0.025, merge.z + 0.55),
          merge.clone(),
        ],
        false,
        "catmullrom",
        0.45,
      ),
    };
  }, [curve]);
  const leftGeometry = useMemo(
    () =>
      createRibbonGeometry(tributaries.left, {
        segments: 96,
        crossSegments: 12,
        width: (localProgress) =>
          MathUtils.lerp(
            2.35,
            0.42,
            localProgress * localProgress * (3 - 2 * localProgress),
          ),
        elevation: (localProgress) =>
          0.02 + Math.sin(localProgress * Math.PI) * 0.018,
      }),
    [tributaries],
  );
  const rightGeometry = useMemo(
    () =>
      createRibbonGeometry(tributaries.right, {
        segments: 96,
        crossSegments: 12,
        width: (localProgress) =>
          MathUtils.lerp(
            2.15,
            0.4,
            localProgress * localProgress * (3 - 2 * localProgress),
          ),
        elevation: (localProgress) =>
          0.024 + Math.sin(localProgress * Math.PI) * 0.014,
      }),
    [tributaries],
  );
  const leftMaterial = useMemo(
    () => {
      const material = createLiquidRibbonMaterial({
        nightColor: "#607875",
        morningColor: "#8b9692",
        baseAlpha: 0.46,
        sparkle: 0.06,
        phase: 0.7,
      });
      material.depthTest = false;
      return material;
    },
    [],
  );
  const rightMaterial = useMemo(
    () => {
      const material = createLiquidRibbonMaterial({
        nightColor: "#6e7d79",
        morningColor: "#9a8b75",
        baseAlpha: 0.42,
        sparkle: 0.05,
        phase: 3.4,
      });
      material.depthTest = false;
      return material;
    },
    [],
  );
  const mergeMaterial = useMemo(
    () =>
      createCausticMaterial({
        nightColor: "#91a4a1",
        morningColor: "#b29872",
        strength: 0.26,
        phase: 4.1,
      }),
    [],
  );

  useEffect(
    () => () => {
      leftGeometry.dispose();
      rightGeometry.dispose();
      leftMaterial.dispose();
      rightMaterial.dispose();
      mergeMaterial.dispose();
    },
    [
      leftGeometry,
      leftMaterial,
      mergeMaterial,
      rightGeometry,
      rightMaterial,
    ],
  );

  useFrame(({ clock }, delta) => {
    const presence = getJourneyChapterPresence(
      progressRef.current.current,
      JOURNEY_CHAPTERS[3],
    );
    const mix = dampThemeMix(themeMix, theme, reducedMotion, delta);
    const time = reducedMotion ? 0 : clock.elapsedTime;

    updateLiquidMaterial(leftMaterial, {
      presence,
      themeMix: mix,
      time,
      motionScale: reducedMotion ? 0.16 : 1,
    });
    updateLiquidMaterial(rightMaterial, {
      presence,
      themeMix: mix,
      time,
      motionScale: reducedMotion ? 0.16 : 1,
    });
    updateLiquidMaterial(mergeMaterial, {
      presence: presence * 0.88,
      themeMix: mix,
      time,
      motionScale: 0,
    });

    if (groupRef.current) {
      groupRef.current.visible = presence > 0.006;
    }

    if (lightRef.current) {
      lightRef.current.color.copy(NIGHT_LIGHT).lerp(MORNING_LIGHT, mix);
      lightRef.current.intensity = presence * MathUtils.lerp(2.25, 1.45, mix);
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
        position={tributaries.merge}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[15, 14, 1]}
        material={mergeMaterial}
        renderOrder={4}
      >
        <planeGeometry args={[1, 1]} />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[
          tributaries.merge.x,
          tributaries.merge.y + 4.8,
          tributaries.merge.z + 0.5,
        ]}
        distance={19}
        decay={2}
      />
    </group>
  );
}
