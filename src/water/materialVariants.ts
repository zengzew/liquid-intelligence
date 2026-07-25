export const WATER_MATERIAL_VARIANTS = [
  "current",
  "three-water",
  "physical",
] as const;

export type WaterMaterialVariant =
  (typeof WATER_MATERIAL_VARIANTS)[number];

export function isWaterMaterialVariant(
  value: string | null,
): value is WaterMaterialVariant {
  return WATER_MATERIAL_VARIANTS.some((variant) => variant === value);
}
