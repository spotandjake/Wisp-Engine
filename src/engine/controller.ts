/**
 * This class provides a unified interface for handling controller input.
 * 
 * Instead of just using a set of keys, we expose a more abstract interface for
 * getting the forward/backward and left/right movement of the camera, or any other 
 * input event.
 * 
 * This allows us to easily swap out the controller implementation in the future, for example
 * if we want to support gamepads or other input devices, or both.
 */
export default class Controller {
  /** The set of currently pressed keys. */
  private keys: Set<string> = new Set<string>();

  /**
   * Constructs a new controller for the given element.
   * 
   * @param element The element we are focused on.
   */
  constructor(target: EventTarget) {
    // Setup our keyboard event listeners
    target.addEventListener("keydown", (event) => {
      if (!(event instanceof KeyboardEvent)) return;
      this.keys.add(event.code);
    });
    target.addEventListener("keyup", (event) => {
      if (!(event instanceof KeyboardEvent)) return;
      this.keys.delete(event.code);
    });
  }
  /** Returns the forward/backward axis of the controller. */
  public getForwardAxis(): number {
    let axis = 0;
    if (this.keys.has('KeyW')) axis += 1;
    if (this.keys.has('KeyS')) axis -= 1;
    return axis;
  }
  /** Returns the left/right axis of the controller. */
  public getRightAxis(): number {
    let axis = 0;
    if (this.keys.has('KeyA')) axis -= 1;
    if (this.keys.has('KeyD')) axis += 1;
    return axis;
  }
  /** Returns the up/down axis of the controller. */
  public getUpAxis(): number {
    let axis = 0;
    if (this.keys.has('KeyE')) axis += 1;
    if (this.keys.has('KeyQ')) axis -= 1;
    return axis;
  }
  /** Get yaw axis of the controller. */
  public getYawAxis(): number {
    let axis = 0;
    if (this.keys.has('ArrowLeft')) axis -= 1;
    if (this.keys.has('ArrowRight')) axis += 1;
    return axis;
  }

  /** Returns the pitch axis of the controller. */
  public getPitchAxis(): number {
    let axis = 0;
    if (this.keys.has('ArrowUp')) axis += 1;
    if (this.keys.has('ArrowDown')) axis -= 1;
    return axis;
  }

  /** Returns the shift axis of the controller. */
  public getShiftAxis(): number {
    let axis = 0;
    if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) axis += 1;
    return axis;
  }

  /** Returns the debug axis of the controller. */
  public getDebugAxis(): number {
    // P is a the "debug" key
    let axis = 0;
    if (this.keys.has('KeyP')) axis += 1;
    return axis;
  }
}