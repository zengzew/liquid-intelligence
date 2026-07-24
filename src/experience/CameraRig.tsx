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
    position: new Vector3(-0.55, 11.9, -2.6),
    target: new Vector3(2.05, 0.04, 4.35),
    fov: 40,
    roll: -0.004,
  },
  {
    at: 0.25,
    position: new Vector3(0.4, 13.2, -48),
    target: new Vector3(1.7, -0.05, -20),
    fov: 45,
    roll: 0.002,
  },
  {
    at: 0.5,
    position: new Vector3(-0.2, 14.2, -72),
    target: new Vector3(0.8, -0.28, -42),
    fov: 46,
    roll: -0.002,
  },
  {
    at: 0.75,
    position: new Vector3(0.25, 18, -104),
    target: new Vector3(0.4, -0.5, -72),
    fov: 48,
    roll: 0.001,
  },
  {
    at: 1,
    position: new Vector3(0.15, 24, -132),
    target: new Vector3(0.1, -0.72, -96),
    fov: 50,
    roll: 0,
  },
];

const MOBILE_SHOTS: CameraShot[] = [
  {
    at: 0,
    position: new Vector3(0.65, 14.1, -2.1),
    target: new Vector3(2.28, 0.04, 2.1),
    fov: 51,
    roll: -0.002,
  },
  {
    at: 0.25,
    position: new Vector3(1.2, 17, -48),
    target: new Vector3(2, -0.06, -20),
    fov: 53,
    roll: 0.002,
  },
  {
    at: 0.5,
    position: new Vector3(0.4, 18, -72),
    target: new Vector3(0.8, -0.28, -41),
    fov: 54,
    roll: -0.001,
  },
  {
    at: 0.75,
    position: new Vector3(0.3, 22, -104),
    target: new Vector3(0.4, -0.5, -71),
    fov: 55,
    roll: 0.001,
  },
  {
    at: 1,
    position: new Vector3(0.2, 30, -132),
    target: new Vector3(0.1, -0.72, -95),
    fov: 56,
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
