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
    at: 0.03,
    position: new Vector3(-2, 10, -3),
    target: new Vector3(5, 0.8, 4.2),
    fov: 40,
    roll: -0.008,
  },
  {
    at: 0.22,
    position: new Vector3(-10, 4.2, -18.5),
    target: new Vector3(1.8, 1.8, -10.8),
    fov: 40,
    roll: -0.04,
  },
  {
    at: 0.46,
    position: new Vector3(-11, 7, -63),
    target: new Vector3(-1, 2, -41),
    fov: 44,
    roll: -0.055,
  },
  {
    at: 0.7,
    position: new Vector3(0.5, 8, -104),
    target: new Vector3(0.3, 4, -68),
    fov: 48,
    roll: 0.001,
  },
  {
    at: 0.92,
    position: new Vector3(0.4, 5.2, -108),
    target: new Vector3(0, 1.2, -30),
    fov: 49,
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
    at: 0.03,
    position: new Vector3(-2.8, 6.8, -3),
    target: new Vector3(0.8, 0.4, 3.8),
    fov: 51,
    roll: -0.01,
  },
  {
    at: 0.22,
    position: new Vector3(-6, 6, -19),
    target: new Vector3(1.4, 3, -11),
    fov: 51,
    roll: -0.025,
  },
  {
    at: 0.46,
    position: new Vector3(-5, 10, -64),
    target: new Vector3(-0.8, 5, -42),
    fov: 53,
    roll: -0.025,
  },
  {
    at: 0.7,
    position: new Vector3(0.2, 10, -110),
    target: new Vector3(0.4, 5, -68),
    fov: 55,
    roll: 0.001,
  },
  {
    at: 0.92,
    position: new Vector3(0.1, 9, -108),
    target: new Vector3(0, 2, -28),
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
