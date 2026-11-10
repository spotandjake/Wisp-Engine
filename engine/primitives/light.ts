import { type Vec3, vec3 } from "mv-redux";
import GameObject from "../prototypes/gameObject";


/** The type of light */
export type LightType = "directional" | "point";

/** A light in the scene. */
class Light extends GameObject {
  /** The type of the light. */
  public readonly type: LightType;
  /** The intensity of the light itself. */
  public readonly intensity: number;
  /** The color of the light itself. */
  public readonly color: Vec3;
  /** The falloff of the light itself. */
  public readonly falloff: number;

  constructor(
    position: Vec3,
    rotation: Vec3,

    lightType: LightType = "point",
    intensity: number = 1.0,
    color: Vec3 = vec3(1, 1, 1),
    falloff: number = 10.0
  ) {
    // NOTE: We do not allow scaling lights, as it doesn't really make sense
    super(position, rotation, vec3(1, 1, 1));

    this.type = lightType;
    this.intensity = intensity;
    this.color = color;
    this.falloff = falloff;
  }
}

export default Light;
