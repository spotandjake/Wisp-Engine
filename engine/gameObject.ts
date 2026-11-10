import {
  type Mat4,
  type Vec3,
  translationMatrix,
  rotationMatrix,
  scaleMatrix,
  mult,
} from "mv-redux";

/** A game object in the scene. */
class GameObject {
  /** The position of the game object. */
  public position: Vec3;
  /** The rotation of the game object. */
  public rotation: Vec3;
  /** The scale of the game object. */
  public scale: Vec3;
  /** The children of the game object. */
  public readonly children: GameObject[] = [];

  /** Creates a new game object. */
  constructor(position: Vec3, rotation: Vec3, scale: Vec3) {
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
  }

  /** Adds a child to the game object. */
  public addChild(child: GameObject): void {
    this.children.push(child);
  }

  /** Creates a model matrix from the object's position, rotation, and scale. */
  public getModelMatrix(): Mat4 {
    // TODO: Should this take into consideration it's parent
    const translation = translationMatrix(this.position);
    const rotationX = rotationMatrix("x", this.rotation.x);
    const rotationY = rotationMatrix("y", this.rotation.y);
    const rotationZ = rotationMatrix("z", this.rotation.z);
    const scale = scaleMatrix(this.scale);
    // Model matrix is computed as: Translation * RotationZ * RotationY * RotationX * Scale
    return mult(
      translation,
      mult(rotationZ, mult(rotationY, mult(rotationX, scale))),
    );
  }
}

export default GameObject;
