import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MathUtils,
  MeshPhysicalMaterial,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
  type Group,
  type WebGLProgramParametersWithUniforms,
} from "three";
import { createWaterNormalTexture } from "../../water/waterNormals";
import { JOURNEY_CHAPTERS, getJourneyChapterPresence } from "../chapters";
import {
  dampThemeMix,
  updateLiquidMaterial,
  type LiquidWorldProps,
} from "./shared";

const NIGHT_OCEAN = new Color("#0c1719");
const MORNING_OCEAN = new Color("#c5cfcc");
const NIGHT_ATTENUATION = new Color("#071011");
const MORNING_ATTENUATION = new Color("#aebdba");

const oceanGlintVertexShader = /* glsl */ `
  uniform float uMotionScale;
  uniform float uTime;

  varying vec2 vGlintUv;

  #include <fog_pars_vertex>

  void main() {
    vGlintUv = uv;
    vec3 transformed = position;
    transformed.z +=
      (
        sin(position.x * 0.16 + uTime * 0.18) * 0.055 +
        sin(position.y * 0.11 - uTime * 0.12) * 0.035
      ) *
      uMotionScale;

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`;

const oceanGlintFragmentShader = /* glsl */ `
  uniform float uPresence;
  uniform float uTheme;
  uniform float uTime;

  varying vec2 vGlintUv;

  #include <common>
  #include <fog_pars_fragment>

  void main() {
    float pathCenter =
      0.5 +
      sin(vGlintUv.y * 8.0 + uTime * 0.08) * 0.022 +
      sin(vGlintUv.y * 19.0 - uTime * 0.05) * 0.009;
    float pathDistance = abs(vGlintUv.x - pathCenter);
    float path = exp(-pathDistance * mix(34.0, 45.0, vGlintUv.y));
    float breaks =
      sin(vGlintUv.y * 126.0 - uTime * 0.42) * 0.5 +
      sin(vGlintUv.y * 53.0 + uTime * 0.17) * 0.3 +
      0.2;
    float brokenReflection = smoothstep(0.36, 0.82, breaks);
    float horizonFade =
      smoothstep(0.02, 0.17, vGlintUv.y) *
      (1.0 - smoothstep(0.86, 1.0, vGlintUv.y));
    vec3 color = mix(
      vec3(0.82, 0.86, 0.84),
      vec3(1.0, 0.83, 0.59),
      uTheme
    );
    float alpha =
      uPresence *
      horizonFade *
      path *
      (0.055 + brokenReflection * mix(0.32, 0.2, uTheme));

    if (alpha < 0.003) {
      discard;
    }

    gl_FragColor = vec4(color, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function createOceanGlintMaterial() {
  return new ShaderMaterial({
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      uMotionScale: { value: 1 },
      uPresence: { value: 0 },
      uTheme: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: oceanGlintVertexShader,
    fragmentShader: oceanGlintFragmentShader,
    blending: AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    fog: true,
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
  const shaderRef =
    useRef<WebGLProgramParametersWithUniforms | null>(null);
  const geometry = useMemo(() => new PlaneGeometry(170, 224, 92, 112), []);
  const normalTexture = useMemo(() => {
    const texture = createWaterNormalTexture(128);
    texture.name = "ocean-flow-normals";
    texture.repeat.set(13, 18);
    return texture;
  }, []);
  const oceanMaterial = useMemo(() => {
    const material = new MeshPhysicalMaterial({
      color: NIGHT_OCEAN,
      attenuationColor: NIGHT_ATTENUATION,
      attenuationDistance: 1.4,
      clearcoat: 0.68,
      clearcoatRoughness: 0.2,
      envMapIntensity: 1.28,
      ior: 1.333,
      metalness: 0,
      normalMap: normalTexture,
      normalScale: new Vector2(0.28, 0.36),
      opacity: 0,
      roughness: 0.2,
      side: DoubleSide,
      specularColor: new Color("#d7dcda"),
      specularIntensity: 0.62,
      thickness: 0.32,
      transmission: 0.04,
      transparent: true,
      depthWrite: false,
    });

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uOceanTime = { value: 0 };
      shader.uniforms.uOceanMotionScale = {
        value: reducedMotion ? 0.15 : 1,
      };
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform float uOceanTime;
          uniform float uOceanMotionScale;`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          transformed.z +=
            (
              sin(position.x * 0.12 + uOceanTime * 0.22) * 0.09 +
              sin(position.y * 0.095 - uOceanTime * 0.16) * 0.065 +
              sin(
                (position.x + position.y) * 0.055 +
                uOceanTime * 0.11
              ) * 0.045
            ) *
            uOceanMotionScale;`,
        );
      shaderRef.current = shader;
    };
    material.customProgramCacheKey = () => "liquid-ocean-world-v2-1";

    return material;
  }, [normalTexture, reducedMotion]);
  const glintMaterial = useMemo(createOceanGlintMaterial, []);

  useEffect(
    () => () => {
      geometry.dispose();
      normalTexture.dispose();
      oceanMaterial.dispose();
      glintMaterial.dispose();
    },
    [geometry, glintMaterial, normalTexture, oceanMaterial],
  );

  useFrame(({ clock }, delta) => {
    const progress = progressRef.current.current;
    const presence =
      getJourneyChapterPresence(progress, JOURNEY_CHAPTERS[4]) *
      MathUtils.smoothstep(progress, 0.8, 0.9);
    const mix = dampThemeMix(themeMix, theme, reducedMotion, delta);
    const time = reducedMotion ? 0 : clock.elapsedTime;

    if (groupRef.current) {
      groupRef.current.visible = presence > 0.004;
    }

    oceanMaterial.color.copy(NIGHT_OCEAN).lerp(MORNING_OCEAN, mix);
    oceanMaterial.attenuationColor
      .copy(NIGHT_ATTENUATION)
      .lerp(MORNING_ATTENUATION, mix);
    oceanMaterial.opacity = presence * MathUtils.lerp(0.9, 0.86, mix);
    oceanMaterial.roughness = MathUtils.lerp(0.2, 0.24, mix);
    oceanMaterial.transmission = MathUtils.lerp(0.04, 0.12, mix);
    oceanMaterial.envMapIntensity = MathUtils.lerp(1.28, 1.16, mix);
    normalTexture.offset.set(time * 0.0025, -time * 0.0045);

    if (shaderRef.current) {
      shaderRef.current.uniforms.uOceanTime.value = time;
      shaderRef.current.uniforms.uOceanMotionScale.value = reducedMotion
        ? 0.15
        : 1;
    }

    updateLiquidMaterial(glintMaterial, {
      presence,
      themeMix: mix,
      time,
      motionScale: reducedMotion ? 0.15 : 1,
    });
  });

  return (
    <group ref={groupRef}>
      <mesh
        geometry={geometry}
        material={oceanMaterial}
        position={[0, -0.73, -24.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        frustumCulled={false}
        renderOrder={2}
      />
      <mesh
        geometry={geometry}
        material={glintMaterial}
        position={[0, -0.69, -24.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        frustumCulled={false}
        renderOrder={8}
      />
    </group>
  );
}
