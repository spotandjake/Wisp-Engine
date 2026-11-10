import { vec3, add, mult } from "mv-redux";

import Behavior from '../prototypes/behavior';
import Controller from '../controller';
import type GameObject from '../prototypes/gameObject';

/** This Behavior takes a controller and applies its input to the entity it is attached to. */
export default class ControllableBehavior extends Behavior {
  private controller: Controller;
  private moveSpeed: number;
  private rotationSpeed: number;

  constructor(controller: Controller, moveSpeed: number = 10, rotationSpeed: number = 2) {
    super();
    this.controller = controller;
    this.moveSpeed = moveSpeed;
    this.rotationSpeed = rotationSpeed;
  }

  /** Applies the controller's input to the game object. */
  public apply(gameObject: GameObject, deltaTime: number): void {
    // Get the controller's input axes
    const pitchAxis = this.controller.getPitchAxis();
    const yawAxis = this.controller.getYawAxis();
    const forwardAxis = this.controller.getForwardAxis();
    const rightAxis = this.controller.getRightAxis();
    const upAxis = this.controller.getUpAxis();
    const shiftAxis = this.controller.getShiftAxis();

    // Determine if we are sprinting
    const moveSpeed = this.moveSpeed * (1 + shiftAxis);
    
    // Apply the controller's input to the game object's rotation
    gameObject.rotation.x += pitchAxis * this.rotationSpeed * deltaTime;
    gameObject.rotation.y += -yawAxis * this.rotationSpeed * deltaTime;

    // Calculate the forward and right vectors based on the game object's rotation
    const forward = vec3(
      -Math.sin(gameObject.rotation.y),
      0,
      -Math.cos(gameObject.rotation.y)
    ); // The forward vector (could also be -backward vector)
    const right = vec3(
      Math.sin(gameObject.rotation.y + Math.PI / 2),
      0,
      Math.cos(gameObject.rotation.y + Math.PI / 2)
    ); // The right vector (could also be left vector)

    // Apply the controller's input to the game object's position
    gameObject.position = add(
      gameObject.position,
      mult(forward, forwardAxis * moveSpeed * deltaTime)
    );
    gameObject.position = add(
      gameObject.position,
      mult(right, rightAxis * moveSpeed * deltaTime)
    );
    gameObject.position = add(
      gameObject.position,
      vec3(0, upAxis * moveSpeed * deltaTime, 0)
    );
  }
}