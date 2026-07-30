import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MathUtils,
  NormalBlending,
  Plane,
  PlaneGeometry,
  Raycaster,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
  Vector4,
  type Group,
} from "three";
import { JOURNEY_CHAPTERS, getJourneyChapterPresence } from "../chapters";
import { dampThemeMix, type LiquidWorldProps } from "./shared";

/**
 * Authored ocean finale.
 *
 * The previous implementation reused a blurred MeshPhysicalMaterial and read
 * as a foggy blob with a hard plane edge — the weakest memory of the whole
 * journey, exactly where the metaphor should peak. This replacement is a
 * purpose-built GLSL sea:
 *
 * - distance-graded body colour that melts into the scene background before
 *   the camera far-plane, so the horizon always reads and no clip edge shows
 * - a moon/sun glitter path computed in world space (view azimuth vs a fixed
 *   horizon direction), broken by streak noise and sharpened sparkle octaves
 * - a sinus-smoothed, dithered horizon glow (Prior's gradient trick) that
 *   anchors the final composition and gives the eye a destination
 * - gentle long swells that flatten with distance so the far sea stays calm
 * - a tide-advance reveal: the sea emerges at the horizon first and spreads
 *   toward the camera, so the river visibly becomes the ocean instead of
 *   cross-fading into it
 * - a downstream-facing horizon on the negative-Z journey axis, matching the
 *   camera's source-to-ocean travel direction
 * - cursor ripples on the sea, raycast from the pointer each frame
 */

const NIGHT_NEAR = new Color("#0d1b1e");
const MORNING_NEAR = new Color("#7d918d");
const NIGHT_FAR = new Color("#101a1b");
const MORNING_FAR = new Color("#e4ddcd");
const NIGHT_BACKGROUND = new Color("#05090b");
const MORNING_BACKGROUND = new Color("#eae4d7");
const SEA_LEVEL = -0.64;
const OCEAN_CENTER_Z = -105;
const HORIZON_Z = -216;
const SEA_PLANE = new Plane(new Vector3(0, 1, 0), -SEA_LEVEL);
const SEA_RAYCASTER = new Raycaster();
const NIGHT_PATH = new Color("#c7d4d1");
const MORNING_PATH = new Color("#f0c384");
const NIGHT_HORIZON_LIFT = new Color("#11191a");
const MORNING_HORIZON_LIFT = new Color("#efe4cf");
const NIGHT_GLOW = new Color("#b9c7c4");
const MORNING_GLOW = new Color("#eecfa0");

const oceanSurfaceVertexShader = /* glsl */ `
  uniform float uMotionScale;
  uniform vec4 uPointerSea;
  uniform float uTime;

  varying vec2 vOceanUv;
  varying vec3 vOceanWorldPosition;

  void main() {
    vOceanUv = uv;

    vec4 flatWorldPosition = modelMatrix * vec4(position, 1.0);
    float cameraDistance = distance(
      flatWorldPosition.xz,
      cameraPosition.xz
    );
    float distanceCalm = exp(-cameraDistance * 0.014);

    vec3 transformed = position;
    float swell =
      sin(position.x * 0.105 + uTime * 0.16) * 0.055 +
      sin(position.y * 0.082 - uTime * 0.11) * 0.04 +
      sin((position.x + position.y) * 0.05 + uTime * 0.085) * 0.028;

    // Cursor ripple rings spreading across the sea surface.
    float pointerRingDistance = distance(
      flatWorldPosition.xz,
      uPointerSea.xy
    );
    float pointerRing =
      sin(pointerRingDistance * 2.2 - uTime * 3.4) *
      exp(-pointerRingDistance * 0.11) *
      0.09 *
      uPointerSea.z;

    transformed.z +=
      (swell * distanceCalm + pointerRing) * uMotionScale;

    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vOceanWorldPosition = worldPosition.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const oceanSurfaceFragmentShader = /* glsl */ `
  uniform float uAdvance;
  uniform vec3 uBackgroundColor;
  uniform vec3 uFarColor;
  uniform vec3 uHorizonLiftColor;
  uniform float uMotionScale;
  uniform vec3 uNearColor;
  uniform vec3 uPathColor;
  uniform vec4 uPointerSea;
  uniform float uPresence;
  uniform float uTheme;
  uniform float uTime;

  varying vec2 vOceanUv;
  varying vec3 vOceanWorldPosition;

  float oceanHash(vec2 value) {
    value = fract(value * vec2(123.34, 456.21));
    value += dot(value, value + 45.32);
    return fract(value.x * value.y);
  }

  float oceanNoise(vec2 value) {
    vec2 index = floor(value);
    vec2 fraction = fract(value);
    fraction = fraction * fraction * (3.0 - 2.0 * fraction);
    float a = oceanHash(index);
    float b = oceanHash(index + vec2(1.0, 0.0));
    float c = oceanHash(index + vec2(0.0, 1.0));
    float d = oceanHash(index + vec2(1.0, 1.0));
    return mix(mix(a, b, fraction.x), mix(c, d, fraction.x), fraction.y);
  }

  void main() {
    vec2 toFragment = vOceanWorldPosition.xz - cameraPosition.xz;
    float distanceToFragment = max(length(toFragment), 0.001);
    vec2 viewDirectionXZ = toFragment / distanceToFragment;

    // Body colour: near body -> far body, so the sea has depth before fog.
    float depthBlend = smoothstep(5.0, 105.0, distanceToFragment);
    vec3 seaColor = mix(uNearColor, uFarColor, depthBlend);

    // Broad tonal mottling so the surface never reads as flat fill.
    float mottle = oceanNoise(
      vOceanWorldPosition.xz * 0.075 +
      vec2(uTime * 0.014, -uTime * 0.019)
    );
    float fineMottle = oceanNoise(
      vec2(
        vOceanWorldPosition.x * 0.52,
        vOceanWorldPosition.z * 0.21 - uTime * 0.03
      )
    );
    seaColor *=
      1.0 +
      (mottle - 0.5) * mix(0.14, 0.1, uTheme) +
      (fineMottle - 0.5) * mix(0.05, 0.075, uTheme);

    // Glitter path toward the horizon: a tight world-space azimuth band on
    // the journey axis, widened by long streaks and sharpened sparkle.
    float alignment = max(dot(viewDirectionXZ, vec2(0.0, -1.0)), 0.0);
    float pathBand = pow(alignment, mix(110.0, 150.0, uTheme));
    float grazing = pow(
      1.0 -
        clamp(
          (cameraPosition.y - vOceanWorldPosition.y) / distanceToFragment,
          0.0,
          1.0
        ),
      2.0
    );
    float longStreak = pow(
      oceanNoise(
        vec2(
          vOceanWorldPosition.x * 1.35,
          vOceanWorldPosition.z * 0.14 - uTime * 0.045
        )
      ),
      3.0
    );
    // Anisotropic sparkle: stretched along the view axis so highlights read
    // as moonlight streaks on swell, not isotropic grain.
    float sparkleA = oceanNoise(
      vec2(vOceanWorldPosition.x * 3.1, vOceanWorldPosition.z * 0.52) +
      vec2(uTime * 0.05, -uTime * 0.085) * max(uMotionScale, 0.15)
    );
    float sparkleB = oceanNoise(
      vec2(vOceanWorldPosition.x * 7.4, vOceanWorldPosition.z * 1.15) +
      vec2(-uTime * 0.061, -uTime * 0.14) * max(uMotionScale, 0.15)
    );
    float sparkle = pow(sparkleA * 0.6 + sparkleB * 0.4, 5.5) * 1.75;
    float sparkleFade = exp(-distanceToFragment * 0.017);
    float nearCalm = smoothstep(2.5, 11.0, distanceToFragment);

    float broadPath =
      pathBand *
      (0.16 + longStreak * 0.5) *
      (0.3 + grazing * 0.9);
    float glitterPath =
      pathBand *
      sparkle *
      sparkleFade *
      nearCalm *
      (0.35 + grazing * 0.85);
    seaColor +=
      uPathColor *
      (broadPath * mix(0.52, 0.42, uTheme) +
        glitterPath * mix(0.9, 0.72, uTheme));

    // Faint luminous lift where sea meets sky, so the horizon line exists
    // even before the glow sprite is noticed.
    float horizonBand =
      smoothstep(64.0, 112.0, distanceToFragment) *
      (1.0 - smoothstep(118.0, 136.0, distanceToFragment));
    seaColor = mix(
      seaColor,
      uHorizonLiftColor,
      horizonBand * mix(0.5, 0.42, uTheme)
    );

    // Manual fog: melt into the exact background colour and force the melt
    // to complete before the camera far-plane, hiding the clip boundary.
    float fogDensity = mix(0.0115, 0.0072, uTheme);
    float fogFactor = 1.0 - exp(-pow(distanceToFragment * fogDensity, 2.0));
    fogFactor = max(fogFactor, smoothstep(108.0, 130.0, distanceToFragment));
    vec3 color = mix(seaColor, uBackgroundColor, fogFactor);

    // Tide advance: the sea emerges at the horizon first and spreads toward
    // the camera, so the river visibly becomes the ocean rather than being
    // replaced by it.
    float tideRadius = mix(150.0, -20.0, uAdvance);
    float tideMask =
      smoothstep(tideRadius - 30.0, tideRadius + 5.0, distanceToFragment);

    // Cursor ring highlight, kept subtle so the sea stays calm.
    float pointerRingDistance = distance(
      vOceanWorldPosition.xz,
      uPointerSea.xy
    );
    float pointerGlint =
      (0.5 + 0.5 * sin(pointerRingDistance * 2.2 - uTime * 3.4)) *
      exp(-pointerRingDistance * 0.16) *
      0.075 *
      uPointerSea.z;
    color += uPathColor * pointerGlint * tideMask;

    // Fade every plane border so no geometry edge can ever appear.
    float edgeFade =
      smoothstep(0.0, 0.05, vOceanUv.x) *
      (1.0 - smoothstep(0.95, 1.0, vOceanUv.x)) *
      smoothstep(0.0, 0.04, vOceanUv.y) *
      (1.0 - smoothstep(0.96, 1.0, vOceanUv.y));

    float alpha =
      uPresence * tideMask * edgeFade * mix(0.97, 0.99, uTheme);

    if (alpha < 0.004) {
      discard;
    }

    gl_FragColor = vec4(color, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const horizonGlowVertexShader = /* glsl */ `
  varying vec2 vGlowUv;

  void main() {
    vGlowUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const horizonGlowFragmentShader = /* glsl */ `
  uniform vec3 uGlowColor;
  uniform float uGlowStrength;
  uniform float uPresence;

  varying vec2 vGlowUv;

  float glowHash(vec2 value) {
    value = fract(value * vec2(123.34, 456.21));
    value += dot(value, value + 45.32);
    return fract(value.x * value.y);
  }

  void main() {
    vec2 point = (vGlowUv - 0.5) * vec2(1.0, 1.62);
    float radial = max(0.0, 1.0 - length(point) * 2.0);

    // Sinus-smoothed falloff with dither: no linear-gradient banding.
    float falloff = sin(pow(radial, 1.9) * 1.5707963);
    falloff += (glowHash(vGlowUv * 480.0) - 0.5) * 0.014;

    // Slightly stronger toward the waterline so the glow feels seated on
    // the sea rather than floating in the sky.
    float waterlineSeat = mix(0.82, 1.0, smoothstep(0.12, 0.6, vGlowUv.y));

    float alpha =
      clamp(falloff, 0.0, 1.0) *
      waterlineSeat *
      uPresence *
      uGlowStrength;

    if (alpha < 0.003) {
      discard;
    }

    gl_FragColor = vec4(uGlowColor, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function createOceanSurfaceMaterial() {
  return new ShaderMaterial({
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      uAdvance: { value: 0 },
      uBackgroundColor: { value: NIGHT_BACKGROUND.clone() },
      uFarColor: { value: NIGHT_FAR.clone() },
      uHorizonLiftColor: { value: NIGHT_HORIZON_LIFT.clone() },
      uMotionScale: { value: 1 },
      uNearColor: { value: NIGHT_NEAR.clone() },
      uPathColor: { value: NIGHT_PATH.clone() },
      uPointerSea: { value: new Vector4(0, 0, 0, 0) },
      uPresence: { value: 0 },
      uTheme: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: oceanSurfaceVertexShader,
    fragmentShader: oceanSurfaceFragmentShader,
    blending: NormalBlending,
    depthTest: false,
    depthWrite: false,
    fog: false,
    side: DoubleSide,
    toneMapped: true,
    transparent: true,
  });
}

function createHorizonGlowMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uGlowColor: { value: NIGHT_GLOW.clone() },
      uGlowStrength: { value: 0.5 },
      uPresence: { value: 0 },
    },
    vertexShader: horizonGlowVertexShader,
    fragmentShader: horizonGlowFragmentShader,
    blending: AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    fog: false,
    side: DoubleSide,
    toneMapped: true,
    transparent: true,
  });
}

export default function OceanWorld({
  progressRef,
  reducedMotion,
  theme,
}: LiquidWorldProps) {
  const groupRef = useRef<Group>(null);
  const themeMix = useRef(theme === "morning" ? 1 : 0);
  const pointerSea = useRef({ x: 0, z: -20, strength: 0 });
  const lastPointerNdc = useMemo(() => new Vector2(), []);
  const pointerHit = useMemo(() => new Vector3(), []);
  const surfaceGeometry = useMemo(
    () => new PlaneGeometry(240, 320, 96, 128),
    [],
  );
  const glowGeometry = useMemo(() => new PlaneGeometry(52, 17), []);
  const surfaceMaterial = useMemo(createOceanSurfaceMaterial, []);
  const glowMaterial = useMemo(createHorizonGlowMaterial, []);
  const glowPosition = useMemo(
    () => new Vector3(0.3, 2.04, HORIZON_Z),
    [],
  );

  useEffect(
    () => () => {
      surfaceGeometry.dispose();
      glowGeometry.dispose();
      surfaceMaterial.dispose();
      glowMaterial.dispose();
    },
    [glowGeometry, glowMaterial, surfaceGeometry, surfaceMaterial],
  );

  useFrame(({ camera, clock, pointer }, delta) => {
    const progress = progressRef.current.current;
    const chapterPresence = getJourneyChapterPresence(
      progress,
      JOURNEY_CHAPTERS[4],
    );
    const presence = Math.max(
      chapterPresence,
      MathUtils.smoothstep(progress, 0.72, 0.88),
    );
    const advance = MathUtils.smoothstep(progress, 0.7, 0.88);
    const glowPresence = MathUtils.smoothstep(progress, 0.76, 0.9);
    const mix = dampThemeMix(themeMix, theme, reducedMotion, delta);
    const time = reducedMotion ? 0 : clock.elapsedTime;

    if (groupRef.current) {
      groupRef.current.visible = presence > 0.004 || glowPresence > 0.004;
    }

    // Raycast the pointer onto the sea plane for cursor ripples.
    const sea = pointerSea.current;
    if (!reducedMotion) {
      SEA_RAYCASTER.setFromCamera(pointer, camera);
      const hit = SEA_RAYCASTER.ray.intersectPlane(SEA_PLANE, pointerHit);

      if (hit) {
        const pointerSpeed =
          Math.hypot(
            pointer.x - lastPointerNdc.x,
            pointer.y - lastPointerNdc.y,
          ) / Math.max(delta, 0.001);
        const strengthTarget =
          MathUtils.clamp(pointerSpeed * 0.45, 0, 1) + 0.12;

        sea.x = MathUtils.damp(sea.x, hit.x, 5, delta);
        sea.z = MathUtils.damp(sea.z, hit.z, 5, delta);
        sea.strength = MathUtils.damp(
          sea.strength,
          strengthTarget,
          strengthTarget > sea.strength ? 6 : 1.3,
          delta,
        );
      }
    } else {
      sea.strength = 0;
    }
    lastPointerNdc.copy(pointer);

    const surfaceUniforms = surfaceMaterial.uniforms;
    surfaceUniforms.uTime.value = time;
    surfaceUniforms.uTheme.value = mix;
    surfaceUniforms.uPresence.value = MathUtils.lerp(
      presence,
      Math.sqrt(presence),
      mix,
    );
    surfaceUniforms.uAdvance.value = advance;
    surfaceUniforms.uMotionScale.value = reducedMotion ? 0.15 : 1;
    (surfaceUniforms.uPointerSea.value as Vector4).set(
      sea.x,
      sea.z,
      sea.strength,
      0,
    );
    (surfaceUniforms.uNearColor.value as Color)
      .copy(NIGHT_NEAR)
      .lerp(MORNING_NEAR, mix);
    (surfaceUniforms.uFarColor.value as Color)
      .copy(NIGHT_FAR)
      .lerp(MORNING_FAR, mix);
    (surfaceUniforms.uBackgroundColor.value as Color)
      .copy(NIGHT_BACKGROUND)
      .lerp(MORNING_BACKGROUND, mix);
    (surfaceUniforms.uPathColor.value as Color)
      .copy(NIGHT_PATH)
      .lerp(MORNING_PATH, mix);
    (surfaceUniforms.uHorizonLiftColor.value as Color)
      .copy(NIGHT_HORIZON_LIFT)
      .lerp(MORNING_HORIZON_LIFT, mix);

    glowMaterial.uniforms.uPresence.value = glowPresence;
    glowMaterial.uniforms.uGlowStrength.value = MathUtils.lerp(
      0.5,
      0.3,
      mix,
    );
    (glowMaterial.uniforms.uGlowColor.value as Color)
      .copy(NIGHT_GLOW)
      .lerp(MORNING_GLOW, mix);
  });

  return (
    <group ref={groupRef}>
      <mesh
        geometry={surfaceGeometry}
        material={surfaceMaterial}
        position={[0, SEA_LEVEL, OCEAN_CENTER_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        frustumCulled={false}
        renderOrder={7}
      />
      <mesh
        geometry={glowGeometry}
        material={glowMaterial}
        position={glowPosition}
        rotation={[0, 0, 0]}
        frustumCulled={false}
        renderOrder={8}
      />
    </group>
  );
}
