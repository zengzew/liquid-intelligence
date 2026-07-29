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
    position: new Vector3(-7.8, 5.65, -60.5),
    target: new Vector3(-0.15, 1.25, -42.5),
    fov: 42,
    roll: -0.034,
  },
  {
    at: 0.54,
    position: new Vector3(-7.4, 5.35, -71.5),
    target: new Vector3(0.2, 1.15, -49),
    fov: 42,
    roll: -0.028,
  },
  {
    at: 0.62,
    position: new Vector3(-2.8, 5.8, -87),
    target: new Vector3(0.35, 2.2, -59),
    fov: 44,
    roll: -0.01,
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
    at: 0.54,
    position: new Vector3(-3.8, 7.6, -72),
    target: new Vector3(0.2, 2.6, -49),
    fov: 52,
    roll: -0.018,
  },
  {
    at: 0.62,
    position: new Vector3(-1.4, 8.2, -89),
    target: new Vector3(0.35, 3.8, -60),
    fov: 54,
    roll: -0.006,
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
  const scrollMomentum = useRef(0);
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const shotsByViewport = useMemo(
    () => ({ desktop: DESKTOP_SHOTS, mobile: MOBILE_SHOTS }),
    [],
  );

  useFrame(({ camera, pointer, size }, delta) => {
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
