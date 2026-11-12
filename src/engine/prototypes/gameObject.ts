import {
  type Mat4,
  type Vec3,
  translationMatrix,
  rotationMatrix,
  scaleMatrix,
  mult,
} from "mv-redux";
import type Renderer from "../renderer";
import type Behavior from "./behavior";

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
  /** The behaviors of the game object. */
  public readonly behaviors: Behavior[] = [];

  /** Creates a new game object. */
  constructor(position: Vec3, rotation: Vec3, scale: Vec3) {
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
  }

  /** Returns the position of the game object. */
  public shouldRender(renderer: Renderer): boolean {
    return true;
  }

  /** Adds a child to the game object. */
  public addChild(child: GameObject): void {
    this.children.push(child);
  }
  /** Adds a behavior to the game object. */
  public addBehavior(behavior: Behavior): void {
    this.behaviors.push(behavior);
  }

  /** Creates a model matrix from the object's position, rotation, and scale. */
  public getModelMatrix(): Mat4 {
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

  /** Updates the game object. (Runs behaviors) */
  public update(deltaTime: number): void {
    // Apply all behaviors to this game object
    for (const behavior of this.behaviors) {
      behavior.apply(this, deltaTime);
    }
    // Update all children
    for (const child of this.children) {
      child.update(deltaTime);
    }
  }
}

export default GameObject;
