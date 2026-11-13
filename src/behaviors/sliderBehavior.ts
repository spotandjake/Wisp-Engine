import { radians, degrees } from "mv-redux";
import Behavior from "../engine/prototypes/behavior";
import type GameObject from "../engine/prototypes/gameObject";

/** The set of input elements for a 3D vector. */
export type Vector3InputElements = {
  x?: HTMLInputElement;
  y?: HTMLInputElement;
  z?: HTMLInputElement;
};

type VectorUpdate = {
  x: number | null;
  y: number | null;
  z: number | null;
};

/**
 * This behavior allows a game object to be controlled by a set of HTML input elements that represent
 * the position, rotation, and scale of the object.
 *
 * This also reactively updates the input elements value to match the game object's position,
 * rotation and scale.
 *
 * NOTE:
 * The updates are applied when the sliders change, which means they won't override any changes made to the
 * game object's position, rotation, or scale outside of this behavior.
 *
 * If the game object's position, rotation, or scale is changed outside of this behavior,
 * the input elements will not be updated to reflect those changes, after the behavior has run.
 */
export default class SliderBehavior extends Behavior {
  /** The span pairs for the input elements. */
  private spanPairs: [HTMLInputElement, HTMLSpanElement][] = [];
  private positionInputElements?: Vector3InputElements;
  private rotationInputElements?: Vector3InputElements;
  private scaleInputElements?: Vector3InputElements;
  private position: VectorUpdate = { x: null, y: null, z: null };
  private rotation: VectorUpdate = { x: null, y: null, z: null };
  private scale: VectorUpdate = { x: null, y: null, z: null };

  /**
   * Creates a new SliderBehavior instance.
   *
   * @param gameObject The game object this behavior is going to be attached to.
   * @param positionInputElements The position input elements for the game object.
   * @param rotationInputElements The rotation input elements for the game object.
   * @param scaleInputElements The scale input elements for the game object.
   */
  constructor(
    _: GameObject,
    positionInputElements?: Vector3InputElements,
    rotationInputElements?: Vector3InputElements,
    scaleInputElements?: Vector3InputElements,
  ) {
    super();
    this.spanPairs = [];
    this.positionInputElements = positionInputElements;
    this.rotationInputElements = rotationInputElements;
    this.scaleInputElements = scaleInputElements;
    // Handle position inputs
    if (positionInputElements !== undefined) {
      for (const key of ["x", "y", "z"] as const) {
        const element = positionInputElements[key];
        if (element === undefined) continue;
        element.addEventListener("input", () => {
          this.position[key] = element.valueAsNumber || 0;
        });
      }
    }
    // Handle rotation inputs
    if (rotationInputElements !== undefined) {
      for (const key of ["x", "y", "z"] as const) {
        const element = rotationInputElements[key];
        if (element === undefined) continue;
        element.addEventListener("input", () => {
          this.rotation[key] = radians(element.valueAsNumber || 0);
        });
      }
    }
    // Handle scale inputs
    if (scaleInputElements !== undefined) {
      for (const key of ["x", "y", "z"] as const) {
        const element = scaleInputElements[key];
        if (element === undefined) continue;
        element.addEventListener("input", () => {
          this.scale[key] = element.valueAsNumber || 0;
        });
      }
    }

    // Register the span pairs
    for (const inputGroup of [
      positionInputElements,
      rotationInputElements,
      scaleInputElements,
    ]) {
      // Empty groups can't register anything
      if (inputGroup === undefined) continue;
      for (const key of ["x", "y", "z"] as const) {
        const input = inputGroup[key];
        if (input === undefined) continue;
        if (input.parentElement === null) continue;
        const span = input.parentElement.querySelector("span");
        if (span instanceof HTMLSpanElement) {
          this.spanPairs.push([input, span]);
        }
      }
    }
  }

  /** Applies the controller's input to the game object. */
  public apply(gameObject: GameObject, deltaTime: number): void {
    // Apply the updates if they exist
    if (this.position.x !== null) gameObject.position.x = this.position.x;
    if (this.position.y !== null) gameObject.position.y = this.position.y;
    if (this.position.z !== null) gameObject.position.z = this.position.z;

    if (this.rotation.x !== null) gameObject.rotation.x = this.rotation.x;
    if (this.rotation.y !== null) gameObject.rotation.y = this.rotation.y;
    if (this.rotation.z !== null) gameObject.rotation.z = this.rotation.z;

    if (this.scale.x !== null) gameObject.scale.x = this.scale.x;
    if (this.scale.y !== null) gameObject.scale.y = this.scale.y;
    if (this.scale.z !== null) gameObject.scale.z = this.scale.z;

    // Register our input updates
    const positionElements = this.positionInputElements;
    if (positionElements !== undefined) {
      if (positionElements.x !== undefined)
        positionElements.x.value = gameObject.position.x.toString();
      if (positionElements.y !== undefined)
        positionElements.y.value = gameObject.position.y.toString();
      if (positionElements.z !== undefined)
        positionElements.z.value = gameObject.position.z.toString();
    }
    const rotationElements = this.rotationInputElements;
    if (rotationElements !== undefined) {
      if (rotationElements.x !== undefined)
        rotationElements.x.value = degrees(gameObject.rotation.x).toString();
      if (rotationElements.y !== undefined)
        rotationElements.y.value = degrees(gameObject.rotation.y).toString();
      if (rotationElements.z !== undefined)
        rotationElements.z.value = degrees(gameObject.rotation.z).toString();
    }
    const scaleElements = this.scaleInputElements;
    if (scaleElements !== undefined) {
      if (scaleElements.x !== undefined)
        scaleElements.x.value = gameObject.scale.x.toString();
      if (scaleElements.y !== undefined)
        scaleElements.y.value = gameObject.scale.y.toString();
      if (scaleElements.z !== undefined)
        scaleElements.z.value = gameObject.scale.z.toString();
    }
    // Update the spans and value
    for (const [input, span] of this.spanPairs) {
      span.textContent = input.valueAsNumber.toFixed(2);
    }
  }

  public clean(): void {
    // Clear any updates that were applied to the game object, so they don't persist to the next frame.
    this.position = { x: null, y: null, z: null };
    this.rotation = { x: null, y: null, z: null };
    this.scale = { x: null, y: null, z: null };
  }
}
