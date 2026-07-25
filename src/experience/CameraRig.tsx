import { useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import type { JourneyProgress } from "./LiquidExperience";

interface CameraRigProps {
  progressRef: MutableRefObject<JourneyProgress>;
}

interface CameraShot {
  at: number;
  position: Vector3;
  target: Vector3;
  fov: number;
  roll: number;
}

const DESKTOP_SHOTS: CameraShot[] = [
  {
    at: 0,
    position: new Vector3(-0.55, 11.4, -2.2),
    target: new Vector3(2.15, 0.04, 4.6),
    fov: 40,
    roll: -0.004,
  },
  {
    at: 0.22,
    position: new Vector3(-10.5, 5, -15.8),
    target: new Vector3(2.6, 1.5, -17.2),
    fov: 40,
    roll: -0.008,
  },
  {
    at: 0.46,
    position: new Vector3(-2.2, 7.8, -67.5),
    target: new Vector3(1, -0.24, -42),
    fov: 43,
    roll: -0.003,
  },
  {
    at: 0.7,
    position: new Vector3(0.5, 13.8, -96),
    target: new Vector3(0.3, -0.47, -68),
    fov: 46,
    roll: 0.001,
  },
  {
    at: 0.92,
    position: new Vector3(0.4, 6.4, -107),
    target: new Vector3(0, -0.7, -24),
    fov: 48,
    roll: 0,
  },
  {
    at: 1,
    position: new Vector3(0.1, 5.4, -116),
    target: new Vector3(0, -0.75, -24),
    fov: 48,
    roll: 0,
  },
];

const MOBILE_SHOTS: CameraShot[] = [
  {
    at: 0,
    position: new Vector3(0.65, 13.8, -2),
    target: new Vector3(2.28, 0.04, 2.4),
    fov: 51,
    roll: -0.002,
  },
  {
    at: 0.22,
    position: new Vector3(-8, 6.5, -15.8),
    target: new Vector3(2.6, 2.1, -17.5),
    fov: 51,
    roll: -0.006,
  },
  {
    at: 0.46,
    position: new Vector3(0.2, 10.8, -67),
    target: new Vector3(0.9, 3.2, -41),
    fov: 53,
    roll: -0.002,
  },
  {
    at: 0.7,
    position: new Vector3(0.2, 17, -96),
    target: new Vector3(0.4, 7.5, -68),
    fov: 54,
    roll: 0.001,
  },
  {
    at: 0.92,
    position: new Vector3(0.1, 9.5, -107),
    target: new Vector3(0, -0.72, -24),
    fov: 55,
    roll: 0,
  },
  {
    at: 1,
    position: new Vector3(0, 8, -116),
    target: new Vector3(0, -0.76, -20),
    fov: 55,
    roll: 0,
  },
];

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

export default function CameraRig({ progressRef }: CameraRigProps) {
  const cameraPosition = useRef(new Vector3());
  const cameraTarget = useRef(new Vector3());
  const pointerOffset = useRef(new Vector3());
  const shotsByViewport = useMemo(
    () => ({ desktop: DESKTOP_SHOTS, mobile: MOBILE_SHOTS }),
    [],
  );

  useFrame(({ camera, pointer, size }) => {
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

    const pointerScale = size.width < 700 ? 0.035 : 0.075;
    pointerOffset.current.set(
      pointer.x * pointerScale,
      pointer.y * pointerScale * 0.35,
      0,
    );

    camera.position.copy(cameraPosition.current).add(pointerOffset.current);
    cameraTarget.current.x += pointer.x * pointerScale * 0.45;
    cameraTarget.current.y += pointer.y * pointerScale * 0.18;
    camera.lookAt(cameraTarget.current);
    camera.rotateZ(
      MathUtils.lerp(from.roll, to.roll, localProgress) +
        pointer.x * (size.width < 700 ? 0.0004 : 0.0008),
    );

    if (camera instanceof PerspectiveCamera) {
      const nextFov = MathUtils.lerp(from.fov, to.fov, localProgress);

      if (Math.abs(camera.fov - nextFov) > 0.001) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}
