import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Vector3,
} from "three";

const UP = new Vector3(0, 1, 0);

interface WidthKeyframe {
  at: number;
  halfWidth: number;
}

const WIDTH_PROFILE: WidthKeyframe[] = [
  { at: 0, halfWidth: 0.03 },
  { at: 0.07, halfWidth: 0.16 },
  { at: 0.2, halfWidth: 0.22 },
  { at: 0.45, halfWidth: 1.35 },
  { at: 0.7, halfWidth: 4.2 },
  { at: 1, halfWidth: 13 },
];

function smootherStep(value: number) {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * clamped * (clamped * (clamped * 6 - 15) + 10);
}

export function getRevealFrontier(progress: number) {
  const clamped = Math.min(1, Math.max(0, progress));
  return 0.024 + Math.pow(clamped, 0.82) * 0.976;
}

export function getRiverHalfWidth(progress: number) {
  const clamped = Math.min(1, Math.max(0, progress));

  for (let index = 0; index < WIDTH_PROFILE.length - 1; index += 1) {
    const from = WIDTH_PROFILE[index];
    const to = WIDTH_PROFILE[index + 1];

    if (clamped <= to.at) {
      const local = smootherStep(
        (clamped - from.at) / Math.max(0.0001, to.at - from.at),
      );
      return from.halfWidth + (to.halfWidth - from.halfWidth) * local;
    }
  }

  return WIDTH_PROFILE[WIDTH_PROFILE.length - 1].halfWidth;
}

function getRiverFrame(
  curve: CatmullRomCurve3,
  progress: number,
  center: Vector3,
  tangent: Vector3,
  lateral: Vector3,
) {
  curve.getPointAt(progress, center);
  curve.getTangentAt(progress, tangent).normalize();
  lateral.crossVectors(UP, tangent).normalize();
}

function getBankOffset(progress: number, across: number) {
  const width = getRiverHalfWidth(progress);
  const bankVariation =
    1 +
    Math.sin(progress * 29.7 + across * 1.9) * 0.045 +
    Math.sin(progress * 67.3 - across * 3.1) * 0.018;
  const asymmetry =
    1 +
    Math.sin(progress * 15.8 + across * 2.4) *
      0.065 *
      smootherStep((progress - 0.08) / 0.82);

  return across * width * bankVariation * asymmetry;
}

export function createRiverGeometry(
  curve: CatmullRomCurve3,
  longitudinalSegments = 360,
  crossSegments = 36,
) {
  const geometry = new BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const longitudinal: number[] = [];
  const acrossValues: number[] = [];
  const indices: number[] = [];

  const center = new Vector3();
  const tangent = new Vector3();
  const lateral = new Vector3();
  const vertex = new Vector3();

  for (let row = 0; row <= longitudinalSegments; row += 1) {
    const progress = row / longitudinalSegments;
    getRiverFrame(curve, progress, center, tangent, lateral);
    const downstream = smootherStep(progress);

    for (let column = 0; column <= crossSegments; column += 1) {
      const across = (column / crossSegments) * 2 - 1;
      const offset = getBankOffset(progress, across);
      const surfaceContour =
        -Math.pow(Math.abs(across), 2.1) * (0.004 + downstream * 0.035) +
        Math.sin(progress * 26 + across * 2.5) * 0.0035 * downstream;

      vertex
        .copy(center)
        .addScaledVector(lateral, offset)
        .addScaledVector(UP, surfaceContour);

      positions.push(vertex.x, vertex.y, vertex.z);
      longitudinal.push(progress);
      acrossValues.push(across);
      uvs.push(column / crossSegments, progress);
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
    "aLongitudinal",
    new BufferAttribute(new Float32Array(longitudinal), 1),
  );
  geometry.setAttribute(
    "aAcross",
    new BufferAttribute(new Float32Array(acrossValues), 1),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

export function createRiverSkirtGeometry(
  curve: CatmullRomCurve3,
  longitudinalSegments = 360,
) {
  const geometry = new BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const longitudinal: number[] = [];
  const indices: number[] = [];

  const center = new Vector3();
  const tangent = new Vector3();
  const lateral = new Vector3();
  const top = new Vector3();
  const bottom = new Vector3();

  for (let sideIndex = 0; sideIndex < 2; sideIndex += 1) {
    const side = sideIndex === 0 ? -1 : 1;
    const sideStart = sideIndex * (longitudinalSegments + 1) * 2;

    for (let row = 0; row <= longitudinalSegments; row += 1) {
      const progress = row / longitudinalSegments;
      getRiverFrame(curve, progress, center, tangent, lateral);
      const offset = getBankOffset(progress, side);
      const depth =
        0.045 +
        smootherStep((progress - 0.08) / 0.92) *
          Math.min(0.7, getRiverHalfWidth(progress) * 0.095);

      top.copy(center).addScaledVector(lateral, offset);
      top.y -= 0.004 + smootherStep(progress) * 0.035;
      bottom.copy(top);
      bottom.y -= depth;

      positions.push(top.x, top.y, top.z, bottom.x, bottom.y, bottom.z);
      uvs.push(0, progress, 1, progress);
      longitudinal.push(progress, progress);
    }

    for (let row = 0; row < longitudinalSegments; row += 1) {
      const current = sideStart + row * 2;
      const next = current + 2;

      if (side < 0) {
        indices.push(current, current + 1, next);
        indices.push(next, current + 1, next + 1);
      } else {
        indices.push(current, next, current + 1);
        indices.push(next, next + 1, current + 1);
      }
    }
  }

  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setAttribute(
    "aLongitudinal",
    new BufferAttribute(new Float32Array(longitudinal), 1),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}
