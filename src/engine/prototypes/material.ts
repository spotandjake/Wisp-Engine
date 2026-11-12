import type { Vec4 } from "mv-redux";

/** A material for a renderable game object. */
export default class Material {
  /** The base color of the material. */
  public BaseColor: Vec4;
  /** Whether the material has a texture. */
  // TODO: We actually want to have a texture object here, that is optional
  public HasTexture: boolean;
  /** The shininess of the material. */
  public Shininess: number;

  constructor(base_color: Vec4, has_texture: boolean, shininess: number) {
    this.BaseColor = base_color;
    this.HasTexture = has_texture;
    this.Shininess = shininess;
  }
}