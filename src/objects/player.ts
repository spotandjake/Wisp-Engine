// A simple minecraft style player object that can be controlled by a player controller.
import { type Vec3, vec3, vec4 } from "mv-redux";
import type Renderer from "../engine/renderer";
import GameObject from "../engine/prototypes/gameObject";
import Camera from "../engine/primitives/camera";
import Cube, { type FaceColors } from "../engine/primitives/cube";

class Player extends GameObject {
  public readonly headPivot: GameObject;
  public readonly camera: Camera;

  constructor(position: Vec3, rotation: Vec3, scale: Vec3, camera: Camera) {
    super(position, rotation, scale);
    this.camera = camera;

    // Player dimensions
    const dimensions = {
      head: {
        width: 1,
        height: 1,
        depth: 1,
      },
      body: {
        width: 1.25,
        height: 1.5,
        depth: 0.9,
      },
      arm: {
        width: 0.5,
        height: 1.5,
        depth: 0.5,
      },
      leg: {
        width: 0.5,
        height: 1.5,
        depth: 0.5,
      },
    };

    const { head, body, arm, leg } = dimensions;

    // Derived dimensions
    const bodyCenter = {
      x: 0,
      y: leg.height + body.height / 2,
      z: 0,
    };

    const armOffset = body.width / 2 + arm.width / 2;
    const legOffset = body.width / 2 - leg.width / 2;

    // Colors
    const faces = (r: number, g: number, b: number): FaceColors => [
      vec4(r, g, b, 1),
      vec4(r, g, b, 1),
      vec4(r, g, b, 1),
      vec4(r, g, b, 1),
      vec4(r, g, b, 1),
      vec4(r, g, b, 1),
    ];

    // Head pivot: rotates around the center of the head.
    this.headPivot = new GameObject(
      vec3(0, leg.height + head.height / 2, 0),
      vec3(0, 0, 0),
      vec3(1, 1, 1),
    );

    const headMesh = new Cube(
      vec3(-head.width / 2, head.height / 2, -head.depth / 2),
      vec3(0, 0, 0),
      vec3(head.width, head.height, head.depth),
      faces(1, 0, 0),
    );
    // Camera sits at the head pivot.
    camera.position = vec3(0, 0, 0);

    this.headPivot.addChild(headMesh);
    this.headPivot.addChild(camera);
    this.addChild(this.headPivot);

    // Body
    const bodyMesh = new Cube(
      vec3(
        bodyCenter.x - body.width / 2,
        leg.height,
        bodyCenter.z - body.depth / 2,
      ),
      vec3(0, 0, 0),
      vec3(body.width, body.height, body.depth),
      faces(0, 1, 0),
    );

    this.addChild(bodyMesh);

    // Arms
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;

      const armMesh = new Cube(
        vec3(side * armOffset - arm.width / 2, leg.height, -arm.depth / 2),
        vec3(0, 0, 0),
        vec3(arm.width, arm.height, arm.depth),
        faces(0, 0, 1),
      );

      this.addChild(armMesh);
    }

    // Legs
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;

      const legMesh = new Cube(
        vec3(side * legOffset - leg.width / 2, 0, -leg.depth / 2),
        vec3(0, 0, 0),
        vec3(leg.width, leg.height, leg.depth),
        faces(1, 1, 0),
      );

      this.addChild(legMesh);
    }
  }

  public override shouldRender(renderer: Renderer): boolean {
    // Don't render the player if the renderer's camera is the player's camera.
    if (renderer.getCamera() === this.camera) return false;
    return true;
  }
}

export default Player;
