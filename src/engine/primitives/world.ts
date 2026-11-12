import { vec3 } from "mv-redux";
import GameObject from "../prototypes/gameObject";

/** This is a pretty dumb class that acts as a more structural container for the entire game world. */
export default class World extends GameObject {
  constructor() {
    super(
      // NOTE: We do not allow configuring these as it wouldn't really make sense
      vec3(0, 0, 0), // Position
      vec3(0, 0, 0), // Rotation
      vec3(1, 1, 1), // Scale
    );
  }
}
