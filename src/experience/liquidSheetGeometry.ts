import * as THREE from "three";

const LONGITUDINAL_SEGMENTS = 32;
const LATERAL_SEGMENTS = 12;
const ROW_COUNT = LONGITUDINAL_SEGMENTS + 1;
const COLUMN_COUNT = LATERAL_SEGMENTS + 1;
const SURFACE_VERTEX_COUNT = ROW_COUNT * COLUMN_COUNT;
const TOTAL_VERTEX_COUNT = SURFACE_VERTEX_COUNT * 2;
const POSE_COUNT = 5;

const TOP_VERTEX_OFFSET = 0;
const BOTTOM_VERTEX_OFFSET = SURFACE_VERTEX_COUNT;
const POSITION_COMPONENTS = 3;

const FULL_TURN = Math.PI * 2;

export type LiquidSheetModel = {
  geometry: THREE.BufferGeometry;
  update: (progress: number) => void;
  dispose: () => void;
};

function smooth01(value: number) {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function smoother01(value: number) {
  const clamped = Math.min(1, Math.max(0, value));
  return (
    clamped *
    clamped *
    clamped *
    (clamped * (clamped * 6 - 15) + 10)
  );
}

function bell(value: number, center: number, radius: number) {
  const distance = (value - center) / radius;
  return Math.exp(-(distance * distance));
}

/**
 * Writes a point on one of the five neutral sheet poses.
 *
 * `u` follows the sheet's length and `v` crosses it from -1 to 1. Keeping that
 * parameterization stable is what lets every chapter share one indexed mesh.
 */
function writeSurfacePoint(
  pose: number,
  u: number,
  v: number,
  target: Float32Array,
  offset: number,
) {
  const arch = Math.sin(Math.PI * u);
  const edge = Math.abs(v);
  const organicEdge = 1 + Math.pow(edge, 4) * Math.sin(u * 17.3 + pose) * 0.025;
  const taperedSpan = smoother01(Math.min(u, 1 - u) * 8);

  let x = 0;
  let y = 0;
  let z = 0;

  switch (pose) {
    case 0: {
      // ORIGIN: a narrow, upright S with enough depth to read as an object.
      const phase = u * Math.PI * 2.05 - 0.35;
      const halfWidth =
        (0.07 + arch * 0.29) *
        (0.28 + taperedSpan * 0.72) *
        organicEdge;

      x =
        1.55 +
        Math.sin(phase) * 0.82 +
        Math.sin(phase * 2.08 + 0.45) * 0.2 +
        v * halfWidth;
      y = -3.55 + u * 7.1 + v * arch * 0.06;
      z =
        -0.75 +
        u * 1.35 +
        Math.cos(phase + 0.25) * 0.24 +
        v * v * arch * 0.1;
      break;
    }

    case 1: {
      // CURIOSITY: the same strip uncoils into a long lateral sweep.
      const halfWidth =
        (0.1 + arch * 0.52 + u * 0.08) *
        (0.26 + taperedSpan * 0.74) *
        organicEdge;

      x = -5.0 + u * 10.0 + v * halfWidth * arch * 0.08;
      y =
        -1.15 +
        Math.sin((u - 0.12) * Math.PI) * 1.35 +
        Math.sin(u * FULL_TURN) * 0.42 +
        v * halfWidth;
      z =
        -1.15 +
        u * 1.25 +
        Math.sin(u * FULL_TURN + 0.4) * 0.48 +
        v * arch * 0.18 +
        v * v * arch * 0.12;
      break;
    }

    case 2: {
      // BUILD: a wider fold rotates the middle of the sheet toward the viewer.
      const forwardFold = bell(u, 0.54, 0.19);
      const halfWidth =
        (0.25 + arch * 0.76) *
        (0.34 + taperedSpan * 0.66) *
        organicEdge;
      const faceOn = 0.2 + forwardFold * 0.72;

      x =
        -3.65 +
        u * 8.1 +
        Math.sin(u * FULL_TURN) * 0.68 +
        v * halfWidth * Math.sin(u * Math.PI) * 0.16;
      y =
        -0.45 +
        Math.sin(u * FULL_TURN - 0.58) * 0.92 +
        v * halfWidth * (1 - forwardFold * 0.62);
      z =
        -0.65 -
        forwardFold * 2.45 +
        Math.sin(u * Math.PI * 3.0) * 0.26 +
        v * halfWidth * faceOn +
        v * v * forwardFold * 0.28;
      break;
    }

    case 3: {
      // CONFLUENCE: the strip opens into a fan and briefly doubles in projection.
      const opening = smooth01(u);
      const centerFold = bell(u, 0.58, 0.23);
      const halfWidth =
        (0.34 + opening * 1.62 + arch * 0.18) *
        (0.38 + taperedSpan * 0.62) *
        organicEdge;

      x =
        -4.15 +
        u * 8.3 +
        Math.sin(u * FULL_TURN) * 1.42 +
        v * halfWidth * arch * 0.16;
      y =
        -0.82 +
        Math.sin(u * FULL_TURN + 0.28) * 0.58 +
        v * halfWidth;
      z =
        -0.72 +
        Math.sin(u * FULL_TURN - 0.2) * 0.72 +
        v * halfWidth * (0.2 + arch * 0.34) +
        v * v * centerFold * 0.48;
      break;
    }

    default: {
      // OCEAN: one broad, gently tilted surface, still using the original mesh.
      const distanceWidth = 4.62 - u * 0.68;
      const lateralBasin = v * v;
      const broadUndulation =
        Math.sin((v + 1) * Math.PI * 1.18 + u * 1.8) *
        (0.035 + arch * 0.075);
      const oceanRipple =
        Math.sin(v * Math.PI * 2.15 + u * 6.4) *
          (0.035 + u * 0.095) +
        Math.sin(v * Math.PI * 4.2 - u * 2.8) * arch * 0.028;

      x =
        Math.sin(u * FULL_TURN) * 0.22 +
        v * distanceWidth * organicEdge;
      y =
        -2.65 +
        u * 2.85 +
        lateralBasin * 0.2 +
        broadUndulation -
        oceanRipple -
        arch * 0.12;
      z =
        2.65 -
        u * 7.15 +
        v * Math.sin(u * Math.PI) * 0.22 +
        Math.sin(v * Math.PI * 2 + u * 5.1) * (0.04 + arch * 0.1) +
        lateralBasin * 0.08;
      break;
    }
  }

  target[offset] = x;
  target[offset + 1] = y;
  target[offset + 2] = z;
}

function halfThicknessForPose(pose: number, u: number) {
  const body = 0.82 + Math.sin(Math.PI * u) * 0.18;

  switch (pose) {
    case 0:
      return 0.026 * body;
    case 1:
      return 0.034 * body;
    case 2:
      return 0.045 * body;
    case 3:
      return 0.04 * body;
    default:
      return 0.03 * body;
  }
}

function buildPosePositions(pose: number) {
  const surface = new Float32Array(SURFACE_VERTEX_COUNT * POSITION_COMPONENTS);
  const positions = new Float32Array(TOTAL_VERTEX_COUNT * POSITION_COMPONENTS);

  for (let row = 0; row < ROW_COUNT; row += 1) {
    const u = row / LONGITUDINAL_SEGMENTS;

    for (let column = 0; column < COLUMN_COUNT; column += 1) {
      const v = (column / LATERAL_SEGMENTS) * 2 - 1;
      const vertex = row * COLUMN_COUNT + column;

      writeSurfacePoint(
        pose,
        u,
        v,
        surface,
        vertex * POSITION_COMPONENTS,
      );
    }
  }

  for (let row = 0; row < ROW_COUNT; row += 1) {
    const previousRow = Math.max(0, row - 1);
    const nextRow = Math.min(ROW_COUNT - 1, row + 1);
    const u = row / LONGITUDINAL_SEGMENTS;
    const halfThickness = halfThicknessForPose(pose, u);

    for (let column = 0; column < COLUMN_COUNT; column += 1) {
      const previousColumn = Math.max(0, column - 1);
      const nextColumn = Math.min(COLUMN_COUNT - 1, column + 1);
      const vertex = row * COLUMN_COUNT + column;
      const surfaceOffset = vertex * POSITION_COMPONENTS;

      const previousRowOffset =
        (previousRow * COLUMN_COUNT + column) * POSITION_COMPONENTS;
      const nextRowOffset =
        (nextRow * COLUMN_COUNT + column) * POSITION_COMPONENTS;
      const previousColumnOffset =
        (row * COLUMN_COUNT + previousColumn) * POSITION_COMPONENTS;
      const nextColumnOffset =
        (row * COLUMN_COUNT + nextColumn) * POSITION_COMPONENTS;

      const duX = surface[nextRowOffset] - surface[previousRowOffset];
      const duY = surface[nextRowOffset + 1] - surface[previousRowOffset + 1];
      const duZ = surface[nextRowOffset + 2] - surface[previousRowOffset + 2];
      const dvX = surface[nextColumnOffset] - surface[previousColumnOffset];
      const dvY =
        surface[nextColumnOffset + 1] - surface[previousColumnOffset + 1];
      const dvZ =
        surface[nextColumnOffset + 2] - surface[previousColumnOffset + 2];

      let normalX = duY * dvZ - duZ * dvY;
      let normalY = duZ * dvX - duX * dvZ;
      let normalZ = duX * dvY - duY * dvX;
      const normalLength = Math.sqrt(
        normalX * normalX + normalY * normalY + normalZ * normalZ,
      );

      if (normalLength > 1e-8) {
        const inverseLength = 1 / normalLength;
        normalX *= inverseLength;
        normalY *= inverseLength;
        normalZ *= inverseLength;
      } else {
        normalX = 0;
        normalY = pose === POSE_COUNT - 1 ? 1 : 0;
        normalZ = pose === POSE_COUNT - 1 ? 0 : -1;
      }

      const topOffset =
        (TOP_VERTEX_OFFSET + vertex) * POSITION_COMPONENTS;
      const bottomOffset =
        (BOTTOM_VERTEX_OFFSET + vertex) * POSITION_COMPONENTS;
      const x = surface[surfaceOffset];
      const y = surface[surfaceOffset + 1];
      const z = surface[surfaceOffset + 2];

      positions[topOffset] = x + normalX * halfThickness;
      positions[topOffset + 1] = y + normalY * halfThickness;
      positions[topOffset + 2] = z + normalZ * halfThickness;
      positions[bottomOffset] = x - normalX * halfThickness;
      positions[bottomOffset + 1] = y - normalY * halfThickness;
      positions[bottomOffset + 2] = z - normalZ * halfThickness;
    }
  }

  return positions;
}

function buildIndices() {
  const surfaceIndexCount =
    LONGITUDINAL_SEGMENTS * LATERAL_SEGMENTS * 6;
  const longitudinalEdgeIndexCount = LONGITUDINAL_SEGMENTS * 2 * 6;
  const lateralEdgeIndexCount = LATERAL_SEGMENTS * 2 * 6;
  const indices = new Uint16Array(
    surfaceIndexCount * 2 +
      longitudinalEdgeIndexCount +
      lateralEdgeIndexCount,
  );
  let cursor = 0;

  for (let row = 0; row < LONGITUDINAL_SEGMENTS; row += 1) {
    for (let column = 0; column < LATERAL_SEGMENTS; column += 1) {
      const a = row * COLUMN_COUNT + column;
      const b = (row + 1) * COLUMN_COUNT + column;
      const c = (row + 1) * COLUMN_COUNT + column + 1;
      const d = row * COLUMN_COUNT + column + 1;

      indices[cursor++] = TOP_VERTEX_OFFSET + a;
      indices[cursor++] = TOP_VERTEX_OFFSET + b;
      indices[cursor++] = TOP_VERTEX_OFFSET + d;
      indices[cursor++] = TOP_VERTEX_OFFSET + b;
      indices[cursor++] = TOP_VERTEX_OFFSET + c;
      indices[cursor++] = TOP_VERTEX_OFFSET + d;

      indices[cursor++] = BOTTOM_VERTEX_OFFSET + a;
      indices[cursor++] = BOTTOM_VERTEX_OFFSET + d;
      indices[cursor++] = BOTTOM_VERTEX_OFFSET + b;
      indices[cursor++] = BOTTOM_VERTEX_OFFSET + b;
      indices[cursor++] = BOTTOM_VERTEX_OFFSET + d;
      indices[cursor++] = BOTTOM_VERTEX_OFFSET + c;
    }
  }

  for (let row = 0; row < LONGITUDINAL_SEGMENTS; row += 1) {
    const leftTop = row * COLUMN_COUNT;
    const leftTopNext = (row + 1) * COLUMN_COUNT;
    const leftBottom = BOTTOM_VERTEX_OFFSET + leftTop;
    const leftBottomNext = BOTTOM_VERTEX_OFFSET + leftTopNext;

    indices[cursor++] = leftTop;
    indices[cursor++] = leftBottom;
    indices[cursor++] = leftTopNext;
    indices[cursor++] = leftTopNext;
    indices[cursor++] = leftBottom;
    indices[cursor++] = leftBottomNext;

    const rightTop = row * COLUMN_COUNT + LATERAL_SEGMENTS;
    const rightTopNext =
      (row + 1) * COLUMN_COUNT + LATERAL_SEGMENTS;
    const rightBottom = BOTTOM_VERTEX_OFFSET + rightTop;
    const rightBottomNext = BOTTOM_VERTEX_OFFSET + rightTopNext;

    indices[cursor++] = rightTop;
    indices[cursor++] = rightTopNext;
    indices[cursor++] = rightBottom;
    indices[cursor++] = rightTopNext;
    indices[cursor++] = rightBottomNext;
    indices[cursor++] = rightBottom;
  }

  const lastRowOffset = LONGITUDINAL_SEGMENTS * COLUMN_COUNT;

  for (let column = 0; column < LATERAL_SEGMENTS; column += 1) {
    const startTop = column;
    const startTopNext = column + 1;
    const startBottom = BOTTOM_VERTEX_OFFSET + startTop;
    const startBottomNext = BOTTOM_VERTEX_OFFSET + startTopNext;

    indices[cursor++] = startTop;
    indices[cursor++] = startTopNext;
    indices[cursor++] = startBottom;
    indices[cursor++] = startTopNext;
    indices[cursor++] = startBottomNext;
    indices[cursor++] = startBottom;

    const endTop = lastRowOffset + column;
    const endTopNext = lastRowOffset + column + 1;
    const endBottom = BOTTOM_VERTEX_OFFSET + endTop;
    const endBottomNext = BOTTOM_VERTEX_OFFSET + endTopNext;

    indices[cursor++] = endTop;
    indices[cursor++] = endBottom;
    indices[cursor++] = endTopNext;
    indices[cursor++] = endTopNext;
    indices[cursor++] = endBottom;
    indices[cursor++] = endBottomNext;
  }

  return indices;
}

function buildUvs() {
  const uvs = new Float32Array(TOTAL_VERTEX_COUNT * 2);

  for (let surface = 0; surface < 2; surface += 1) {
    const surfaceOffset = surface * SURFACE_VERTEX_COUNT;

    for (let row = 0; row < ROW_COUNT; row += 1) {
      const u = row / LONGITUDINAL_SEGMENTS;

      for (let column = 0; column < COLUMN_COUNT; column += 1) {
        const v = column / LATERAL_SEGMENTS;
        const vertex = surfaceOffset + row * COLUMN_COUNT + column;
        const offset = vertex * 2;

        uvs[offset] = u;
        uvs[offset + 1] = v;
      }
    }
  }

  return uvs;
}

function recomputeVertexNormals(
  positions: Float32Array,
  indices: Uint16Array,
  normals: Float32Array,
) {
  normals.fill(0);

  for (let index = 0; index < indices.length; index += 3) {
    const vertexA = indices[index] * POSITION_COMPONENTS;
    const vertexB = indices[index + 1] * POSITION_COMPONENTS;
    const vertexC = indices[index + 2] * POSITION_COMPONENTS;
    const abX = positions[vertexB] - positions[vertexA];
    const abY = positions[vertexB + 1] - positions[vertexA + 1];
    const abZ = positions[vertexB + 2] - positions[vertexA + 2];
    const acX = positions[vertexC] - positions[vertexA];
    const acY = positions[vertexC + 1] - positions[vertexA + 1];
    const acZ = positions[vertexC + 2] - positions[vertexA + 2];
    const normalX = abY * acZ - abZ * acY;
    const normalY = abZ * acX - abX * acZ;
    const normalZ = abX * acY - abY * acX;

    normals[vertexA] += normalX;
    normals[vertexA + 1] += normalY;
    normals[vertexA + 2] += normalZ;
    normals[vertexB] += normalX;
    normals[vertexB + 1] += normalY;
    normals[vertexB + 2] += normalZ;
    normals[vertexC] += normalX;
    normals[vertexC + 1] += normalY;
    normals[vertexC + 2] += normalZ;
  }

  for (let offset = 0; offset < normals.length; offset += 3) {
    const normalX = normals[offset];
    const normalY = normals[offset + 1];
    const normalZ = normals[offset + 2];
    const length = Math.sqrt(
      normalX * normalX + normalY * normalY + normalZ * normalZ,
    );

    if (length > 1e-8) {
      const inverseLength = 1 / length;

      normals[offset] = normalX * inverseLength;
      normals[offset + 1] = normalY * inverseLength;
      normals[offset + 2] = normalZ * inverseLength;
    }
  }
}

function assignConservativeBounds(
  geometry: THREE.BufferGeometry,
  poses: Float32Array[],
) {
  let minimumX = Number.POSITIVE_INFINITY;
  let minimumY = Number.POSITIVE_INFINITY;
  let minimumZ = Number.POSITIVE_INFINITY;
  let maximumX = Number.NEGATIVE_INFINITY;
  let maximumY = Number.NEGATIVE_INFINITY;
  let maximumZ = Number.NEGATIVE_INFINITY;

  for (let pose = 0; pose < poses.length; pose += 1) {
    const positions = poses[pose];

    for (let offset = 0; offset < positions.length; offset += 3) {
      const x = positions[offset];
      const y = positions[offset + 1];
      const z = positions[offset + 2];

      minimumX = Math.min(minimumX, x);
      minimumY = Math.min(minimumY, y);
      minimumZ = Math.min(minimumZ, z);
      maximumX = Math.max(maximumX, x);
      maximumY = Math.max(maximumY, y);
      maximumZ = Math.max(maximumZ, z);
    }
  }

  const centerX = (minimumX + maximumX) * 0.5;
  const centerY = (minimumY + maximumY) * 0.5;
  const centerZ = (minimumZ + maximumZ) * 0.5;
  let radiusSquared = 0;

  for (let pose = 0; pose < poses.length; pose += 1) {
    const positions = poses[pose];

    for (let offset = 0; offset < positions.length; offset += 3) {
      const deltaX = positions[offset] - centerX;
      const deltaY = positions[offset + 1] - centerY;
      const deltaZ = positions[offset + 2] - centerZ;

      radiusSquared = Math.max(
        radiusSquared,
        deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ,
      );
    }
  }

  geometry.boundingBox = new THREE.Box3(
    new THREE.Vector3(minimumX, minimumY, minimumZ),
    new THREE.Vector3(maximumX, maximumY, maximumZ),
  );
  geometry.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(centerX, centerY, centerZ),
    Math.sqrt(radiusSquared),
  );
}

/**
 * Creates one persistent shallow sheet that can morph through five chapters.
 *
 * The geometry has fixed indexed topology: 33 longitudinal rows by 13 lateral
 * columns, duplicated for top and bottom faces, with explicit faces around the
 * four perimeter edges. `update` only interpolates cached pose positions.
 */
export function createLiquidSheetModel(): LiquidSheetModel {
  const poses = new Array<Float32Array>(POSE_COUNT);

  for (let pose = 0; pose < POSE_COUNT; pose += 1) {
    poses[pose] = buildPosePositions(pose);
  }

  const geometry = new THREE.BufferGeometry();
  const currentPositions = new Float32Array(poses[0]);
  const indices = buildIndices();
  const normals = new Float32Array(TOTAL_VERTEX_COUNT * POSITION_COMPONENTS);
  const positionAttribute = new THREE.BufferAttribute(currentPositions, 3);
  const normalAttribute = new THREE.BufferAttribute(normals, 3);

  positionAttribute.setUsage(THREE.DynamicDrawUsage);
  normalAttribute.setUsage(THREE.DynamicDrawUsage);
  recomputeVertexNormals(currentPositions, indices, normals);
  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("normal", normalAttribute);
  geometry.setAttribute("uv", new THREE.BufferAttribute(buildUvs(), 2));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  assignConservativeBounds(geometry, poses);

  let currentProgress = Number.NaN;
  let disposed = false;

  const update = (progress: number) => {
    if (disposed) {
      return;
    }

    const nextProgress = Number.isFinite(progress)
      ? Math.min(POSE_COUNT - 1, Math.max(0, progress))
      : 0;

    if (nextProgress === currentProgress) {
      return;
    }

    const lowerPose = Math.min(
      POSE_COUNT - 2,
      Math.floor(nextProgress),
    );
    const upperPose = lowerPose + 1;
    const blend = smoother01(nextProgress - lowerPose);
    const inverseBlend = 1 - blend;
    const lowerPositions = poses[lowerPose];
    const upperPositions = poses[upperPose];

    for (let index = 0; index < currentPositions.length; index += 1) {
      currentPositions[index] =
        lowerPositions[index] * inverseBlend + upperPositions[index] * blend;
    }

    positionAttribute.needsUpdate = true;
    recomputeVertexNormals(currentPositions, indices, normals);
    normalAttribute.needsUpdate = true;
    currentProgress = nextProgress;
  };

  const dispose = () => {
    if (disposed) {
      return;
    }

    geometry.dispose();
    disposed = true;
  };

  return { geometry, update, dispose };
}
