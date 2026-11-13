import type { Vec3, Vec4 } from "mv-redux";
import type { Geometry } from "../geometry";
import { vec4 } from "mv-redux";
import RenderableGameObject from "../prototypes/renderableGameObject";
import Material from "../prototypes/material";

/** A collection of colors for each face of a cube. */
export type FaceColors = [Vec4, Vec4, Vec4, Vec4, Vec4, Vec4];

/** A basic cube in 3D space. */
class Cube extends RenderableGameObject {
  private faceColors: FaceColors;
  private geometry: Geometry | null = null;
  /** Creates a new cube. */
  constructor(
    // Basic GameObject properties
    position: Vec3,
    rotation: Vec3,
    scale: Vec3,
    material: Material,
    // Cube coloring
    faceColors: FaceColors = [
      vec4(1, 0, 0, 1), // Red
      vec4(0, 1, 0, 1), // Green
      vec4(0, 0, 1, 1), // Blue
      vec4(1, 1, 0, 1), // Yellow
      vec4(1, 0, 1, 1), // Magenta
      vec4(0, 1, 1, 1), // Cyan
    ],
  ) {
    super(position, rotation, scale, material);

    this.faceColors = faceColors;
  }

  public getGeometry(): Geometry {
    // Memoize the geometry so we don't have to recalculate it every time we render a cube.
    if (this.geometry) return this.geometry;

    // NOTE: This isn't the most efficient way to create a cube, but it is straightforward and easy to understand, and i'm tired.

    // Face order matches the original faceColors order:
    // top, bottom, right, left, front, back.
    const faces = [
      // Top (+Y)
      {
        corners: [
          [0, 0, 1],
          [1, 0, 1],
          [1, 0, 0],
          [0, 0, 0],
        ],
        normal: [0, 1, 0],
      },
      // Bottom (-Y)
      {
        corners: [
          [0, -1, 0],
          [1, -1, 0],
          [1, -1, 1],
          [0, -1, 1],
        ],
        normal: [0, -1, 0],
      },
      // Right (+X)
      {
        corners: [
          [1, -1, 0],
          [1, 0, 0],
          [1, 0, 1],
          [1, -1, 1],
        ],
        normal: [1, 0, 0],
      },
      // Left (-X)
      {
        corners: [
          [0, -1, 1],
          [0, 0, 1],
          [0, 0, 0],
          [0, -1, 0],
        ],
        normal: [-1, 0, 0],
      },
      // Front (+Z)
      {
        corners: [
          [0, -1, 1],
          [1, -1, 1],
          [1, 0, 1],
          [0, 0, 1],
        ],
        normal: [0, 0, 1],
      },
      // Back (-Z)
      {
        corners: [
          [1, -1, 0],
          [0, -1, 0],
          [0, 0, 0],
          [1, 0, 0],
        ],
        normal: [0, 0, -1],
      },
    ] as const;

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const faceUvs = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];

    for (const [faceIndex, face] of faces.entries()) {
      const vertexOffset = faceIndex * 4;
      const color = this.faceColors[faceIndex];

      for (const [vertexIndex, corner] of face.corners.entries()) {
        positions.push(...corner);
        normals.push(...face.normal);
        uvs.push(...faceUvs[vertexIndex]);
        colors.push(color.x, color.y, color.z, color.w);
      }

      indices.push(
        vertexOffset,
        vertexOffset + 1,
        vertexOffset + 2,
        vertexOffset,
        vertexOffset + 2,
        vertexOffset + 3,
      );
    }

    this.geometry = {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      colors: new Float32Array(colors),
      indices: new Uint16Array(indices),
    };

    return this.geometry;
  }
}

export default Cube;
