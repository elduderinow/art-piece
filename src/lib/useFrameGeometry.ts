"use client";

import { useEffect, useState } from "react";
import type { BufferGeometry } from "three";
import {
  buildDisplacedFrame,
  buildIsolatedFrame,
  readHeightfield,
  type FrameParams,
  type Heightfield,
} from "./frameGeometry";

/**
 * CSG walks every triangle of both operands through a BVH. At the full 600
 * subdivisions the frame is around 700k vertices, which turns the isolate
 * toggle into a multi-minute freeze. The displaced face is subdivided far
 * beyond what the cut needs, so the isolated build is capped here.
 */
const CSG_MAX_RESOLUTION = 220;

export function useHeightfield(url: string) {
  const [heightfield, setHeightfield] = useState<Heightfield | null>(null);

  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = url;
    let disposed = false;

    image.decode().then(
      () => {
        if (!disposed) setHeightfield(readHeightfield(image));
      },
      () => {},
    );

    return () => {
      disposed = true;
    };
  }, [url]);

  return heightfield;
}

/**
 * Rebuilds the frame whenever a shape parameter moves. The work is CPU-side
 * vertex pushing, so it is deferred one tick past the render that sets
 * `building`, giving React a chance to paint the label before the main thread
 * locks up.
 */
export function useFrameGeometry(
  heightfield: Heightfield | null,
  params: FrameParams,
  isolated: boolean,
) {
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  const [building, setBuilding] = useState(false);

  const key = JSON.stringify(params) + isolated;

  useEffect(() => {
    if (!heightfield) return;
    setBuilding(true);

    let disposed = false;
    let built: BufferGeometry | null = null;

    // Doubles as a debounce: dragging a slider clears the pending timer, so a
    // 600-subdivision rebuild only runs once the value settles.
    const timer = window.setTimeout(() => {
      const resolution = isolated
        ? Math.min(params.resolution, CSG_MAX_RESOLUTION)
        : params.resolution;

      const base = buildDisplacedFrame(heightfield, { ...params, resolution });
      built = isolated ? buildIsolatedFrame(base, { ...params, resolution }) : base;
      if (isolated) base.dispose();

      if (disposed) {
        built.dispose();
        return;
      }

      setGeometry((previous) => {
        previous?.dispose();
        return built;
      });
      setBuilding(false);
    }, 120);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
    // params is compared by value through `key`; spreading it here would
    // rebuild on every render since the object literal is new each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heightfield, key]);

  return { geometry, building };
}
