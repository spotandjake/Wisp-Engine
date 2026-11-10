import { vec3 } from "mv-redux";
import { WebGpuUnavailableError } from './engine/internal/errors';
import Renderer, { RendererUpdateEvent } from './engine/renderer';
import Controller from './engine/controller';

import ControllableBehavior from './engine/behaviors/controllable';

import World from './engine/primitives/world';
import Camera from './engine/primitives/camera';
import Plane from './engine/primitives/plane';
import Light from './engine/primitives/light';

import Test from './engine/primitives/test';

// Get our dom items
const canvas = document.getElementById('screen') as HTMLCanvasElement;

const cameraToggle = document.getElementById('ct') as HTMLInputElement;
const cameraX = document.getElementById('cx') as HTMLInputElement;
const cameraY = document.getElementById('cy') as HTMLInputElement;
const cameraZ = document.getElementById('cz') as HTMLInputElement;

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
// Create our controller behavior
const controller = new Controller(window);
const controllableBehavior = new ControllableBehavior(controller, 5, 2);
// Setup our scene
const world = new World();
renderer.setScene(world);

// Create our initial main camera
const camera = new Camera(
  vec3(0, 5, 0),
  vec3(-Math.PI / 2, 0, 0),
  canvas.width / canvas.height
);
world.addChild(camera);

// Create a player light
const light = new Light(
  vec3(0, 0, 0),
  vec3(0, 0, 0),
  "point",
  1.0,
  vec3(1, 1, 1),
  100.0
);
// Create a second camera for our scene
const playerCamera = new Camera(
  vec3(0, 10, 0),
  vec3(0, 0, 0),
  canvas.width / canvas.height
);

playerCamera.addChild(light);
playerCamera.addBehavior(controllableBehavior);
world.addChild(playerCamera);
renderer.setCamera(playerCamera);

// Construct a ground
const plane = new Plane(
  vec3(0, 0, 0),
  vec3(0, 0, 0),
  vec3(100, 1, 100)
);
world.addChild(plane);

// Create a basic test object
const test = new Test(
  vec3(0, 1, 0),
  vec3(0, 0, 0),
  vec3(0.1, 0.1, 0.1)
);
world.addChild(test);
// TODO: Setup a basic room like scene

// Render the world
renderer.addEventListener('engineUpdate', (event: Event) => {
  if (!(event instanceof RendererUpdateEvent)) return;
  const { deltaTime, timeStamp } = event;
  // Update the world
  world.update(deltaTime);
  // TODO: Perform any updates to the scene here
});


// Bind our menu controls
cameraToggle.addEventListener('change', (event: Event) => {
  if (!(event.target instanceof HTMLInputElement)) return;
  if (event.target.checked) {
    renderer.setCamera(camera);
  } else {
    renderer.setCamera(playerCamera);
  }
});