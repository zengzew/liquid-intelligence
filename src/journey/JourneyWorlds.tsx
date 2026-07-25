import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CatmullRomCurve3,
  Color,
  DoubleSide,
  MathUtils,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Vector3,
  type Group,
  type Mesh,
} from "three";
import type { ExperienceTheme } from "../App";
import type { JourneyProgress } from "../experience/LiquidExperience";
import { getRiverHalfWidth } from "../water/riverGeometry";
import {
  JOURNEY_CHAPTERS,
  getJourneyChapterPresence,
} from "./chapters";

interface JourneyWorldsProps {
  curve: CatmullRomCurve3;
  progressRef: MutableRefObject<JourneyProgress>;
  theme: ExperienceTheme;
}

const NIGHT_SILVER = new Color("#c9cfcd");
const MORNING_SILVER = new Color("#625f59");
const NIGHT_GLASS = new Color("#8b9b9e");
const MORNING_GLASS = new Color("#8a8176");
const NIGHT_SIGNAL = new Color("#f1f2ed");
const MORNING_SIGNAL = new Color("#aa7e4f");
const UP = new Vector3(0, 1, 0);
const WAVEFORM = [
  0.12, 0.26, 0.18, 0.42, 0.24, 0.58, 0.3, 0.72, 0.36, 0.62, 0.28, 0.5,
  0.2, 0.38, 0.16, 0.28, 0.12,
];

function getBankPosition(
  curve: CatmullRomCurve3,
  progress: number,
  side: number,
  extraOffset = 0,
) {
  const center = curve.getPointAt(progress);
  const tangent = curve.getTangentAt(progress).normalize();
  const lateral = new Vector3().crossVectors(UP, tangent).normalize();

  return center
    .addScaledVector(
      lateral,
      side * (getRiverHalfWidth(progress) + extraOffset),
    )
    .addScaledVector(UP, 0.08);
}

function setGroupPresence(
  group: Group | null,
  presence: number,
  baseScale = 1,
) {
  if (!group) {
    return;
  }

  group.visible = presence > 0.008;
  const scale = baseScale * (0.92 + presence * 0.08);
  group.scale.setScalar(scale);
}

export default function JourneyWorlds({
  curve,
  progressRef,
  theme,
}: JourneyWorldsProps) {
  const sourceRef = useRef<Group>(null);
  const sourceRingRef = useRef<Mesh>(null);
  const streamRef = useRef<Group>(null);
  const bookcastRef = useRef<Group>(null);
  const pageRef = useRef<Group>(null);
  const leftHostRef = useRef<Mesh>(null);
  const rightHostRef = useRef<Mesh>(null);
  const confluenceRef = useRef<Group>(null);
  const oceanRef = useRef<Group>(null);
  const themeMix = useRef(theme === "morning" ? 1 : 0);
  const mixedColor = useMemo(() => new Color(), []);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);

    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  const sourcePosition = useMemo(() => {
    const position = curve.getPointAt(0.012);
    position.y += 0.16;
    return position;
  }, [curve]);

  const streamMarkers = useMemo(
    () => [
      getBankPosition(curve, 0.14, -1, 0.42),
      getBankPosition(curve, 0.21, 1, 0.58),
      getBankPosition(curve, 0.28, -1, 0.82),
    ],
    [curve],
  );

  const bookcastPosition = useMemo(() => {
    const position = curve.getPointAt(0.45);
    position.y += 0.08;
    return position;
  }, [curve]);

  const confluenceCurves = useMemo(() => {
    const merge = curve.getPointAt(0.69);
    merge.y += 0.1;

    return {
      left: new CatmullRomCurve3([
        new Vector3(-10.5, merge.y + 0.12, merge.z + 3.2),
        new Vector3(-7.4, merge.y + 0.08, merge.z + 1.9),
        new Vector3(-3.4, merge.y + 0.04, merge.z + 0.5),
        merge.clone(),
      ]),
      merge,
      right: new CatmullRomCurve3([
        new Vector3(11.5, merge.y + 0.12, merge.z + 2.4),
        new Vector3(7.8, merge.y + 0.08, merge.z + 1.6),
        new Vector3(3.7, merge.y + 0.04, merge.z + 0.4),
        merge.clone(),
      ]),
    };
  }, [curve]);

  const oceanPosition = useMemo(() => {
    const position = curve.getPointAt(0.83);
    position.y += 0.055;
    return position;
  }, [curve]);

  const sourceMaterial = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: NIGHT_SIGNAL,
        emissive: NIGHT_SIGNAL,
        emissiveIntensity: 0.24,
        metalness: 0.82,
        roughness: 0.22,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );
  const lineMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: NIGHT_SILVER,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  const hostMaterial = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: NIGHT_SIGNAL,
        emissive: NIGHT_SIGNAL,
        emissiveIntensity: 0.1,
        metalness: 0.86,
        roughness: 0.16,
        clearcoat: 1,
        clearcoatRoughness: 0.14,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );
  const pageMaterial = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: NIGHT_GLASS,
        emissive: NIGHT_GLASS,
        emissiveIntensity: 0.055,
        metalness: 0.24,
        roughness: 0.24,
        transmission: 0.08,
        thickness: 0.08,
        transparent: true,
        opacity: 0,
        side: DoubleSide,
        depthWrite: false,
      }),
    [],
  );
  const tributaryMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: NIGHT_SILVER,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  const rippleMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: NIGHT_SILVER,
        transparent: true,
        opacity: 0,
        side: DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  useEffect(
    () => () => {
      sourceMaterial.dispose();
      lineMaterial.dispose();
      hostMaterial.dispose();
      pageMaterial.dispose();
      tributaryMaterial.dispose();
      rippleMaterial.dispose();
    },
    [
      hostMaterial,
      lineMaterial,
      pageMaterial,
      rippleMaterial,
      sourceMaterial,
      tributaryMaterial,
    ],
  );

  useFrame(({ clock }, delta) => {
    const progress = progressRef.current.current;
    const originPresence = getJourneyChapterPresence(
      progress,
      JOURNEY_CHAPTERS[0],
    );
    const streamPresence = getJourneyChapterPresence(
      progress,
      JOURNEY_CHAPTERS[1],
    );
    const bookcastPresence = getJourneyChapterPresence(
      progress,
      JOURNEY_CHAPTERS[2],
    );
    const confluencePresence = getJourneyChapterPresence(
      progress,
      JOURNEY_CHAPTERS[3],
    );
    const oceanPresence =
      getJourneyChapterPresence(progress, JOURNEY_CHAPTERS[4]) *
      MathUtils.smoothstep(progress, 0.82, 0.94);

    const targetThemeMix = theme === "morning" ? 1 : 0;
    themeMix.current = reducedMotion
      ? targetThemeMix
      : MathUtils.damp(themeMix.current, targetThemeMix, 2.8, delta);

    mixedColor
      .copy(NIGHT_SILVER)
      .lerp(MORNING_SILVER, themeMix.current);
    lineMaterial.color.copy(mixedColor);
    tributaryMaterial.color.copy(mixedColor);
    rippleMaterial.color.copy(mixedColor);

    sourceMaterial.color
      .copy(NIGHT_SIGNAL)
      .lerp(MORNING_SIGNAL, themeMix.current);
    sourceMaterial.emissive.copy(sourceMaterial.color);
    hostMaterial.color
      .copy(NIGHT_SIGNAL)
      .lerp(MORNING_SIGNAL, themeMix.current);
    hostMaterial.emissive.copy(hostMaterial.color);
    pageMaterial.color
      .copy(NIGHT_GLASS)
      .lerp(MORNING_GLASS, themeMix.current);
    pageMaterial.emissive.copy(pageMaterial.color);

    sourceMaterial.opacity = originPresence * 0.92;
    lineMaterial.opacity = Math.max(
      streamPresence * 0.5,
      bookcastPresence * 0.48,
    );
    hostMaterial.opacity = Math.max(
      bookcastPresence * 0.94,
      confluencePresence * 0.78,
    );
    pageMaterial.opacity = bookcastPresence * 0.14;
    tributaryMaterial.opacity = confluencePresence * 0.3;
    rippleMaterial.opacity = Math.max(
      bookcastPresence * 0.19,
      oceanPresence * 0.2,
    );

    setGroupPresence(sourceRef.current, originPresence);
    setGroupPresence(streamRef.current, streamPresence);
    setGroupPresence(bookcastRef.current, bookcastPresence, 1.46);
    setGroupPresence(confluenceRef.current, confluencePresence);
    setGroupPresence(oceanRef.current, oceanPresence);

    const elapsed = reducedMotion ? 0 : clock.getElapsedTime();

    if (sourceRingRef.current) {
      const sourcePulse = 1 + Math.sin(elapsed * 1.15) * 0.08;
      sourceRingRef.current.scale.setScalar(sourcePulse);
      sourceRingRef.current.rotation.z = elapsed * 0.08;
    }

    if (streamRef.current) {
      streamRef.current.position.y = reducedMotion
        ? 0
        : Math.sin(elapsed * 0.42) * 0.012 * streamPresence;
    }

    if (pageRef.current) {
      pageRef.current.rotation.y = reducedMotion
        ? 0
        : Math.sin(elapsed * 0.34) * 0.075;
    }

    if (leftHostRef.current && rightHostRef.current) {
      const hostBob = Math.sin(elapsed * 0.78) * 0.025;
      leftHostRef.current.position.y = 0.24 + hostBob;
      rightHostRef.current.position.y = 0.24 - hostBob;
    }

    if (confluenceRef.current) {
      confluenceRef.current.position.y = reducedMotion
        ? 0
        : Math.sin(elapsed * 0.25) * 0.008 * confluencePresence;
    }
  });

  return (
    <>
      <group ref={sourceRef} position={sourcePosition}>
        <mesh
          ref={sourceRingRef}
          material={sourceMaterial}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.16, 0.2, 48]} />
        </mesh>
        <mesh material={sourceMaterial} position={[0, 0.055, 0]}>
          <sphereGeometry args={[0.052, 24, 16]} />
        </mesh>
      </group>

      <group ref={streamRef}>
        {streamMarkers.map((position, index) => (
          <mesh
            key={position.toArray().join(":")}
            material={lineMaterial}
            position={position}
            scale={[1, 0.72 + index * 0.23, 1]}
          >
            <cylinderGeometry args={[0.012, 0.012, 0.86, 8]} />
          </mesh>
        ))}
      </group>

      <group ref={bookcastRef} position={bookcastPosition}>
        {[1.08, 1.52, 1.96].map((radius) => (
          <mesh
            key={radius}
            material={rippleMaterial}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.018, 0]}
          >
            <ringGeometry args={[radius, radius + 0.018, 72]} />
          </mesh>
        ))}

        <mesh
          ref={leftHostRef}
          material={hostMaterial}
          position={[-1.08, 0.24, 0]}
        >
          <sphereGeometry args={[0.22, 32, 20]} />
        </mesh>
        <mesh
          ref={rightHostRef}
          material={hostMaterial}
          position={[1.08, 0.24, 0]}
        >
          <sphereGeometry args={[0.22, 32, 20]} />
        </mesh>

        <group ref={pageRef} position={[0, 0.72, -0.18]}>
          {[-0.34, 0, 0.34].map((offset, index) => (
            <group
              key={offset}
              position={[offset, index * 0.09, -index * 0.06]}
              rotation={[0.02, offset * -0.42, offset * 0.08]}
            >
              <mesh material={pageMaterial}>
                <planeGeometry args={[0.72, 1.12]} />
              </mesh>
              <mesh material={lineMaterial} position={[0, 0.56, 0.008]}>
                <boxGeometry args={[0.74, 0.012, 0.012]} />
              </mesh>
              <mesh material={lineMaterial} position={[0, -0.56, 0.008]}>
                <boxGeometry args={[0.74, 0.012, 0.012]} />
              </mesh>
              <mesh material={lineMaterial} position={[-0.36, 0, 0.008]}>
                <boxGeometry args={[0.012, 1.12, 0.012]} />
              </mesh>
              <mesh material={lineMaterial} position={[0.36, 0, 0.008]}>
                <boxGeometry args={[0.012, 1.12, 0.012]} />
              </mesh>
            </group>
          ))}
        </group>

        <group position={[0, 0.22, 0.08]}>
          {WAVEFORM.map((height, index) => (
            <mesh
              key={`${index}-${height}`}
              material={lineMaterial}
              position={[(index - (WAVEFORM.length - 1) / 2) * 0.09, 0, 0]}
              scale={[1, height, 1]}
            >
              <boxGeometry args={[0.018, 0.7, 0.018]} />
            </mesh>
          ))}
        </group>
      </group>

      <group ref={confluenceRef}>
        <mesh material={tributaryMaterial}>
          <tubeGeometry args={[confluenceCurves.left, 56, 0.034, 6, false]} />
        </mesh>
        <mesh material={tributaryMaterial}>
          <tubeGeometry args={[confluenceCurves.right, 56, 0.034, 6, false]} />
        </mesh>

        {[
          confluenceCurves.left.getPointAt(0),
          confluenceCurves.right.getPointAt(0),
          confluenceCurves.merge,
        ].map((position) => (
          <mesh
            key={position.toArray().join(":")}
            material={hostMaterial}
            position={position}
          >
            <sphereGeometry args={[0.105, 20, 12]} />
          </mesh>
        ))}
      </group>

      <group ref={oceanRef} position={oceanPosition}>
        {[3.5, 5.5, 7.5].map((radius) => (
          <mesh
            key={radius}
            material={rippleMaterial}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[radius, radius + 0.025, 112]} />
          </mesh>
        ))}
      </group>
    </>
  );
}
