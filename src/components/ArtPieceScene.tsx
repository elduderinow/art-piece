"use client";

import { Canvas } from "@react-three/fiber";
import { useCallback, useMemo, useState } from "react";
import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import ArtPiece from "./ArtPiece";
import Controls from "./Controls";
import EnvironmentHdr from "./EnvironmentHdr";
import Lights from "./Lights";
import Wall from "./Wall";
import { exportStl } from "@/lib/exportStl";
import type { FrameParams } from "@/lib/frameGeometry";
import { useFrameGeometry, useHeightfield } from "@/lib/useFrameGeometry";

type Backend = "webgpu" | "webgl";

/**
 * Full subdivision is around 700k vertices. That is fine on a desktop GPU and
 * punishing on a phone, where the CPU-side displacement pass is the slower half
 * anyway, so touch devices start coarser. The slider still goes to 1000.
 */
function defaultResolution() {
  if (typeof window === "undefined") return 600;
  return window.matchMedia("(pointer: coarse)").matches ? 250 : 600;
}

const DEFAULTS: FrameParams = {
  frameWidth: 2.5,
  frameHeight: 3,
  frameDepth: 0.15,
  frameThickness: 0.05,
  displacementDepth: 0.1,
  scale: 0.64,
  offsetX: 0,
  offsetY: 0,
  resolution: 600,
};

export default function ArtPieceScene() {
  const [backend, setBackend] = useState<Backend | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [isolated, setIsolated] = useState(false);
  const [color, setColor] = useState("#273f96");
  const [roughness, setRoughness] = useState(0.19);
  const [metalness, setMetalness] = useState(0);
  const [params, setParams] = useState<FrameParams>(() => ({
    ...DEFAULTS,
    resolution: defaultResolution(),
  }));

  const heightfield = useHeightfield("/images/brushes.jpeg");
  const { geometry, building } = useFrameGeometry(heightfield, params, isolated);

  const set = useCallback(
    (key: keyof FrameParams) => (value: number) =>
      setParams((prev) => ({ ...prev, [key]: value })),
    [],
  );

  /**
   * WebGPU where available, WebGL 2 otherwise. Everything in the scene is node
   * materials, so the same graph compiles to WGSL or GLSL depending on which
   * backend starts.
   */
  const createRenderer = useCallback(async (props: object) => {
    const hasWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;

    const renderer = new WebGPURenderer({
      ...(props as ConstructorParameters<typeof WebGPURenderer>[0]),
      forceWebGL: !hasWebGPU,
      antialias: true,
    });

    try {
      await renderer.init();
    } catch (error) {
      setFailed(true);
      throw error;
    }

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // PCFSoftShadowMap was removed from the WebGPU renderer, which warns and
    // falls back to PCF, so the default is what gets used either way.
    renderer.shadowMap.enabled = true;

    const active = renderer.backend as { isWebGPUBackend?: boolean };
    setBackend(active.isWebGPUBackend === true ? "webgpu" : "webgl");
    return renderer;
  }, []);

  const triangles = useMemo(() => {
    if (!geometry) return 0;
    const index = geometry.getIndex();
    const count = index ? index.count : geometry.attributes.position.count;
    return Math.round(count / 3);
  }, [geometry]);

  if (failed) {
    return (
      <div className="status">
        <p>This scene could not start a GPU context.</p>
        <p className="muted">It needs WebGPU or WebGL 2.</p>
      </div>
    );
  }

  return (
    <>
      <Canvas
        dpr={[1, 1.5]}
        shadows
        camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 5] }}
        gl={createRenderer}
      >
        <Controls />
        <Lights />
        {geometry ? (
          <ArtPiece
            geometry={geometry}
            color={color}
            roughness={roughness}
            metalness={metalness}
          />
        ) : null}
        <Wall />
        {/* Environment only, no backdrop: the 2024 scene painted the canvas
            white behind the wall. */}
        <EnvironmentHdr
          file="/hdri/potsdamer_platz_1k.hdr"
          intensity={0.15}
          background={false}
        />
      </Canvas>

      <div className={open ? "panel open" : "panel"}>
        <button type="button" className="toggle" onClick={() => setOpen((v) => !v)}>
          {open ? "close" : "controls"}
        </button>

        {open ? (
          <div className="controls">
            <Slider label="width" value={params.frameWidth} min={0.1} max={10} step={0.01} onChange={set("frameWidth")} />
            <Slider label="height" value={params.frameHeight} min={0.1} max={10} step={0.01} onChange={set("frameHeight")} />
            <Slider label="depth" value={params.frameDepth} min={0.01} max={1} step={0.01} onChange={set("frameDepth")} />
            <Slider label="wall thickness" value={params.frameThickness} min={0.01} max={1} step={0.01} onChange={set("frameThickness")} />
            <Slider label="relief" value={params.displacementDepth} min={0} max={0.3} step={0.01} onChange={set("displacementDepth")} />
            <Slider label="pattern scale" value={params.scale} min={0.2} max={1} step={0.01} onChange={set("scale")} />
            <Slider label="offset x" value={params.offsetX} min={-50} max={50} step={0.1} onChange={set("offsetX")} />
            <Slider label="offset y" value={params.offsetY} min={-50} max={50} step={0.1} onChange={set("offsetY")} />
            <Slider label="roughness" value={roughness} min={0} max={1} step={0.01} onChange={setRoughness} />
            <Slider label="metalness" value={metalness} min={0} max={1} step={0.01} onChange={setMetalness} />
            <Slider label="resolution" value={params.resolution} min={10} max={1000} step={10} onChange={set("resolution")} />

            <label className="row">
              <span>colour</span>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </label>

            <label className="row">
              <span>printable</span>
              <input
                type="checkbox"
                checked={isolated}
                onChange={(e) => setIsolated(e.target.checked)}
              />
            </label>

            <div className="row actions">
              <button
                type="button"
                disabled={!geometry || building}
                onClick={() => geometry && exportStl(geometry)}
              >
                export STL
              </button>
              <button
                type="button"
                onClick={() => setParams({ ...DEFAULTS, resolution: defaultResolution() })}
              >
                reset
              </button>
            </div>

            <p className="meta">
              {triangles.toLocaleString()} triangles
              {isolated && params.resolution > 220 ? " · capped for the cut" : ""}
            </p>
          </div>
        ) : null}
      </div>

      {building ? <p className="hint">building…</p> : null}
      {backend ? <p className="backend">{backend}</p> : null}
    </>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="row">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <em>{value}</em>
    </label>
  );
}
