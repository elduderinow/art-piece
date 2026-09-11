import { BufferGeometry, Mesh } from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

/**
 * Binary STL straight out of the geometry that is on screen, so what gets
 * printed is what was dialled in. The 2024 version pulled STLExporter from
 * three-stdlib; three ships the same exporter in its own examples, and it only
 * touches position and normal attributes, so it is indifferent to the renderer.
 */
export function exportStl(geometry: BufferGeometry, filename = "artpiece.stl") {
  const exporter = new STLExporter();
  const view = exporter.parse(new Mesh(geometry), { binary: true }) as DataView;

  const blob = new Blob([new Uint8Array(view.buffer as ArrayBuffer)], {
    type: "model/stl",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
