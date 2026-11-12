import { radians, degrees } from 'mv-redux';
import Behavior from '../engine/prototypes/behavior';
import type GameObject from '../engine/prototypes/gameObject';

/** The set of input elements for a 3D vector. */
export type Vector3InputElements = {
  x?: HTMLInputElement;
  y?: HTMLInputElement;
  z?: HTMLInputElement; 
}

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
  private rotationInputElements?: Vector3InputElements
  private scaleInputElements?: Vector3InputElements;

  /**
   * Creates a new SliderBehavior instance.
   * 
   * @param gameObject The game object this behavior is going to be attached to.
   * @param positionInputElements The position input elements for the game object.
   * @param rotationInputElements The rotation input elements for the game object.
   * @param scaleInputElements The scale input elements for the game object.
   */
  constructor(
    gameObject: GameObject,
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
      positionInputElements.x?.addEventListener('input', () => {
        gameObject.position.x = positionInputElements.x?.valueAsNumber || 0;
      });
      positionInputElements.y?.addEventListener('input', () => {
        gameObject.position.y = positionInputElements.y?.valueAsNumber || 0;
      });
      positionInputElements.z?.addEventListener('input', () => {
        gameObject.position.z = positionInputElements.z?.valueAsNumber || 0;
      });
    }
    // Handle rotation inputs
    if (rotationInputElements !== undefined) {
      rotationInputElements.x?.addEventListener('input', () => {
        gameObject.rotation.x = radians(rotationInputElements.x?.valueAsNumber || 0);
      });
      rotationInputElements.y?.addEventListener('input', () => {
        gameObject.rotation.y = radians(rotationInputElements.y?.valueAsNumber || 0);
      });
      rotationInputElements.z?.addEventListener('input', () => {
        gameObject.rotation.z = radians(rotationInputElements.z?.valueAsNumber || 0);
      });
    }
    // Handle scale inputs
    if (scaleInputElements !== undefined) {
      scaleInputElements.x?.addEventListener('input', () => {
        gameObject.scale.x = scaleInputElements.x?.valueAsNumber || 0;
      });
      scaleInputElements.y?.addEventListener('input', () => {
        gameObject.scale.y = scaleInputElements.y?.valueAsNumber || 0;
      });
      scaleInputElements.z?.addEventListener('input', () => {
        gameObject.scale.z = scaleInputElements.z?.valueAsNumber || 0;
      });
    }

    // Register the span pairs
    for (const inputGroup of [positionInputElements, rotationInputElements, scaleInputElements]) {
      // Empty groups can't register anything
      if (inputGroup === undefined) continue;
      for (const key of ['x', 'y', 'z'] as const) {
        const input = inputGroup[key];
        if (input === undefined) continue;
        if (input.parentElement === null) continue;
        const span = input.parentElement.querySelector('span');
        if (span instanceof HTMLSpanElement) {
          this.spanPairs.push([input, span]);
        }
      }
    }
  }

  /** Applies the controller's input to the game object. */
  public apply(gameObject: GameObject, deltaTime: number): void {
    // We don't need to do anything with the sliders as we handle that in the constructor.

    // Register our input updates
    const positionElements = this.positionInputElements;
    if (positionElements !== undefined) {
      if (positionElements.x !== undefined) positionElements.x.value = gameObject.position.x.toString();
      if (positionElements.y !== undefined) positionElements.y.value = gameObject.position.y.toString();
      if (positionElements.z !== undefined) positionElements.z.value = gameObject.position.z.toString();
    }
    const rotationElements = this.rotationInputElements;
    if (rotationElements !== undefined) {
      if (rotationElements.x !== undefined) rotationElements.x.value = degrees(gameObject.rotation.x).toString();
      if (rotationElements.y !== undefined) rotationElements.y.value = degrees(gameObject.rotation.y).toString();
      if (rotationElements.z !== undefined) rotationElements.z.value = degrees(gameObject.rotation.z).toString();
    }
    const scaleElements = this.scaleInputElements;
    if (scaleElements !== undefined) {
      if (scaleElements.x !== undefined) scaleElements.x.value = gameObject.scale.x.toString();
      if (scaleElements.y !== undefined) scaleElements.y.value = gameObject.scale.y.toString();
      if (scaleElements.z !== undefined) scaleElements.z.value = gameObject.scale.z.toString();
    }
    // Update the spans and value
    for (const [input, span] of this.spanPairs) {
      span.textContent = input.valueAsNumber.toFixed(2);
    }
  }
}