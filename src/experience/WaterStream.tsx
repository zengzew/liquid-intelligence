import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildLiquidGeometry, getRiverFrame, riverWidthAt } from "./river";
import type { NumericRef, ThemeMode } from "../types";

type WaterStreamProps = {
  curve: THREE.CatmullRomCurve3;
  scrollProgress: NumericRef;
  theme: ThemeMode;
  reducedMotion: boolean;
};

type LiquidUniforms = {
  time: THREE.IUniform<number>;
  reveal: THREE.IUniform<number>;
  growth: THREE.IUniform<number>;
  theme: THREE.IUniform<number>;
  motion: THREE.IUniform<number>;
};

function createLiquidMaterial(uniforms: LiquidUniforms) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uLiquidTime: uniforms.time,
      uLiquidReveal: uniforms.reveal,
      uLiquidGrowth: uniforms.growth,
      uLiquidTheme: uniforms.theme,
      uLiquidMotion: uniforms.motion,
    },
    vertexShader: `
      uniform float uLiquidTime;
      uniform float uLiquidReveal;
      uniform float uLiquidGrowth;
      uniform float uLiquidMotion;
      attribute vec3 aCenter;
      attribute float aAlong;
      attribute float aAround;
      varying float vLiquidAlong;
      varying float vLiquidAround;
      varying float vLiquidReveal;
      varying vec3 vLiquidNormal;
      varying vec3 vLiquidView;
      varying vec3 vLiquidViewPosition;

      void main() {
        float reveal = 1.0 - smoothstep(
          uLiquidReveal - 0.055,
          uLiquidReveal + 0.026,
          aAlong
        );
        float growth = mix(0.34, 1.0, smoothstep(0.0, 1.0, uLiquidGrowth));
        float body = mix(0.014, 1.0, reveal);
        vec3 radial = position - aCenter;
        radial *= growth * body;

        float broadWave =
          sin(aAlong * 47.0 - uLiquidTime * 0.72 + aAround * 5.4) *
          0.58 +
          sin(
            aAlong * 23.0 +
            sin(aAround * 6.28318530718) * 4.6 +
            uLiquidTime * 0.19
          ) * 0.28;
        float fineWave =
          sin(aAlong * 112.0 + uLiquidTime * 0.43 - aAround * 9.0) *
          0.62 +
          sin(
            aAlong * 179.0 -
            aAround * 17.0 -
            uLiquidTime * 0.31
          ) * 0.18;
        float upperSurface = smoothstep(
          -0.58,
          0.82,
          sin(aAround * 6.28318530718)
        );
        float amplitude =
          mix(0.003, 0.084, pow(aAlong, 1.1)) *
          mix(0.42, 1.0, upperSurface) *
          reveal;

        vec3 displaced = aCenter + radial;
        displaced += normal *
          (broadWave + fineWave * 0.48) *
          amplitude *
          (0.68 + uLiquidMotion * 0.32);

        vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
        vLiquidAlong = aAlong;
        vLiquidAround = aAround;
        vLiquidReveal = reveal;
        vLiquidNormal = normalize(normalMatrix * normal);
        vLiquidView = normalize(-viewPosition.xyz);
        vLiquidViewPosition = viewPosition.xyz;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform float uLiquidTime;
      uniform float uLiquidTheme;
      varying float vLiquidAlong;
      varying float vLiquidAround;
      varying float vLiquidReveal;
      varying vec3 vLiquidNormal;
      varying vec3 vLiquidView;
      varying vec3 vLiquidViewPosition;

      float liquidHash(vec2 point) {
        point = fract(point * vec2(123.34, 456.21));
        point += dot(point, point + 45.32);
        return fract(point.x * point.y);
      }

      float liquidNoise(vec2 point) {
        vec2 cell = floor(point);
        vec2 local = fract(point);
        local = local * local * (3.0 - 2.0 * local);

        return mix(
          mix(
            liquidHash(cell),
            liquidHash(cell + vec2(1.0, 0.0)),
            local.x
          ),
          mix(
            liquidHash(cell + vec2(0.0, 1.0)),
            liquidHash(cell + vec2(1.0, 1.0)),
            local.x
          ),
          local.y
        );
      }

      float liquidFbm(vec2 point) {
        float value = 0.0;
        float weight = 0.54;

        for (int octave = 0; octave < 4; octave++) {
          value += liquidNoise(point) * weight;
          point = point * 2.03 + vec2(17.1, 9.2);
          weight *= 0.48;
        }

        return value;
      }

      void main() {
        vec3 derivativeNormal = normalize(
          cross(
            dFdx(vLiquidViewPosition),
            dFdy(vLiquidViewPosition)
          )
        );
        derivativeNormal *=
          dot(derivativeNormal, vLiquidNormal) < 0.0 ? -1.0 : 1.0;
        vec3 normalDirection = normalize(
          mix(vLiquidNormal, derivativeNormal, 0.82)
        );
        vec3 viewDirection = normalize(vLiquidView);
        float fresnel = pow(
          1.0 - max(dot(normalDirection, viewDirection), 0.0),
          5.2
        );
        float lateral = cos(vLiquidAround * 6.28318530718);
        float edge = pow(abs(lateral), 9.0);
        float macroWarp = liquidFbm(
          vec2(
            vLiquidAlong * 10.5 - uLiquidTime * 0.045,
            lateral * 2.7 + uLiquidTime * 0.018
          )
        );
        float detailWarp = liquidNoise(
          vec2(
            vLiquidAlong * 39.0 + lateral * 3.2,
            lateral * 7.0 - uLiquidTime * 0.13
          )
        );
        float longitudinalDrift =
          sin(vLiquidAlong * 31.0 - uLiquidTime * 0.46) * 0.72 +
          macroWarp * 6.2 +
          detailWarp * 1.15;
        float flowA = pow(
          0.5 + 0.5 * sin(
            lateral * 12.5 +
            longitudinalDrift -
            uLiquidTime * 0.22
          ),
          18.0
        );
        float flowB = pow(
          0.5 + 0.5 * sin(
            lateral * 20.0 +
            macroWarp * 8.7 +
            sin(vLiquidAlong * 53.0 + uLiquidTime * 0.27) * 0.86 +
            2.1
          ),
          26.0
        );
        float flowBreak = smoothstep(
          0.24,
          0.78,
          liquidNoise(
            vec2(
              vLiquidAlong * 28.0 - uLiquidTime * 0.08,
              lateral * 5.3 + macroWarp
            )
          )
        );
        float filament =
          (flowA * 0.68 + flowB * 0.38) *
          mix(0.32, 1.0, flowBreak);
        float rippleGlint = pow(
          liquidFbm(
            vec2(
              vLiquidAlong * 24.0 - uLiquidTime * 0.1,
              lateral * 8.5
            )
          ),
          9.0
        );
        float sparkle =
          pow(
            0.5 + 0.5 * sin(
              vLiquidAlong * 317.0 +
              lateral * 71.0 -
              uLiquidTime * 0.95
            ),
            42.0
          ) *
          pow(
            0.5 + 0.5 * sin(
              vLiquidAlong * 43.0 -
              lateral * 19.0 +
              0.7
            ),
            7.0
          );
        float grazing = pow(
          max(dot(normalDirection, normalize(vec3(-0.25, 0.78, 0.36))), 0.0),
          7.0
        );

        vec3 darkSheen = vec3(0.84, 0.91, 0.95);
        vec3 lightSheen = vec3(0.34, 0.40, 0.42);
        vec3 sheen = mix(darkSheen, lightSheen, uLiquidTheme);
        float alpha =
          (mix(0.012, 0.006, uLiquidTheme) +
            fresnel * mix(0.74, 0.18, uLiquidTheme) +
            edge * 0.14 +
            filament * mix(0.21, 0.13, uLiquidTheme) +
            grazing * 0.03 +
            rippleGlint * mix(0.24, 0.09, uLiquidTheme) +
            sparkle * mix(0.45, 0.22, uLiquidTheme)) *
          smoothstep(0.02, 0.35, vLiquidReveal);

        vec3 sparkleSheen = mix(
          vec3(1.0, 1.0, 1.0),
          vec3(1.0, 0.98, 0.93),
          uLiquidTheme
        );
        gl_FragColor = vec4(
          mix(
            sheen * (0.78 + filament * 0.38),
            sparkleSheen,
            clamp(sparkle * 1.2 + rippleGlint * 0.55, 0.0, 1.0)
          ),
          clamp(alpha, 0.0, 0.88)
        );
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
    blending: THREE.NormalBlending,
    toneMapped: true,
  });
}

function createLiquidBodyMaterial(uniforms: LiquidUniforms) {
  const material = new THREE.MeshPhysicalMaterial({
    color: "#53616a",
    transmission: 0.88,
    thickness: 0.34,
    ior: 1.333,
    roughness: 0.075,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.035,
    envMapIntensity: 3.2,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
    side: THREE.FrontSide,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uLiquidReveal = uniforms.reveal;
    shader.uniforms.uLiquidGrowth = uniforms.growth;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uLiquidReveal;
        uniform float uLiquidGrowth;
        attribute vec3 aCenter;
        attribute float aAlong;
        varying float vLiquidBodyReveal;`,
      )
      .replace(
        "#include <begin_vertex>",
        `float liquidReveal = 1.0 - smoothstep(
          uLiquidReveal - 0.055,
          uLiquidReveal + 0.026,
          aAlong
        );
        float liquidGrowth = mix(
          0.34,
          1.0,
          smoothstep(0.0, 1.0, uLiquidGrowth)
        );
        float liquidBody = mix(0.014, 1.0, liquidReveal);
        vec3 liquidRadial = position - aCenter;
        vec3 transformed =
          aCenter + liquidRadial * liquidGrowth * liquidBody;
        vLiquidBodyReveal = liquidReveal;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying float vLiquidBodyReveal;`,
      )
      .replace(
        "#include <alphatest_fragment>",
        `#include <alphatest_fragment>
        diffuseColor.a *= smoothstep(
          0.02,
          0.35,
          vLiquidBodyReveal
        );`,
      );
  };

  material.customProgramCacheKey = () => "liquid-body-v1";
  return material;
}

const DARK_BODY = new THREE.Color("#53616a");
const LIGHT_BODY = new THREE.Color("#d1dde1");
const DARK_DROPLET = new THREE.Color("#b9c8d1");
const LIGHT_DROPLET = new THREE.Color("#8e9a9e");

type DropletSpec = {
  position: THREE.Vector3;
  scale: number;
  phase: number;
  along: number;
};

function seededRandom(seed: number) {
  const value = Math.sin(seed * 91.3458) * 47453.5453;
  return value - Math.floor(value);
}

function buildDropletSpecs(curve: THREE.CatmullRomCurve3) {
  const specs: DropletSpec[] = [];
  const center = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  const surfaceUp = new THREE.Vector3();

  for (let index = 0; index < 16; index += 1) {
    const along = 0.18 + seededRandom(index + 1.3) * 0.76;
    const lateral = (seededRandom(index + 7.8) - 0.5) * 1.16;
    const lift = 0.035 + seededRandom(index + 12.4) * (0.04 + along * 0.12);
    getRiverFrame(curve, along, center, tangent, side, surfaceUp);

    const position = center
      .clone()
      .addScaledVector(side, lateral * riverWidthAt(along))
      .addScaledVector(surfaceUp, lift);

    specs.push({
      position,
      scale: 0.005 + seededRandom(index + 23.5) * (0.007 + along * 0.013),
      phase: seededRandom(index + 31.7) * Math.PI * 2,
      along,
    });
  }

  return specs;
}

function Droplets({
  curve,
  scrollProgress,
  theme,
  reducedMotion,
}: WaterStreamProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const material = useRef<THREE.MeshPhysicalMaterial>(null);
  const specs = useMemo(() => buildDropletSpecs(curve), [curve]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const themeMix = useRef(theme === "light" ? 1 : 0);

  useFrame(({ clock }, delta) => {
    if (!mesh.current) {
      return;
    }

    const reveal = 0.4 + scrollProgress.current * 0.57;
    const elapsed = reducedMotion ? 0 : clock.elapsedTime;

    specs.forEach((spec, index) => {
      const isVisible = spec.along < reveal + 0.025;
      const buoyancy = Math.sin(elapsed * 0.46 + spec.phase) * spec.scale * 0.55;
      dummy.position.copy(spec.position);
      dummy.position.y += buoyancy;
      dummy.rotation.set(
        elapsed * 0.08 + spec.phase,
        spec.phase * 0.7,
        elapsed * 0.05,
      );
      dummy.scale.setScalar(isVisible ? spec.scale : 0.0001);
      dummy.updateMatrix();
      mesh.current?.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;

    themeMix.current = THREE.MathUtils.damp(
      themeMix.current,
      theme === "light" ? 1 : 0,
      reducedMotion ? 12 : 2.6,
      delta,
    );

    if (material.current) {
      material.current.color.lerpColors(
        DARK_DROPLET,
        LIGHT_DROPLET,
        themeMix.current,
      );
      material.current.envMapIntensity = THREE.MathUtils.lerp(
        2.2,
        0.9,
        themeMix.current,
      );
      material.current.opacity = THREE.MathUtils.lerp(
        0.62,
        0.38,
        themeMix.current,
      );
    }
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, specs.length]}>
      <sphereGeometry args={[1, 14, 10]} />
      <meshPhysicalMaterial
        ref={material}
        color="#b9c8d1"
        transmission={0.86}
        thickness={0.38}
        ior={1.333}
        roughness={0.08}
        clearcoat={1}
        clearcoatRoughness={0.04}
        transparent
        opacity={0.62}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

export function WaterStream(props: WaterStreamProps) {
  const { curve, scrollProgress, theme, reducedMotion } = props;
  const geometry = useMemo(() => buildLiquidGeometry(curve), [curve]);
  const uniforms = useMemo<LiquidUniforms>(
    () => ({
      time: { value: 0 },
      reveal: { value: 0.4 + scrollProgress.current * 0.57 },
      growth: { value: scrollProgress.current },
      theme: { value: theme === "light" ? 1 : 0 },
      motion: { value: reducedMotion ? 0 : 1 },
    }),
    [scrollProgress],
  );
  const material = useMemo(() => createLiquidMaterial(uniforms), [uniforms]);
  const bodyMaterial = useMemo(
    () => createLiquidBodyMaterial(uniforms),
    [uniforms],
  );
  const themeMix = useRef(theme === "light" ? 1 : 0);
  const smoothedProgress = useRef(scrollProgress.current);

  useFrame(({ clock }, delta) => {
    smoothedProgress.current = THREE.MathUtils.damp(
      smoothedProgress.current,
      scrollProgress.current,
      reducedMotion ? 12 : 2.5,
      delta,
    );
    themeMix.current = THREE.MathUtils.damp(
      themeMix.current,
      theme === "light" ? 1 : 0,
      reducedMotion ? 12 : 2.5,
      delta,
    );

    uniforms.time.value = reducedMotion ? 0 : clock.elapsedTime;
    uniforms.reveal.value = 0.4 + smoothedProgress.current * 0.57;
    uniforms.growth.value = smoothedProgress.current;
    uniforms.theme.value = themeMix.current;
    uniforms.motion.value = reducedMotion ? 0 : 1;

    bodyMaterial.color.lerpColors(DARK_BODY, LIGHT_BODY, themeMix.current);
    bodyMaterial.envMapIntensity = THREE.MathUtils.lerp(
      3.2,
      1.6,
      themeMix.current,
    );
    bodyMaterial.opacity = THREE.MathUtils.lerp(
      0.36,
      0.16,
      themeMix.current,
    );
  });

  return (
    <group>
      <mesh
        geometry={geometry}
        material={bodyMaterial}
        frustumCulled={false}
        renderOrder={0}
      />
      <mesh
        geometry={geometry}
        material={material}
        frustumCulled={false}
        renderOrder={1}
      />
      <Droplets {...props} />
    </group>
  );
}
