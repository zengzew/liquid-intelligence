import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

interface LiquidMetrics {
  fps: number;
  frameTime: {
    count: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  };
  framesOver18ms: number;
  framesOver33ms: number;
  framesOver50ms: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
}

interface FrameMonitorProps {
  enabled: boolean;
}

const FRAME_SAMPLE_CAPACITY = 360;

function round(value: number) {
  return Number(value.toFixed(2));
}

export default function FrameMonitor({ enabled }: FrameMonitorProps) {
  const sample = useRef({
    elapsed: 0,
    frames: 0,
    publishElapsed: 0,
    frameTimes: new Float32Array(FRAME_SAMPLE_CAPACITY),
    sortedFrameTimes: new Float32Array(FRAME_SAMPLE_CAPACITY),
    sampleCount: 0,
    writeIndex: 0,
    lastResetToken: "",
    warmupElapsed: 0,
    warmupComplete: false,
    forcePublish: false,
    programDiagnosticsPublished: false,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    delete document.documentElement.dataset.renderMetrics;
    delete document.documentElement.dataset.fps;

    const resetProfileMetrics = () => {
      const currentSample = sample.current;
      currentSample.elapsed = 0;
      currentSample.frames = 0;
      currentSample.publishElapsed = 0;
      currentSample.sampleCount = 0;
      currentSample.writeIndex = 0;
      currentSample.forcePublish = false;
      delete document.documentElement.dataset.renderMetrics;
      delete document.documentElement.dataset.fps;
      Reflect.deleteProperty(window, "__LIQUID_METRICS__");
    };
    const snapshotProfileMetrics = () => {
      sample.current.forcePublish = true;
    };

    window.addEventListener("liquid-profile-reset", resetProfileMetrics);
    window.addEventListener(
      "liquid-profile-snapshot",
      snapshotProfileMetrics,
    );

    return () => {
      window.removeEventListener("liquid-profile-reset", resetProfileMetrics);
      window.removeEventListener(
        "liquid-profile-snapshot",
        snapshotProfileMetrics,
      );
    };
  }, [enabled]);

  useFrame(({ gl }, delta) => {
    if (!enabled) {
      return;
    }

    const currentSample = sample.current;

    if (!currentSample.warmupComplete) {
      currentSample.warmupElapsed += Math.min(delta, 0.05);

      if (currentSample.warmupElapsed >= 2) {
        currentSample.warmupComplete = true;
        currentSample.elapsed = 0;
        currentSample.frames = 0;
        currentSample.publishElapsed = 0;
        currentSample.sampleCount = 0;
        currentSample.writeIndex = 0;
      }

      return;
    }

    const profileResetToken =
      document.documentElement.dataset.profileResetRequest ?? "";

    if (
      profileResetToken &&
      profileResetToken !== currentSample.lastResetToken
    ) {
      currentSample.elapsed = 0;
      currentSample.frames = 0;
      currentSample.publishElapsed = 0;
      currentSample.sampleCount = 0;
      currentSample.writeIndex = 0;
      currentSample.lastResetToken = profileResetToken;
      delete document.documentElement.dataset.renderMetrics;
      delete document.documentElement.dataset.fps;
      Reflect.deleteProperty(window, "__LIQUID_METRICS__");
      return;
    }

    const frameTime = delta * 1000;
    currentSample.elapsed += delta;
    currentSample.frames += 1;
    currentSample.publishElapsed += delta;
    currentSample.frameTimes[currentSample.writeIndex] = frameTime;
    currentSample.writeIndex =
      (currentSample.writeIndex + 1) % currentSample.frameTimes.length;
    currentSample.sampleCount = Math.min(
      currentSample.sampleCount + 1,
      currentSample.frameTimes.length,
    );

    if (currentSample.publishElapsed < 1.5 && !currentSample.forcePublish) {
      return;
    }

    currentSample.forcePublish = false;
    const start =
      currentSample.sampleCount === currentSample.frameTimes.length
        ? currentSample.writeIndex
        : 0;

    for (let index = 0; index < currentSample.sampleCount; index += 1) {
      currentSample.sortedFrameTimes[index] =
        currentSample.frameTimes[
          (start + index) % currentSample.frameTimes.length
        ];
    }

    const sortedFrameTimes = currentSample.sortedFrameTimes.subarray(
      0,
      currentSample.sampleCount,
    );
    sortedFrameTimes.sort();

    const percentile = (ratio: number) =>
      sortedFrameTimes[
        Math.min(
          sortedFrameTimes.length - 1,
          Math.floor((sortedFrameTimes.length - 1) * ratio),
        )
      ];
    let framesOver18ms = 0;
    let framesOver33ms = 0;
    let framesOver50ms = 0;

    for (let index = 0; index < sortedFrameTimes.length; index += 1) {
      const value = sortedFrameTimes[index];

      if (value > 18.18) {
        framesOver18ms += 1;
      }

      if (value > 33.33) {
        framesOver33ms += 1;
      }

      if (value > 50) {
        framesOver50ms += 1;
      }
    }

    const metrics: LiquidMetrics = {
      fps: Math.round(currentSample.frames / currentSample.elapsed),
      frameTime: {
        count: sortedFrameTimes.length,
        max: round(sortedFrameTimes[sortedFrameTimes.length - 1]),
        p50: round(percentile(0.5)),
        p95: round(percentile(0.95)),
        p99: round(percentile(0.99)),
      },
      framesOver18ms,
      framesOver33ms,
      framesOver50ms,
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
    };

    Reflect.set(window, "__LIQUID_METRICS__", metrics);
    document.documentElement.dataset.fps = String(metrics.fps);
    document.documentElement.dataset.renderMetrics = JSON.stringify(metrics);
    if (!currentSample.programDiagnosticsPublished) {
      document.documentElement.dataset.webglPrograms = JSON.stringify(
        gl.info.programs?.map((program, index) => {
          const diagnostics = Reflect.get(program, "diagnostics") as
            | {
                runnable?: boolean;
                programLog?: string;
                vertexShader?: { log?: string };
                fragmentShader?: { log?: string };
              }
            | undefined;

          return {
            index,
            runnable: diagnostics?.runnable ?? true,
            programLog: diagnostics?.programLog ?? "",
            vertexLog: diagnostics?.vertexShader?.log ?? "",
            fragmentLog: diagnostics?.fragmentShader?.log ?? "",
          };
        }) ?? [],
      );
      currentSample.programDiagnosticsPublished = true;
    }
    currentSample.publishElapsed = 0;
  });

  return null;
}
