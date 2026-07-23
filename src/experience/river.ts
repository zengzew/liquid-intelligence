import * as THREE from "three";

const WORLD_UP = new THREE.Vector3(0, 1, 0);

export function createRiverCurve() {
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-1.45, 0.02, -16.5),
      new THREE.Vector3(-0.8, 0.04, -14.0),
      new THREE.Vector3(1.25, 0.0, -11.2),
      new THREE.Vector3(2.55, 0.06, -8.15),
      new THREE.Vector3(1.45, 0.01, -5.45),
      new THREE.Vector3(-1.5, 0.04, -2.2),
      new THREE.Vector3(-2.85, 0.0, 1.2),
      new THREE.Vector3(-1.2, 0.05, 4.45),
      new THREE.Vector3(2.15, 0.01, 7.7),
      new THREE.Vector3(3.3, 0.04, 11.05),
      new THREE.Vector3(1.55, 0.0, 14.4),
      new THREE.Vector3(-2.45, 0.04, 18.35),
      new THREE.Vector3(-3.35, 0.01, 22.0),
    ],
    false,
    "centripetal",
    0.42,
  );
}

export function riverWidthAt(progress: number) {
  const organicVariation =
    0.955 +
    Math.sin(progress * 19.1 + 0.8) * 0.025 +
    Math.sin(progress * 41.7) * 0.012;

  return (0.16 + 5.15 * Math.pow(progress, 1.46)) * organicVariation;
}

export function getRiverFrame(
  curve: THREE.CatmullRomCurve3,
  progress: number,
  center: THREE.Vector3,
  tangent: THREE.Vector3,
  side: THREE.Vector3,
  surfaceUp: THREE.Vector3,
) {
  curve.getPointAt(progress, center);
  curve.getTangentAt(progress, tangent).normalize();
  side.crossVectors(WORLD_UP, tangent).normalize();
  surfaceUp.crossVectors(tangent, side).normalize();

  if (surfaceUp.y < 0) {
    surfaceUp.multiplyScalar(-1);
  }
}

export function buildLiquidGeometry(
  curve: THREE.CatmullRomCurve3,
  longitudinalSegments = 320,
  radialSegments = 48,
) {
  const positions: number[] = [];
  const centers: number[] = [];
  const along: number[] = [];
  const around: number[] = [];
  const indices: number[] = [];

  const center = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  const surfaceUp = new THREE.Vector3();
  const position = new THREE.Vector3();

  for (let ring = 0; ring <= longitudinalSegments; ring += 1) {
    const progress = ring / longitudinalSegments;
    getRiverFrame(curve, progress, center, tangent, side, surfaceUp);

    const halfWidth = riverWidthAt(progress) * 0.5;
    const halfDepth = 0.024 + 0.17 * Math.pow(progress, 1.28);

    for (let segment = 0; segment < radialSegments; segment += 1) {
      const theta = (segment / radialSegments) * Math.PI * 2;
      const lateralCosine = Math.cos(theta);
      const edgeWeight = Math.pow(Math.abs(lateralCosine), 7);
      const bankPhase = lateralCosine >= 0 ? 0.9 : 4.1;
      const bankRuffle =
        (Math.sin(progress * 83 + bankPhase) * 0.012 +
          Math.sin(progress * 171 - bankPhase) * 0.005) *
        (0.35 + progress * 0.65);
      const lateral =
        lateralCosine *
        halfWidth *
        (1 + bankRuffle * edgeWeight);
      const vertical =
        Math.sin(theta) *
        halfDepth *
        (0.92 + 0.08 * Math.cos(theta * 2 + progress * 8.0));

      position
        .copy(center)
        .addScaledVector(side, lateral)
        .addScaledVector(surfaceUp, vertical);

      positions.push(position.x, position.y, position.z);
      centers.push(center.x, center.y, center.z);
      along.push(progress);
      around.push(segment / radialSegments);
    }
  }

  for (let ring = 0; ring < longitudinalSegments; ring += 1) {
    const current = ring * radialSegments;
    const next = (ring + 1) * radialSegments;

    for (let segment = 0; segment < radialSegments; segment += 1) {
      const following = (segment + 1) % radialSegments;
      const a = current + segment;
      const b = next + segment;
      const c = next + following;
      const d = current + following;

      indices.push(a, d, b, b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute(
    "aCenter",
    new THREE.Float32BufferAttribute(centers, 3),
  );
  geometry.setAttribute("aAlong", new THREE.Float32BufferAttribute(along, 1));
  geometry.setAttribute("aAround", new THREE.Float32BufferAttribute(around, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}
