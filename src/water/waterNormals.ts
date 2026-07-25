import {
  DataTexture,
  LinearFilter,
  RepeatWrapping,
  RGBAFormat,
  UnsignedByteType,
  Vector3,
} from "three";

const TAU = Math.PI * 2;

function smoothStep(value: number) {
  return value * value * (3 - 2 * value);
}

function hashGrid(x: number, y: number, seed: number) {
  const value =
    Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return value - Math.floor(value);
}

function tileableValueNoise(
  u: number,
  v: number,
  cells: number,
  seed: number,
) {
  const scaledX = u * cells;
  const scaledY = v * cells;
  const x0 = Math.floor(scaledX);
  const y0 = Math.floor(scaledY);
  const x1 = (x0 + 1) % cells;
  const y1 = (y0 + 1) % cells;
  const wrappedX0 = ((x0 % cells) + cells) % cells;
  const wrappedY0 = ((y0 % cells) + cells) % cells;
  const mixX = smoothStep(scaledX - Math.floor(scaledX));
  const mixY = smoothStep(scaledY - Math.floor(scaledY));
  const top =
    hashGrid(wrappedX0, wrappedY0, seed) * (1 - mixX) +
    hashGrid(x1, wrappedY0, seed) * mixX;
  const bottom =
    hashGrid(wrappedX0, y1, seed) * (1 - mixX) +
    hashGrid(x1, y1, seed) * mixX;

  return top * (1 - mixY) + bottom * mixY;
}

function periodicHeight(x: number, y: number) {
  const warpedX = (x + Math.sin(y * TAU * 2) * 0.045 + 1) % 1;
  const warpedY = (y + Math.sin(x * TAU * 3) * 0.025 + 1) % 1;

  return (
    tileableValueNoise(warpedX, warpedY, 4, 1) * 0.56 +
    tileableValueNoise((x + 0.19) % 1, (y + 0.37) % 1, 9, 2) * 0.29 +
    tileableValueNoise((x + 0.43) % 1, (y + 0.11) % 1, 17, 3) * 0.15
  );
}

/**
 * A small, deterministic normal texture intended for two independently
 * scrolling samples. The motion comes from shader UVs, keeping the texture
 * reusable and avoiding a high-frequency procedural shader on every pixel.
 */
export function createWaterNormalTexture(size = 128) {
  const data = new Uint8Array(size * size * 4);
  const normal = new Vector3();
  const step = 1 / size;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const heightLeft = periodicHeight((u - step + 1) % 1, v);
      const heightRight = periodicHeight((u + step) % 1, v);
      const heightDown = periodicHeight(u, (v - step + 1) % 1);
      const heightUp = periodicHeight(u, (v + step) % 1);

      normal
        .set(
          (heightLeft - heightRight) * 4.8,
          (heightDown - heightUp) * 3.5,
          1,
        )
        .normalize();

      const offset = (y * size + x) * 4;
      data[offset] = Math.round((normal.x * 0.5 + 0.5) * 255);
      data[offset + 1] = Math.round((normal.y * 0.5 + 0.5) * 255);
      data[offset + 2] = Math.round((normal.z * 0.5 + 0.5) * 255);
      data[offset + 3] = 255;
    }
  }

  const texture = new DataTexture(
    data,
    size,
    size,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.name = "river-flow-normals";
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;

  return texture;
}
