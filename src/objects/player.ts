import { type Vec3, vec3, vec4 } from "mv-redux";
import GameObject from "../engine/prototypes/gameObject";
import Camera from "../engine/primitives/camera";
import Cube from "../engine/primitives/cube";

// TODO: Controllable is controlling the camera right now it should control the player and then pass it's data around a bit better.
class Player extends GameObject {
  public readonly head: GameObject;

  constructor(
    // Default GameObject properties
    position: Vec3,
    rotation: Vec3,
    scale: Vec3,
    // Player specific properties
    camera?: Camera
  ) {
    super(position, rotation, scale);
    // NOTE: These offsets are magic numbers, from trial and error of what looks good.

    // Create body parts
    this.head = new Cube(
      vec3(0, 0, 0),
      vec3(0, 0, 0),
      vec3(1, 1, 1),
      [
        vec4(1, 0, 0, 1), // Red
        vec4(1, 0, 0, 1), // Red
        vec4(1, 0, 0, 1), // Red
        vec4(1, 0, 0, 1), // Red
        vec4(1, 0, 0, 1), // Red
        vec4(1, 0, 0, 1), // Red
      ]
    );
    this.addChild(this.head);
    const body = new Cube(
      vec3(-0.125, -1, 0.05), // (1.25 - 1)/2 = 0.125, -1 (under body), (1-0.9) / 2 = 0.05
      vec3(0, 0, 0),
      vec3(1.25, 2, 0.9),
      [
        vec4(0, 1, 0, 1), // Green
        vec4(0, 1, 0, 1), // Green
        vec4(0, 1, 0, 1), // Green
        vec4(0, 1, 0, 1), // Green
        vec4(0, 1, 0, 1), // Green
        vec4(0, 1, 0, 1), // Green
      ]
    );
    this.addChild(body);
    // Arms
    for (let i = 0; i < 2; i++) {
      // The right is 1.125, 1.25(body) - (0.5arm)/2 = 1.125
      // The left arm is -0.5 - 0.125 (body offset) = -0.625
      const arm = new Cube(
        vec3(i === 0 ? -0.625 : 1.125, -1.25, 0.25),
        vec3(0, 0, 0),
        vec3(0.5, 1.5, 0.5),
        [
          vec4(0, 0, 1, 1), // Blue
          vec4(0, 0, 1, 1), // Blue
          vec4(0, 0, 1, 1), // Blue
          vec4(0, 0, 1, 1), // Blue
          vec4(0, 0, 1, 1), // Blue
          vec4(0, 0, 1, 1), // Blue
        ]
      );
      this.addChild(arm);
    }
    // Legs
    for (let i = 0; i < 2; i++) {
      const leg = new Cube(
        vec3(i === 0 ? -0.125 : 1.25-0.125-0.5, -3, 0.25), // Left or right side
        vec3(0, 0, 0),
        vec3(0.5, 1.5, 0.5),
        [
          vec4(1, 1, 0, 1), // Yellow
          vec4(1, 1, 0, 1), // Yellow
          vec4(1, 1, 0, 1), // Yellow
          vec4(1, 1, 0, 1), // Yellow
          vec4(1, 1, 0, 1), // Yellow
          vec4(1, 1, 0, 1), // Yellow
        ]
      );
      this.addChild(leg);
    }
  }
}

export default Player;
