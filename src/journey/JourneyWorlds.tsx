import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import type { CatmullRomCurve3 } from "three";
import type { ExperienceTheme } from "../App";
import type { JourneyProgress } from "../experience/LiquidExperience";
import BookCastWorld from "./worlds/BookCastWorld";
import ConfluenceWorld from "./worlds/ConfluenceWorld";
import OceanWorld from "./worlds/OceanWorld";
import OriginWorld from "./worlds/OriginWorld";
import StreamWorld from "./worlds/StreamWorld";

interface JourneyWorldsProps {
  curve: CatmullRomCurve3;
  progressRef: MutableRefObject<JourneyProgress>;
  theme: ExperienceTheme;
}

export default function JourneyWorlds({
  curve,
  progressRef,
  theme,
}: JourneyWorldsProps) {
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);

    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  const worldProps = {
    curve,
    progressRef,
    reducedMotion,
    theme,
  };

  return (
    <>
      <OriginWorld {...worldProps} />
      <StreamWorld {...worldProps} />
      <BookCastWorld {...worldProps} />
      <ConfluenceWorld {...worldProps} />
      <OceanWorld {...worldProps} />
    </>
  );
}
