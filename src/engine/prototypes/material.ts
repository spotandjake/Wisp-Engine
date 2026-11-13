import type { Vec4 } from "mv-redux";
import type { TextureReference } from "../renderer";

/** A material for a renderable game object. */
export default class Material {
  /** The ambient color of the material. */
  public AmbientColor: Vec4;
  /** The diffuse color of the material. */
  public DiffuseColor: Vec4;
  /** The specular color of the material. */
  public SpecularColor: Vec4;
  /** The shininess of the material. */
  public Shininess: number;
  /** The texture of the material. */
  public Texture: TextureReference | null;

  constructor(
    ambientColor: Vec4,
    diffuseColor: Vec4,
    specularColor: Vec4,
    shininess: number,
    texture: TextureReference | null,
  ) {
    this.AmbientColor = ambientColor;
    this.DiffuseColor = diffuseColor;
    this.SpecularColor = specularColor;
    this.Texture = texture;
    this.Shininess = shininess;
  }
}
