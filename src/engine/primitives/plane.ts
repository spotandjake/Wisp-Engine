import type { Vec3, Vec4 } from "mv-redux";
import type { Geometry } from "../geometry";
import { vec4 } from "mv-redux";
import RenderableGameObject from "../prototypes/renderableGameObject";

/** A basic plane in 3D space. */
class Plane extends RenderableGameObject {
  private color: Vec4;

  /** Creates a new plane. */
  constructor(
    // Game Object
    position: Vec3,
    rotation: Vec3,
    scale: Vec3,
    // Plane coloring
    color: Vec4 = vec4(1, 1, 1, 1), // Default to white
  ) {
    super(position, rotation, scale);
    this.color = color;
  }

  /** Returns the geometry of the plane. */
  protected override getGeometry(): Geometry {
    const color = this.color.flat();
    return {
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1]),
      normals: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]),
      uvs: undefined,
      indices: new Uint16Array([0, 2, 1, 0, 3, 2]),
      colors: new Float32Array([...color, ...color, ...color, ...color]),
    };
  }
}

export default Plane;
