"use client";

import { useEffect, useMemo } from "react";
import { Color, type BufferGeometry } from "three";
import { MeshStandardNodeMaterial } from "three/webgpu";

/**
 * The piece itself. Geometry is built outside the canvas and handed in, since
 * nothing about the displacement or the CSG needs a GPU context.
 */
export default function ArtPiece({
  geometry,
  color,
  roughness,
  metalness,
}: {
  geometry: BufferGeometry;
  color: string;
  roughness: number;
  metalness: number;
}) {
  const material = useMemo(() => new MeshStandardNodeMaterial(), []);

  useEffect(() => {
    material.color = new Color(color);
    material.roughness = roughness;
    material.metalness = metalness;
  }, [material, color, roughness, metalness]);

  useEffect(() => () => material.dispose(), [material]);

  return <mesh geometry={geometry} material={material} castShadow receiveShadow />;
}
