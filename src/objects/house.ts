// This is a custom object, not builtin to the renderer.
// It build a basic house from our geometry and adds it to the scene.
// NOTE: This is actually rather generic so anything produced by my script could be used here, but for now it's just a house.
import type { Vec3 } from "mv-redux";
import type { Geometry } from "../engine/geometry";
import { vec4, vec3 } from "mv-redux";
import GameObject from "../engine/prototypes/gameObject";
import RenderableGameObject from "../engine/prototypes/renderableGameObject";
import Material from "../engine/prototypes/material";

import Geometries from "../geometry/house.ts";

/** A basic house in 3D space. */
class House extends GameObject {
  /** Creates a new house. */
  constructor(position: Vec3, rotation: Vec3, scale: Vec3) {
    super(position, rotation, scale);
    // Iterate through our geometries and make a dynamic class for each one, then add it to the scene.
    for (const geometry of Geometries) {
      /** A basic part of a house in 3D space. */
      const part = class extends RenderableGameObject {
        /** Creates a new house part. */
        constructor(position: Vec3, rotation: Vec3, scale: Vec3) {
          // Create a new material for this part, using the color from the geometry.
          const material = new Material(vec4(1, 1, 1, 1), null, 50);

          super(position, rotation, scale, material);
        }
        /** Returns the geometry of the house part. */
        protected override getGeometry(): Geometry {
          return geometry;
        }
      }
      this.addChild(new part(vec3(0, 0, 0), vec3(0, 0, 0), vec3(1, 1, 1)));
    }
  }
}

export default House;