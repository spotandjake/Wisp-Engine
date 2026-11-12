import type { Vec4 } from "mv-redux";
import type { TextureReference } from "../renderer";

/** A material for a renderable game object. */
export default class Material {
  /** The base color of the material. */
  public BaseColor: Vec4;
  /** The texture of the material. */
  public Texture: TextureReference | null;
  /** The shininess of the material. */
  public Shininess: number;

  constructor(base_color: Vec4, texture: TextureReference | null, shininess: number) {
    this.BaseColor = base_color;
    this.Texture = texture;
    this.Shininess = shininess;
  }
}