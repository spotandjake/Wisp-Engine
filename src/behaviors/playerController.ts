// Similar to the ControllableBehavior, but this one is specifically for a player character. It takes a controller and applies its input to the player character's movement and rotation.
import { vec3, add, mult } from "mv-redux";

import type GameObject from "../engine/prototypes/gameObject";
import Behavior from "../engine/prototypes/behavior";
import Controller from "../engine/controller";
import Player from "../objects/player";

/** This Behavior takes a controller and applies its input to the entity it is attached to. */
export default class ControllableBehavior extends Behavior {
  private controller: Controller;
  private player: Player;
  private moveSpeed: number | undefined;
  private rotationSpeed: number | undefined;

  constructor(
    controller: Controller,
    player: Player,
    moveSpeed: number | undefined,
    rotationSpeed: number | undefined,
  ) {
    super();
    this.controller = controller;
    this.player = player;
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

    // Apply the controller's input to the game object's rotation
    if (this.rotationSpeed !== undefined) {
      this.player.headPivot.rotation.x +=
        pitchAxis * this.rotationSpeed * deltaTime;
      if (this.player.headPivot.rotation.x > Math.PI / 2)
        this.player.headPivot.rotation.x = Math.PI / 2;
      if (this.player.headPivot.rotation.x < -Math.PI / 2)
        this.player.headPivot.rotation.x = -Math.PI / 2;
      gameObject.rotation.y += -yawAxis * this.rotationSpeed * deltaTime;
    }

    if (this.moveSpeed !== undefined) {
      // Clamp the pitch rotation to prevent flipping
      const moveSpeed = this.moveSpeed * (1 + shiftAxis);
      // Calculate the forward and right vectors based on the game object's rotation
      const forward = vec3(
        -Math.sin(gameObject.rotation.y),
        0,
        -Math.cos(gameObject.rotation.y),
      ); // The forward vector (could also be -backward vector)
      const right = vec3(
        Math.sin(gameObject.rotation.y + Math.PI / 2),
        0,
        Math.cos(gameObject.rotation.y + Math.PI / 2),
      ); // The right vector (could also be left vector)

      // Apply the controller's input to the game object's position
      gameObject.position = add(
        gameObject.position,
        mult(forward, forwardAxis * moveSpeed * deltaTime),
      );
      gameObject.position = add(
        gameObject.position,
        mult(right, rightAxis * moveSpeed * deltaTime),
      );
      gameObject.position = add(
        gameObject.position,
        vec3(0, upAxis * moveSpeed * deltaTime, 0),
      );
    }

    if (this.controller.getDebugAxis() > 0) {
      console.log(
        `Position: ${gameObject.position.x.toFixed(2)}, ${gameObject.position.y.toFixed(2)}, ${gameObject.position.z.toFixed(2)}`,
      );
      console.log(
        `Rotation: ${gameObject.rotation.x.toFixed(2)}, ${gameObject.rotation.y.toFixed(2)}, ${gameObject.rotation.z.toFixed(2)}`,
      );
    }
  }

  public clean(): void {}
}
