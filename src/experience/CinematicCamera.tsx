import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getRiverFrame, riverWidthAt } from "./river";
import type { NumericRef } from "../types";

type CinematicCameraProps = {
  curve: THREE.CatmullRomCurve3;
  scrollProgress: NumericRef;
  reducedMotion: boolean;
};

const center = new THREE.Vector3();
const tangent = new THREE.Vector3();
const side = new THREE.Vector3();
const surfaceUp = new THREE.Vector3();
const targetPosition = new THREE.Vector3();
const targetLook = new THREE.Vector3();
const lookCenter = new THREE.Vector3();
const dummy = new THREE.PerspectiveCamera();

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

export function CinematicCamera({
  curve,
  scrollProgress,
  reducedMotion,
}: CinematicCameraProps) {
  const { camera, size } = useThree();
  const smoothedProgress = useRef(scrollProgress.current);
  const initialized = useRef(false);

  useFrame(({ clock }, delta) => {
    smoothedProgress.current = THREE.MathUtils.damp(
      smoothedProgress.current,
      scrollProgress.current,
      reducedMotion ? 12 : 2.35,
      delta,
    );

    const progress = smoothstep(smoothedProgress.current);
    const curveProgress = 0.075 + progress * 0.56;
    getRiverFrame(
      curve,
      curveProgress,
      center,
      tangent,
      side,
      surfaceUp,
    );

    const width = riverWidthAt(curveProgress);
    const lateralDirection = Math.cos(progress * Math.PI * 1.14 + 0.24);
    const lateralOffset =
      lateralDirection * (0.52 + width * 0.16 + progress * 0.28);
    const idle =
      reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.16) * 0.045;
    const cameraHeight =
      THREE.MathUtils.lerp(0.42, 1.24, progress) +
      (size.width < 700 ? 0.23 : 0);

    targetPosition
      .copy(center)
      .addScaledVector(tangent, -0.48)
      .addScaledVector(side, lateralOffset + idle)
      .addScaledVector(surfaceUp, cameraHeight);

    const lookProgress = Math.min(curveProgress + 0.135 + progress * 0.035, 0.98);
    curve.getPointAt(lookProgress, lookCenter);
    targetLook
      .copy(lookCenter)
      .addScaledVector(surfaceUp, 0.18 - progress * 0.085)
      .addScaledVector(side, -lateralOffset * 0.09);

    const targetFov = size.width < 700 ? 54 : 44;
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const nextFov = THREE.MathUtils.damp(
      perspectiveCamera.fov,
      targetFov,
      3,
      delta,
    );

    if (Math.abs(nextFov - perspectiveCamera.fov) > 0.001) {
      perspectiveCamera.fov = nextFov;
      perspectiveCamera.updateProjectionMatrix();
    }

    dummy.position.copy(targetPosition);
    dummy.up.copy(surfaceUp);
    dummy.lookAt(targetLook);

    if (!initialized.current) {
      camera.position.copy(targetPosition);
      camera.quaternion.copy(dummy.quaternion);
      initialized.current = true;
      return;
    }

    const positionEase = 1 - Math.exp(-delta * (reducedMotion ? 12 : 2.8));
    const rotationEase = 1 - Math.exp(-delta * (reducedMotion ? 14 : 3.1));
    camera.position.lerp(targetPosition, positionEase);
    camera.quaternion.slerp(dummy.quaternion, rotationEase);
  });

  return null;
}
