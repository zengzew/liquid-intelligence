import { useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CatmullRomCurve3,
  MathUtils,
  Matrix4,
  PerspectiveCamera,
  Quaternion,
  Vector3,
} from "three";
import type { JourneyProgress } from "./LiquidExperience";

interface CameraRigProps {
  curve: CatmullRomCurve3;
  progressRef: MutableRefObject<JourneyProgress>;
}

const WORLD_UP = new Vector3(0, 1, 0);
const LOCAL_FORWARD = new Vector3(0, 0, 1);

export default function CameraRig({
  curve,
  progressRef,
}: CameraRigProps) {
  const initialized = useRef(false);
  const curveCenter = useRef(new Vector3());
  const forwardPoint = useRef(new Vector3());
  const curveTangent = useRef(new Vector3());
  const curveLateral = useRef(new Vector3());
  const desiredPosition = useRef(new Vector3());
  const desiredTarget = useRef(new Vector3());
  const desiredQuaternion = useRef(new Quaternion());
  const rollQuaternion = useRef(new Quaternion());
  const lookAtMatrix = useRef(new Matrix4());

  useFrame(({ camera, size }, delta) => {
    const progress = progressRef.current.current;
    const progressVelocity = progressRef.current.velocity;
    const isMobile = size.width < 700;
    const easedProgress = MathUtils.smoothstep(progress, 0, 1);
    const velocityLead = MathUtils.clamp(
      progressVelocity * 0.006,
      -0.02,
      0.026,
    );
    const focusProgress = MathUtils.clamp(
      0.015 + progress * 0.84 + velocityLead,
      0.012,
      0.9,
    );
    const lookAhead =
      MathUtils.lerp(0.057, 0.035, easedProgress) +
      Math.min(0.006, Math.abs(progressVelocity) * 0.0015);

    curve.getPointAt(focusProgress, curveCenter.current);
    curve.getPointAt(
      Math.min(0.995, focusProgress + lookAhead),
      forwardPoint.current,
    );
    curve.getTangentAt(focusProgress, curveTangent.current).normalize();
    curveLateral.current
      .crossVectors(WORLD_UP, curveTangent.current)
      .normalize();

    const cameraHeight = isMobile
      ? MathUtils.lerp(10.2, 27.5, easedProgress)
      : MathUtils.lerp(7.6, 28.5, easedProgress);
    const backwardOffset = isMobile
      ? MathUtils.lerp(4.8, 2.7, easedProgress)
      : MathUtils.lerp(5.8, 3.1, easedProgress);
    const baseLateralOffset = isMobile ? 0.08 : -2.2;
    const velocityLateralLag = MathUtils.clamp(
      -progressVelocity * (isMobile ? 0.045 : 0.08),
      -0.22,
      0.22,
    );

    desiredPosition.current
      .copy(curveCenter.current)
      .addScaledVector(curveTangent.current, -backwardOffset)
      .addScaledVector(
        curveLateral.current,
        baseLateralOffset + velocityLateralLag,
      )
      .addScaledVector(WORLD_UP, cameraHeight);
    desiredTarget.current.copy(forwardPoint.current);

    lookAtMatrix.current.lookAt(
      desiredPosition.current,
      desiredTarget.current,
      WORLD_UP,
    );
    desiredQuaternion.current.setFromRotationMatrix(lookAtMatrix.current);
    rollQuaternion.current.setFromAxisAngle(
      LOCAL_FORWARD,
      MathUtils.clamp(
        -progressVelocity * (isMobile ? 0.0035 : 0.0055),
        -0.018,
        0.018,
      ),
    );
    desiredQuaternion.current.multiply(rollQuaternion.current);

    const desiredFov = isMobile
      ? MathUtils.lerp(46, 55, easedProgress)
      : MathUtils.lerp(40, 48, easedProgress);

    if (!initialized.current) {
      camera.position.copy(desiredPosition.current);
      camera.quaternion.copy(desiredQuaternion.current);

      if (camera instanceof PerspectiveCamera) {
        camera.fov = desiredFov;
        camera.updateProjectionMatrix();
      }

      initialized.current = true;
      return;
    }

    const safeDelta = Math.min(0.05, Math.max(1 / 240, delta));
    const positionResponse = 1 - Math.exp(-safeDelta * 10);
    const rotationResponse = 1 - Math.exp(-safeDelta * 8);
    const fovResponse = 1 - Math.exp(-safeDelta * 7.5);

    camera.position.lerp(desiredPosition.current, positionResponse);
    camera.quaternion.slerp(desiredQuaternion.current, rotationResponse);

    if (camera instanceof PerspectiveCamera) {
      const nextFov = MathUtils.lerp(camera.fov, desiredFov, fovResponse);

      if (Math.abs(camera.fov - nextFov) > 0.0005) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}
