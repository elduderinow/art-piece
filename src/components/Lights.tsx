"use client";

/**
 * The 2024 rig unchanged: a soft spot from the front, one hard directional that
 * casts the shadow onto the wall, and a flat ambient fill. Plain three lights,
 * so nothing here cares which backend is running.
 */
export default function Lights() {
  return (
    <>
      <spotLight
        castShadow
        position={[0, 2, 3]}
        intensity={0.8}
        ref={(light) => light?.lookAt(0, 0, 0)}
      />
      <directionalLight
        position={[3, 2, 2]}
        castShadow
        intensity={7}
        shadow-mapSize={2048}
        shadow-normalBias={0.01}
        shadow-bias={0.001}
      >
        <orthographicCamera attach="shadow-camera" args={[-8, 8, 8, -8, 0.1, 20]} />
      </directionalLight>
      <ambientLight intensity={1} />
    </>
  );
}
