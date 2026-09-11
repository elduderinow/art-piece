"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import type { WebGPURenderer } from "three/webgpu";
import { PMREMGenerator } from "three/webgpu";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

/**
 * drei's <Environment> leans on its own loader plumbing, so the HDR is loaded
 * and prefiltered by hand here.
 *
 * The 2024 scene stacked two environments: a full-strength one from the local
 * equirect jpg, then drei's "studio" preset at 0.15 on the Canvas, which is
 * mounted later and therefore wins. The preset is a CDN download. This uses the
 * local HDR at that same low intensity, so nothing is fetched off-site and the
 * metal still has something to reflect.
 */
export default function EnvironmentHdr({
  file,
  blur = 1,
  intensity = 1,
  background = true,
}: {
  file: string;
  blur?: number;
  intensity?: number;
  background?: boolean;
}) {
  const scene = useThree((s) => s.scene);
  const renderer = useThree((s) => s.gl);

  useEffect(() => {
    let disposed = false;
    let envMap: THREE.Texture | null = null;

    new HDRLoader().load(file, (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }

      // PMREMGenerator must come from three/webgpu. The core one prefilters
      // with a plain ShaderMaterial, which the node renderer rejects outright
      // ("Material ShaderMaterial is not compatible"), leaving no environment
      // map at all and therefore nothing for the glass to refract.
      const pmrem = new PMREMGenerator(renderer as unknown as WebGPURenderer);
      envMap = pmrem.fromEquirectangular(texture).texture;
      pmrem.dispose();
      texture.dispose();

      scene.environment = envMap;
      scene.environmentIntensity = intensity;
      if (background) {
        scene.background = envMap;
        scene.backgroundBlurriness = blur;
      }
    });

    return () => {
      disposed = true;
      scene.environment = null;
      scene.background = null;
      envMap?.dispose();
    };
  }, [file, blur, intensity, background, scene, renderer]);

  return null;
}
