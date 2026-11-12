import type GameObject from './gameObject';

/** Implements a behavior that can be applied to a game object. */
export default abstract class Behavior {
  constructor() {}

  /** Applies the behavior to the game object. */
  public abstract apply(gameObject: GameObject, deltaTime: number): void;
}