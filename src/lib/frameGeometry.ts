import { BoxGeometry, BufferGeometry, CylinderGeometry, Vector3 } from "three";
import { ADDITION, Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";

export type FrameParams = {
  frameWidth: number;
  frameHeight: number;
  frameDepth: number;
  frameThickness: number;
  displacementDepth: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  resolution: number;
};

/** Pixel data plus dimensions, read once from the displacement image. */
export type Heightfield = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

export function readHeightfield(image: HTMLImageElement | ImageBitmap): Heightfield | null {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image as CanvasImageSource, 0, 0);
  const { data } = ctx.getImageData(0, 0, image.width, image.height);
  return { data, width: image.width, height: image.height };
}

/**
 * A subdivided box whose front face is pushed out by the red channel of the
 * heightfield. Only the +Z face moves, so the sides and back stay flat and the
 * thing still reads as a frame.
 *
 * The sampling maths is the 2024 one unchanged, including the fact that v
 * indexes image rows top-down while the geometry's y runs bottom-up, so the
 * brush strokes land mirrored. That mirroring is what the piece looks like.
 */
export function buildDisplacedFrame(height: Heightfield, p: FrameParams): BufferGeometry {
  const box = new BoxGeometry(
    p.frameWidth,
    p.frameHeight,
    p.frameDepth,
    p.resolution,
    p.resolution,
    1,
  );

  const pos = box.attributes.position;
  const vertex = new Vector3();
  const front = p.frameDepth / 2;

  for (let i = 0; i < pos.count; i++) {
    vertex.fromBufferAttribute(pos, i);
    if (Math.abs(vertex.z - front) > 1e-4) continue;

    const u = (vertex.x / p.frameWidth + 0.5) * height.width * p.scale + p.offsetX;
    const v = (vertex.y / p.frameHeight + 0.5) * height.height * p.scale + p.offsetY;

    const xi = Math.max(0, Math.min(height.width - 1, Math.floor(u)));
    const yi = Math.max(0, Math.min(height.height - 1, Math.floor(v)));

    const h = height.data[(yi * height.width + xi) * 4] / 255;
    pos.setXYZ(i, vertex.x, vertex.y, vertex.z + h * p.displacementDepth);
  }

  pos.needsUpdate = true;
  box.computeVertexNormals();
  return box;
}

/** One wall mount: a small block with a keyhole bored through it. */
function buildMount(): BufferGeometry {
  const size = 0.15;
  const height = 0.05;
  const thickness = 0.1;

  const block = new Brush(new BoxGeometry(size, height, size));
  const hole = new Brush(new CylinderGeometry(size - thickness, size - thickness, height));
  block.updateMatrixWorld();
  hole.updateMatrixWorld();

  return new Evaluator().evaluate(block, hole, SUBTRACTION).geometry;
}

/**
 * The printable version: hollow out the back so only the frame wall and the
 * displaced face remain, then weld four mounts onto the back corners.
 *
 * The 2024 scene did this with @react-three/csg's JSX wrapper. Same
 * three-bvh-csg underneath, driven directly here because the result has to be a
 * plain geometry that a node material and the STL exporter can both take.
 */
export function buildIsolatedFrame(base: BufferGeometry, p: FrameParams): BufferGeometry {
  const evaluator = new Evaluator();
  evaluator.useGroups = false;

  let current = new Brush(base);
  current.updateMatrixWorld();

  const cavity = new Brush(
    new BoxGeometry(
      p.frameWidth - p.frameThickness * 2,
      p.frameHeight - p.frameThickness * 2,
      p.frameDepth * 2 + p.displacementDepth,
    ),
  );
  cavity.position.set(0, 0, -p.frameDepth);
  cavity.updateMatrixWorld();

  current = evaluator.evaluate(current, cavity, SUBTRACTION);

  const mountGeometry = buildMount();
  const z = -p.frameDepth + 0.1;
  const corners: [number, number][] = [
    [-p.frameWidth / 2 + 0.12, -p.frameHeight / 2 + 0.12],
    [p.frameWidth / 2 - 0.12, -p.frameHeight / 2 + 0.12],
    [-p.frameWidth / 2 + 0.12, p.frameHeight / 2 - 0.12],
    [p.frameWidth / 2 - 0.12, p.frameHeight / 2 - 0.12],
  ];

  for (const [x, y] of corners) {
    const mount = new Brush(mountGeometry.clone());
    mount.position.set(x, y, z);
    mount.rotation.set(Math.PI / 2, 0, 0);
    mount.updateMatrixWorld();
    current = evaluator.evaluate(current, mount, ADDITION);
  }

  const result = current.geometry;
  result.computeVertexNormals();
  return result;
}
