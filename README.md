# art-piece

A relief panel displaced from a brush-stroke image, hung on a tiled wall, with a
printable mode that hollows the back, adds wall mounts and exports an STL.
Rendered with three.js `WebGPURenderer`.

Drag to orbit, scroll to dolly. "controls" opens the panel: frame dimensions,
relief depth, pattern scale and offset, material, and a "printable" toggle.

## Stack

- Next.js 16 (App Router, Turbopack), React 19
- three.js r186 via `three/webgpu`
- `three-bvh-csg` for the boolean cut
- `@react-three/fiber` v9, `@react-three/drei` v10 for `CameraControls` only

## How the port differs

Ported from the ArtPiece scene in the 2024 portfolio. The displacement pass is
unchanged, including the quirk that the image is sampled top-down while the
geometry runs bottom-up, so the strokes land mirrored. That mirroring is what the
piece looks like, so it stays.

| 2024 | here |
|---|---|
| `@react-three/csg` JSX (`Geometry`/`Base`/`Subtraction`/`Addition`) | `three-bvh-csg` `Evaluator` driven directly |
| drei `<Environment preset="studio">` (CDN) | local HDR through `HDRLoader` + `PMREMGenerator` from `three/webgpu` |
| drei `useTexture` for the wall | plain `TextureLoader`, so the wall fades in instead of suspending the scene |
| `meshStandardMaterial` | `MeshStandardNodeMaterial` |
| leva | an HTML panel |
| zustand `exportBlob` flag | a button that calls the exporter |
| `three-stdlib` `STLExporter` | three's own `examples/jsm/exporters/STLExporter` |

`PMREMGenerator` has to come from `three/webgpu`. The core one prefilters with a
plain `ShaderMaterial`, which the node builder rejects outright, leaving no
environment map at all.

Deliberate changes, all marked in the code:

1. **Printable mode caps subdivision at 220.** CSG walks every triangle of both
   operands through a BVH, and at the full 600 the boolean takes minutes. The
   displaced face is subdivided far past what the cut needs.
2. **Touch devices start at 250 subdivisions** instead of 600. The slider still
   goes to 1000. Full subdivision is roughly 700k vertices, and the displacement
   pass that builds them is CPU-side.
3. **Geometry rebuilds are debounced by 120ms**, so dragging a slider rebuilds
   once the value settles rather than on every input event.
4. The 2024 tree had an `Effects` component with N8AO and ACES tone mapping that
   the canvas never mounted. It is not reproduced. ACES is set on the renderer,
   which is what r3f did by default.

## Backend

`WebGPURenderer` is asked for WebGL directly when `navigator.gpu` is absent, and
keeps its own automatic fallback for the case where WebGPU exists but fails to
start. Everything is node materials, so the same graph compiles to WGSL or GLSL.
The active backend is printed in the bottom right.

## Develop

```bash
npm install
npm run dev
```

`NODE_ENV` must not be forced to `development` for `npm run build`.
