import { type Vec3 } from "mv-redux";
import type { Geometry } from "../geometry";
import RenderableGameObject from "../prototypes/renderableGameObject";

/** A basic plane in 3D space. */
class Plane extends RenderableGameObject {
  /** Creates a new plane. */
  constructor(position: Vec3, rotation: Vec3, scale: Vec3) {
    super(position, rotation, scale);
  }
  
  /** Returns the geometry of the plane. */
  protected override getGeometry(): Geometry {
    return {
      positions: new Float32Array([
        -0.5, 0, -0.5,
        0.5, 0, -0.5,
        0.5, 0,  0.5,
        -0.5, 0,  0.5,
      ]),
      normals: new Float32Array([
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
      ]),
      uvs: new Float32Array([
        0, 0,
        1, 0,
        1, 1,
        0, 1,
      ]),
      indices: new Uint16Array([
        0, 2, 1,
        0, 3, 2,
      ]),
    };
  }
}

export default Plane;