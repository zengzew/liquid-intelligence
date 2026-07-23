import { useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CatmullRomCurve3,
  MathUtils,
  PerspectiveCamera,
  Vector3,
} from "three";
import type { JourneyProgress } from "./LiquidExperience";

interface CameraRigProps {
  curve: CatmullRomCurve3;
  progressRef: MutableRefObject<JourneyProgress>;
}

const UP = new Vector3(0, 1, 0);

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

export default function CameraRig({
  curve,
  progressRef,
}: CameraRigProps) {
  const smoothedProgress = useRef(0);
  const smoothedLookAt = useRef(new Vector3(0, 0, 0));
  const point = useRef(new Vector3());
  const tangent = useRef(new Vector3());
  const side = useRef(new Vector3());
  const targetPosition = useRef(new Vector3());
  const targetLookAt = useRef(new Vector3());

  useFrame(({ camera, pointer, size, clock }, delta) => {
    smoothedProgress.current = MathUtils.damp(
      smoothedProgress.current,
      progressRef.current.value,
      2.9,
      delta,
    );

    const progress = easeInOutCubic(smoothedProgress.current);
    const pathProgress = MathUtils.lerp(0.018, 0.72, progress);
    const mobile = size.width < 700;

    curve.getPointAt(pathProgress, point.current);
    curve.getTangentAt(pathProgress, tangent.current).normalize();
    side.current.crossVectors(UP, tangent.current).normalize();

    const trailingDistance = MathUtils.lerp(2.05, 6.8, progress);
    const cameraHeight = MathUtils.lerp(
      mobile ? 2.75 : 1.65,
      mobile ? 8.4 : 7.2,
      progress,
    );
    const compositionOffset = MathUtils.lerp(
      mobile ? -0.16 : -0.78,
      0.08,
      progress,
    );
    const lateralDrift =
      compositionOffset +
      Math.sin(progress * Math.PI * 2.15 + 0.35) *
        MathUtils.lerp(0.32, 1.05, progress) +
      pointer.x * (mobile ? 0.08 : 0.22);
    const breath = Math.sin(clock.elapsedTime * 0.2) * 0.045;

    targetPosition.current
      .copy(point.current)
      .addScaledVector(tangent.current, -trailingDistance)
      .addScaledVector(side.current, lateralDrift)
      .addScaledVector(UP, cameraHeight + breath + pointer.y * 0.08);

    const lookAhead = Math.min(
      0.985,
      pathProgress + MathUtils.lerp(0.045, 0.072, progress),
    );

    curve.getPointAt(lookAhead, targetLookAt.current);
    targetLookAt.current.y += MathUtils.lerp(0.02, -0.18, progress);
    targetLookAt.current.addScaledVector(
      side.current,
      pointer.x * (mobile ? 0.02 : 0.08),
    );

    const cameraEase = 1 - Math.exp(-delta * 3.2);
    const lookEase = 1 - Math.exp(-delta * 2.7);
    camera.position.lerp(targetPosition.current, cameraEase);
    smoothedLookAt.current.lerp(targetLookAt.current, lookEase);
    camera.lookAt(smoothedLookAt.current);

    if (camera instanceof PerspectiveCamera) {
      const nextFov = MathUtils.lerp(
        mobile ? 53 : 44,
        mobile ? 51 : 47,
        progress,
      );

      if (Math.abs(camera.fov - nextFov) > 0.01) {
        camera.fov = MathUtils.damp(camera.fov, nextFov, 3, delta);
        camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}
