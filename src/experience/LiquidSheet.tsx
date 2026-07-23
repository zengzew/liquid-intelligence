import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { JourneyController } from "../journey/useJourneyController";
import type { ThemeMode } from "../types";
import { createLiquidSheetModel } from "./liquidSheetGeometry";

type LiquidSheetProps = {
  controller: JourneyController;
  theme: ThemeMode;
  reducedMotion: boolean;
};

const DARK_MATTE = new THREE.Color("#f1f2ef");
const LIGHT_MATTE = new THREE.Color("#c6c7c3");
const materialColor = new THREE.Color();

export function LiquidSheet({
  controller,
  theme,
  reducedMotion,
}: LiquidSheetProps) {
  const model = useMemo(() => createLiquidSheetModel(), []);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const themeMix = useRef(theme === "light" ? 1 : 0);

  useEffect(() => () => model.dispose(), [model]);

  useFrame((_, delta) => {
    model.update(controller.progressRef.current);

    themeMix.current = THREE.MathUtils.damp(
      themeMix.current,
      theme === "light" ? 1 : 0,
      reducedMotion ? 16 : 3.4,
      delta,
    );

    if (material.current) {
      const mix = themeMix.current;
      material.current.color.copy(
        materialColor.lerpColors(DARK_MATTE, LIGHT_MATTE, mix),
      );
      material.current.roughness = THREE.MathUtils.lerp(0.7, 0.79, mix);
      material.current.envMapIntensity = THREE.MathUtils.lerp(0.72, 0.5, mix);
    }
  });

  return (
    <mesh
      geometry={model.geometry}
      frustumCulled={false}
      renderOrder={2}
    >
      <meshStandardMaterial
        ref={material}
        color={DARK_MATTE}
        roughness={0.7}
        metalness={0.015}
        envMapIntensity={0.72}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
