import { type Vec3, vec3 } from "mv-redux";
import GameObject from "../gameObject";

export default class w extends GameObject {
  constructor() {
    super(
      // NOTE: We do not allow configuring these as it wouldn't really make sense
      vec3(0, 0, 0), // Position
      vec3(0, 0, 0), // Rotation
      vec3(1, 1, 1), // Scale
    );
  }
}