import { vec3, vec4 } from "mv-redux";
import { WebGpuUnavailableError } from './engine/internal/errors';

// Get our dom items
const canvas = document.getElementById('screen') as HTMLCanvasElement;

// TODO: Extract this to a menu handler
const cameraToggle = document.getElementById('ct') as HTMLInputElement;
const cameraX = document.getElementById('cx') as HTMLInputElement;
const cameraY = document.getElementById('cy') as HTMLInputElement;
const cameraZ = document.getElementById('cz') as HTMLInputElement;
const cameraRotX = document.getElementById('cRotx') as HTMLInputElement;
const cameraRotY = document.getElementById('cRoty') as HTMLInputElement;
const cameraRotZ = document.getElementById('cRotz') as HTMLInputElement;

// Engine
import Renderer, { RendererUpdateEvent } from './engine/renderer';
import Controller from './engine/controller';
// Behaviors
import ControllableBehavior from './engine/behaviors/controllable';
import SliderBehavior from './behaviors/slider';
// Models
import GameObject from './engine/prototypes/gameObject';
import World from './engine/primitives/world';
import Camera from './engine/primitives/camera';
import Plane from './engine/primitives/plane';
import Light, { LightType } from './engine/primitives/light';
import Player from './objects/player';
import House from './objects/house';

import Cube from './engine/primitives/cube';

// Setup our renderer
let renderer: Renderer;
try {
  renderer = new Renderer(
    canvas,
    vec3(0.5, 0.7, 1.0),
  );
  await renderer.initialize();
} catch (error: unknown) {
  // TODO: Display a nice error message to the user if WebGPU is not available.
  if (error instanceof WebGpuUnavailableError) throw error;
  // Otherwise this error is completely unknown and unexpected
  throw error;
}

// Create some behaviors
const controller = new Controller(window);
const controllableBehavior = new ControllableBehavior(controller, 10, 2);
// const rotationControllableBehavior = new ControllableBehavior(controller, undefined, 2);
const cameraSliderBehavior = (gameObject: GameObject) => new SliderBehavior(
  gameObject,
  {
    x: cameraX,
    y: cameraY,
    z: cameraZ,
  },
  {
    x: cameraRotX,
    y: cameraRotY,
    z: cameraRotZ,
  },
  undefined
);

// Setup our scene
const world = new World();

const ground = new Plane(
  vec3(-500, 0, -500),
  vec3(0, 0, 0),
  vec3(1000, 1, 1000),
  vec4(0, 1, 0, 1)
);
world.addChild(ground);
const house = new House(
  vec3(0, 1, 0),
  vec3(0, 0, 0),
  vec3(0.03, 0.03, 0.03)
);
world.addChild(house);
const sun = new Light(
  vec3(0, 10, 0),
  vec3(0, 0, 0),
  LightType.Directional,
  1.0,
  vec3(1, 1, 1),
  100.0
);
world.addChild(sun);

const skyCamera = new Camera(
  vec3(30, 20, 30),
  // TODO: Improve these numbers
  vec3(-0.5, 0.7, 0), // These were picked by hand to give a nice view of the scene
  canvas.width / canvas.height
);
skyCamera.addBehavior(cameraSliderBehavior(skyCamera));
world.addChild(skyCamera);


const flashLight = new Light(
  vec3(0, 0, 0),
  vec3(0, 0, 0),
  LightType.Point,
  1.0,
  vec3(1, 1, 1),
  100.0
);
const playerCamera = new Camera(
  vec3(0, 0, 0),
  vec3(0, 0, 0),
  canvas.width / canvas.height
);
const player = new Player(
  vec3(0, 10, 0),
  vec3(0, 0, 0),
  vec3(1, 1, 1),
  playerCamera
);
player.head.addChild(playerCamera);
player.addChild(flashLight);
// TODO: We need to make a behavior specifically for the player as the player is a special case where rotation should be applied to the player and camera, but movement should only be applied to the player.
player.addBehavior(controllableBehavior);
world.addChild(player);

// Set our basic renderer properties
renderer.setScene(world);
const pickCamera = () => {
  if (cameraToggle.checked) {
    renderer.setCamera(skyCamera);
  } else {
    renderer.setCamera(playerCamera);
  }
}
pickCamera();
cameraToggle.addEventListener('change', pickCamera);

// Expose a basic rendering loop
renderer.addEventListener('engineUpdate', (event: Event) => {
  if (!(event instanceof RendererUpdateEvent)) return;
  const { deltaTime, timeStamp } = event;
  // Update the world
  world.update(deltaTime);
});