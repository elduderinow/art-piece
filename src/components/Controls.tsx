"use client";

import { CameraControls } from "@react-three/drei";

export default function Controls() {
  return (
    <CameraControls
      makeDefault
      minDistance={1}
      maxDistance={10}
      dampingFactor={0.1}
      truckSpeed={1}
    />
  );
}
