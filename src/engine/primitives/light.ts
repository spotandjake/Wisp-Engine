import { type Vec3, type Vec4, vec3, vec4 } from "mv-redux";
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
  public readonly Type: LightType;
  /** The intensity of the light itself. */
  public readonly Intensity: number;
  /** The range of the light itself. */
  public readonly Range: number;
  /** The ambient color of the light itself. */
  public readonly AmbientColor: Vec4;
  /** The diffuse color of the light itself. */
  public readonly DiffuseColor: Vec4;
  /** The specular color of the light itself. */
  public readonly SpecularColor: Vec4;

  constructor(
    // The GameObject properties
    position: Vec3,
    rotation: Vec3,
    // The properties of the light
    lightType: LightType = LightType.Point,
    intensity: number = 1.0,
    range: number = 10.0,
    // Color properties
    ambientColor: Vec4 = vec4(0, 0, 0, 1),
    diffuseColor: Vec4 = vec4(1, 1, 1, 1),
    specularColor: Vec4 = vec4(1, 1, 1, 1),
  ) {
    // NOTE: We do not allow scaling lights, as it doesn't really make sense (Would we be scaling the range?)
    super(position, rotation, vec3(1, 1, 1));

    this.Type = lightType;
    this.Intensity = intensity;
    this.Range = range;

    this.AmbientColor = ambientColor;
    this.DiffuseColor = diffuseColor;
    this.SpecularColor = specularColor;
  }
}

export default Light;
