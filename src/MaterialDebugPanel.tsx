import { useEffect, useState } from "react";
import type { ExperienceTheme } from "./App";
import {
  WATER_MATERIAL_VARIANTS,
  type WaterMaterialVariant,
} from "./water/materialVariants";

const MATERIAL_LABELS: Record<WaterMaterialVariant, string> = {
  current: "Current",
  "three-water": "Three Water",
  physical: "Physical",
};

const PROGRESS_PRESETS = [0.25, 0.6, 0.9] as const;

interface MaterialDebugPanelProps {
  material: WaterMaterialVariant;
  theme: ExperienceTheme;
  progress: number | null;
  onMaterialChange: (material: WaterMaterialVariant) => void;
  onThemeChange: (theme: ExperienceTheme) => void;
  onProgressChange: (progress: number) => void;
  onHideTypography: () => void;
}

function readFps() {
  const value = Number.parseInt(document.documentElement.dataset.fps ?? "", 10);
  return Number.isFinite(value) ? value : null;
}

export default function MaterialDebugPanel({
  material,
  theme,
  progress,
  onMaterialChange,
  onThemeChange,
  onProgressChange,
  onHideTypography,
}: MaterialDebugPanelProps) {
  const [fps, setFps] = useState<number | null>(readFps);

  useEffect(() => {
    const updateFps = () => setFps(readFps());
    const intervalId = window.setInterval(updateFps, 500);

    updateFps();

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <aside
      className="material-debug-panel"
      data-testid="material-debug-panel"
      aria-label="Water material comparison controls"
    >
      <div className="material-debug-panel__header">
        <span>Material spike</span>
        <output aria-label="Frames per second">
          {fps === null ? "—" : fps} FPS
        </output>
      </div>

      <fieldset>
        <legend>Material</legend>
        <div className="material-debug-panel__options">
          {WATER_MATERIAL_VARIANTS.map((variant) => (
            <button
              key={variant}
              type="button"
              data-testid={`material-${variant}`}
              aria-pressed={material === variant}
              onClick={() => onMaterialChange(variant)}
            >
              {MATERIAL_LABELS[variant]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Theme</legend>
        <div className="material-debug-panel__options">
          {(["night", "morning"] as const).map((themeOption) => (
            <button
              key={themeOption}
              type="button"
              data-testid={`theme-${themeOption}`}
              aria-pressed={theme === themeOption}
              onClick={() => onThemeChange(themeOption)}
            >
              {themeOption}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Journey</legend>
        <div className="material-debug-panel__options">
          {PROGRESS_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              data-testid={`progress-${preset.toFixed(2)}`}
              aria-pressed={progress === preset}
              onClick={() => onProgressChange(preset)}
            >
              {preset.toFixed(2)}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        className="material-debug-panel__hide"
        type="button"
        data-testid="hide-typography"
        onClick={onHideTypography}
      >
        Hide DOM typography
      </button>
    </aside>
  );
}
