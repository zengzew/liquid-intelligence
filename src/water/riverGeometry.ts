import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  Vector3,
} from "three";

const UP = new Vector3(0, 1, 0);

function smoothstep(min: number, max: number, value: number) {
  const normalized = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return normalized * normalized * (3 - 2 * normalized);
}

export function getRiverHalfWidth(progress: number) {
  const growth = Math.pow(smoothstep(0, 1, progress), 1.5);
  return 0.22 + growth * 3.1;
}

function pseudoRandom(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function createRiverGeometry(
  curve: CatmullRomCurve3,
  longitudinalSegments = 360,
  crossSegments = 28,
) {
  const geometry = new BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const centers: number[] = [];
  const longitudinal: number[] = [];
  const indices: number[] = [];

  const center = new Vector3();
  const tangent = new Vector3();
  const lateral = new Vector3();
  const vertex = new Vector3();

  for (let row = 0; row <= longitudinalSegments; row += 1) {
    const t = row / longitudinalSegments;

    curve.getPointAt(t, center);
    curve.getTangentAt(t, tangent).normalize();
    lateral.crossVectors(UP, tangent).normalize();

    const growth = Math.pow(smoothstep(0, 1, t), 1.5);
    const halfWidth = getRiverHalfWidth(t);
    const bankVariation =
      1 +
      Math.sin(t * 31.7) * 0.035 +
      Math.sin(t * 73.4 + 1.8) * 0.018;

    for (let column = 0; column <= crossSegments; column += 1) {
      const u = column / crossSegments;
      const across = u * 2 - 1;
      const asymmetry =
        1 +
        Math.sin(t * 19.5 + across * 2.6) *
          0.045 *
          smoothstep(0.1, 0.9, t);
      const offset = across * halfWidth * bankVariation * asymmetry;
      const settledHeight =
        -Math.pow(Math.abs(across), 1.8) * (0.018 + growth * 0.028) +
        Math.sin(t * 52 + across * 3.2) * 0.006 * growth;

      vertex
        .copy(center)
        .addScaledVector(lateral, offset)
        .addScaledVector(UP, settledHeight);

      positions.push(vertex.x, vertex.y, vertex.z);
      centers.push(center.x, center.y, center.z);
      longitudinal.push(t);
      uvs.push(u, t);
    }
  }

  const rowSize = crossSegments + 1;

  for (let row = 0; row < longitudinalSegments; row += 1) {
    for (let column = 0; column < crossSegments; column += 1) {
      const current = row * rowSize + column;
      const next = current + rowSize;

      indices.push(current, next, current + 1);
      indices.push(next, next + 1, current + 1);
    }
  }

  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setAttribute(
    "aCenter",
    new BufferAttribute(new Float32Array(centers), 3),
  );
  geometry.setAttribute(
    "aLongitudinal",
    new BufferAttribute(new Float32Array(longitudinal), 1),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

export function createGlintGeometry(
  curve: CatmullRomCurve3,
  count = 96,
) {
  const geometry = new BufferGeometry();
  const positions: number[] = [];
  const progressValues: number[] = [];
  const seedValues: number[] = [];
  const sizeValues: number[] = [];
  const center = new Vector3();
  const tangent = new Vector3();
  const lateral = new Vector3();
  const point = new Vector3();

  for (let index = 0; index < count; index += 1) {
    const distribution = (index + pseudoRandom(index, 1.7) * 0.7) / count;
    const progress = 0.018 + distribution * 0.93;
    const sideSeed = pseudoRandom(index, 3.1);
    const sideDirection = sideSeed > 0.5 ? 1 : -1;
    const sideMagnitude = Math.pow(pseudoRandom(index, 4.9), 0.62) * 0.88;

    curve.getPointAt(progress, center);
    curve.getTangentAt(progress, tangent).normalize();
    lateral.crossVectors(UP, tangent).normalize();

    point
      .copy(center)
      .addScaledVector(
        lateral,
        sideDirection * sideMagnitude * getRiverHalfWidth(progress),
      );
    point.y += 0.035 + pseudoRandom(index, 7.3) * 0.055;

    positions.push(point.x, point.y, point.z);
    progressValues.push(progress);
    seedValues.push(pseudoRandom(index, 8.8));
    sizeValues.push(0.45 + pseudoRandom(index, 10.2) * 0.55);
  }

  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute(
    "aPathProgress",
    new Float32BufferAttribute(progressValues, 1),
  );
  geometry.setAttribute("aSeed", new Float32BufferAttribute(seedValues, 1));
  geometry.setAttribute("aSize", new Float32BufferAttribute(sizeValues, 1));
  geometry.computeBoundingSphere();

  return geometry;
}
