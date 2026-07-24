import {
  DataTexture,
  LinearFilter,
  RepeatWrapping,
  RGBAFormat,
  UnsignedByteType,
} from "three";

function smoothStep(value: number) {
  return value * value * (3 - 2 * value);
}

function wrap(value: number, range: number) {
  return ((value % range) + range) % range;
}

function seededGridValue(x: number, y: number, seed: number) {
  let hash = Math.imul(x + seed * 1013, 374761393);
  hash = Math.imul(hash ^ (y + seed * 1619), 668265263);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967295;
}

function periodicValueNoise(
  x: number,
  y: number,
  cells: number,
  seed: number,
) {
  const scaledX = wrap(x, 1) * cells;
  const scaledY = wrap(y, 1) * cells;
  const x0 = Math.floor(scaledX);
  const y0 = Math.floor(scaledY);
  const x1 = (x0 + 1) % cells;
  const y1 = (y0 + 1) % cells;
  const mixX = smoothStep(scaledX - x0);
  const mixY = smoothStep(scaledY - y0);
  const top =
    seededGridValue(x0 % cells, y0 % cells, seed) * (1 - mixX) +
    seededGridValue(x1, y0 % cells, seed) * mixX;
  const bottom =
    seededGridValue(x0 % cells, y1, seed) * (1 - mixX) +
    seededGridValue(x1, y1, seed) * mixX;

  return top * (1 - mixY) + bottom * mixY;
}

function periodicHeight(x: number, y: number) {
  return (
    (periodicValueNoise(x, y, 4, 3) - 0.5) * 0.52 +
    (periodicValueNoise(x, y, 8, 11) - 0.5) * 0.31 +
    (periodicValueNoise(x, y, 16, 29) - 0.5) * 0.17
  );
}

function periodicBreakPattern(x: number, y: number) {
  return (
    periodicValueNoise(x, y, 5, 47) * 0.62 +
    periodicValueNoise(x, y, 11, 71) * 0.38
  );
}

function periodicCausticRidge(
  x: number,
  y: number,
  cells: number,
  seed: number,
) {
  const scaledX = wrap(x, 1) * cells;
  const scaledY = wrap(y, 1) * cells;
  const cellX = Math.floor(scaledX);
  const cellY = Math.floor(scaledY);
  let nearest = Number.POSITIVE_INFINITY;
  let secondNearest = Number.POSITIVE_INFINITY;

  for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
    for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
      const candidateX = cellX + xOffset;
      const candidateY = cellY + yOffset;
      const wrappedX = wrap(candidateX, cells);
      const wrappedY = wrap(candidateY, cells);
      const featureX =
        candidateX +
        0.14 +
        seededGridValue(wrappedX, wrappedY, seed) * 0.72;
      const featureY =
        candidateY +
        0.14 +
        seededGridValue(wrappedX, wrappedY, seed + 37) * 0.72;
      const deltaX = scaledX - featureX;
      const deltaY = scaledY - featureY;
      const distance = deltaX * deltaX + deltaY * deltaY;

      if (distance < nearest) {
        secondNearest = nearest;
        nearest = distance;
      } else if (distance < secondNearest) {
        secondNearest = distance;
      }
    }
  }

  const ridgeDistance = Math.sqrt(secondNearest) - Math.sqrt(nearest);
  const normalized = Math.min(
    1,
    Math.max(0, (ridgeDistance - 0.018) / 0.17),
  );

  return 1 - smoothStep(normalized);
}

function toByte(value: number) {
  return Math.round(Math.min(1, Math.max(0, value)) * 255);
}

export function createWaterNormalTexture(size = 128) {
  const data = new Uint8Array(size * size * 4);
  const texel = 1 / size;

  for (let yIndex = 0; yIndex < size; yIndex += 1) {
    for (let xIndex = 0; xIndex < size; xIndex += 1) {
      const x = xIndex / size;
      const y = yIndex / size;
      const height = periodicHeight(x, y);
      const gradientX =
        periodicHeight(x + texel, y) - periodicHeight(x - texel, y);
      const gradientY =
        periodicHeight(x, y + texel) - periodicHeight(x, y - texel);
      const breakPattern = periodicBreakPattern(x, y);
      const largeCaustic = periodicCausticRidge(x, y, 5, 89);
      const smallCaustic = periodicCausticRidge(
        y + 0.19,
        x + 0.07,
        9,
        149,
      );
      const causticBreakup = Math.min(
        1,
        breakPattern * 0.24 +
          largeCaustic * 0.48 +
          smallCaustic * 0.38,
      );
      const dataIndex = (yIndex * size + xIndex) * 4;

      data[dataIndex] = toByte(0.5 - gradientX * 3.6);
      data[dataIndex + 1] = toByte(0.5 - gradientY * 3.6);
      data[dataIndex + 2] = toByte(0.5 + height * 0.94);
      data[dataIndex + 3] = toByte(causticBreakup);
    }
  }

  const texture = new DataTexture(
    data,
    size,
    size,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  return texture;
}
