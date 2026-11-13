import Behavior from "../engine/prototypes/behavior";
import type GameObject from "../engine/prototypes/gameObject";

/**
 * This behavior allows composing a child behavior to only be applied when the input is checked.
 */
export default class SelectionBehavior extends Behavior {
  /** The child behavior to be applied when the input is checked. */
  private childBehavior: Behavior;
  /** The checkbox that controls whether the child behavior is applied. */
  private checkBox: HTMLInputElement;
  /**
   * Creates a new SelectionBehavior instance.
   *
   * @param childBehavior The child behavior to be applied when the input is checked.
   */
  constructor(childBehavior: Behavior, checkBox: HTMLInputElement) {
    super();
    this.childBehavior = childBehavior;
    this.checkBox = checkBox;
  }

  public apply(gameObject: GameObject, deltaTime: number): void {
    if (this.checkBox.checked) {
      this.childBehavior.apply(gameObject, deltaTime);
    }
    this.childBehavior.clean();
  }

  public clean(): void {}
}
