import { useMemo, useRef } from "react";
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

interface CameraShot {
  at: number;
  position: Vector3;
  target: Vector3;
  fov: number;
  roll: number;
}

interface CameraShotSpec {
  at: number;
  positionAt: number;
  targetAt: number;
  height: number;
  targetHeight: number;
  targetLead?: number;
  lateral?: number;
  fov: number;
  roll: number;
}

/**
 * Spatial narrative contract:
 *
 * - positionAt is always upstream of targetAt, so the camera looks downstream.
 * - river width grows with curve progress, therefore downstream maps toward
 *   the upper/forward part of the image instead of widening into the bottom.
 * - height and targetHeight converge through the journey, continuously
 *   raising the view from a source overview to a level ocean horizon.
 */
const DESKTOP_SHOT_SPECS: CameraShotSpec[] = [
  {
    at: 0.03,
    positionAt: 0.012,
    targetAt: 0.075,
    height: 14.5,
    targetHeight: 0.12,
    lateral: -0.45,
    fov: 38,
    roll: -0.004,
  },
  {
    at: 0.22,
    positionAt: 0.04,
    targetAt: 0.3,
    height: 11.5,
    targetHeight: 0.24,
    lateral: -0.65,
    fov: 39,
    roll: -0.018,
  },
  {
    at: 0.46,
    positionAt: 0.05,
    targetAt: 0.535,
    height: 14,
    targetHeight: 0.46,
    lateral: -1.15,
    fov: 30,
    roll: -0.016,
  },
  {
    at: 0.54,
    positionAt: 0.12,
    targetAt: 0.605,
    height: 13,
    targetHeight: 0.68,
    lateral: -0.95,
    fov: 34,
    roll: -0.012,
  },
  {
    at: 0.62,
    positionAt: 0.22,
    targetAt: 0.68,
    height: 11,
    targetHeight: 0.98,
    lateral: -0.55,
    fov: 39,
    roll: -0.006,
  },
  {
    at: 0.7,
    positionAt: 0.34,
    targetAt: 0.75,
    height: 9,
    targetHeight: 1.34,
    lateral: -0.15,
    fov: 44,
    roll: 0.001,
  },
  {
    at: 0.92,
    positionAt: 0.77,
    targetAt: 1,
    targetLead: 94,
    height: 3.2,
    targetHeight: 2,
    lateral: 0,
    fov: 51,
    roll: 0,
  },
  {
    at: 1,
    positionAt: 0.83,
    targetAt: 1,
    targetLead: 122,
    height: 3,
    targetHeight: 2.04,
    lateral: 0,
    fov: 52,
    roll: 0,
  },
];

const MOBILE_SHOT_SPECS: CameraShotSpec[] = [
  {
    at: 0.03,
    positionAt: 0.012,
    targetAt: 0.075,
    height: 15.2,
    targetHeight: 0.12,
    lateral: -0.25,
    fov: 53,
    roll: -0.003,
  },
  {
    at: 0.22,
    positionAt: 0.03,
    targetAt: 0.3,
    height: 13,
    targetHeight: 0.36,
    lateral: -0.35,
    fov: 53,
    roll: -0.012,
  },
  {
    at: 0.46,
    positionAt: 0.04,
    targetAt: 0.535,
    height: 16,
    targetHeight: 0.72,
    lateral: -0.45,
    fov: 44,
    roll: -0.012,
  },
  {
    at: 0.54,
    positionAt: 0.1,
    targetAt: 0.605,
    height: 14.5,
    targetHeight: 0.94,
    lateral: -0.35,
    fov: 46,
    roll: -0.009,
  },
  {
    at: 0.62,
    positionAt: 0.2,
    targetAt: 0.68,
    height: 12.5,
    targetHeight: 1.24,
    lateral: -0.22,
    fov: 49,
    roll: -0.004,
  },
  {
    at: 0.7,
    positionAt: 0.32,
    targetAt: 0.75,
    height: 11,
    targetHeight: 1.56,
    lateral: -0.08,
    fov: 52,
    roll: 0.001,
  },
  {
    at: 0.92,
    positionAt: 0.75,
    targetAt: 1,
    targetLead: 88,
    height: 4.1,
    targetHeight: 2.78,
    lateral: 0,
    fov: 56,
    roll: 0,
  },
  {
    at: 1,
    positionAt: 0.81,
    targetAt: 1,
    targetLead: 116,
    height: 3.8,
    targetHeight: 2.7,
    lateral: 0,
    fov: 56,
    roll: 0,
  },
];

const WORLD_UP = new Vector3(0, 1, 0);

function createCameraShots(
  curve: CatmullRomCurve3,
  specs: CameraShotSpec[],
) {
  return specs.map((spec) => {
    const position = curve.getPointAt(spec.positionAt);
    const positionTangent = curve.getTangentAt(spec.positionAt).normalize();
    const lateral = new Vector3()
      .crossVectors(WORLD_UP, positionTangent)
      .normalize();
    position
      .addScaledVector(lateral, spec.lateral ?? 0)
      .addScaledVector(WORLD_UP, spec.height);

    const target = curve.getPointAt(spec.targetAt);
    const targetTangent = curve.getTangentAt(spec.targetAt).normalize();
    target.addScaledVector(targetTangent, spec.targetLead ?? 0);
    target.y = spec.targetHeight;

    return {
      at: spec.at,
      position,
      target,
      fov: spec.fov,
      roll: spec.roll,
    };
  });
}

function smootherStep(value: number) {
  const clamped = MathUtils.clamp(value, 0, 1);
  return clamped * clamped * clamped * (clamped * (clamped * 6 - 15) + 10);
}

function findShotPair(shots: CameraShot[], progress: number) {
  for (let index = 0; index < shots.length - 1; index += 1) {
    if (progress <= shots[index + 1].at) {
      return [shots[index], shots[index + 1]] as const;
    }
  }

  return [shots[shots.length - 2], shots[shots.length - 1]] as const;
}

export default function CameraRig({ curve, progressRef }: CameraRigProps) {
  const cameraPosition = useRef(new Vector3());
  const cameraTarget = useRef(new Vector3());
  const cameraDirection = useRef(new Vector3());
  const pointerOffset = useRef(new Vector3());
  const scrollMomentum = useRef(0);
  const lastTelemetryAt = useRef(-1);
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const shotsByViewport = useMemo(
    () => ({
      desktop: createCameraShots(curve, DESKTOP_SHOT_SPECS),
      mobile: createCameraShots(curve, MOBILE_SHOT_SPECS),
    }),
    [curve],
  );

  useFrame(({ camera, clock, pointer, size }, delta) => {
    const progress = progressRef.current.current;
    const shots =
      size.width < 700 ? shotsByViewport.mobile : shotsByViewport.desktop;
    const [from, to] = findShotPair(shots, progress);
    const localProgress = smootherStep(
      (progress - from.at) / Math.max(0.0001, to.at - from.at),
    );

    cameraPosition.current.lerpVectors(
      from.position,
      to.position,
      localProgress,
    );
    cameraTarget.current.lerpVectors(from.target, to.target, localProgress);

    const pointerScale = size.width < 700 ? 0.08 : 0.26;
    pointerOffset.current.x = MathUtils.damp(
      pointerOffset.current.x,
      reducedMotion ? 0 : pointer.x * pointerScale,
      3.8,
      delta,
    );
    pointerOffset.current.y = MathUtils.damp(
      pointerOffset.current.y,
      reducedMotion ? 0 : pointer.y * pointerScale * 0.32,
      3.8,
      delta,
    );
    const momentumTarget = reducedMotion
      ? 0
      : MathUtils.clamp(progressRef.current.velocity * 0.58, -1, 1);
    scrollMomentum.current = MathUtils.damp(
      scrollMomentum.current,
      momentumTarget,
      Math.abs(momentumTarget) > Math.abs(scrollMomentum.current) ? 7.5 : 2.4,
      delta,
    );

    camera.position.copy(cameraPosition.current).add(pointerOffset.current);
    camera.position.x -= scrollMomentum.current * 0.14;
    camera.position.y += Math.abs(scrollMomentum.current) * 0.07;
    camera.position.z += scrollMomentum.current * 0.34;
    cameraTarget.current.x += pointerOffset.current.x * 0.45;
    cameraTarget.current.y += pointerOffset.current.y * 0.56;
    cameraTarget.current.y += scrollMomentum.current * 0.08;

    if (clock.elapsedTime - lastTelemetryAt.current > 0.25) {
      cameraDirection.current
        .copy(cameraTarget.current)
        .sub(camera.position);
      const horizontalDistance = Math.hypot(
        cameraDirection.current.x,
        cameraDirection.current.z,
      );
      const downwardPitch = MathUtils.radToDeg(
        Math.atan2(-cameraDirection.current.y, horizontalDistance),
      );

      document.documentElement.dataset.cameraPitch =
        downwardPitch.toFixed(1);
      document.documentElement.dataset.cameraDirection =
        cameraTarget.current.z < camera.position.z ? "downstream" : "upstream";
      document.documentElement.dataset.cameraPosition = camera.position
        .toArray()
        .map((value) => value.toFixed(2))
        .join(",");
      document.documentElement.dataset.cameraTarget = cameraTarget.current
        .toArray()
        .map((value) => value.toFixed(2))
        .join(",");
      lastTelemetryAt.current = clock.elapsedTime;
    }

    camera.lookAt(cameraTarget.current);
    camera.rotateZ(
      MathUtils.lerp(from.roll, to.roll, localProgress) +
        pointer.x * (size.width < 700 ? 0.0008 : 0.0018) +
        scrollMomentum.current * 0.005,
    );

    if (camera instanceof PerspectiveCamera) {
      const nextFov =
        MathUtils.lerp(from.fov, to.fov, localProgress) +
        Math.abs(scrollMomentum.current) * 0.42;

      if (Math.abs(camera.fov - nextFov) > 0.001) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}
