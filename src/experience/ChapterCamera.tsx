import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { JourneyController } from "../journey/useJourneyController";

type ChapterCameraProps = {
  controller: JourneyController;
};

type CameraPose = {
  position: readonly [number, number, number];
  target: readonly [number, number, number];
  fov: number;
};

const CAMERA_POSES: readonly CameraPose[] = [
  {
    position: [0.05, 0.08, 9.45],
    target: [0.55, 0.02, -0.2],
    fov: 42,
  },
  {
    position: [-0.16, 0.16, 9.2],
    target: [0.05, -0.1, -0.15],
    fov: 43,
  },
  {
    position: [0.18, 0.34, 9.05],
    target: [0.36, -0.12, -0.4],
    fov: 43.5,
  },
  {
    position: [-0.08, 0.52, 9.42],
    target: [0.05, -0.32, -0.7],
    fov: 44,
  },
  {
    position: [0, 1.82, 10.25],
    target: [0, -1.05, -1.65],
    fov: 44,
  },
];

const targetPosition = new THREE.Vector3();
const targetLook = new THREE.Vector3();
const dummyCamera = new THREE.PerspectiveCamera();

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

export function ChapterCamera({ controller }: ChapterCameraProps) {
  const { camera, size } = useThree();

  useFrame(() => {
    const progress = THREE.MathUtils.clamp(controller.progressRef.current, 0, 4);
    const fromIndex = Math.min(Math.floor(progress), CAMERA_POSES.length - 1);
    const toIndex = Math.min(fromIndex + 1, CAMERA_POSES.length - 1);
    const mix = smoothstep(progress - fromIndex);
    const from = CAMERA_POSES[fromIndex];
    const to = CAMERA_POSES[toIndex];
    const mobile = size.width < 700;

    targetPosition.set(
      THREE.MathUtils.lerp(from.position[0], to.position[0], mix),
      THREE.MathUtils.lerp(from.position[1], to.position[1], mix),
      THREE.MathUtils.lerp(from.position[2], to.position[2], mix) +
        (mobile ? 1.65 : 0),
    );
    targetLook.set(
      THREE.MathUtils.lerp(from.target[0], to.target[0], mix),
      THREE.MathUtils.lerp(from.target[1], to.target[1], mix),
      THREE.MathUtils.lerp(from.target[2], to.target[2], mix),
    );

    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const fov =
      THREE.MathUtils.lerp(from.fov, to.fov, mix) + (mobile ? 9.5 : 0);

    if (Math.abs(perspectiveCamera.fov - fov) > 0.001) {
      perspectiveCamera.fov = fov;
      perspectiveCamera.updateProjectionMatrix();
    }

    dummyCamera.position.copy(targetPosition);
    dummyCamera.up.set(0, 1, 0);
    dummyCamera.lookAt(targetLook);

    camera.position.copy(targetPosition);
    camera.quaternion.copy(dummyCamera.quaternion);
  });

  return null;
}
