// This file implements behaviors which are a composable system of adding functionality to game objects. Behaviors are applied to game objects and can be used to modify their properties or add new functionality.
import type GameObject from "./gameObject";

/** Implements a behavior that can be applied to a game object. */
export default abstract class Behavior {
  constructor() {}

  /** Applies the behavior to the game object. */
  public abstract apply(gameObject: GameObject, deltaTime: number): void;

  /** Cleans up after a frame. */
  public abstract clean(): void;
}
