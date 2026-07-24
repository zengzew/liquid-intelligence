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
  { at: 0, halfWidth: 0.06 },
  { at: 0.12, halfWidth: 0.115 },
  { at: 0.26, halfWidth: 0.72 },
  { at: 0.5, halfWidth: 6.4 },
  { at: 0.72, halfWidth: 15 },
  { at: 0.9, halfWidth: 30 },
  { at: 1, halfWidth: 46 },
];

function smootherStep(value: number) {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * clamped * (clamped * (clamped * 6 - 15) + 10);
}

function gaussian(value: number, center: number, spread: number) {
  const normalized = (value - center) / spread;
  return Math.exp(-(normalized * normalized));
}

function seededValue(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function getRevealFrontier(progress: number) {
  const clamped = Math.min(1, Math.max(0, progress));
  return 0.105 + Math.pow(clamped, 0.94) * 0.895;
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
  const downstream = smootherStep((progress - 0.04) / 0.9);
  const leftScale =
    1 +
    Math.sin(progress * 16.7 + 0.35) * 0.14 * downstream +
    Math.sin(progress * 39.2 + 1.4) * 0.068 * downstream -
    Math.sin(progress * 82.0 + 0.7) * 0.045 * downstream +
    Math.sin(progress * 147.0 + 1.9) * 0.014 * downstream -
    gaussian(progress, 0.49, 0.075) * 0.15 +
    gaussian(progress, 0.76, 0.052) * 0.21;
  const rightScale =
    1 +
    Math.sin(progress * 13.1 + 2.15) * 0.17 * downstream +
    Math.sin(progress * 34.9 + 0.2) * 0.075 * downstream +
    Math.sin(progress * 76.0 + 2.4) * 0.05 * downstream +
    Math.sin(progress * 139.0 + 0.1) * 0.016 * downstream +
    gaussian(progress, 0.34, 0.06) * 0.22 -
    gaussian(progress, 0.63, 0.065) * 0.16 +
    gaussian(progress, 0.87, 0.045) * 0.26;
  const sideScale = across < 0 ? leftScale : rightScale;
  const absoluteAcross = Math.abs(across);
  const internalFold =
    1 +
    (
      Math.sin(progress * 25.7 + across * 2.8) * 0.025 +
      Math.sin(progress * 61.3 - across * 4.6) * 0.012
    ) *
      downstream *
      (0.35 + absoluteAcross * 0.65);

  return (
    Math.sign(across) *
    Math.pow(absoluteAcross, 0.96) *
    width *
    sideScale *
    internalFold
  );
}

export function createRiverGeometry(
  curve: CatmullRomCurve3,
  longitudinalSegments = 184,
  crossSegments = 22,
) {
  const geometry = new BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const longitudinal: number[] = [];
  const acrossValues: number[] = [];
  const localOffsets: number[] = [];
  const featureValues: number[] = [];
  const indices: number[] = [];

  const center = new Vector3();
  const tangent = new Vector3();
  const lateral = new Vector3();
  const vertex = new Vector3();
  const relative = new Vector3();
  const pushRiverVertex = (
    progress: number,
    across: number,
    uvX: number,
    feature = 0,
  ) => {
    relative.copy(vertex).sub(center);
    positions.push(vertex.x, vertex.y, vertex.z);
    localOffsets.push(
      relative.dot(tangent),
      relative.dot(lateral),
      relative.dot(UP),
    );
    longitudinal.push(progress);
    acrossValues.push(across);
    featureValues.push(feature);
    uvs.push(uvX, progress);
  };

  for (let row = 0; row <= longitudinalSegments; row += 1) {
    const progress = row / longitudinalSegments;
    getRiverFrame(curve, progress, center, tangent, lateral);
    const downstream = smootherStep(progress);

    for (let column = 0; column <= crossSegments; column += 1) {
      const across = (column / crossSegments) * 2 - 1;
      const offset = getBankOffset(progress, across);
      const absoluteAcross = Math.abs(across);
      const broadFold =
        Math.sin(progress * 17.4 + across * 4.1) *
        0.008 *
        downstream;
      const leftLane =
        Math.exp(-Math.pow((across + 0.36) / 0.17, 2)) *
        Math.sin(progress * 32.0 + 0.7) *
        0.012 *
        downstream;
      const rightLane =
        Math.exp(-Math.pow((across - 0.28) / 0.13, 2)) *
        Math.sin(progress * 27.0 + 2.1) *
        0.016 *
        downstream;
      const edgeCurl =
        smootherStep((absoluteAcross - 0.62) / 0.38) *
        Math.sin(progress * 47.0 + across * 5.0) *
        0.012 *
        downstream;
      const surfaceContour =
        -Math.pow(absoluteAcross, 1.72) * (0.003 + downstream * 0.026) +
        broadFold +
        leftLane +
        rightLane +
        edgeCurl;

      vertex
        .copy(center)
        .addScaledVector(lateral, offset)
        .addScaledVector(UP, surfaceContour);

      pushRiverVertex(progress, across, column / crossSegments);
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

  const tendrils = [
    { start: 0.09, end: 0.145, side: 1, phase: 0.4 },
    { start: 0.285, end: 0.355, side: -1, phase: 1.7 },
    { start: 0.47, end: 0.545, side: 1, phase: 2.6 },
    { start: 0.655, end: 0.72, side: -1, phase: 0.9 },
    { start: 0.79, end: 0.865, side: 1, phase: 2.2 },
  ] as const;

  tendrils.forEach(({ start, end, side, phase }) => {
    const segmentCount = 18;
    const firstVertex = positions.length / 3;

    for (let segment = 0; segment <= segmentCount; segment += 1) {
      const local = segment / segmentCount;
      const progress = start + (end - start) * local;
      const taper = Math.pow(Math.sin(local * Math.PI), 0.72);
      const width = getRiverHalfWidth(progress);
      getRiverFrame(curve, progress, center, tangent, lateral);

      const bankOffset = getBankOffset(progress, side);
      const outward =
        side *
        taper *
        (0.025 + width * (0.045 + Math.sin(local * Math.PI) * 0.035));
      const wander =
        side *
        taper *
        (0.018 + width * 0.018) *
        Math.sin(local * Math.PI * 2 + phase);
      const ribbonHalfWidth =
        taper * (0.01 + Math.min(0.16, Math.sqrt(width) * 0.022));

      for (let ribbonSide = -1; ribbonSide <= 1; ribbonSide += 2) {
        vertex
          .copy(center)
          .addScaledVector(
            lateral,
            bankOffset + outward + wander + ribbonSide * ribbonHalfWidth,
          )
          .addScaledVector(UP, 0.004 + taper * 0.012);

        pushRiverVertex(
          progress,
          side * (0.72 + local * 0.08),
          ribbonSide < 0 ? 0 : 1,
          0.45,
        );
      }
    }

    for (let segment = 0; segment < segmentCount; segment += 1) {
      const current = firstVertex + segment * 2;
      indices.push(current, current + 2, current + 1);
      indices.push(current + 2, current + 3, current + 1);
    }
  });

  for (let dropletIndex = 0; dropletIndex < 22; dropletIndex += 1) {
    const seed = seededValue(dropletIndex + 3);
    const progress = Math.max(
      0.006,
      0.016 +
        dropletIndex * 0.043 +
        (seed - 0.5) * 0.014,
    );

    if (progress >= 0.97) {
      continue;
    }

    const side = seededValue(dropletIndex + 17) > 0.48 ? 1 : -1;
    const width = getRiverHalfWidth(progress);
    const radius =
      Math.min(0.2, 0.014 + Math.sqrt(width) * 0.026) *
      (0.72 + seed * 0.48) *
      (1 + (1 - smootherStep(progress / 0.34)) * 1.35);
    getRiverFrame(curve, progress, center, tangent, lateral);
    const bankOffset = getBankOffset(progress, side);
    const outward =
      side *
      (radius * (1.35 + seededValue(dropletIndex + 29)) +
        width * (0.012 + seed * 0.012));
    const dropletCenter = new Vector3()
      .copy(center)
      .addScaledVector(lateral, bankOffset + outward)
      .addScaledVector(UP, 0.008);
    const firstVertex = positions.length / 3;
    const ringSegments = 8;

    vertex.set(
      dropletCenter.x,
      dropletCenter.y + radius * 0.3,
      dropletCenter.z,
    );
    pushRiverVertex(progress, side * 0.74, 0.5, 1);

    for (let ring = 0; ring < ringSegments; ring += 1) {
      const angle = (ring / ringSegments) * Math.PI * 2;
      vertex
        .copy(dropletCenter)
        .addScaledVector(tangent, Math.cos(angle) * radius * 1.35)
        .addScaledVector(lateral, Math.sin(angle) * radius)
        .addScaledVector(UP, Math.sin(angle * 2) * radius * 0.035);
      pushRiverVertex(
        progress,
        side * 0.76,
        Math.cos(angle) * 0.5 + 0.5,
        1,
      );
    }

    for (let ring = 0; ring < ringSegments; ring += 1) {
      indices.push(
        firstVertex,
        firstVertex + 1 + ring,
        firstVertex + 1 + ((ring + 1) % ringSegments),
      );
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
  geometry.setAttribute(
    "aLocalOffset",
    new BufferAttribute(new Float32Array(localOffsets), 3),
  );
  geometry.setAttribute(
    "aFeature",
    new BufferAttribute(new Float32Array(featureValues), 1),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

export function createRiverSkirtGeometry(
  curve: CatmullRomCurve3,
  longitudinalSegments = 220,
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
