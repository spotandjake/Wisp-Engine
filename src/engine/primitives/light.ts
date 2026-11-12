import { type Vec3, vec3 } from "mv-redux";
import GameObject from "../prototypes/gameObject";

// NOTE: We do not use an actual enum here because we want to be able to use the values in shaders, and enums are not supported in WGSL. Instead, we use a const object and a type that is derived from the keys of the object. This allows us to use the values in shaders, while still having type safety in TypeScript.

/** The light enum. */
export const LightType = {
  Directional: 0,
  Point: 1,
} as const;
/** The light enum. */
export type LightType = (typeof LightType)[keyof typeof LightType];

/** A light in the scene. */
class Light extends GameObject {
  /** The type of the light. */
  public readonly type: LightType;
  /** The intensity of the light itself. */
  public readonly intensity: number;
  /** The color of the light itself. */
  public readonly color: Vec3;
  /** The range of the light itself. */
  public readonly range: number;

  constructor(
    // The GameObject properties
    position: Vec3,
    rotation: Vec3,
    // The properties of the light
    lightType: LightType = LightType.Point,
    intensity: number = 1.0,
    color: Vec3 = vec3(1, 1, 1),
    range: number = 10.0,
  ) {
    // NOTE: We do not allow scaling lights, as it doesn't really make sense (Would we be scaling the range?)
    super(position, rotation, vec3(1, 1, 1));

    this.type = lightType;
    this.intensity = intensity;
    this.color = color;
    this.range = range;
  }
}

export default Light;
