import {
  CatmullRomCurve3,
  ClampToEdgeWrapping,
  DataTexture,
  FloatType,
  NearestFilter,
  RGBAFormat,
  Vector3,
} from "three";

const WORLD_UP = new Vector3(0, 1, 0);
const DEFAULT_GUIDE_COUNT = 112;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export default class RiverGuideSimulation {
  readonly count: number;
  readonly texture: DataTexture;

  private readonly baseCenters: Float32Array;
  private readonly baseLaterals: Float32Array;
  private readonly responseShape: Float32Array;
  private readonly propagationByDistance: Float32Array;
  private readonly lateralOffsets: Float32Array;
  private readonly verticalOffsets: Float32Array;
  private readonly lateralVelocities: Float32Array;
  private readonly verticalVelocities: Float32Array;
  private readonly textureData: Float32Array;
  private readonly reducedMotion: boolean;
  private filteredInputVelocity = 0;
  private isSettled = true;

  constructor(
    curve: CatmullRomCurve3,
    reducedMotion: boolean,
    count = DEFAULT_GUIDE_COUNT,
  ) {
    this.count = count;
    this.reducedMotion = reducedMotion;
    this.baseCenters = new Float32Array(count * 3);
    this.baseLaterals = new Float32Array(count * 3);
    this.responseShape = new Float32Array(count);
    this.propagationByDistance = new Float32Array(count);
    this.lateralOffsets = new Float32Array(count);
    this.verticalOffsets = new Float32Array(count);
    this.lateralVelocities = new Float32Array(count);
    this.verticalVelocities = new Float32Array(count);
    this.textureData = new Float32Array(count * 2 * 4);

    const center = new Vector3();
    const tangent = new Vector3();
    const lateral = new Vector3();

    for (let index = 0; index < count; index += 1) {
      const progress = index / (count - 1);
      curve.getPointAt(progress, center);
      curve.getTangentAt(progress, tangent).normalize();
      lateral.crossVectors(WORLD_UP, tangent).normalize();

      const vectorIndex = index * 3;
      this.baseCenters[vectorIndex] = center.x;
      this.baseCenters[vectorIndex + 1] = center.y;
      this.baseCenters[vectorIndex + 2] = center.z;
      this.baseLaterals[vectorIndex] = lateral.x;
      this.baseLaterals[vectorIndex + 1] = lateral.y;
      this.baseLaterals[vectorIndex + 2] = lateral.z;
      this.responseShape[index] =
        Math.sin(index * 0.43 + 0.8) * 0.42 +
        Math.sin(index * 0.17 + 2.1) * 0.58;
      this.propagationByDistance[index] = Math.exp(-index / 34);
    }

    this.writeTextureData();
    this.texture = new DataTexture(
      this.textureData,
      count,
      2,
      RGBAFormat,
      FloatType,
    );
    this.texture.minFilter = NearestFilter;
    this.texture.magFilter = NearestFilter;
    this.texture.wrapS = ClampToEdgeWrapping;
    this.texture.wrapT = ClampToEdgeWrapping;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
  }

  update(reveal: number, progressVelocity: number, delta: number) {
    const safeDelta = clamp(delta, 1 / 240, 0.05);

    if (this.reducedMotion) {
      if (!this.isSettled) {
        this.resetOffsets();
      }

      return;
    }

    const clampedInputVelocity = clamp(progressVelocity, -2.4, 2.4);
    const inputResponse = 1 - Math.exp(-safeDelta * 13);
    this.filteredInputVelocity +=
      (clampedInputVelocity - this.filteredInputVelocity) * inputResponse;

    const frontierIndex = clamp(
      Math.round(reveal * (this.count - 1)),
      0,
      this.count - 1,
    );
    const headLateralTarget = -this.filteredInputVelocity * 0.052;
    const headVerticalTarget =
      Math.min(0.034, Math.abs(this.filteredInputVelocity) * 0.014);
    let maximumMotion = Math.abs(this.filteredInputVelocity);
    const restingLateralDecay = Math.exp(-14 * safeDelta);
    const restingVerticalDecay = Math.exp(-15 * safeDelta);
    const verticalFrequencyDecayFactor = Math.exp(-1.4 * safeDelta);

    for (let index = this.count - 1; index > frontierIndex; index -= 1) {
      const lateralDisplacement = this.lateralOffsets[index];
      const lateralSpringVelocity =
        this.lateralVelocities[index] + 14 * lateralDisplacement;
      const nextLateral =
        (lateralDisplacement + lateralSpringVelocity * safeDelta) *
        restingLateralDecay;
      const nextLateralVelocity =
        (this.lateralVelocities[index] -
          14 * lateralSpringVelocity * safeDelta) *
        restingLateralDecay;
      const verticalDisplacement = this.verticalOffsets[index];
      const verticalSpringVelocity =
        this.verticalVelocities[index] + 15 * verticalDisplacement;
      const nextVertical =
        (verticalDisplacement + verticalSpringVelocity * safeDelta) *
        restingVerticalDecay;
      const nextVerticalVelocity =
        (this.verticalVelocities[index] -
          15 * verticalSpringVelocity * safeDelta) *
        restingVerticalDecay;

      this.lateralOffsets[index] = nextLateral;
      this.lateralVelocities[index] = nextLateralVelocity;
      this.verticalOffsets[index] = nextVertical;
      this.verticalVelocities[index] = nextVerticalVelocity;
      maximumMotion = Math.max(
        maximumMotion,
        Math.abs(nextLateral),
        Math.abs(nextLateralVelocity) * 0.08,
        Math.abs(nextVertical),
        Math.abs(nextVerticalVelocity) * 0.08,
      );
    }

    for (let index = frontierIndex; index >= 0; index -= 1) {
      const distanceFromHead = frontierIndex - index;
      const propagation = this.propagationByDistance[distanceFromHead];
      const shapedResponse =
        0.72 + this.responseShape[index] * 0.28;
      const lateralTarget =
        index === frontierIndex
          ? headLateralTarget
          : this.lateralOffsets[index + 1] * 0.91 +
            headLateralTarget * propagation * shapedResponse * 0.09;
      const verticalTarget =
        index === frontierIndex
          ? headVerticalTarget
          : this.verticalOffsets[index + 1] * 0.9 +
            headVerticalTarget * propagation * 0.1;
      const springFrequency = 8.8 + propagation * 4.2;
      const lateralDisplacement =
        this.lateralOffsets[index] - lateralTarget;
      const lateralSpringVelocity =
        this.lateralVelocities[index] +
        springFrequency * lateralDisplacement;
      const lateralDecay = Math.exp(-springFrequency * safeDelta);
      const verticalDecay =
        lateralDecay * verticalFrequencyDecayFactor;
      const nextLateral =
        lateralTarget +
        (lateralDisplacement + lateralSpringVelocity * safeDelta) *
          lateralDecay;
      const nextLateralVelocity =
        (this.lateralVelocities[index] -
          springFrequency * lateralSpringVelocity * safeDelta) *
        lateralDecay;
      const verticalFrequency = springFrequency + 1.4;
      const verticalDisplacement =
        this.verticalOffsets[index] - verticalTarget;
      const verticalSpringVelocity =
        this.verticalVelocities[index] +
        verticalFrequency * verticalDisplacement;
      const nextVertical =
        verticalTarget +
        (verticalDisplacement + verticalSpringVelocity * safeDelta) *
          verticalDecay;
      const nextVerticalVelocity =
        (this.verticalVelocities[index] -
          verticalFrequency * verticalSpringVelocity * safeDelta) *
        verticalDecay;

      this.lateralOffsets[index] = clamp(nextLateral, -0.18, 0.18);
      this.lateralVelocities[index] = nextLateralVelocity;
      this.verticalOffsets[index] = clamp(nextVertical, -0.01, 0.045);
      this.verticalVelocities[index] = nextVerticalVelocity;
      maximumMotion = Math.max(
        maximumMotion,
        Math.abs(nextLateral),
        Math.abs(nextLateralVelocity) * 0.08,
        Math.abs(nextVertical),
        Math.abs(nextVerticalVelocity) * 0.08,
      );
    }

    this.isSettled = maximumMotion < 0.00008;

    if (this.isSettled) {
      this.resetOffsets();
      return;
    }

    this.writeTextureData();
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
  }

  private resetOffsets() {
    this.filteredInputVelocity = 0;
    this.lateralOffsets.fill(0);
    this.verticalOffsets.fill(0);
    this.lateralVelocities.fill(0);
    this.verticalVelocities.fill(0);
    this.isSettled = true;
    this.writeTextureData();
    this.texture.needsUpdate = true;
  }

  private writeTextureData() {
    for (let index = 0; index < this.count; index += 1) {
      const vectorIndex = index * 3;
      const positionTexel = index * 4;
      const velocityTexel = (this.count + index) * 4;
      const lateralOffset = this.lateralOffsets[index];
      const verticalOffset = this.verticalOffsets[index];
      const lateralVelocity = this.lateralVelocities[index];
      const verticalVelocity = this.verticalVelocities[index];

      this.textureData[positionTexel] =
        this.baseCenters[vectorIndex] +
        this.baseLaterals[vectorIndex] * lateralOffset;
      this.textureData[positionTexel + 1] =
        this.baseCenters[vectorIndex + 1] +
        this.baseLaterals[vectorIndex + 1] * lateralOffset +
        verticalOffset;
      this.textureData[positionTexel + 2] =
        this.baseCenters[vectorIndex + 2] +
        this.baseLaterals[vectorIndex + 2] * lateralOffset;
      this.textureData[positionTexel + 3] = 1;

      this.textureData[velocityTexel] =
        this.baseLaterals[vectorIndex] * lateralVelocity;
      this.textureData[velocityTexel + 1] =
        this.baseLaterals[vectorIndex + 1] * lateralVelocity +
        verticalVelocity;
      this.textureData[velocityTexel + 2] =
        this.baseLaterals[vectorIndex + 2] * lateralVelocity;
      this.textureData[velocityTexel + 3] = 0;
    }
  }
}
