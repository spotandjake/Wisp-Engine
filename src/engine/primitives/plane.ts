import type { Vec3 } from "mv-redux";
import type { Geometry } from "../geometry";
import type Material from "../prototypes/material";
import RenderableGameObject from "../prototypes/renderableGameObject";

/** A basic plane in 3D space. */
export default class Plane extends RenderableGameObject {

  /** Creates a new plane. */
  constructor(
    // Game Object
    position: Vec3,
    rotation: Vec3,
    scale: Vec3,
    // Renderable Game Object Property
    material: Material
  ) {
    super(position, rotation, scale, material);
  }

  /** Returns the geometry of the plane. */
  protected override getGeometry(): Geometry {
    return {
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1]),
      normals: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]),
      uvs: undefined,
      indices: new Uint16Array([0, 2, 1, 0, 3, 2]),
      // Color it white by default
      colors: new Float32Array([
        1, 1, 1, 1,
        1, 1, 1, 1,
        1, 1, 1, 1,
        1, 1, 1, 1
      ])
    };
  }
}
