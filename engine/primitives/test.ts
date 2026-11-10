import { type Vec3, vec3 } from "mv-redux";
import type { Geometry } from "../geometry";
import GameObject from "../prototypes/gameObject";
import RenderableGameObject from "../prototypes/renderableGameObject";

import Geometries from "../../models/test.ts";

/** A basic test in 3D space. */
class Test extends GameObject {
  /** Creates a new test. */
  constructor(position: Vec3, rotation: Vec3, scale: Vec3) {
    super(position, rotation, scale);
    // Setup the geometry for the test object
    for (const geometry of Geometries) {
      /** A basic test in 3D space. */
      const part = class extends RenderableGameObject {
        /** Creates a new test. */
        constructor(position: Vec3, rotation: Vec3, scale: Vec3) {
          super(position, rotation, scale);
        }
        
        /** Returns the geometry of the test. */
        protected override getGeometry(): Geometry {
          return geometry;
        }
      }
      this.addChild(new part(vec3(0, 0, 0), vec3(0, 0, 0), vec3(1, 1, 1)));
    }
  }
}

export default Test;