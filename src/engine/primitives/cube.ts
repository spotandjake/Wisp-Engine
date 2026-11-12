import type { Vec3, Vec4 } from "mv-redux";
import { vec3, vec4 } from "mv-redux";
import GameObject from "../prototypes/gameObject";

import Plane from "./plane";

/** A collection of colors for each face of a cube. */
export type FaceColors = [Vec4, Vec4, Vec4, Vec4, Vec4, Vec4];

/** A basic cube in 3D space. */
class Cube extends GameObject {
  /** The colors for each face of the cube. */
  private faceColors: FaceColors;

  /** Creates a new cube. */
  constructor(
    // Basic GameObject properties
    position: Vec3,
    rotation: Vec3,
    scale: Vec3,
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
    super(position, rotation, scale);
    this.faceColors = faceColors;

    // TODO: We should build this using geometry instead of planes, but for now, this is a simple way to create a cube with colored faces.

    // Create the cube's geometry using planes
    // Top Face
    this.addChild(
      new Plane(
        vec3(0, 0, 0),
        vec3(0, 0, 0),
        vec3(1, 1, 1),
        this.faceColors[0],
      ),
    );
    // Bottom Face
    this.addChild(
      new Plane(
        vec3(0, -1, 1),
        vec3(Math.PI, 0, 0),
        vec3(1, 1, 1),
        this.faceColors[1],
      ),
    );
    // Right Face
    this.addChild(
      new Plane(
        vec3(1, 0, 0),
        vec3(0, 0, -Math.PI / 2),
        vec3(1, 1, 1),
        this.faceColors[2],
      ),
    );
    // Left Face
    this.addChild(
      new Plane(
        vec3(0, -1, 0),
        vec3(0, 0, Math.PI / 2),
        vec3(1, 1, 1),
        this.faceColors[3],
      ),
    );
    // Front Face
    this.addChild(
      new Plane(
        vec3(0, -1, 0),
        vec3(-Math.PI / 2, 0, 0),
        vec3(1, 1, 1),
        this.faceColors[4],
      ),
    );
    // Back Face
    this.addChild(
      new Plane(
        vec3(0, 0, 1),
        vec3(Math.PI / 2, 0, 0),
        vec3(1, 1, 1),
        this.faceColors[5],
      ),
    );
  }
}

export default Cube;
