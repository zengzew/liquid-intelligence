import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

interface LiquidMetrics {
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
}

export default function FrameMonitor() {
  const sample = useRef({
    elapsed: 0,
    frames: 0,
    drawCalls: 0,
    triangles: 0,
  });

  useFrame(({ gl }, delta) => {
    const frameDrawCalls = gl.info.render.calls;
    const frameTriangles = gl.info.render.triangles;
    gl.info.reset();

    sample.current.elapsed += delta;
    sample.current.frames += 1;
    sample.current.drawCalls += frameDrawCalls;
    sample.current.triangles += frameTriangles;

    if (sample.current.elapsed < 1.5) {
      return;
    }

    const metrics: LiquidMetrics = {
      fps: Math.round(sample.current.frames / sample.current.elapsed),
      drawCalls: Math.round(
        sample.current.drawCalls / Math.max(1, sample.current.frames),
      ),
      triangles: Math.round(
        sample.current.triangles / Math.max(1, sample.current.frames),
      ),
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
    };

    Reflect.set(window, "__LIQUID_METRICS__", metrics);
    document.documentElement.dataset.fps = String(metrics.fps);
    document.documentElement.dataset.renderMetrics = JSON.stringify(metrics);
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
    sample.current.elapsed = 0;
    sample.current.frames = 0;
    sample.current.drawCalls = 0;
    sample.current.triangles = 0;
  });

  return null;
}
