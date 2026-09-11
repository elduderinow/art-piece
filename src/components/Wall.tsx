"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { MeshStandardNodeMaterial } from "three/webgpu";

const MAPS = {
  map: "/tiles/mosaic_col_2K.png",
  normalMap: "/tiles/mosaic_normal_2K.png",
  aoMap: "/tiles/mosaic_ao_2K.png",
  roughnessMap: "/tiles/mosaic_gloss_2K.png",
  bumpMap: "/tiles/mosaic_bump_2K.png",
  metalnessMap: "/tiles/mosaic_spec_2K.png",
} as const;

type MapKey = keyof typeof MAPS;

/**
 * The tiled wall the piece hangs on. drei's useTexture is replaced with a plain
 * TextureLoader so nothing suspends: the wall appears as its maps arrive rather
 * than holding the whole scene back.
 *
 * The colour map is the only one that carries colour, so it is the only one
 * flagged sRGB. Tagging the data maps the same way would wash out roughness,
 * metalness and AO.
 */
export default function Wall() {
  const [textures, setTextures] = useState<Partial<Record<MapKey, THREE.Texture>>>({});

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const loaded: THREE.Texture[] = [];
    let disposed = false;

    for (const [key, url] of Object.entries(MAPS) as [MapKey, string][]) {
      loader.load(url, (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(3.5, 3.5);
        if (key === "map") texture.colorSpace = THREE.SRGBColorSpace;
        loaded.push(texture);
        setTextures((prev) => ({ ...prev, [key]: texture }));
      });
    }

    return () => {
      disposed = true;
      for (const texture of loaded) texture.dispose();
    };
  }, []);

  const material = useMemo(() => new MeshStandardNodeMaterial(), []);

  useEffect(() => {
    material.color = new THREE.Color("white");
    material.metalness = 1;
    material.roughness = 0.5;
    material.normalScale = new THREE.Vector2(0.35, 0.35);
    Object.assign(material, textures);
    material.needsUpdate = true;
  }, [material, textures]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh position={[0, 0, -0.075]} receiveShadow material={material}>
      <planeGeometry args={[20, 10]} />
    </mesh>
  );
}
